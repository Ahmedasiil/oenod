import { db } from "./db";
import { HttpError } from "./http";
import { decideVerification } from "./verification";
import { sendGrowthCampaign } from "./growth";
import { clearPlatformCache } from "./platform";
import { emailLayout, sendEmail } from "./messaging";
import { notify } from "./audit";
import { APP_URL } from "./env";

export async function adminAudit(userId: string | null, action: string, entity?: string, entityId?: string, data?: unknown) {
  await db.auditLog.create({ data: { userId, actor: "super-admin", action, entity, entityId, data: data === undefined ? undefined : JSON.parse(JSON.stringify(data)) } });
}

/** The numbers on the super admin home. */
export async function platformStats() {
  const now = Date.now(), d30 = new Date(now - 30 * 864e5), d60 = new Date(now - 60 * 864e5);
  const [orgs, byStatus, plans, signups30, signupsPrev, users, active7, canceled30, adSpend, academy, queue, aiUsage, msgs, incidents, leads, jobs, apps] = await Promise.all([
    db.organization.count(),
    db.organization.groupBy({ by: ["subscriptionStatus"], _count: true }),
    db.organization.groupBy({ by: ["planKey", "billingInterval"], where: { subscriptionStatus: "ACTIVE" }, _count: true }),
    db.organization.findMany({ where: { createdAt: { gte: d30 } }, select: { createdAt: true } }),
    db.organization.count({ where: { createdAt: { gte: d60, lt: d30 } } }),
    db.user.count(),
    db.user.count({ where: { lastSeenAt: { gte: new Date(now - 7 * 864e5) } } }),
    db.auditLog.count({ where: { action: "subscription.canceled", createdAt: { gte: d30 } } }),
    db.adLedger.aggregate({ where: { kind: "TOPUP", createdAt: { gte: d30 } }, _sum: { amountCents: true } }),
    db.coursePurchase.aggregate({ where: { status: "PAID", paidAt: { gte: d30 } }, _sum: { amountCents: true }, _count: true }),
    db.adminAction.count({ where: { status: "PROPOSED" } }),
    db.usageRecord.aggregate({ where: { metric: "AI_TOKENS", createdAt: { gte: d30 } }, _sum: { quantity: true } }),
    db.messageLog.groupBy({ by: ["channel", "status"], where: { createdAt: { gte: d30 } }, _count: true }),
    db.statusIncident.count({ where: { resolvedAt: null } }),
    db.lead.count({ where: { createdAt: { gte: d30 } } }),
    db.jobPosting.count({ where: { status: "OPEN" } }),
    db.jobApplication.count({ where: { createdAt: { gte: d30 } } }),
  ]);
  const planRows = await db.plan.findMany();
  const mrrCents = plans.reduce((s, p) => {
    const plan = planRows.find((x) => x.key === p.planKey);
    if (!plan) return s;
    return s + p._count * (p.billingInterval === "year" ? Math.round(plan.priceYearly / 12) : plan.priceMonthly);
  }, 0);
  const daily: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) daily[new Date(now - i * 864e5).toISOString().slice(0, 10)] = 0;
  for (const s of signups30) { const k = s.createdAt.toISOString().slice(0, 10); if (k in daily) daily[k]++; }
  const status = Object.fromEntries(byStatus.map((s) => [s.subscriptionStatus, s._count]));
  return {
    mrrCents, arrCents: mrrCents * 12, orgs, users, active7, status,
    signups30: signups30.length, signupsPrev30: signupsPrev, signupsDaily: Object.entries(daily).map(([date, count]) => ({ date, count })),
    churn30: canceled30, churnRate: (status.ACTIVE ?? 0) ? Math.round((canceled30 / ((status.ACTIVE ?? 0) + canceled30)) * 1000) / 10 : 0,
    adRevenue30Cents: adSpend._sum.amountCents ?? 0, academyRevenue30Cents: academy._sum.amountCents ?? 0, academySales30: academy._count,
    approvalsWaiting: queue, aiTokens30: aiUsage._sum.quantity ?? 0, messages30: msgs.map((m) => ({ channel: m.channel, status: m.status, count: m._count })),
    openIncidents: incidents, leads30: leads, openJobs: jobs, applications30: apps,
    plans: planRows.map((p) => ({ key: p.key, name: p.name, active: plans.filter((x) => x.planKey === p.key).reduce((s, x) => s + x._count, 0) })),
  };
}

type Payload = Record<string, any>;

/** Run an approved admin action. Every branch is idempotent-safe enough to retry. */
export async function executeAdminAction(id: string, by: { id: string; name: string }) {
  const a = await db.adminAction.findUnique({ where: { id } });
  if (!a) throw new HttpError(404, "Action not found.");
  if (a.status !== "PROPOSED" && a.status !== "FAILED") throw new HttpError(409, `This action is already ${a.status.toLowerCase()}.`);
  const p = a.payload as Payload;
  await db.adminAction.update({ where: { id }, data: { status: "APPROVED", decidedBy: by.name, decidedAt: new Date() } });
  try {
    let result: unknown = { ok: true };
    switch (a.kind) {
      case "approve_verification": await decideVerification(p.requestId, true, by.name, p.note); break;
      case "reject_verification": await decideVerification(p.requestId, false, by.name, p.note ?? (p.risks ?? []).join("; ")); break;
      case "approve_ad": {
        const c = await db.adCampaign.update({ where: { id: p.campaignId }, data: { status: "ACTIVE", reviewNote: null } });
        await notify(c.orgId, `Your ad "${c.headline}" is live`, { link: "/app/ads", level: "success" });
        break;
      }
      case "reject_ad": {
        const c = await db.adCampaign.update({ where: { id: p.campaignId }, data: { status: "REJECTED", reviewNote: p.note ?? (p.issues ?? []).join("; ") } });
        await notify(c.orgId, `Your ad "${c.headline}" needs changes`, { body: c.reviewNote ?? undefined, link: "/app/ads", level: "warning" });
        break;
      }
      case "send_growth_campaign": result = await sendGrowthCampaign(p.campaignId); break;
      case "schedule_growth_campaign": await db.growthCampaign.update({ where: { id: p.campaignId }, data: { status: "SCHEDULED", scheduledAt: new Date(p.scheduledAt) } }); break;
      case "set_maintenance": {
        await db.platformControl.upsert({ where: { surface: p.surface }, create: { surface: p.surface, mode: p.mode, title: p.title ?? undefined, message: p.message ?? undefined, endsAt: p.endsAt ? new Date(p.endsAt) : null, updatedBy: by.name }, update: { mode: p.mode, ...(p.title ? { title: p.title } : {}), ...(p.message ? { message: p.message } : {}), endsAt: p.endsAt ? new Date(p.endsAt) : null, updatedBy: by.name } });
        clearPlatformCache();
        break;
      }
      case "publish_banner": {
        await db.platformBanner.updateMany({ data: { active: false } });
        result = await db.platformBanner.create({ data: { message: p.message, level: p.level ?? "info", link: p.link ?? null } });
        break;
      }
      case "extend_trial": {
        const o = await db.organization.findUniqueOrThrow({ where: { id: p.orgId } });
        const from = o.trialEndsAt && o.trialEndsAt > new Date() ? o.trialEndsAt : new Date();
        await db.organization.update({ where: { id: o.id }, data: { trialEndsAt: new Date(from.getTime() + Number(p.days) * 864e5), subscriptionStatus: o.subscriptionStatus === "CANCELED" ? "TRIALING" : o.subscriptionStatus } });
        await notify(o.id, `Your trial was extended by ${p.days} days`, { level: "success" });
        break;
      }
      case "update_plan": await db.plan.update({ where: { key: p.planKey }, data: { ...(p.priceMonthly !== undefined ? { priceMonthly: p.priceMonthly, stripePriceMonthly: null } : {}), ...(p.priceYearly !== undefined ? { priceYearly: p.priceYearly, stripePriceYearly: null } : {}), ...(p.features ? { features: p.features } : {}), ...(p.tagline ? { tagline: p.tagline } : {}) } }); break;
      case "set_feature_flag": await db.featureFlag.upsert({ where: { key: p.key }, create: { key: p.key, enabled: p.enabled, rolloutPercent: p.rolloutPercent ?? 100, description: p.description }, update: { enabled: p.enabled, ...(p.rolloutPercent !== undefined ? { rolloutPercent: p.rolloutPercent } : {}) } }); break;
      case "status_incident": result = await db.statusIncident.create({ data: { title: p.title, message: p.message, components: p.components ?? [], status: p.status ?? "INVESTIGATING" } }); break;
      case "publish_plugin": await db.plugin.update({ where: { id: p.pluginId }, data: { status: "PUBLISHED", reviewNote: null, verified: Boolean(p.verified) } }); break;
      case "reject_plugin": await db.plugin.update({ where: { id: p.pluginId }, data: { status: "REJECTED", reviewNote: p.note ?? "Doesn't meet the plugin guidelines." } }); break;
      case "update_course": await db.course.update({ where: { id: p.courseId }, data: { ...(p.priceCents !== undefined ? { priceCents: p.priceCents } : {}), ...(p.compareAtCents !== undefined ? { compareAtCents: p.compareAtCents } : {}), ...(p.featured !== undefined ? { featured: p.featured } : {}), ...(p.published !== undefined ? { published: p.published } : {}) } }); break;
      case "email_customer": {
        const owners = await db.membership.findMany({ where: { orgId: p.orgId, role: "OWNER" }, include: { user: true } });
        for (const o of owners) await sendEmail({ to: o.user.email, scope: "PLATFORM", idempotencyKey: `adminmail:${a.id}:${o.userId}`, subject: p.subject, html: emailLayout({ title: p.subject, body: p.body, ctaLabel: p.ctaLabel, ctaUrl: p.ctaUrl ?? `${APP_URL}/app` }) });
        break;
      }
      default: throw new HttpError(400, `Unknown action type ${a.kind}.`);
    }
    await db.adminAction.update({ where: { id }, data: { status: "DONE", result: JSON.parse(JSON.stringify(result ?? { ok: true })) } });
    await adminAudit(by.id, `admin_action.${a.kind}`, "admin_action", a.id, p);
    return { ok: true };
  } catch (e) {
    await db.adminAction.update({ where: { id }, data: { status: "FAILED", error: e instanceof Error ? e.message : String(e) } });
    throw e;
  }
}
