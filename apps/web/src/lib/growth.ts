import { z } from "zod";
import { db } from "./db";
import { emailLayout, personalize, sendEmail, sendSms, unsubscribeUrl } from "./messaging";
import { APP_URL } from "./env";

export const AUDIENCES: { key: string; name: string; description: string }[] = [
  { key: "ALL_CONSENTED", name: "Everyone who said yes", description: "All users and leads who agreed to hear from OENOD" },
  { key: "LEADS", name: "Leads not yet customers", description: "Newsletter, demo and event sign-ups" },
  { key: "TRIALS", name: "Companies on trial", description: "Owners and admins of trialing workspaces" },
  { key: "TRIAL_ENDING", name: "Trial ends in 3 days", description: "Help them pick a plan" },
  { key: "INACTIVE_14D", name: "Inactive 14+ days", description: "Users who haven't signed in for two weeks" },
  { key: "CANCELED", name: "Canceled customers", description: "Win back former customers" },
  { key: "CUSTOMERS", name: "Paying customers", description: "Owners of active subscriptions" },
  { key: "JOB_SEEKERS", name: "Job seekers", description: "People with job alerts or who applied and agreed to updates" },
  { key: "LEARNERS", name: "Academy learners", description: "People enrolled in courses" },
];

export interface Recipient { kind: "user" | "lead" | "jobalert"; id: string; email?: string | null; phone?: string | null; name?: string | null; company?: string | null }

/**
 * Resolve an audience to recipients who have given consent for the channel.
 * Anyone without consent, or who unsubscribed, is never included.
 */
export async function resolveAudience(audience: string, channel: "EMAIL" | "SMS"): Promise<Recipient[]> {
  const consent = channel === "EMAIL" ? { marketingEmailConsent: true } : { marketingSmsConsent: true, phone: { not: null } };
  const base = { ...consent, unsubscribedAt: null };
  const users = async (where: object) =>
    (await db.user.findMany({ where: { ...base, ...where }, include: { memberships: { include: { org: true }, take: 1 } } }))
      .map((u) => ({ kind: "user" as const, id: u.id, email: u.email, phone: u.phone, name: u.name, company: u.memberships[0]?.org.name }));
  const now = Date.now();
  switch (audience) {
    case "ALL_CONSENTED": {
      const leads = await db.lead.findMany({ where: { unsubscribedAt: null, ...(channel === "EMAIL" ? { emailConsent: true } : { smsConsent: true, phone: { not: null } }) } });
      return dedupe([...(await users({})), ...leads.map((l) => ({ kind: "lead" as const, id: l.id, email: l.email, phone: l.phone, name: l.name, company: l.company }))]);
    }
    case "LEADS": {
      const leads = await db.lead.findMany({ where: { convertedUserId: null, unsubscribedAt: null, ...(channel === "EMAIL" ? { emailConsent: true } : { smsConsent: true, phone: { not: null } }) } });
      return leads.map((l) => ({ kind: "lead" as const, id: l.id, email: l.email, phone: l.phone, name: l.name, company: l.company }));
    }
    case "TRIALS": return users({ memberships: { some: { role: { in: ["OWNER", "ADMIN"] }, org: { subscriptionStatus: "TRIALING" } } } });
    case "TRIAL_ENDING": return users({ memberships: { some: { role: "OWNER", org: { subscriptionStatus: "TRIALING", trialEndsAt: { gte: new Date(now), lte: new Date(now + 3 * 864e5) } } } } });
    case "INACTIVE_14D": return users({ lastSeenAt: { lt: new Date(now - 14 * 864e5) } });
    case "CANCELED": return users({ memberships: { some: { role: "OWNER", org: { subscriptionStatus: "CANCELED" } } } });
    case "CUSTOMERS": return users({ memberships: { some: { role: { in: ["OWNER", "ADMIN"] }, org: { subscriptionStatus: "ACTIVE" } } } });
    case "LEARNERS": return users({ enrollments: { some: {} } });
    case "JOB_SEEKERS": {
      if (channel !== "EMAIL") return [];
      const alerts = await db.jobAlert.findMany({ where: { unsubscribedAt: null } });
      return dedupe([...(await users({ applications: { some: { marketingConsent: true } } })), ...alerts.map((a) => ({ kind: "jobalert" as const, id: a.id, email: a.email }))]);
    }
  }
  return [];
}

function dedupe(list: Recipient[]) {
  const seen = new Set<string>();
  return list.filter((r) => {
    const k = (r.email ?? r.phone ?? r.id).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function sendGrowthCampaign(id: string) {
  const c = await db.growthCampaign.findUnique({ where: { id } });
  if (!c || c.status === "SENT") return c;
  await db.growthCampaign.update({ where: { id }, data: { status: "SENDING" } });
  const channel = c.channel === "SMS" ? "SMS" : "EMAIL";
  const recipients = await resolveAudience(c.audience, channel);
  let sent = 0, skipped = 0;
  for (const r of recipients) {
    const vars = { first_name: r.name?.split(" ")[0] ?? "there", name: r.name ?? "", company: r.company ?? "your business" };
    if (channel === "EMAIL" && r.email) {
      const unsub = await unsubscribeUrl(r.kind, r.id);
      const res = await sendEmail({
        to: r.email, campaignId: c.id, idempotencyKey: `gc:${c.id}:${r.email}`, unsubscribe: unsub,
        subject: personalize(c.subject ?? c.name, vars),
        html: emailLayout({ title: personalize(c.subject ?? c.name, vars), body: personalize(c.content, vars), ctaLabel: c.ctaLabel ?? undefined, ctaUrl: c.ctaUrl ? `${c.ctaUrl}${c.ctaUrl.includes("?") ? "&" : "?"}utm_source=oenod&utm_medium=email&utm_campaign=${c.id}` : undefined, unsubscribe: unsub }),
      });
      res.ok && !res.skipped ? sent++ : skipped++;
    } else if (channel === "SMS" && r.phone) {
      const res = await sendSms({ to: r.phone, campaignId: c.id, idempotencyKey: `gc:${c.id}:${r.phone}`, body: personalize(c.content, vars) });
      res.ok && !res.skipped ? sent++ : skipped++;
    } else skipped++;
  }
  return db.growthCampaign.update({ where: { id }, data: { status: "SENT", sentAt: new Date(), sent: { increment: sent }, skipped: { increment: skipped } } });
}

// Lifecycle messages. Transactional ones (about the person's own account) go to
// account owners; promotional ones (win-back) only go to people who gave consent.
const TRANSACTIONAL = new Set(["SIGNUP", "TRIAL_DAY_3", "TRIAL_ENDING", "PAYMENT_FAILED"]);

export const DEFAULT_AUTOMATIONS = [
  { key: "welcome", name: "Welcome", trigger: "SIGNUP", delayHours: 0, subject: "Welcome to OENOD, {{first_name}}", content: "Your workspace for {{company}} is ready.\n\nStart with three quick wins: invite your team, connect Google Business Profile, and ask the AI Business Manager \"What needs my attention today?\"", ctaLabel: "Open my dashboard", ctaUrl: `${APP_URL}/app` },
  { key: "trial_day3", name: "Trial day 3 tips", trigger: "TRIAL_DAY_3", delayHours: 72, subject: "3 things OENOD can do for {{company}} this week", content: "Most teams save hours in their first week by:\n\n1. Building next week's schedule with AI.\n2. Turning on automatic invoice reminders.\n3. Adding a monitor for low stock or late jobs.\n\nEach takes about two minutes.", ctaLabel: "Try one now", ctaUrl: `${APP_URL}/app/ai` },
  { key: "trial_ending", name: "Trial ending", trigger: "TRIAL_ENDING", delayHours: 0, subject: "Your OENOD trial ends in 3 days", content: "Keep everything you've set up by choosing a plan. Your data stays exactly as it is.", ctaLabel: "Choose a plan", ctaUrl: `${APP_URL}/app/settings/billing` },
  { key: "payment_failed", name: "Payment failed", trigger: "PAYMENT_FAILED", delayHours: 0, subject: "We couldn't process your OENOD payment", content: "Please update your card so your team keeps uninterrupted access.", ctaLabel: "Update payment", ctaUrl: `${APP_URL}/app/settings/billing` },
  { key: "inactive_7d", name: "We miss you (7 days)", trigger: "INACTIVE_7D", delayHours: 0, subject: "{{first_name}}, here's what happened at {{company}} while you were away", content: "Your AI Business Manager kept watching. Sign in to see your briefing, approvals and alerts.", ctaLabel: "See my briefing", ctaUrl: `${APP_URL}/app` },
  { key: "winback_30d", name: "Win back (30 days)", trigger: "CANCELED", delayHours: 720, subject: "Come back to OENOD: 30% off for 3 months", content: "We've shipped a lot since you left: fleet GPS, live map, and smarter AI scheduling. Restart today and get 30% off for three months.", ctaLabel: "Restart my workspace", ctaUrl: `${APP_URL}/pricing?offer=COMEBACK30` },
];

export async function runLifecycle() {
  const autos = await db.growthAutomation.findMany({ where: { enabled: true } });
  let total = 0;
  const now = Date.now();
  for (const a of autos) {
    let targets: { id: string; email: string; name: string; phone: string | null; company?: string; consent: boolean; unsub: boolean }[] = [];
    const owners = async (orgWhere: object) =>
      (await db.membership.findMany({ where: { role: "OWNER", org: orgWhere }, include: { user: true, org: true } }))
        .map((m) => ({ id: m.user.id, email: m.user.email, name: m.user.name, phone: m.user.phone, company: m.org.name, consent: m.user.marketingEmailConsent, unsub: Boolean(m.user.unsubscribedAt) }));
    switch (a.trigger) {
      case "SIGNUP": targets = await owners({ createdAt: { gte: new Date(now - 48 * 36e5), lte: new Date(now - a.delayHours * 36e5) } }); break;
      case "TRIAL_DAY_3": targets = await owners({ subscriptionStatus: "TRIALING", createdAt: { gte: new Date(now - (a.delayHours + 48) * 36e5), lte: new Date(now - a.delayHours * 36e5) } }); break;
      case "TRIAL_ENDING": targets = await owners({ subscriptionStatus: "TRIALING", trialEndsAt: { gte: new Date(now), lte: new Date(now + 3 * 864e5) } }); break;
      case "PAYMENT_FAILED": targets = await owners({ subscriptionStatus: "PAST_DUE" }); break;
      case "CANCELED": targets = await owners({ subscriptionStatus: "CANCELED", updatedAt: { lte: new Date(now - a.delayHours * 36e5) } }); break;
      case "INACTIVE_7D": {
        const users = await db.user.findMany({ where: { lastSeenAt: { lt: new Date(now - 7 * 864e5), gte: new Date(now - 9 * 864e5) } }, include: { memberships: { include: { org: true }, take: 1 } } });
        targets = users.map((u) => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, company: u.memberships[0]?.org.name, consent: u.marketingEmailConsent, unsub: Boolean(u.unsubscribedAt) }));
        break;
      }
    }
    for (const t of targets) {
      if (!TRANSACTIONAL.has(a.trigger) && (!t.consent || t.unsub)) continue;
      const vars = { first_name: t.name.split(" ")[0], company: t.company ?? "your business" };
      const unsub = TRANSACTIONAL.has(a.trigger) ? undefined : await unsubscribeUrl("user", t.id);
      const r = await sendEmail({
        to: t.email, automationKey: a.key, idempotencyKey: `auto:${a.key}:${t.id}`, unsubscribe: unsub,
        subject: personalize(a.subject, vars),
        html: emailLayout({ title: personalize(a.subject, vars), body: personalize(a.content, vars), ctaLabel: a.ctaLabel ?? undefined, ctaUrl: a.ctaUrl ?? undefined, unsubscribe: unsub }),
      });
      if (r.ok && !r.skipped) total++;
    }
    if (total) await db.growthAutomation.update({ where: { id: a.id }, data: { sentCount: { increment: total } } });
  }
  return total;
}

/** What a super admin (or the AI operator) can set on a growth campaign. */
export const CampaignInput = z.object({
  name: z.string().min(2).max(120),
  channel: z.enum(["EMAIL", "SMS", "IN_APP"]).default("EMAIL"),
  audience: z.string(),
  subject: z.string().max(160).optional(),
  preheader: z.string().max(160).optional(),
  content: z.string().min(5).max(20000),
  ctaLabel: z.string().max(40).optional(),
  ctaUrl: z.string().url().optional(),
  scheduledAt: z.coerce.date().optional(),
});
