import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { serialize } from "@/lib/resources";
import { postPayRun } from "@/lib/accounting";
import { emit } from "@/lib/webhooks";
import { audit } from "@/lib/audit";
import { emailLayout, sendEmail } from "@/lib/messaging";
import { APP_URL } from "@/lib/env";

type P = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg("payroll");
  const run = await db.payRun.findFirst({ where: { id: (await params).id, orgId: ctx.org.id }, include: { stubs: { include: { employee: true } } } });
  if (!run) throw new HttpError(404, "Pay run not found");
  return ok({ data: serialize(run) });
});

// Approve (human only), mark paid, or cancel.
export const POST = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("payroll", "edit");
  if (ctx.actor === "api") throw new HttpError(403, "Payroll release must be approved by a person in OENOD.");
  if (!["OWNER", "ADMIN", "FINANCE"].includes(ctx.role)) throw new HttpError(403, "Only owners and finance can approve payroll.");
  const { action } = await body(req, z.object({ action: z.enum(["approve", "paid", "cancel"]) }));
  const run = await db.payRun.findFirst({ where: { id: (await params).id, orgId: ctx.org.id }, include: { stubs: { include: { employee: true } } } });
  if (!run) throw new HttpError(404, "Pay run not found");
  if (action === "approve") {
    if (run.status !== "DRAFT") throw new HttpError(409, "Only draft pay runs can be approved.");
    const r = await db.payRun.update({ where: { id: run.id }, data: { status: "APPROVED", approvedBy: ctx.user?.name, approvedAt: new Date() } });
    await postPayRun(r);
    await emit(ctx.org.id, "payrun.approved", serialize(r));
    for (const s of run.stubs) {
      if (s.employee.email) await sendEmail({ to: s.employee.email, scope: "ORG", orgId: ctx.org.id, idempotencyKey: `payslip:${s.id}`, subject: `Your payslip from ${ctx.org.name}`, html: emailLayout({ brand: ctx.org.name, title: "Your payslip is ready", body: `Hi ${s.employee.firstName},\n\nYour pay for ${run.periodStart.toLocaleDateString("en-CA")} to ${run.periodEnd.toLocaleDateString("en-CA")} is ready. Pay date: ${run.payDate.toLocaleDateString("en-CA")}.`, ctaLabel: "View payslip", ctaUrl: `${APP_URL}/app/me` }) });
    }
    await audit(ctx, "payroll.approved", "payRun", run.id);
    return ok({ data: serialize(r) });
  }
  if (action === "paid") {
    if (run.status !== "APPROVED") throw new HttpError(409, "Approve the pay run first.");
    const r = await db.payRun.update({ where: { id: run.id }, data: { status: "PAID" } });
    await audit(ctx, "payroll.paid", "payRun", run.id);
    return ok({ data: serialize(r) });
  }
  if (run.status === "PAID") throw new HttpError(409, "A paid run can't be cancelled.");
  const r = await db.payRun.update({ where: { id: run.id }, data: { status: "CANCELLED" } });
  await audit(ctx, "payroll.cancelled", "payRun", run.id);
  return ok({ data: serialize(r) });
});
