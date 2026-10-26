import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireSuperAdmin, route } from "@/lib/http";
import { adminAudit } from "@/lib/admin";

type P = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, { params }: P) => {
  await requireSuperAdmin();
  const id = (await params).id;
  const org = await db.organization.findUnique({ where: { id }, include: { plan: true, memberships: { include: { user: { select: { id: true, name: true, email: true, lastSeenAt: true } } } }, _count: { select: { employees: true, contacts: true, invoices: true, projects: true } } } });
  if (!org) throw new HttpError(404, "Company not found.");
  const [usage, audit, verification, ads] = await Promise.all([
    db.usageRecord.groupBy({ by: ["metric"], where: { orgId: id, createdAt: { gte: new Date(Date.now() - 30 * 864e5) } }, _sum: { quantity: true } }),
    db.auditLog.findMany({ where: { orgId: id }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.verificationRequest.findFirst({ where: { orgId: id }, orderBy: { submittedAt: "desc" } }),
    db.adCampaign.findMany({ where: { orgId: id }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, headline: true, status: true, spentCents: true } }),
  ]);
  return ok({ ...org, usage: usage.map((u) => ({ metric: u.metric, quantity: u._sum.quantity ?? 0 })), audit, verification, ads });
});

// Direct changes by a super admin (the AI never calls this; it proposes actions instead).
export const PATCH = route(async (req: Request, { params }: P) => {
  const ctx = await requireSuperAdmin();
  const id = (await params).id;
  const d = await body(req, z.object({
    planKey: z.string().optional(),
    subscriptionStatus: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "PAUSED"]).optional(),
    trialEndsAt: z.coerce.date().nullable().optional(),
    verificationStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]).optional(),
    publicProfile: z.boolean().optional(),
    adCreditCents: z.number().int().min(-1_000_000).max(1_000_000).optional(),
    note: z.string().max(300).optional(),
  }));
  if (d.planKey && !(await db.plan.findUnique({ where: { key: d.planKey } }))) throw new HttpError(422, "Unknown plan.");
  const { adCreditCents, note, ...data } = d;
  const org = await db.organization.update({ where: { id }, data: { ...data, ...(d.verificationStatus === "VERIFIED" ? { verifiedAt: new Date() } : {}), ...(adCreditCents ? { adBalanceCents: { increment: adCreditCents } } : {}) } });
  if (adCreditCents) await db.adLedger.create({ data: { orgId: id, kind: "ADJUSTMENT", amountCents: adCreditCents, note: note ?? `Adjusted by ${ctx.user.name}` } });
  await adminAudit(ctx.user.id, "org.updated", "organization", id, d);
  return ok(org);
});
