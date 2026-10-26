import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { isManager, moduleLevels, type Grants } from "@/lib/rbac";
import { token } from "@/lib/crypto";
import { emailLayout, sendEmail } from "@/lib/messaging";
import { audit } from "@/lib/audit";
import { APP_URL } from "@/lib/env";

const ROLES = ["ADMIN", "MANAGER", "FINANCE", "ACCOUNTANT", "EMPLOYEE"] as const;

// Everyone on the team with their role, per-module access and two-step status, plus pending invites.
export const GET = route(async () => {
  const ctx = await requireOrg("settings");
  const [members, invites] = await Promise.all([
    db.membership.findMany({ where: { orgId: ctx.org.id }, orderBy: { createdAt: "asc" }, include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, lastSeenAt: true, totpEnabledAt: true } }, employee: { select: { id: true, jobTitle: true, status: true } } } }),
    db.invite.findMany({ where: { orgId: ctx.org.id, acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
  ]);
  return ok({
    seats: { used: members.length, included: ctx.org.planKey ? (await db.plan.findUnique({ where: { key: ctx.org.planKey } }))?.seats ?? null : null },
    members: members.map((m) => ({ id: m.id, role: m.role, title: m.title, grants: m.grants ?? {}, access: moduleLevels(m.role, m.grants as Grants | null), user: { ...m.user, totpEnabledAt: undefined, twoFactor: Boolean(m.user.totpEnabledAt) }, employee: m.employee })),
    invites: invites.map(({ token: _t, ...i }) => i),
  });
});

// Invite people by email. They get a link to join; no password is ever sent by email.
export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("settings", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only owners, admins and managers can invite people.");
  const d = await body(req, z.object({ invites: z.array(z.object({ email: z.string().trim().toLowerCase().email(), role: z.enum(ROLES).default("EMPLOYEE") })).min(1).max(100), message: z.string().max(500).optional() }));
  if (ctx.role === "MANAGER" && d.invites.some((i) => i.role !== "EMPLOYEE")) throw new HttpError(403, "Managers can invite employees. Ask an admin to add other roles.");
  const created = [];
  for (const inv of d.invites) {
    const exists = await db.membership.findFirst({ where: { orgId: ctx.org.id, user: { email: inv.email } } });
    if (exists) continue;
    const t = token(24);
    await db.invite.deleteMany({ where: { orgId: ctx.org.id, email: inv.email, acceptedAt: null } });
    const row = await db.invite.create({ data: { orgId: ctx.org.id, email: inv.email, role: inv.role, token: t, expiresAt: new Date(Date.now() + 14 * 864e5) } });
    created.push({ id: row.id, email: row.email, role: row.role });
    await sendEmail({
      to: inv.email, scope: "ORG", orgId: ctx.org.id, idempotencyKey: `invite:${row.id}`,
      subject: `${ctx.user?.name ?? ctx.org.name} invited you to ${ctx.org.name} on OENOD`,
      html: emailLayout({ brand: ctx.org.name, brandLogo: ctx.org.logoUrl, locale: ctx.org.locale, title: `Join ${ctx.org.name}`, body: `${ctx.user?.name ?? "Your team"} invited you to join ${ctx.org.name} on OENOD, where you can see your schedule, clock in, view your pay and more.${d.message ? `\n\n"${d.message}"` : ""}\n\nThis invitation is valid for 14 days.`, ctaLabel: "Accept invitation", ctaUrl: `${APP_URL}/invite/${t}` }),
    }).catch(() => {});
  }
  await audit(ctx, "member.invited", undefined, undefined, { count: created.length });
  return ok({ invited: created }, 201);
});
