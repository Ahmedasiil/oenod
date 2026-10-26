import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type output } from "zod";
import type { Organization, Role } from "@prisma/client";
import { getCtx, type Ctx } from "./auth";
import { accessLevel, type Grants } from "./rbac";
import { gate, pausedModules, surfaceOf } from "./platform";
import { loadPlatformSettings } from "./platform-plugins";
import { headers } from "next/headers";
import { ipAllowed, orgSecurity } from "./security";
import { limit as rateLimit } from "./ratelimit";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const ok = (data: unknown, init?: number | ResponseInit) =>
  NextResponse.json(data, typeof init === "number" ? { status: init } : init);

export function fail(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message, details: e.details }, { status: e.status });
  if (e instanceof ZodError) return NextResponse.json({ error: "Please check the highlighted fields.", details: e.flatten() }, { status: 422 });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export type OrgCtx = Ctx & { org: Organization; role: Role };

/** Require a signed-in user (or API key) with an organization and access to `module`. */
export async function requireOrg(module?: string, need: "view" | "edit" = "view"): Promise<OrgCtx> {
  const ctx = await getCtx();
  if (!ctx.user && ctx.actor !== "api") throw new HttpError(401, "Please sign in.");
  if (!ctx.org || !ctx.role) throw new HttpError(403, "No company workspace found for this account.");
  // API keys: 120 requests a minute per key (set API_RATE_LIMIT to change it).
  if (ctx.actor === "api" && ctx.apiKeyId && !rateLimit(`api:${ctx.apiKeyId}`, Number(process.env.API_RATE_LIMIT) || 120)) throw new HttpError(429, "Too many requests for this API key. Slow down and try again in a minute.");
  if (module) {
    const level = accessLevel(ctx.role, module, (ctx.membership?.grants ?? null) as Grants | null);
    if (level === "none") throw new HttpError(403, "You don't have access to this area. Ask your manager to give you access.");
    if (need === "edit" && level === "view") throw new HttpError(403, "You have view-only access here. Ask your manager for edit access.");
  }
  if (module && !ctx.user?.isSuperAdmin && (await pausedModules()).has(module)) throw new HttpError(503, "This area is under maintenance. Please check back soon.");
  // Company security policy: trusted networks only, and two-step sign-in when required.
  const policy = orgSecurity(ctx.org);
  if (policy.ipAllowlist?.length) {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
    if (!ipAllowed(ip ?? null, policy.ipAllowlist)) throw new HttpError(403, `${ctx.org.name} only allows access from its approved networks. Your address (${ip ?? "unknown"}) isn't on the list.`, { code: "IP_NOT_ALLOWED" });
  }
  if (policy.require2fa && ctx.user && !ctx.user.totpEnabledAt) throw new HttpError(403, `${ctx.org.name} requires two-step sign-in. Turn it on in My account → Security to continue.`, { code: "MFA_REQUIRED" });
  return ctx as OrgCtx;
}

export async function requireUser() {
  const ctx = await getCtx();
  if (!ctx.user) throw new HttpError(401, "Please sign in.");
  return ctx as Ctx & { user: NonNullable<Ctx["user"]> };
}

export async function requireSuperAdmin() {
  const ctx = await getCtx();
  if (!ctx.user?.isSuperAdmin) throw new HttpError(403, "Super admin only.");
  // The keys to the whole platform: two-step sign-in is mandatory in production.
  if (process.env.NODE_ENV === "production" && !ctx.user.totpEnabledAt && process.env.SUPER_ADMIN_ALLOW_NO_2FA !== "true") {
    throw new HttpError(403, "Turn on two-step sign-in in My account → Security to use the super admin.", { code: "MFA_REQUIRED" });
  }
  return ctx as Ctx & { user: NonNullable<Ctx["user"]> };
}

export async function body<S extends ZodTypeAny>(req: Request, schema: S): Promise<output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Expected a JSON body.");
  }
  return schema.parse(raw);
}

// These keep working during maintenance: status checks, sign-in (so admins can get in),
// admin tools, background jobs, payment webhooks and GPS trackers.
const ALWAYS_ON = ["/api/platform", "/api/auth/", "/api/admin", "/api/cron", "/api/webhooks", "/api/fleet/ingest", "/api/health", "/api/hooks"];

/** Maintenance check for API requests. Returns a response when the request must be refused. */
async function maintenance(req: Request) {
  const path = new URL(req.url).pathname;
  if (ALWAYS_ON.some((p) => path.startsWith(p))) return null;
  const { surface, version } = surfaceOf(req.headers, path);
  const g = await gate(surface, { method: req.method, version, locale: req.headers.get("accept-language")?.slice(0, 2) });
  if (!g.blocked) return null;
  if (g.mode !== "UPDATE_REQUIRED" && (g.allowAdmins || g.allowOrgIds?.length)) {
    const ctx = await getCtx();
    if ((g.allowAdmins && ctx.user?.isSuperAdmin) || (ctx.org && g.allowOrgIds?.includes(ctx.org.id))) return null;
  }
  return NextResponse.json(
    { error: g.message, maintenance: true, mode: g.mode, title: g.title, endsAt: g.endsAt, updateUrl: g.updateUrl },
    { status: g.mode === "UPDATE_REQUIRED" ? 426 : 503, headers: g.endsAt ? { "Retry-After": String(Math.max(60, Math.round((g.endsAt.getTime() - Date.now()) / 1000))) } : {} },
  );
}

export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      await loadPlatformSettings();
      if (args[0] instanceof Request) {
        crossSiteCheck(args[0]);
        const stop = await maintenance(args[0]);
        if (stop) return stop;
      }
      return await fn(...args);
    } catch (e) {
      return fail(e);
    }
  };
}

/**
 * Block cross-site form/fetch posts that ride on the browser's session cookie (CSRF).
 * Apps and API clients use an Authorization header and are not affected.
 */
function crossSiteCheck(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  if (req.headers.get("authorization")) return;
  if (!/(?:^|;\s*)oenod_session=/.test(req.headers.get("cookie") ?? "")) return;
  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  if (site === "cross-site") throw new HttpError(403, "Request blocked for your security. Please use the OENOD app or website.");
  if (origin && origin !== "null") {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    try { if (new URL(origin).host !== host) throw new HttpError(403, "Request blocked for your security. Please use the OENOD app or website."); }
    catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(403, "Request blocked for your security."); }
  }
}

/**
 * The caller's IP, for rate limits and audit logs. The left side of X-Forwarded-For can be typed by anyone,
 * so we count back from the right by the number of proxies we run behind (TRUSTED_PROXY_HOPS, default 1).
 * Behind Cloudflare or an Nginx that sets X-Real-IP, set CLIENT_IP_HEADER to that header instead.
 */
export function clientIp(req: Request) {
  const named = process.env.CLIENT_IP_HEADER ? req.headers.get(process.env.CLIENT_IP_HEADER) : null;
  if (named) return named.trim();
  const chain = req.headers.get("x-forwarded-for")?.split(",").map((x) => x.trim()).filter(Boolean) ?? [];
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
  return chain[Math.max(0, chain.length - hops)] ?? null;
}
