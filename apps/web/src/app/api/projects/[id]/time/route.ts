import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { serialize } from "@/lib/resources";
import { actorName, canManageProject, loadProject, logActivity, meEmployee, refreshProject } from "@/lib/projects";

type P = { params: Promise<{ id: string }> };

export const GET = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects");
  const p = await loadProject(ctx, (await params).id);
  const s = new URL(req.url).searchParams;
  const logs = await db.projectTimeLog.findMany({
    where: { projectId: p.id, ...(s.get("from") ? { date: { gte: new Date(s.get("from")!) } } : {}), ...(s.get("employeeId") ? { employeeId: s.get("employeeId")! } : {}) },
    orderBy: { date: "desc" }, take: 500,
  });
  const byPerson = Object.values(logs.reduce<Record<string, { employeeId: string; hours: number; billable: number }>>((a, l) => {
    a[l.employeeId] ??= { employeeId: l.employeeId, hours: 0, billable: 0 };
    a[l.employeeId].hours += l.hours;
    if (l.billable) a[l.employeeId].billable += l.hours;
    return a;
  }, {}));
  return ok({ data: serialize(logs), byPerson });
});

// Log time manually (the timer endpoint handles start/stop).
export const POST = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects", "edit");
  const p = await loadProject(ctx, (await params).id);
  const d = await body(req, z.object({ hours: z.number().positive().max(24), date: z.coerce.date().default(() => new Date()), taskId: z.string().nullable().optional(), note: z.string().max(1000).optional(), billable: z.boolean().default(p.billingType !== "NON_BILLABLE"), employeeId: z.string().optional() }));
  const me = await meEmployee(ctx);
  const employeeId = d.employeeId && d.employeeId !== me?.id ? d.employeeId : me?.id;
  if (!employeeId) throw new HttpError(422, "Choose who the time is for.");
  if (employeeId !== me?.id && !(await canManageProject(ctx, p.id))) throw new HttpError(403, "Only the lead or a manager can log time for someone else.");
  if (d.taskId && !(await db.task.findFirst({ where: { id: d.taskId, projectId: p.id } }))) throw new HttpError(422, "Task not found in this project.");
  const log = await db.projectTimeLog.create({ data: { projectId: p.id, taskId: d.taskId ?? null, employeeId, hours: d.hours, date: d.date, note: d.note, billable: d.billable } });
  if (d.taskId) await db.task.update({ where: { id: d.taskId }, data: { loggedHours: { increment: d.hours } } });
  await logActivity(p.id, actorName(ctx), "logged_time", `${d.hours}h`, d.taskId ?? undefined);
  await refreshProject(p.id);
  return ok({ data: serialize(log) }, 201);
});
