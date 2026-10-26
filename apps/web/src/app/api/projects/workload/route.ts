import { db } from "@/lib/db";
import { ok, requireOrg, route } from "@/lib/http";

// Who is overloaded? Open task hours and logged hours per person for the next/last 7 days.
export const GET = route(async () => {
  const ctx = await requireOrg("projects");
  const week = new Date(Date.now() + 7 * 864e5), ago = new Date(Date.now() - 7 * 864e5);
  const [emps, tasks, logs] = await Promise.all([
    db.employee.findMany({ where: { orgId: ctx.org.id, status: "ACTIVE" }, select: { id: true, firstName: true, lastName: true, jobTitle: true, photoUrl: true } }),
    db.task.findMany({ where: { orgId: ctx.org.id, status: { not: "DONE" }, OR: [{ dueDate: { lte: week } }, { dueDate: null }] }, select: { assigneeId: true, estimateHours: true, loggedHours: true, dueDate: true } }),
    db.projectTimeLog.findMany({ where: { project: { orgId: ctx.org.id }, date: { gte: ago } }, select: { employeeId: true, hours: true } }),
  ]);
  return ok({
    data: emps.map((e) => {
      const mine = tasks.filter((t) => t.assigneeId === e.id);
      const plannedHours = mine.reduce((s, t) => s + Math.max(0, (t.estimateHours ?? 2) - t.loggedHours), 0);
      return { ...e, openTasks: mine.length, overdue: mine.filter((t) => t.dueDate && t.dueDate < new Date()).length, plannedHours: Math.round(plannedHours * 10) / 10, loggedLast7: Math.round(logs.filter((l) => l.employeeId === e.id).reduce((s, l) => s + l.hours, 0) * 10) / 10, load: Math.min(200, Math.round((plannedHours / 40) * 100)) };
    }).sort((a, b) => b.load - a.load),
  });
});
