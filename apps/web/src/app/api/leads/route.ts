import { z } from "zod";
import { db } from "@/lib/db";
import { body, clientIp, HttpError, ok, route } from "@/lib/http";
import { limit } from "@/lib/ratelimit";

// Website forms (newsletter, demo request, contact sales). Consent is explicit and recorded.
export const POST = route(async (req: Request) => {
  if (!limit(`lead:${clientIp(req)}`, 10, 3600_000)) throw new HttpError(429, "Too many requests.");
  const d = await body(req, z.object({
    email: z.string().trim().toLowerCase().email(), name: z.string().max(100).optional(), phone: z.string().max(30).optional(), company: z.string().max(120).optional(),
    source: z.string().max(40).default("website"), message: z.string().max(4000).optional(), emailConsent: z.boolean().default(false), smsConsent: z.boolean().default(false), utm: z.record(z.string()).optional(),
  }));
  const consentText = d.emailConsent || d.smsConsent ? `Agreed on ${d.source}: "Send me product news, tips and offers from OENOD. I can unsubscribe at any time."` : null;
  await db.lead.upsert({
    where: { email: d.email },
    create: { email: d.email, name: d.name, phone: d.phone, company: d.company, source: d.source, utm: d.utm, tags: d.message ? ["contact-request"] : [], emailConsent: d.emailConsent, smsConsent: d.smsConsent && Boolean(d.phone), consentAt: consentText ? new Date() : null, consentText, consentIp: clientIp(req) },
    update: { name: d.name ?? undefined, phone: d.phone ?? undefined, company: d.company ?? undefined, ...(consentText ? { emailConsent: d.emailConsent, smsConsent: d.smsConsent && Boolean(d.phone), consentAt: new Date(), consentText, consentIp: clientIp(req), unsubscribedAt: null } : {}) },
  });
  return ok({ ok: true });
});
