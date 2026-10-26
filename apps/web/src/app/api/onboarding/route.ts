import { db } from "@/lib/db";
import { ok, requireOrg, route } from "@/lib/http";
import { audit } from "@/lib/audit";
import { orgSecurity } from "@/lib/security";

// The smart setup checklist on the welcome screen. Each step is worked out from real data.
export const GET = route(async () => {
  const ctx = await requireOrg();
  const orgId = ctx.org.id;
  const [locations, geofenced, members, invites, employees, shifts, payRuns, integrations, owners2fa, ownersTotal, products, contacts, sessionsMobile] = await Promise.all([
    db.location.count({ where: { orgId } }),
    db.location.count({ where: { orgId, lat: { not: null } } }),
    db.membership.count({ where: { orgId } }),
    db.invite.count({ where: { orgId } }),
    db.employee.count({ where: { orgId } }),
    db.shift.count({ where: { orgId, status: "PUBLISHED" } }),
    db.payRun.count({ where: { orgId } }),
    db.integration.count({ where: { orgId, status: "CONNECTED" } }),
    db.membership.count({ where: { orgId, role: { in: ["OWNER", "ADMIN"] }, user: { totpEnabledAt: { not: null } } } }),
    db.membership.count({ where: { orgId, role: { in: ["OWNER", "ADMIN"] } } }),
    db.product.count({ where: { orgId } }),
    db.contact.count({ where: { orgId } }),
    db.session.count({ where: { user: { memberships: { some: { orgId } } }, client: { in: ["ios", "android"] } } }),
  ]);
  const org = ctx.org;
  const sec = orgSecurity(org);
  const steps = [
    { key: "profile", title: "Add your logo and company details", why: "Your logo appears on invoices, certificates, job posts and your public profile.", done: !!org.logoUrl && !!(org as any).phone, href: "/app/settings/company", minutes: 2 },
    { key: "location", title: "Add your location and clock-in zone", why: "Staff can only clock in when they are on site.", done: geofenced > 0, partial: locations > 0, href: "/app/settings/locations", minutes: 2 },
    { key: "team", title: "Invite your team", why: "Managers and staff get their own sign-in with only the parts you allow.", done: members > 1 || invites > 0, href: "/app/settings/team", minutes: 3 },
    { key: "employees", title: "Add employees", why: "Needed for scheduling, time, payroll and the employee app.", done: employees > 0, href: "/app/people", minutes: 5 },
    { key: "schedule", title: "Publish your first schedule", why: "Staff see shifts on their phones and get reminders.", done: shifts > 0, href: "/app/scheduling", minutes: 5 },
    { key: "payroll", title: "Set up payroll", why: "Hours from time and attendance flow straight into pay runs.", done: payRuns > 0, href: "/payroll", minutes: 10 },
    { key: "catalog", title: "Add products or services", why: "Used by POS, quotes, invoices and your online booking.", done: products > 0, href: "/app/inventory", minutes: 5 },
    { key: "customers", title: "Import your customers", why: "The AI follows up on leads and overdue invoices for you.", done: contacts > 0, href: "/app/crm", minutes: 3 },
    { key: "connect", title: "Connect your apps", why: "Bring in Google, Microsoft, accounting, payments and more.", done: integrations > 0, href: "/app/integrations", minutes: 3 },
    { key: "verify", title: "Get the blue verified badge", why: "Verified companies get more applicants and more trust on ads.", done: org.verificationStatus === "VERIFIED", partial: org.verificationStatus === "PENDING", href: "/app/settings/verification", minutes: 4 },
    { key: "security", title: "Turn on two-step sign-in", why: "Protects your company even if a password leaks.", done: ownersTotal > 0 && owners2fa === ownersTotal, partial: owners2fa > 0, href: "/app/account/security", minutes: 2, extra: { required: sec.require2fa } },
    { key: "mobile", title: "Get the mobile app", why: "Clock in, see shifts, approve requests and track vehicles on the go.", done: sessionsMobile > 0, href: "/download", minutes: 1 },
  ];
  const done = steps.filter((s) => s.done).length;
  return ok({ done, total: steps.length, percent: Math.round((done / steps.length) * 100), finished: org.onboardingDone, next: steps.find((s) => !s.done) ?? null, steps });
});

// Dismiss the checklist (or bring it back with { done: false }).
export const POST = route(async (req: Request) => {
  const ctx = await requireOrg();
  const { done = true } = (await req.json().catch(() => ({}))) as { done?: boolean };
  await db.organization.update({ where: { id: ctx.org.id }, data: { onboardingDone: !!done } });
  await audit(ctx, done ? "onboarding.finished" : "onboarding.reopened", "organization", ctx.org.id);
  return ok({ finished: !!done });
});
