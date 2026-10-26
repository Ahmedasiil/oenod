import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { isManager } from "@/lib/rbac";
import { audit, notify } from "@/lib/audit";
import { token } from "@/lib/crypto";
import { emailLayout, sendEmail } from "@/lib/messaging";
import { CERT_KINDS } from "@/lib/certificate";
import { APP_URL } from "@/lib/env";

const Recipient = z.object({ employeeId: z.string().optional(), name: z.string().trim().min(2).max(120).optional(), email: z.string().email().optional() })
  .refine((r) => r.employeeId || r.name, "Pick an employee or type the person's name.");
const Issue = z.object({
  kind: z.enum(Object.keys(CERT_KINDS) as [string, ...string[]]).default("COMPLETION"),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(240).optional(),
  hours: z.number().min(0).max(10000).optional(),
  signerName: z.string().trim().max(80).optional(),
  signerTitle: z.string().trim().max(80).optional(),
  issuedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  sendEmail: z.boolean().default(true),
  recipients: z.array(Recipient).min(1).max(500),
});

// Certificates this company has issued.
export const GET = route(async (req: Request) => {
  const ctx = await requireOrg("academy");
  const q = new URL(req.url).searchParams;
  const employeeId = q.get("employeeId") ?? undefined;
  const search = q.get("q")?.trim();
  const rows = await db.issuedCertificate.findMany({
    where: { orgId: ctx.org.id, ...(employeeId ? { employeeId } : {}), ...(search ? { OR: [{ recipientName: { contains: search, mode: "insensitive" } }, { title: { contains: search, mode: "insensitive" } }, { code: { contains: search.toUpperCase() } }] } : {}) },
    orderBy: { issuedAt: "desc" }, take: 200,
  });
  return ok({ data: rows.map((r) => ({ ...r, imageUrl: `/api/certificates/${r.code}/image`, verifyUrl: `${APP_URL}/verify/${r.code}` })) });
});

// Issue a certificate to one person or to a whole team at once.
export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("academy", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only owners and managers can issue certificates.");
  const d = await body(req, Issue);
  if (d.expiresAt && d.expiresAt <= (d.issuedAt ?? new Date())) throw new HttpError(422, "The expiry date must be after the issue date.");
  const ids = d.recipients.map((r) => r.employeeId).filter(Boolean) as string[];
  const emps = ids.length ? await db.employee.findMany({ where: { orgId: ctx.org.id, id: { in: ids } }, include: { membership: { select: { userId: true } } } }) : [];
  if (emps.length !== new Set(ids).size) throw new HttpError(422, "One of the selected employees isn't in this company.");
  const kind = CERT_KINDS[d.kind];
  const created = [];
  for (const r of d.recipients) {
    const emp = r.employeeId ? emps.find((e) => e.id === r.employeeId) : undefined;
    const name = r.name || `${emp!.firstName} ${emp!.lastName}`;
    const email = r.email || emp?.email || undefined;
    const cert = await db.issuedCertificate.create({
      data: {
        orgId: ctx.org.id, code: `OEN-${token(6).toUpperCase().replace(/[-_]/g, "X")}`, kind: d.kind, title: d.title, description: d.description,
        recipientName: name, recipientEmail: email, employeeId: emp?.id, hours: d.hours,
        signerName: d.signerName ?? ctx.user?.name ?? undefined, signerTitle: d.signerTitle,
        issuedAt: d.issuedAt ?? new Date(), expiresAt: d.expiresAt, createdById: ctx.user?.id,
      },
    });
    created.push(cert);
    const link = `${APP_URL}/verify/${cert.code}`;
    if (emp?.membership?.userId) await notify(ctx.org.id, `You received a certificate: ${d.title}`, { userId: emp.membership.userId, link: `/verify/${cert.code}`, level: "success" });
    if (d.sendEmail && email) {
      await sendEmail({
        to: email, scope: "ORG", orgId: ctx.org.id, idempotencyKey: `cert:${cert.id}`,
        subject: `${ctx.org.name} sent you a ${kind.heading.toLowerCase()}`,
        html: emailLayout({ brand: ctx.org.name, brandLogo: ctx.org.logoUrl, title: `Congratulations, ${name.split(" ")[0]}!`, body: `${ctx.org.name} has issued you a ${kind.heading.toLowerCase()} for "${d.title}".\n\nYou can view, download and share it any time. Anyone can confirm it's genuine with the certificate ID ${cert.code}.`, ctaLabel: "View my certificate", ctaUrl: link }),
      }).catch(() => {});
    }
  }
  await audit(ctx, "certificate.issued", "issued_certificate", created[0]?.id, { count: created.length, title: d.title });
  return ok({ issued: created.length, data: created.map((c) => ({ id: c.id, code: c.code, name: c.recipientName, imageUrl: `/api/certificates/${c.code}/image` })) }, 201);
});
