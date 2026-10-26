import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { sha256 } from "@/lib/crypto";
import { emailLayout, sendEmail } from "@/lib/messaging";
import { runVerification } from "@/lib/verification";
import { audit } from "@/lib/audit";
import { limit } from "@/lib/ratelimit";

export const GET = route(async () => {
  const ctx = await requireOrg("settings");
  const latest = await db.verificationRequest.findFirst({ where: { orgId: ctx.org.id }, orderBy: { submittedAt: "desc" } });
  return ok({ status: ctx.org.verificationStatus, verifiedAt: ctx.org.verifiedAt, request: latest && { ...latest, emailCode: undefined, aiReport: latest.status === "REJECTED" || latest.status === "NEEDS_INFO" ? latest.aiReport : undefined } });
});

const Schema = z.object({
  legalName: z.string().trim().min(2).max(200),
  businessNumber: z.string().trim().min(4).max(40),
  registry: z.string().max(120).optional(),
  country: z.string().length(2).toUpperCase(),
  address: z.object({ line1: z.string().min(3), line2: z.string().optional(), city: z.string().min(2), region: z.string().optional(), postalCode: z.string().min(3), country: z.string().length(2) }),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().min(8).max(25),
  contactName: z.string().min(2).max(100),
  contactTitle: z.string().max(100).optional(),
  domainEmail: z.string().email().optional().or(z.literal("")),
  documentIds: z.array(z.string()).max(10).default([]),
  attest: z.literal(true, { errorMap: () => ({ message: "Please confirm the information is accurate." }) }),
});

// Submit company details for the blue verified badge.
export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("settings", "edit");
  if (!["OWNER", "ADMIN"].includes(ctx.role)) throw new HttpError(403, "Only the owner or an admin can request verification.");
  if (!limit(`verif:${ctx.org.id}`, 5, 864e5)) throw new HttpError(429, "Too many verification attempts today.");
  if (ctx.org.verificationStatus === "VERIFIED") throw new HttpError(409, "Your company is already verified.");
  const d = await body(req, Schema);
  const docs = await db.document.count({ where: { orgId: ctx.org.id, id: { in: d.documentIds } } });
  if (docs !== d.documentIds.length) throw new HttpError(422, "A document wasn't found.");
  const code = d.domainEmail ? String(Math.floor(100000 + Math.random() * 900000)) : null;
  const v = await db.verificationRequest.create({ data: { orgId: ctx.org.id, legalName: d.legalName, businessNumber: d.businessNumber, registry: d.registry, country: d.country, address: d.address, website: d.website || null, phone: d.phone, contactName: d.contactName, contactTitle: d.contactTitle, domainEmail: d.domainEmail || null, emailCode: code ? sha256(code) : null, documentIds: d.documentIds } });
  await db.organization.update({ where: { id: ctx.org.id }, data: { verificationStatus: "PENDING", legalName: d.legalName, website: d.website || ctx.org.website, phone: ctx.org.phone ?? d.phone, address: ctx.org.address ?? d.address } });
  if (code && d.domainEmail) await sendEmail({ to: d.domainEmail, scope: "PLATFORM", idempotencyKey: `verifcode:${v.id}`, subject: `Your OENOD verification code: ${code}`, html: emailLayout({ title: "Confirm your company email", body: `Your code is ${code}\n\nEnter it in OENOD to confirm ${d.legalName} owns this email domain. It expires in 24 hours.` }) });
  await audit(ctx, "verification.submitted", "verification", v.id);
  // Without an email code to wait for, check right away; otherwise after the code is confirmed.
  if (!code) runVerification(v.id).catch(console.error);
  return ok({ id: v.id, needsEmailCode: Boolean(code) }, 201);
});
