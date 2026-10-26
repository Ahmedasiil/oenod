import { db } from "@/lib/db";
import { ok, requireOrg, route } from "@/lib/http";

// Employee self-service: today's shifts, upcoming schedule, payslips, leave, training, tasks.
export const GET = route(async () => {
  const ctx = await requireOrg("me");
  const e = ctx.membership ? await db.employee.findFirst({ where: { orgId: ctx.org.id, membershipId: ctx.membership.id }, include: { location: true, leaveBalances: true, certifications: true } }) : null;
  if (!e) return ok({ employee: null });
  const now = new Date();
  const [shifts, stubs, leave, trainings, tasks, open, announcements] = await Promise.all([
    db.shift.findMany({ where: { orgId: ctx.org.id, employeeId: e.id, end: { gte: now } }, orderBy: { start: "asc" }, take: 14, include: { location: true } }),
    db.payStub.findMany({ where: { employeeId: e.id, payRun: { status: { in: ["APPROVED", "PAID"] } } }, include: { payRun: true }, orderBy: { payRun: { payDate: "desc" } }, take: 12 }),
    db.leaveRequest.findMany({ where: { employeeId: e.id }, orderBy: { startDate: "desc" }, take: 10 }),
    db.trainingAssignment.findMany({ where: { employeeId: e.id }, include: { course: true } }),
    db.task.findMany({ where: { orgId: ctx.org.id, assigneeId: e.id, status: { not: "DONE" } }, orderBy: { dueDate: "asc" }, take: 20 }),
    db.shift.findMany({ where: { orgId: ctx.org.id, employeeId: null, status: "OPEN", start: { gte: now } }, take: 10, include: { location: true } }),
    db.announcement.findMany({ where: { orgId: ctx.org.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  return ok({
    employee: { id: e.id, name: `${e.firstName} ${e.lastName}`, jobTitle: e.jobTitle, location: e.location?.name, shareLiveLocation: e.shareLiveLocation, leaveBalances: e.leaveBalances, certifications: e.certifications },
    shifts, openShifts: open, leave, trainings, tasks, announcements: announcements.map((a) => ({ ...a, acked: ctx.user ? a.acks.includes(ctx.user.id) : false })),
    payslips: stubs.map((s) => ({ id: s.id, payDate: s.payRun.payDate, periodStart: s.payRun.periodStart, periodEnd: s.payRun.periodEnd, gross: Number(s.gross), net: Number(s.net), deductions: s.deductions, regularHours: Number(s.regularHours), overtimeHours: Number(s.overtimeHours) })),
  });
});

export const PATCH = route(async (req: Request) => {
  const ctx = await requireOrg("me", "edit");
  const { shareLiveLocation } = (await req.json()) as { shareLiveLocation?: boolean };
  const r = await db.employee.updateMany({ where: { orgId: ctx.org.id, membershipId: ctx.membership?.id }, data: { shareLiveLocation: Boolean(shareLiveLocation) } });
  return ok({ updated: r.count });
});
