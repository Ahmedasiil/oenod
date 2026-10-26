import { db } from "../db";
import { decrypt } from "../crypto";
import { HttpError } from "../http";
import { connectorByKey } from "./catalog";
import { accessToken } from "./oauth";
import { safeFetch } from "./safeurl";

export const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type Method = (typeof METHODS)[number];

/** Decrypted settings of a connected catalog app. */
export async function settings(orgId: string, provider: string) {
  const c = connectorByKey(provider);
  const i = await db.integration.findUnique({ where: { orgId_provider: { orgId, provider } } });
  if (!c || !i || i.status === "DISCONNECTED" || i.status === "PENDING") throw new HttpError(400, `${c?.name ?? provider} is not connected.`);
  const cfg = { ...((i.config ?? {}) as Record<string, string>) };
  for (const f of c.fields ?? []) if (f.secret && cfg[f.name]) cfg[f.name] = decrypt(cfg[f.name]) ?? "";
  return { c, i, cfg };
}

const fill = (tpl: string, cfg: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(cfg[k] ?? "").replace(/%2F/g, "/").replace(/%3A/g, ":"));

/**
 * Call any endpoint of a connected app with the right credentials. This is what
 * lets customers, automations and the AI use apps OENOD has no dedicated sync for.
 */
export async function callConnected(orgId: string, provider: string, method: Method, path: string, body?: unknown, query?: Record<string, string>) {
  const { c, i, cfg } = await settings(orgId, provider);
  if (!c.api) throw new HttpError(400, `${c.name} doesn't support direct requests yet. Use a custom connector.`);
  const base = fill(c.api.baseUrl, cfg).replace(/\/$/, "");
  const url = new URL(/^https?:\/\//.test(path) ? path : `${base}/${path.replace(/^\//, "")}`);
  if (!url.toString().startsWith(base) && new URL(base).host !== url.host) throw new HttpError(422, `Requests must go to ${new URL(base).host}.`);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
  const headers: Record<string, string> = { Accept: "application/json" };
  const a = c.api;
  if (a.auth === "oauth") headers.Authorization = `Bearer ${await accessToken(orgId, provider)}`;
  else if (a.auth === "bearer") headers.Authorization = `Bearer ${cfg[a.token!]}`;
  else if (a.auth === "header") headers[a.header!] = provider === "klaviyo" ? `Klaviyo-API-Key ${cfg[a.token!]}` : cfg[a.token!];
  else if (a.auth === "query") url.searchParams.set(a.param!, cfg[a.token!]);
  else if (a.auth === "basic") headers.Authorization = `Basic ${Buffer.from(`${cfg[a.token!]}:${a.password ? cfg[a.password] : "X"}`).toString("base64")}`;
  if (provider === "klaviyo") headers.revision = "2024-10-15";
  if (provider === "notion") headers["Notion-Version"] = "2022-06-28";
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const r = await safeFetch(url.toString(), { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  await db.integration.update({ where: { id: i.id }, data: r.ok ? { lastSyncAt: new Date(), lastError: null } : { lastError: `HTTP ${r.status} on ${method} ${url.pathname}` } });
  return r;
}

/** After connecting, store which account was connected so customers can see it. */
export async function identify(provider: string, orgId: string) {
  const who: Record<string, [string, (j: any) => string | undefined]> = {
    microsoft: ["me", (j) => j.mail || j.userPrincipalName],
    google: ["https://openidconnect.googleapis.com/v1/userinfo", (j) => j.email],
  };
  const c = connectorByKey(provider);
  const kind = c?.envPrefix === "MICROSOFT" ? "microsoft" : c?.envPrefix === "GOOGLE" ? "google" : null;
  if (!kind) return;
  const [path, pick] = who[kind];
  const t = await accessToken(orgId, provider);
  const url = path.startsWith("http") ? path : `https://graph.microsoft.com/v1.0/${path}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
  if (!r.ok) return;
  const name = pick(await r.json());
  if (name) await db.integration.update({ where: { orgId_provider: { orgId, provider } }, data: { accountName: name } });
}
