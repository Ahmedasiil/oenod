import { z } from "zod";
import { db } from "@/lib/db";
import { body, clientIp, HttpError, ok, requireUser, route } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { checkPassword, orgSecurity } from "@/lib/security";
import { limit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";
import { emailLayout, sendEmail } from "@/lib/messaging";

// Change password: other devices are signed out, this one stays signed in.
export const POST = route(async (req: Request) => {
  const ctx = await requireUser();
  if (!limit(`pwchange:${ctx.user.id}`, 5, 900_000)) throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");
  const d = await body(req, z.object({ current: z.string().optional(), password: z.string().min(10).max(200), signOutOthers: z.boolean().default(true) }));
  if (ctx.user.passwordHash && !(d.current && (await verifyPassword(d.current, ctx.user.passwordHash)))) throw new HttpError(401, "Your current password isn't right.");
  const orgs = await db.membership.findMany({ where: { userId: ctx.user.id }, include: { org: { select: { security: true } } } });
  await checkPassword(d.password, { email: ctx.user.email, name: ctx.user.name, minLength: Math.max(10, ...orgs.map((m) => orgSecurity(m.org).passwordMinLength ?? 10)) });
  await db.user.update({ where: { id: ctx.user.id }, data: { passwordHash: await hashPassword(d.password), passwordChangedAt: new Date() } });
  if (d.signOutOthers) await db.session.updateMany({ where: { userId: ctx.user.id, revokedAt: null, ...(ctx.sessionId ? { id: { not: ctx.sessionId } } : {}) }, data: { revokedAt: new Date() } });
  await audit(ctx, "auth.password_changed", undefined, undefined, { ip: clientIp(req) });
  await sendEmail({ to: ctx.user.email, scope: "PLATFORM", idempotencyKey: `pw:${ctx.user.id}:${Date.now()}`, subject: "Your OENOD password was changed", html: emailLayout({ title: "Password changed", body: "The password for your OENOD account was just changed. If this wasn't you, reset it right away from the sign-in page." }) }).catch(() => {});
  return ok({ ok: true });
});
