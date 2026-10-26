import { z } from "zod";
import { db } from "@/lib/db";
import { body, clientIp, HttpError, ok, route } from "@/lib/http";
import { limit } from "@/lib/ratelimit";
import { notify } from "@/lib/audit";
import { emit } from "@/lib/webhooks";

// Public lead form on "Get a quote / Contact" ads. The lead goes straight into the advertiser's CRM.
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  if (!limit(`adlead:${clientIp(req)}`, 10, 3600_000)) throw new HttpError(429, "Too many requests.");
  const c = await db.adCampaign.findUnique({ where: { id: (await params).id }, select: { id: true, orgId: true, name: true, status: true } });
  if (!c || !["ACTIVE", "PAUSED", "OUT_OF_FUNDS", "ENDED"].includes(c.status)) throw new HttpError(404, "Not found.");
  const d = await body(req, z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().toLowerCase().email(), phone: z.string().max(30).optional(), message: z.string().max(2000).optional(), consent: z.boolean().default(false) }));
  await db.adLead.create({ data: { campaignId: c.id, ...d } });
  await db.adCampaign.update({ where: { id: c.id }, data: { leads: { increment: 1 } } });
  const [first, ...rest] = d.name.split(" ");
  const contact = await db.contact.create({ data: { orgId: c.orgId, type: "LEAD", firstName: first, lastName: rest.join(" ") || null, email: d.email, phone: d.phone, source: `ad:${c.name}`, notes: d.message, emailConsent: d.consent, consentAt: d.consent ? new Date() : null, consentSource: d.consent ? "oenod-ad-form" : null } });
  await notify(c.orgId, `New lead from your ad: ${d.name}`, { body: d.message?.slice(0, 140), link: `/app/crm/contacts/${contact.id}`, level: "success" });
  await emit(c.orgId, "contact.created", { id: contact.id, source: "ad" });
  return ok({ ok: true }, 201);
});
