import { MODULE_KEYS } from "./modules";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import type { Membership, Organization, Role, User } from "@prisma/client";
import { db } from "./db";
import { sha256 } from "./crypto";
import { openSession, orgSecurity } from "./security";

export const SESSION_COOKIE = "oenod_session";
export const ORG_COOKIE = "oenod_org";
const TTL_DAYS = 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s || "dev-only-insecure-secret-change-me");
}

export async function hashPassword(p: string) {
  return bcrypt.hash(p, 11);
}
export async function verifyPassword(p: string, h: string) {
  return bcrypt.compare(p, h);
}

export async function signSession(user: Pick<User, "id" | "tokenVersion">, sid: string, days = TTL_DAYS) {
  return new SignJWT({ v: user.tokenVersion, sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret());
}

export async function setSessionCookie(tokenValue: string, days = TTL_DAYS) {
  (await cookies()).set(SESSION_COOKIE, tokenValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: days * 86400,
  });
}

/**
 * Sign a person in on this device: a session row (so it can be listed and revoked),
 * a signed token for mobile/desktop and the httpOnly cookie for the browser.
 */
export async function startSession(user: User, req: Request, opts: { mfa?: boolean } = {}) {
  const memberships = await db.membership.findMany({ where: { userId: user.id }, include: { org: { select: { security: true } } } });
  // The strictest company policy wins.
  const days = Math.min(TTL_DAYS, ...memberships.map((m) => orgSecurity(m.org).sessionDays ?? TTL_DAYS));
  const s = await openSession(user, req, { mfa: Boolean(opts.mfa), days });
  const t = await signSession(user, s.id, days);
  await setSessionCookie(t, days);
  await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date(), failedLogins: 0, lockedUntil: null } });
  return { token: t, sessionId: s.id };
}

export async function clearSession() {
  const c = await cookies();
  const t = c.get(SESSION_COOKIE)?.value;
  if (t) {
    try {
      const { payload } = await jwtVerify(t, secret());
      if (payload.sid) await db.session.updateMany({ where: { id: String(payload.sid), revokedAt: null }, data: { revokedAt: new Date() } });
    } catch { /* already invalid */ }
  }
  c.delete(SESSION_COOKIE);
  c.delete(ORG_COOKIE);
}

async function userFromToken(t: string): Promise<{ user: User; sessionId: string } | null> {
  try {
    const { payload } = await jwtVerify(t, secret());
    if (!payload.sub || !payload.sid) return null;
    const session = await db.session.findUnique({ where: { id: String(payload.sid) }, include: { user: true } });
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt < new Date()) return null;
    const user = session.user;
    if (user.tokenVersion !== payload.v || user.disabledAt) return null;
    // Touch at most once every 5 minutes to keep writes low.
    if (Date.now() - session.lastSeenAt.getTime() > 300_000) db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
    return { user, sessionId: session.id };
  } catch {
    return null;
  }
}

export interface Ctx {
  user: User | null;
  org: Organization | null;
  membership: Membership | null;
  role: Role | null;
  actor: "user" | "api";
  apiKeyId?: string;
  sessionId?: string;
}

/** Resolve who is calling: web cookie, mobile/desktop bearer token, or an org API key. */
export async function getCtx(): Promise<Ctx> {
  const h = await headers();
  const c = await cookies();
  const auth = h.get("authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;

  // Public API key (oen_live_...) gives organization-level access.
  if (bearer?.startsWith("oen_")) {
    const key = await db.apiKey.findUnique({ where: { hash: sha256(bearer) }, include: { org: true } });
    if (!key || key.revokedAt) return { user: null, org: null, membership: null, role: null, actor: "api" };
    db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    // Scoped keys (plugins) carry grants: only the listed modules are reachable.
    const scoped = key.scopes.length && !key.scopes.includes("*");
    const membership = scoped ? ({ grants: Object.fromEntries([...MODULE_KEYS, "billing"].map((m) => [m, key.scopes.includes(`${m}:write`) ? "edit" : key.scopes.includes(`${m}:read`) || key.scopes.includes(m) ? "view" : "none"])) } as unknown as Membership) : null;
    return { user: null, org: key.org, membership, role: "ADMIN", actor: "api", apiKeyId: key.id };
  }

  const t = bearer || c.get(SESSION_COOKIE)?.value;
  const found = t ? await userFromToken(t) : null;
  if (!found) return { user: null, org: null, membership: null, role: null, actor: "user" };
  const { user, sessionId } = found;

  const wanted = h.get("x-org-id") || c.get(ORG_COOKIE)?.value;
  const memberships = await db.membership.findMany({ where: { userId: user.id }, include: { org: true }, orderBy: { createdAt: "asc" } });
  const m = memberships.find((x) => x.orgId === wanted) ?? memberships[0] ?? null;
  return { user, org: m?.org ?? null, membership: m, role: m?.role ?? null, actor: "user", sessionId };
}

export async function getUser() {
  return (await getCtx()).user;
}
