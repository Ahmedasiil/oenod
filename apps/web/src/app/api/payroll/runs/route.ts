import { z } from "zod";
import { db } from "@/lib/db";
import { body, ok, requireOrg, route } from "@/lib/http";
import { calculatePayroll, createPayRun } from "@/lib/payroll";
import { audit } from "@/lib/audit";
import { serialize } from "@/lib/resources";

export const GET = route(async () => {
  const ctx = await requireOrg("payroll");
  const runs = await db.payRun.findMany({ where: { orgId: ctx.org.id }, orderBy: { periodEnd: "desc" }, take: 50, include: { _count: { select: { stubs: true } } } });
  return ok({ data: runs.map(serialize) });
});

const Schema = z.object({ periodStart: z.coerce.date(), periodEnd: z.coerce.date(), payDate: z.coerce.date(), preview: z.boolean().optional() });

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("payroll", "edit");
  const d = await body(req, Schema);
  if (d.preview) return ok({ preview: await calculatePayroll(ctx.org.id, d.periodStart, d.periodEnd) });
  const run = await createPayRun(ctx.org.id, d.periodStart, d.periodEnd, d.payDate);
  await audit(ctx, "payroll.created", "payRun", run.id);
  return ok({ data: serialize(run) }, 201);
});
