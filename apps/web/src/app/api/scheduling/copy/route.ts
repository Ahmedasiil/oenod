import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { isManager } from "@/lib/rbac";
import { audit } from "@/lib/audit";

// Copy the previous week's shifts into the given week as drafts (skips people on approved leave).
export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("scheduling", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only managers can build schedules.");
  const { weekStart } = await body(req, z.object({ weekStart: z.coerce.date() }));
  const week = 7 * 864e5, prevStart = new Date(weekStart.getTime() - week);
  const [prev, existing, leave] = await Promise.all([
    db.shift.findMany({ where: { orgId: ctx.org.id, start: { gte: prevStart, lt: weekStart } } }),
    db.shift.count({ where: { orgId: ctx.org.id, start: { gte: weekStart, lt: new Date(weekStart.getTime() + week) } } }),
    db.leaveRequest.findMany({ where: { orgId: ctx.org.id, status: "APPROVED", startDate: { lt: new Date(weekStart.getTime() + week) }, endDate: { gte: weekStart } } }),
  ]);
  if (existing > 0) throw new HttpError(409, "This week already has shifts. Clear them first or add shifts one by one.");
  const off = (empId: string | null, d: Date) => !!empId && leave.some((l) => l.employeeId === empId && l.startDate <= d && l.endDate >= new Date(d.getTime() - 864e5));
  const data = prev.map((s) => {
    const start = new Date(s.start.getTime() + week), end = new Date(s.end.getTime() + week);
    const away = off(s.employeeId, start);
    return { orgId: ctx.org.id, locationId: s.locationId, employeeId: away ? null : s.employeeId, role: s.role, start, end, breakMinutes: s.breakMinutes, notes: away ? "Usual person is on leave" : s.notes, status: "DRAFT" };
  });
  if (data.length) await db.shift.createMany({ data });
  await audit(ctx, "schedule.copied", "shift", undefined, { weekStart, count: data.length });
  return ok({ created: data.length, uncovered: data.filter((d) => !d.employeeId).length });
});
