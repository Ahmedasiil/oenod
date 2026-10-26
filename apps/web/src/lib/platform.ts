import type { PlatformControl } from "@prisma/client";
import { db } from "./db";

/** Surfaces the super admin can pause. "all" overrides every other surface. */
export const SURFACES = [
  { key: "all", name: "Everything", help: "Website, web app, mobile, desktop and API" },
  { key: "marketing", name: "Public website", help: "Home, features, pricing, jobs, academy" },
  { key: "app", name: "Web app", help: "Customer and employee dashboard in the browser" },
  { key: "mobile", name: "Mobile apps", help: "iPhone and Android apps" },
  { key: "desktop", name: "Desktop app", help: "Windows, macOS and Linux app" },
  { key: "api", name: "Public API", help: "API keys, plugins and integrations calling OENOD" },
] as const;
export type Surface = (typeof SURFACES)[number]["key"];

let cache: { at: number; rows: PlatformControl[] } | null = null;
export function clearPlatformCache() { cache = null; }

export async function controls() {
  if (cache && Date.now() - cache.at < 10_000) return cache.rows;
  const rows = await db.platformControl.findMany().catch(() => [] as PlatformControl[]);
  cache = { at: Date.now(), rows };
  return rows;
}

const active = (c: PlatformControl | undefined, now = new Date()) =>
  c && c.mode !== "LIVE" && (!c.startsAt || c.startsAt <= now) && (!c.endsAt || c.endsAt > now) ? c : undefined;

/** Which surface a request comes from: mobile/desktop apps identify themselves. */
export function surfaceOf(h: Headers, path = ""): { surface: Surface; version?: string } {
  const client = h.get("x-oenod-client") ?? "";
  const ua = h.get("user-agent") ?? "";
  const m = client.match(/^(mobile|desktop)\/([\d.]+)/) ?? ua.match(/OENOD-(Mobile|Desktop)\/([\d.]+)/i);
  if (m) return { surface: m[1].toLowerCase() as Surface, version: m[2] };
  if (path.startsWith("/api/v1") && h.get("authorization")?.includes("oen_")) return { surface: "api" };
  if (path.startsWith("/app") || path.startsWith("/api")) return { surface: "app" };
  return { surface: "marketing" };
}

const older = (a: string, b: string) => {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0);
  return false;
};

export interface GateResult {
  blocked: boolean;
  mode?: "MAINTENANCE" | "READ_ONLY" | "UPDATE_REQUIRED";
  surface: Surface;
  title?: string;
  message?: string;
  endsAt?: Date | null;
  updateUrl?: string | null;
  allowAdmins?: boolean;
  allowOrgIds?: string[];
}

/** Decide if a surface is paused right now (before admin / pilot bypass). */
export async function gate(surface: Surface, opts: { method?: string; version?: string; locale?: string } = {}): Promise<GateResult> {
  const rows = await controls();
  const by = (k: string) => rows.find((r) => r.surface === k);
  const own = by(surface);
  if (own?.minVersion && opts.version && older(opts.version, own.minVersion))
    return { blocked: true, mode: "UPDATE_REQUIRED", surface, title: "Update OENOD", message: "A new version is required. Please update the app to continue.", updateUrl: own.updateUrl };
  const c = active(by("all")) ?? active(own) ?? (surface === "marketing" || surface === "app" ? active(by("web")) : undefined);
  if (!c) return { blocked: false, surface };
  if (c.mode === "READ_ONLY" && (!opts.method || ["GET", "HEAD", "OPTIONS"].includes(opts.method))) return { blocked: false, surface };
  const tr = (c.messages ?? {}) as Record<string, string>;
  return {
    blocked: true, mode: c.mode as GateResult["mode"], surface, title: c.title, endsAt: c.endsAt,
    message: (opts.locale && tr[opts.locale]) || (c.mode === "READ_ONLY" ? `${c.message} Viewing still works; changes are paused.` : c.message),
    allowAdmins: c.allowAdmins, allowOrgIds: c.allowOrgIds,
  };
}

export async function pausedModules() {
  const rows = await controls();
  return new Set(rows.flatMap((r) => r.pausedModules));
}

/** Public status for apps to poll on launch (mobile/desktop show a native screen). */
export async function publicStatus() {
  const rows = await controls();
  return Object.fromEntries(SURFACES.map((s) => {
    const r = rows.find((x) => x.surface === s.key);
    const a = active(r);
    return [s.key, { mode: a ? a.mode : "LIVE", title: a?.title, message: a?.message, messages: a?.messages, endsAt: a?.endsAt, minVersion: r?.minVersion, latestVersion: r?.latestVersion, updateUrl: r?.updateUrl }];
  }));
}
