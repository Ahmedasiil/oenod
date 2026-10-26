import { z } from "zod";
import type { CustomConnector } from "@prisma/client";
import { db } from "../db";
import { decrypt, encrypt } from "../crypto";
import { HttpError, type OrgCtx } from "../http";
import { safeFetch, assertPublicUrl } from "./safeurl";
import { createResource, getSpec } from "../resources";
import { METHODS } from "./request";

export const ActionSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]{2,60}$/, "Use lowercase letters, numbers and _"),
  name: z.string().min(2).max(120),
  method: z.enum(METHODS),
  path: z.string().max(500), // may contain {placeholders}
  description: z.string().max(500).optional(),
  body: z.string().max(20000).optional(), // JSON template with {{placeholders}}
  query: z.record(z.string()).optional(),
});
export type Action = z.infer<typeof ActionSchema>;

export const AUTH_TYPES = ["none", "bearer", "header", "query", "basic", "oauth2"] as const;
const SECRET_KEYS = ["token", "value", "password", "apiKey"];

export function encryptAuth(cfg: Record<string, string> = {}) {
  return Object.fromEntries(Object.entries(cfg).map(([k, v]) => [k, SECRET_KEYS.includes(k) && v ? encrypt(v) : v]));
}
function decryptAuth(cfg: unknown) {
  const c = (cfg ?? {}) as Record<string, string>;
  return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, SECRET_KEYS.includes(k) && v ? decrypt(v) ?? "" : v]));
}

/** Customer-facing view: never returns secrets. */
export function publicConnector(c: CustomConnector) {
  const auth = (c.authConfig ?? {}) as Record<string, string>;
  return {
    id: c.id, name: c.name, description: c.description, color: c.color, baseUrl: c.baseUrl, authType: c.authType,
    authConfig: Object.fromEntries(Object.entries(auth).map(([k, v]) => [k, SECRET_KEYS.includes(k) ? (v ? "••••••" : "") : v])),
    authorizeUrl: c.authorizeUrl, tokenUrl: c.tokenUrl, scopes: c.scopes, clientId: c.clientId, oauthConnected: Boolean(c.accessToken),
    actions: c.actions, inboundResource: c.inboundResource, inboundMapping: c.inboundMapping, status: c.status, lastError: c.lastError, lastUsedAt: c.lastUsedAt, callCount: c.callCount, createdAt: c.createdAt,
  };
}

const getPath = (obj: unknown, path: string): unknown => path.split(".").reduce<any>((o, k) => (o == null ? undefined : o[k]), obj);

/** Fill {{name}} placeholders; values are JSON-escaped when inside a JSON template. */
function render(tpl: string, vars: Record<string, unknown>, json: boolean) {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = getPath(vars, k);
    if (v === undefined || v === null) return json ? "null" : "";
    return json ? JSON.stringify(v).replace(/^"|"$/g, "") : encodeURIComponent(String(v));
  });
}

async function oauthToken(c: CustomConnector) {
  if (!c.accessToken) throw new HttpError(400, `Sign in to ${c.name} first.`);
  if (!c.expiresAt || c.expiresAt.getTime() > Date.now() + 60_000 || !c.refreshToken || !c.tokenUrl) return decrypt(c.accessToken)!;
  const params = new URLSearchParams({ grant_type: "refresh_token", refresh_token: decrypt(c.refreshToken)!, client_id: c.clientId ?? "", client_secret: decrypt(c.clientSecret) ?? "" });
  const r = await safeFetch(c.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: params });
  const j = r.data as Record<string, any>;
  if (!r.ok || !j?.access_token) {
    await db.customConnector.update({ where: { id: c.id }, data: { status: "ERROR", lastError: "Sign-in expired. Reconnect." } });
    throw new HttpError(400, `${c.name} sign-in expired. Reconnect it.`);
  }
  await db.customConnector.update({ where: { id: c.id }, data: { accessToken: encrypt(j.access_token), refreshToken: j.refresh_token ? encrypt(j.refresh_token) : c.refreshToken, expiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000) : null, status: "ACTIVE", lastError: null } });
  return j.access_token as string;
}

/** Run one action (or a raw request) of a custom connector. */
export async function runCustom(c: CustomConnector, actionKey: string | null, input: Record<string, unknown> = {}, raw?: { method: (typeof METHODS)[number]; path: string; body?: unknown }) {
  const actions = (c.actions ?? []) as Action[];
  const a = actionKey ? actions.find((x) => x.key === actionKey) : null;
  if (actionKey && !a) throw new HttpError(404, `Action "${actionKey}" not found on ${c.name}.`);
  const method = a?.method ?? raw?.method ?? "GET";
  const path = a ? render(a.path, input, false) : raw?.path ?? "/";
  const base = c.baseUrl.replace(/\/$/, "");
  const url = new URL(`${base}/${path.replace(/^\//, "")}`);
  if (url.host !== new URL(base).host) throw new HttpError(422, `Requests must stay on ${new URL(base).host}.`);
  for (const [k, v] of Object.entries(a?.query ?? {})) url.searchParams.set(k, render(v, input, false).replace(/%20/g, " "));
  const auth = decryptAuth(c.authConfig);
  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": "OENOD-Connector/1.0", ...((c.defaultHeaders ?? {}) as Record<string, string>) };
  switch (c.authType) {
    case "bearer": headers.Authorization = `Bearer ${auth.token}`; break;
    case "header": headers[auth.name || "X-API-Key"] = auth.value; break;
    case "query": url.searchParams.set(auth.name || "api_key", auth.value); break;
    case "basic": headers.Authorization = `Basic ${Buffer.from(`${auth.username ?? ""}:${auth.password ?? ""}`).toString("base64")}`; break;
    case "oauth2": headers.Authorization = `Bearer ${await oauthToken(c)}`; break;
  }
  let payload: string | undefined;
  if (a?.body) {
    payload = render(a.body, input, true);
    try { JSON.parse(payload); } catch { throw new HttpError(422, "The action's body template isn't valid JSON after filling it in."); }
  } else if (raw?.body !== undefined) payload = JSON.stringify(raw.body);
  else if (!a && method !== "GET" && Object.keys(input).length) payload = JSON.stringify(input);
  if (payload) headers["Content-Type"] = "application/json";
  const r = await safeFetch(url.toString(), { method, headers, body: payload });
  await db.customConnector.update({ where: { id: c.id }, data: { lastUsedAt: new Date(), callCount: { increment: 1 }, ...(r.ok ? { status: "ACTIVE", lastError: null } : { lastError: `HTTP ${r.status} on ${method} ${url.pathname}` }) } });
  return r;
}

/** Turn an OpenAPI 3 / Swagger 2 document into connector actions. */
export async function importOpenApi(specUrlOrJson: string) {
  let doc: any;
  if (/^https?:\/\//.test(specUrlOrJson.trim())) {
    const r = await safeFetch(specUrlOrJson.trim(), { headers: { Accept: "application/json" } });
    doc = typeof r.data === "string" ? (() => { throw new HttpError(422, "Only JSON OpenAPI files are supported. Convert YAML to JSON first."); })() : r.data;
  } else {
    try { doc = JSON.parse(specUrlOrJson); } catch { throw new HttpError(422, "Paste an OpenAPI JSON document or its URL."); }
  }
  if (!doc?.paths) throw new HttpError(422, "That doesn't look like an OpenAPI document.");
  const baseUrl: string = doc.servers?.[0]?.url ?? (doc.host ? `${doc.schemes?.[0] ?? "https"}://${doc.host}${doc.basePath ?? ""}` : "");
  const actions: Action[] = [];
  const seen = new Set<string>();
  for (const [path, ops] of Object.entries<any>(doc.paths)) {
    for (const m of ["get", "post", "put", "patch", "delete"]) {
      const op = ops?.[m];
      if (!op) continue;
      let key = (op.operationId ?? `${m}_${path}`).replace(/[^a-zA-Z0-9]+/g, "_").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase().replace(/^_|_$/g, "").slice(0, 60);
      while (seen.has(key)) key = `${key.slice(0, 57)}_${seen.size}`;
      seen.add(key);
      actions.push({ key: key.length >= 2 ? key : `op_${seen.size}`, name: (op.summary ?? `${m.toUpperCase()} ${path}`).slice(0, 120), method: m.toUpperCase() as Action["method"], path: path.replace(/\{(\w+)\}/g, "{{$1}}"), description: op.description?.slice(0, 500) });
      if (actions.length >= 300) break;
    }
  }
  const schemes = doc.components?.securitySchemes ?? doc.securityDefinitions ?? {};
  const first: any = Object.values(schemes)[0];
  const authType = !first ? "none" : first.type === "http" && first.scheme === "bearer" ? "bearer" : first.type === "http" && first.scheme === "basic" ? "basic" : first.type === "apiKey" ? (first.in === "query" ? "query" : "header") : first.type === "oauth2" ? "oauth2" : "none";
  const flow = first?.flows?.authorizationCode ?? (first?.flow === "accessCode" ? first : null);
  return {
    name: doc.info?.title?.slice(0, 120) ?? "Custom API", description: doc.info?.description?.slice(0, 500), baseUrl, actions, authType,
    authHint: first?.type === "apiKey" ? { name: first.name } : undefined,
    oauth: flow ? { authorizeUrl: flow.authorizationUrl, tokenUrl: flow.tokenUrl, scopes: Object.keys(flow.scopes ?? {}) } : undefined,
  };
}

export async function validateBase(url: string) {
  await assertPublicUrl(url);
}

// Inbound webhooks: what an outside app can create in OENOD, and the fields it can fill.
export const INBOUND_RESOURCES = ["contacts", "deals", "tickets", "tasks", "bookings", "orders", "expenses", "activities", "applications"] as const;

/** Create a record from an inbound payload using the field mapping. */
export async function handleInbound(c: CustomConnector, payload: unknown) {
  if (!c.inboundResource) throw new HttpError(400, "This connector doesn't accept inbound data.");
  const org = await db.organization.findUnique({ where: { id: c.orgId } });
  if (!org) throw new HttpError(404, "Not found");
  const map = (c.inboundMapping ?? {}) as Record<string, string>;
  const data: Record<string, unknown> = {};
  for (const [field, path] of Object.entries(map)) {
    const v = path.startsWith("=") ? path.slice(1) : getPath(payload, path);
    if (v !== undefined && v !== null && v !== "") data[field] = v;
  }
  const ctx = { user: null, org, membership: null, role: "ADMIN", actor: "api" } as unknown as OrgCtx;
  const spec = getSpec(c.inboundResource, ctx, "edit");
  const row = await createResource(spec, ctx, data);
  await db.customConnector.update({ where: { id: c.id }, data: { lastUsedAt: new Date(), callCount: { increment: 1 } } });
  return row;
}

/** Body accepted when creating one (also used, partially, for edits). */
export const ConnectorInput = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2342E0"),
  baseUrl: z.string().url(),
  authType: z.enum(AUTH_TYPES).default("none"),
  authConfig: z.record(z.string()).optional(), // { token } | { name, value } | { username, password } | { inboundSecret }
  authorizeUrl: z.string().url().optional(),
  tokenUrl: z.string().url().optional(),
  scopes: z.array(z.string()).default([]),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  defaultHeaders: z.record(z.string()).optional(),
  actions: z.array(ActionSchema).max(300).default([]),
  inboundResource: z.enum(INBOUND_RESOURCES).nullable().optional(),
  inboundMapping: z.record(z.string()).optional(),
});
