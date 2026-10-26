import { z } from "zod";
import { SignJWT } from "jose";
import { db } from "@/lib/db";
import { body, clientIp, HttpError, ok, route } from "@/lib/http";
import { startSession, verifyPassword } from "@/lib/auth";
import { limit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";
import { orgSecurity, recordFailedLogin } from "@/lib/security";
import { mfaSecret } from "@/lib/mfa-challenge";

const Schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });
// Compared against when the email doesn't exist, so a wrong email takes as long as a wrong password.
const DUMMY = "$2b$11$Pdmhb//03jXxNm9tk5eSYOadqWdYQ3cTezkefc.oHABWY8EKyVTXq";

export const POST = route(async (req: Request) => {
  const d = await body(req, Schema);
  const ip = clientIp(req);
  if (!limit(`signin:${ip}:${d.email}`, 10, 900_000) || !limit(`signin-ip:${ip}`, 40, 900_000)) throw new HttpError(429, "Too many attempts. Wait 15 minutes and try again.");
  const user = await db.user.findUnique({ where: { email: d.email }, include: { memberships: { include: { org: { select: { security: true } } } } } });
  if (!user?.passwordHash) {
    await verifyPassword(d.password, DUMMY);
    throw new HttpError(401, "That email and password don't match.");
  }
  if (user.disabledAt) throw new HttpError(403, "This account has been disabled. Contact OENOD support.");
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new HttpError(423, `For your safety, sign-in is paused for ${Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000)} more minute(s). You can reset your password to get in now.`);
  }
  if (!(await verifyPassword(d.password, user.passwordHash))) {
    const locked = await recordFailedLogin(user, ip);
    await audit({ user, orgId: user.memberships[0]?.orgId, actor: "user" }, "auth.failed", undefined, undefined, { ip });
    if (locked) throw new HttpError(423, "Too many wrong passwords. Sign-in is paused for 15 minutes and we've emailed you.");
    throw new HttpError(401, "That email and password don't match.");
  }

  const needs2fa = user.isSuperAdmin || user.memberships.some((m) => orgSecurity(m.org).require2fa);
  // Two-step sign-in: return a short-lived challenge instead of a session.
  if (user.totpEnabledAt) {
    const challenge = await new SignJWT({ p: "mfa", v: user.tokenVersion }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("5m").sign(mfaSecret());
    return ok({ mfaRequired: true, challenge });
  }

  const s = await startSession(user, req);
  await audit({ user, orgId: user.memberships[0]?.orgId, actor: "user" }, "auth.signin", "session", s.sessionId, { ip });
  const redirect = needs2fa ? (user.memberships.length ? "/app/account/security?setup=2fa" : "/admin/security?setup=2fa") : user.memberships.length ? (user.memberships.every((m) => m.role === "EMPLOYEE") ? "/me" : "/app") : user.isSuperAdmin ? "/admin" : (await db.payProfile.count({ where: { userId: user.id } })) ? "/pay" : "/academy";
  return ok({ token: s.token, user: { id: user.id, name: user.name, email: user.email, isSuperAdmin: user.isSuperAdmin }, mustEnable2fa: needs2fa, redirect });
});
