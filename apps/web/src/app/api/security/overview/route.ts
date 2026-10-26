import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { orgSecurity } from "@/lib/security";

// Security centre for owners: a score, what's protecting the company, and what to fix next.
export const GET = route(async () => {
  const ctx = await requireOrg();
  if (!["OWNER", "ADMIN"].includes(ctx.role)) throw new HttpError(403, "Only the owner or an admin can see the security centre.");
  const policy = orgSecurity(ctx.org);
  const since = new Date(Date.now() - 30 * 864e5);
  const members = await db.membership.findMany({ where: { orgId: ctx.org.id }, include: { user: { select: { id: true, name: true, email: true, totpEnabledAt: true, lastSeenAt: true, lockedUntil: true, passwordChangedAt: true } } } });
  const userIds = members.map((m) => m.userId);
  const [failed, signins, keys, webhooks, connections, risky, sessions] = await Promise.all([
    db.auditLog.count({ where: { userId: { in: userIds }, action: { in: ["auth.failed", "auth.2fa_failed"] }, createdAt: { gte: since } } }),
    db.auditLog.findMany({ where: { userId: { in: userIds }, action: "auth.signin", createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 20, select: { userId: true, data: true, createdAt: true } }),
    db.apiKey.findMany({ where: { orgId: ctx.org.id, revokedAt: null }, select: { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, createdAt: true } }),
    db.webhook.count({ where: { orgId: ctx.org.id } }),
    db.integration.count({ where: { orgId: ctx.org.id } }),
    db.auditLog.findMany({ where: { orgId: ctx.org.id, createdAt: { gte: since }, OR: [{ action: { startsWith: "security." } }, { action: { startsWith: "member." } }, { action: { contains: "apikey" } }, { action: { contains: "payroll" } }, { action: { contains: "role" } }] }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.session.count({ where: { userId: { in: userIds }, revokedAt: null, expiresAt: { gt: new Date() } } }),
  ]);

  const without2fa = members.filter((m) => !m.user.totpEnabledAt);
  const adminsWithout2fa = without2fa.filter((m) => ["OWNER", "ADMIN", "FINANCE"].includes(m.role));
  const staleKeys = keys.filter((k) => !k.lastUsedAt || k.lastUsedAt < new Date(Date.now() - 90 * 864e5));
  const fullKeys = keys.filter((k) => !k.scopes.length || k.scopes.includes("*"));
  const inactive = members.filter((m) => m.role !== "OWNER" && (!m.user.lastSeenAt || m.user.lastSeenAt < new Date(Date.now() - 60 * 864e5)));

  const recs: { level: "high" | "medium" | "low"; title: string; detail: string; action?: string }[] = [];
  if (adminsWithout2fa.length) recs.push({ level: "high", title: "Turn on two-step sign-in for admins", detail: `${adminsWithout2fa.map((m) => m.user.name).join(", ")} can see money or people data without a second step.`, action: "/app/settings/security" });
  if (!policy.require2fa) recs.push({ level: "medium", title: "Require two-step sign-in for everyone", detail: `${without2fa.length} of ${members.length} people sign in with a password only.`, action: "/app/settings/security" });
  if (fullKeys.length) recs.push({ level: "medium", title: "Limit what your API keys can do", detail: `${fullKeys.length} key(s) have full access. Give each one only the modules it needs.`, action: "/app/settings/developers" });
  if (staleKeys.length) recs.push({ level: "low", title: "Remove unused API keys", detail: `${staleKeys.length} key(s) haven't been used in 90 days.`, action: "/app/settings/developers" });
  if (inactive.length) recs.push({ level: "low", title: "Review inactive accounts", detail: `${inactive.length} people haven't signed in for 60 days. Remove access for anyone who has left.`, action: "/app/settings/team" });
  if (failed > 20) recs.push({ level: "medium", title: "Lots of failed sign-ins", detail: `${failed} failed attempts in 30 days. Consider requiring two-step sign-in or limiting access to your office network.`, action: "/app/settings/security" });

  const score = Math.max(0, Math.min(100, 100
    - (adminsWithout2fa.length ? 25 : 0)
    - Math.round((without2fa.length / Math.max(1, members.length)) * 20)
    - (fullKeys.length ? 10 : 0) - (staleKeys.length ? 5 : 0) - (inactive.length ? 5 : 0) - (failed > 20 ? 10 : 0)
    + (policy.require2fa ? 5 : 0) + (policy.ipAllowlist?.length ? 5 : 0)));

  return ok({
    score, grade: score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 55 ? "Fair" : "Needs attention",
    policy, recommendations: recs,
    protections: [
      { name: "Encrypted connections (HTTPS) and secure cookies", on: true },
      { name: "Passwords hashed with bcrypt, checked against known breaches", on: true },
      { name: "Account lockout after repeated wrong passwords", on: true },
      { name: "Email alert on sign-in from a new device", on: true },
      { name: "Connected app keys and tokens encrypted at rest (AES-256-GCM)", on: true },
      { name: "Every change recorded in the audit log", on: true },
      { name: "Two-step sign-in required for everyone", on: Boolean(policy.require2fa) },
      { name: "Access limited to approved networks", on: Boolean(policy.ipAllowlist?.length) },
    ],
    people: members.map((m) => ({ userId: m.userId, name: m.user.name, email: m.user.email, role: m.role, twoFactor: Boolean(m.user.totpEnabledAt), lastSeenAt: m.user.lastSeenAt, locked: Boolean(m.user.lockedUntil && m.user.lockedUntil > new Date()) })),
    stats: { failedSignins30d: failed, activeSessions: sessions, apiKeys: keys.length, webhooks, connectedApps: connections },
    recentSignins: signins.map((s) => ({ ...s, name: members.find((m) => m.userId === s.userId)?.user.name })),
    recentSensitiveChanges: risky,
    apiKeys: keys,
  });
});
