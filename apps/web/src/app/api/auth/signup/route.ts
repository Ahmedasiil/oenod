import { z } from "zod";
import { db } from "@/lib/db";
import { body, clientIp, HttpError, ok, route } from "@/lib/http";
import { hashPassword, startSession } from "@/lib/auth";
import { checkPassword } from "@/lib/security";
import { requestLocale } from "@/lib/i18n";
import { createWorkspace } from "@/lib/setup";
import { limit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";

const Schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10, "Use at least 10 characters").max(200),
  company: z.string().trim().max(120).optional(),
  industry: z.string().optional(),
  country: z.string().length(2).optional(),
  region: z.string().max(10).optional(),
  phone: z.string().max(30).optional(),
  marketingConsent: z.boolean().optional(),
  smsConsent: z.boolean().optional(),
  partner: z.string().max(40).optional(),
  plan: z.string().optional(),
  learnerOnly: z.boolean().optional(), // Academy / Jobs accounts without a company
});

export const POST = route(async (req: Request) => {
  if (!limit(`signup:${clientIp(req)}`, 8, 3600_000)) throw new HttpError(429, "Too many sign-ups from this network. Try again later.");
  const d = await body(req, Schema);
  if (await db.user.findUnique({ where: { email: d.email } })) throw new HttpError(409, "An account with this email already exists. Sign in instead.");
  await checkPassword(d.password, { email: d.email, name: d.name });
  const isSuper = Boolean(process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_EMAIL.toLowerCase() === d.email);
  const user = await db.user.create({
    data: {
      name: d.name, email: d.email, phone: d.phone, locale: await requestLocale(), passwordHash: await hashPassword(d.password), passwordChangedAt: new Date(), isSuperAdmin: isSuper,
      marketingEmailConsent: Boolean(d.marketingConsent), marketingSmsConsent: Boolean(d.smsConsent && d.phone),
      consentAt: d.marketingConsent || d.smsConsent ? new Date() : null, consentSource: d.marketingConsent ? "signup-form" : null, lastSeenAt: new Date(),
    },
  });
  await db.lead.updateMany({ where: { email: d.email }, data: { convertedUserId: user.id } });
  let orgId: string | null = null;
  if (!d.learnerOnly) {
    const org = await createWorkspace(user, { company: d.company || `${d.name.split(" ")[0]}'s business`, industry: d.industry, country: d.country, region: d.region, phone: d.phone, partnerCode: d.partner, planKey: d.plan });
    orgId = org.id;
  }
  await audit({ user, orgId, actor: "user" }, "auth.signup");
  const { token: t } = await startSession(user, req);
  return ok({ token: t, mustEnable2fa: isSuper, user: { id: user.id, name: user.name, email: user.email }, orgId, redirect: d.learnerOnly ? "/academy" : "/app/welcome" }, 201);
});
