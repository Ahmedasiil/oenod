import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { serialize } from "@/lib/resources";
import { actorName, loadProject, logActivity, meEmployee, refreshProject } from "@/lib/projects";

// One running timer per person, across all projects. Works from web, mobile and desktop.
export const GET = route(async () => {
  const ctx = await requireOrg("projects");
  const me = await meEmployee(ctx);
  const running = me ? await db.projectTimeLog.findFirst({ where: { employeeId: me.id, timerStartedAt: { not: null } } }) : null;
  return ok({ running: running ? serialize(running) : null });
});

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("projects", "edit");
  const me = await meEmployee(ctx);
  if (!me) throw new HttpError(422, "Timers are for people with an employee profile.");
  const d = await body(req, z.object({ action: z.enum(["start", "stop"]), projectId: z.string().optional(), taskId: z.string().nullable().optional(), note: z.string().max(1000).optional() }));
  const running = await db.projectTimeLog.findFirst({ where: { employeeId: me.id, timerStartedAt: { not: null } } });
  const stop = async () => {
    if (!running) return null;
    const hours = Math.max(0.01, Math.round(((Date.now() - running.timerStartedAt!.getTime()) / 36e5) * 100) / 100);
    const done = await db.projectTimeLog.update({ where: { id: running.id }, data: { hours, timerStartedAt: null, note: d.note ?? running.note } });
    if (running.taskId) await db.task.update({ where: { id: running.taskId }, data: { loggedHours: { increment: hours } } });
    await logActivity(running.projectId, actorName(ctx), "logged_time", `${hours}h`, running.taskId ?? undefined);
    await refreshProject(running.projectId);
    return done;
  };
  if (d.action === "stop") return ok({ stopped: serialize(await stop()) });
  if (!d.projectId) throw new HttpError(422, "Pick a project.");
  const p = await loadProject(ctx, d.projectId);
  if (d.taskId && !(await db.task.findFirst({ where: { id: d.taskId, projectId: p.id } }))) throw new HttpError(422, "Task not found in this project.");
  const stopped = await stop();
  const log = await db.projectTimeLog.create({ data: { projectId: p.id, taskId: d.taskId ?? null, employeeId: me.id, hours: 0, timerStartedAt: new Date(), billable: p.billingType !== "NON_BILLABLE", note: d.note } });
  return ok({ running: serialize(log), stopped: serialize(stopped) }, 201);
});
