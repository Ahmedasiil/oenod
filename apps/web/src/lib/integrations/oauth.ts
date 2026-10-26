import { SignJWT, jwtVerify } from "jose";
import { db } from "../db";
import { decrypt, encrypt } from "../crypto";
import { APP_URL } from "../env";
import { HttpError } from "../http";
import { connectorByKey, type Connector } from "./catalog";

const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me");
export const redirectUri = (c: Connector) => `${APP_URL}/api/integrations/${c.key}/callback`;

/**
 * OAuth app credentials: the customer's own app (saved in Integrations > "Use my own app")
 * wins, otherwise OENOD's platform app from the environment.
 */
async function creds(c: Connector, orgId: string) {
  const i = await db.integration.findUnique({ where: { orgId_provider: { orgId, provider: c.key } } });
  const cfg = (i?.config ?? {}) as Record<string, string>;
  if (cfg.clientId && cfg.clientSecret) return { id: cfg.clientId, secret: decrypt(cfg.clientSecret)!, tenant: cfg.tenant };
  const id = process.env[`${c.envPrefix}_CLIENT_ID`], secret = process.env[`${c.envPrefix}_CLIENT_SECRET`];
  if (!id || !secret) throw new HttpError(400, `${c.name} needs an app connection. Add your own app's client ID and secret under "Use my own app", or ask your OENOD admin to set ${c.envPrefix}_CLIENT_ID and ${c.envPrefix}_CLIENT_SECRET.`);
  return { id, secret, tenant: cfg.tenant };
}

/** Microsoft lets single-tenant apps use their own tenant instead of "common". */
const withTenant = (url: string, tenant?: string) => (tenant ? url.replace("/common/", `/${encodeURIComponent(tenant)}/`) : url);

export async function authorizeUrl(c: Connector, orgId: string, extra: Record<string, string> = {}) {
  const { id, tenant } = await creds(c, orgId);
  const state = await new SignJWT({ orgId, k: c.key, ...extra }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("15m").sign(key());
  let base = withTenant(c.authorizeUrl ?? "", tenant);
  if (c.key === "shopify") {
    if (!extra.shop || !/^[a-z0-9-]+\.myshopify\.com$/.test(extra.shop)) throw new HttpError(422, "Enter your store domain, like yourstore.myshopify.com");
    base = `https://${extra.shop}/admin/oauth/authorize`;
  }
  const u = new URL(base!);
  u.searchParams.set(c.clientIdParam ?? "client_id", id);
  u.searchParams.set("redirect_uri", redirectUri(c));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", state);
  if (c.scopes?.length) u.searchParams.set("scope", c.scopes.join(c.key === "tiktok" ? "," : " "));
  for (const [k, v] of Object.entries(c.extraAuthParams ?? {})) u.searchParams.set(k, v);
  return u.toString();
}

export async function readState(state: string) {
  const { payload } = await jwtVerify(state, key());
  return payload as { orgId: string; k: string; shop?: string };
}

export async function exchangeCode(c: Connector, orgId: string, code: string, shop?: string) {
  const { id, secret, tenant } = await creds(c, orgId);
  const tokenUrl = c.key === "shopify" ? `https://${shop}/admin/oauth/access_token` : withTenant(c.tokenUrl!, tenant);
  const params = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri(c) });
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };
  if (c.basicAuthToken) headers.Authorization = `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
  else { params.set(c.clientIdParam ?? "client_id", id); params.set("client_secret", secret); }
  const r = await fetch(tokenUrl, { method: "POST", headers, body: params });
  const j = (await r.json().catch(() => ({}))) as Record<string, any>;
  if (!r.ok || j.error) throw new HttpError(400, `${c.name} sign-in failed: ${j.error_description || j.error || r.status}`);
  return { accessToken: j.access_token as string, refreshToken: j.refresh_token as string | undefined, expiresIn: j.expires_in as number | undefined, raw: j };
}

/** Return a valid access token, refreshing it when it has expired. */
export async function accessToken(orgId: string, provider: string) {
  const i = await db.integration.findUnique({ where: { orgId_provider: { orgId, provider } } });
  if (!i || i.status === "DISCONNECTED" || i.status === "PENDING" || !i.accessToken) throw new HttpError(400, `${provider} is not connected.`);
  const c = connectorByKey(provider)!;
  if (!i.expiresAt || i.expiresAt.getTime() > Date.now() + 60_000 || !i.refreshToken) return decrypt(i.accessToken)!;
  const { id, secret, tenant } = await creds(c, orgId);
  const params = new URLSearchParams({ grant_type: "refresh_token", refresh_token: decrypt(i.refreshToken)! });
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (c.basicAuthToken) headers.Authorization = `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
  else { params.set(c.clientIdParam ?? "client_id", id); params.set("client_secret", secret); }
  const r = await fetch(withTenant(c.tokenUrl!, tenant), { method: "POST", headers, body: params });
  const j = (await r.json().catch(() => ({}))) as Record<string, any>;
  if (!r.ok || !j.access_token) {
    await db.integration.update({ where: { id: i.id }, data: { status: "ERROR", lastError: "Sign-in expired. Reconnect this app." } });
    throw new HttpError(400, `${c.name} sign-in expired. Reconnect it in Integrations.`);
  }
  await db.integration.update({
    where: { id: i.id },
    data: { accessToken: encrypt(j.access_token), refreshToken: j.refresh_token ? encrypt(j.refresh_token) : i.refreshToken, expiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000) : null, status: "CONNECTED", lastError: null },
  });
  return j.access_token as string;
}
