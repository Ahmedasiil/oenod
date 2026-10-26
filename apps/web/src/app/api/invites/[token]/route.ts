import { z } from "zod";
import { db } from "@/lib/db";
import { body, clientIp, HttpError, ok, route } from "@/lib/http";
import { getCtx, hashPassword, startSession } from "@/lib/auth";
import { checkPassword } from "@/lib/security";
import { limit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";
import { requestLocale } from "@/lib/i18n";

type P = { params: Promise<{ token: string }> };

async function load(t: string) {
  const inv = await db.invite.findUnique({ where: { token: t }, include: { org: { select: { id: true, name: true, logoUrl: true, verificationStatus: true } } } });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) throw new HttpError(404, "This invitation has expired or was already used. Ask for a new one.");
  return inv;
}

export const GET = route(async (_req: Request, { params }: P) => {
  const inv = await load((await params).token);
  return ok({ email: inv.email, role: inv.role, org: inv.org, hasAccount: Boolean(await db.user.findUnique({ where: { email: inv.email }, select: { id: true } })) });
});

// Accept: a signed-in person with the invited email joins right away; a new person sets their name and password.
export const POST = route(async (req: Request, { params }: P) => {
  if (!limit(`invite:${clientIp(req)}`, 20, 3600_000)) throw new HttpError(429, "Too many attempts. Try again later.");
  const inv = await load((await params).token);
  const ctx = await getCtx();
  let user = ctx.user;
  if (user && user.email !== inv.email) throw new HttpError(403, `This invitation is for ${inv.email}. Sign out and open the link again.`);
  if (!user) {
    if (await db.user.findUnique({ where: { email: inv.email } })) throw new HttpError(409, "You already have an OENOD account. Sign in first, then open the invitation link again.");
    const d = await body(req, z.object({ name: z.string().trim().min(2).max(100), password: z.string().min(10).max(200) }));
    await checkPassword(d.password, { email: inv.email, name: d.name });
    user = await db.user.create({ data: { email: inv.email, name: d.name, passwordHash: await hashPassword(d.password), passwordChangedAt: new Date(), emailVerifiedAt: new Date(), locale: await requestLocale(), lastSeenAt: new Date() } });
  }
  const m = await db.membership.upsert({ where: { userId_orgId: { userId: user.id, orgId: inv.orgId } }, create: { userId: user.id, orgId: inv.orgId, role: inv.role }, update: {} });
  // Link to the employee record HR already created for this email, or create one.
  const emp = await db.employee.findFirst({ where: { orgId: inv.orgId, email: inv.email, membershipId: null } });
  if (emp) await db.employee.update({ where: { id: emp.id }, data: { membershipId: m.id } });
  else if (!(await db.employee.findFirst({ where: { membershipId: m.id } }))) {
    const [first, ...rest] = user.name.split(" ");
    await db.employee.create({ data: { orgId: inv.orgId, membershipId: m.id, firstName: first ?? user.name, lastName: rest.join(" ") || "-", email: user.email, status: "ONBOARDING" } });
  }
  await db.invite.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
  await audit({ user, orgId: inv.orgId, actor: "user" }, "member.joined", "membership", m.id);
  const session = ctx.user ? null : await startSession(user, req);
  return ok({ orgId: inv.orgId, token: session?.token, redirect: inv.role === "EMPLOYEE" ? "/me" : "/app" });
});
