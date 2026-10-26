import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { emailLayout, personalize, sendEmail, sendSms, unsubscribeUrl } from "@/lib/messaging";
import { audit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";

// Sends only to contacts who gave consent for this channel and haven't unsubscribed.
export const POST = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("marketing", "edit");
  if (ctx.actor === "api" || !isManager(ctx.role)) throw new HttpError(403, "A manager must send campaigns from OENOD.");
  const c = await db.campaign.findFirst({ where: { id: (await params).id, orgId: ctx.org.id }, include: { segment: true } });
  if (!c) throw new HttpError(404, "Campaign not found");
  if (c.status === "SENT" || c.status === "SENDING") throw new HttpError(409, "This campaign was already sent.");
  const f = (c.segment?.filter ?? {}) as { type?: string; tags?: string[]; minScore?: number };
  const sms = c.channel !== "EMAIL";
  const contacts = await db.contact.findMany({
    where: {
      orgId: ctx.org.id, unsubscribedAt: null,
      ...(sms ? { smsConsent: true, phone: { not: null } } : { emailConsent: true, email: { not: null } }),
      ...(f.type ? { type: f.type } : {}), ...(f.tags?.length ? { tags: { hasSome: f.tags } } : {}), ...(f.minScore ? { score: { gte: f.minScore } } : {}),
    },
  });
  await db.campaign.update({ where: { id: c.id }, data: { status: "SENDING" } });
  let sent = 0;
  for (const p of contacts) {
    const vars = { first_name: p.firstName, last_name: p.lastName, company: p.company, business: ctx.org.name };
    if (sms) {
      const r = await sendSms({ to: p.phone!, body: `${ctx.org.name}: ${personalize(c.content, vars)}`, whatsapp: c.channel === "WHATSAPP", scope: "ORG", orgId: ctx.org.id, campaignId: c.id, idempotencyKey: `camp:${c.id}:${p.id}` });
      if (r.ok) sent++;
    } else {
      const unsub = await unsubscribeUrl("contact", p.id);
      const r = await sendEmail({ to: p.email!, scope: "ORG", orgId: ctx.org.id, campaignId: c.id, idempotencyKey: `camp:${c.id}:${p.id}`, unsubscribe: unsub, subject: personalize(c.subject ?? c.name, vars), html: emailLayout({ brand: ctx.org.name, title: personalize(c.subject ?? c.name, vars), body: personalize(c.content, vars), unsubscribe: unsub }) });
      if (r.ok) sent++;
    }
  }
  const r = await db.campaign.update({ where: { id: c.id }, data: { status: "SENT", sentAt: new Date(), sent } });
  await audit(ctx, "campaign.sent", "campaign", c.id, { sent, eligible: contacts.length });
  return ok({ sent, eligible: contacts.length, campaign: r });
});
