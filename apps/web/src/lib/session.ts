import { db } from "./db";
import { getCtx } from "./auth";
import { allowedModules, moduleLevels, type Grants } from "./rbac";
import { pausedModules } from "./platform";

/** Everything the app shell needs about the signed-in person. Shared by /api/auth/me and the /app layout. */
export async function loadSession() {
  const ctx = await getCtx();
  if (!ctx.user) return null;
  const [memberships, employee, unread, paused] = await Promise.all([
    db.membership.findMany({ where: { userId: ctx.user.id }, include: { org: { select: { id: true, name: true, slug: true, logoUrl: true, industry: true, currency: true, verificationStatus: true } } } }),
    ctx.membership ? db.employee.findFirst({ where: { membershipId: ctx.membership.id } }) : null,
    ctx.org ? db.notification.count({ where: { orgId: ctx.org.id, readAt: null, ...(ctx.role === "EMPLOYEE" ? { userId: ctx.user.id } : { OR: [{ userId: null }, { userId: ctx.user.id }] }) } }).catch(() => 0) : 0,
    pausedModules().then((s) => [...s]).catch(() => [] as string[]),
  ]);
  const grants = ctx.membership?.grants as Grants | null;
  return {
    user: { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email, phone: ctx.user.phone, isSuperAdmin: ctx.user.isSuperAdmin, avatarUrl: ctx.user.avatarUrl, locale: ctx.user.locale, twoFactor: !!ctx.user.totpEnabledAt },
    org: ctx.org ? { id: ctx.org.id, name: ctx.org.name, slug: ctx.org.slug, logoUrl: ctx.org.logoUrl, currency: ctx.org.currency, timezone: ctx.org.timezone, plan: ctx.org.planKey, status: ctx.org.subscriptionStatus, trialEndsAt: ctx.org.trialEndsAt, aiPaused: ctx.org.aiPaused, aiSimulation: ctx.org.aiSimulation, verificationStatus: ctx.org.verificationStatus, onboardingDone: ctx.org.onboardingDone, brandColor: ctx.org.brandColor } : null,
    role: ctx.role,
    modules: ctx.role ? allowedModules(ctx.role, grants).filter((m) => m === "me" || m === "billing" || ctx.org!.modules.includes(m)) : [],
    access: ctx.role ? moduleLevels(ctx.role, grants) : {},
    pausedModules: paused,
    employee: employee ? { id: employee.id, name: `${employee.firstName} ${employee.lastName}`, jobTitle: employee.jobTitle, shareLiveLocation: employee.shareLiveLocation } : null,
    workspaces: memberships.map((m) => ({ ...m.org, role: m.role })),
    unread,
  };
}
export type Session = NonNullable<Awaited<ReturnType<typeof loadSession>>>;
