import { z } from "zod";
import { db } from "./db";
import { HttpError, type OrgCtx } from "./http";
import { actorName, completeTaskSideEffects, logActivity, notifyAssigned, refreshProject, taskDefaults } from "./projects";

export const TaskInput = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(20000).nullable(),
  status: z.enum(["TODO", "DOING", "REVIEW", "BLOCKED", "DONE"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  stageId: z.string().nullable(),
  milestoneId: z.string().nullable(),
  parentId: z.string().nullable(),
  assigneeId: z.string().nullable(),
  assigneeIds: z.array(z.string()),
  watcherIds: z.array(z.string()),
  startDate: z.coerce.date().nullable(),
  dueDate: z.coerce.date().nullable(),
  estimateHours: z.number().min(0).nullable(),
  tags: z.array(z.string().max(30)),
  checklist: z.array(z.object({ id: z.string(), text: z.string().max(300), done: z.boolean() })),
  dependsOn: z.array(z.string()),
  recurrence: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).nullable(),
  order: z.number(),
}).partial();
export type TaskData = z.infer<typeof TaskInput>;

async function checkRefs(ctx: OrgCtx, projectId: string | null, d: TaskData) {
  const people = [d.assigneeId, ...(d.assigneeIds ?? []), ...(d.watcherIds ?? [])].filter(Boolean) as string[];
  if (people.length) {
    const n = await db.employee.count({ where: { orgId: ctx.org.id, id: { in: [...new Set(people)] } } });
    if (n !== new Set(people).size) throw new HttpError(422, "Some assignees weren't found in this company.");
  }
  if (d.stageId && !(await db.projectStage.findFirst({ where: { id: d.stageId, projectId: projectId ?? "__" } }))) throw new HttpError(422, "Column not found.");
  if (d.milestoneId && !(await db.milestone.findFirst({ where: { id: d.milestoneId, projectId: projectId ?? "__" } }))) throw new HttpError(422, "Milestone not found.");
  if (d.parentId && !(await db.task.findFirst({ where: { id: d.parentId, orgId: ctx.org.id } }))) throw new HttpError(422, "Parent task not found.");
  if (d.dependsOn?.length && (await db.task.count({ where: { orgId: ctx.org.id, id: { in: d.dependsOn } } })) !== d.dependsOn.length) throw new HttpError(422, "A dependency wasn't found.");
}

/** Keep status and board column in sync: moving to the Done column completes the task and vice versa. */
async function syncStage(projectId: string | null, d: TaskData, prev?: { status: string; stageId: string | null }) {
  if (!projectId) return;
  const stages = await db.projectStage.findMany({ where: { projectId }, orderBy: { order: "asc" } });
  if (d.stageId && d.stageId !== prev?.stageId) {
    const st = stages.find((s) => s.id === d.stageId);
    if (st?.isDone) d.status = "DONE";
    else if (!d.status || d.status === "DONE") d.status = st && stages.indexOf(st) === 0 ? "TODO" : st?.name.toLowerCase().includes("review") ? "REVIEW" : "DOING";
  } else if (d.status && d.status !== prev?.status) {
    if (d.status === "DONE") d.stageId = stages.find((s) => s.isDone)?.id ?? d.stageId;
    else if (prev?.status === "DONE" || !prev) {
      const map: Record<string, number> = { TODO: 0, DOING: 1, REVIEW: 2, BLOCKED: 1 };
      d.stageId = stages.filter((s) => !s.isDone)[Math.min(map[d.status] ?? 0, stages.length - 2)]?.id ?? d.stageId;
    }
  }
}

export async function createTask(ctx: OrgCtx, projectId: string | null, d: TaskData & { title: string }) {
  await checkRefs(ctx, projectId, d);
  const defaults = projectId ? await taskDefaults(projectId, d.status) : { order: Date.now(), number: 0 };
  await syncStage(projectId, d);
  const t = await db.task.create({ data: { ...defaults, ...d, orgId: ctx.org.id, projectId, createdById: ctx.user?.id, completedAt: d.status === "DONE" ? new Date() : null, checklist: d.checklist ?? undefined } });
  if (projectId) {
    await logActivity(projectId, actorName(ctx), "created_task", t.title, t.id);
    await refreshProject(projectId);
  }
  const assignees = [t.assigneeId, ...t.assigneeIds].filter(Boolean) as string[];
  await notifyAssigned(ctx.org.id, assignees, t, actorName(ctx));
  return t;
}

export async function updateTask(ctx: OrgCtx, id: string, d: TaskData) {
  const prev = await db.task.findFirst({ where: { id, orgId: ctx.org.id } });
  if (!prev) throw new HttpError(404, "Task not found.");
  await checkRefs(ctx, prev.projectId, d);
  if (d.dependsOn?.includes(id)) throw new HttpError(422, "A task can't depend on itself.");
  await syncStage(prev.projectId, d, prev);
  if (d.status === "DONE" && prev.status !== "DONE") {
    const deps = d.dependsOn ?? prev.dependsOn;
    if (deps.length) {
      const blocking = await db.task.findMany({ where: { id: { in: deps }, status: { not: "DONE" } }, select: { title: true } });
      if (blocking.length) throw new HttpError(409, `Finish these first: ${blocking.map((b) => b.title).join(", ")}`);
    }
  }
  const t = await db.task.update({
    where: { id },
    data: { ...d, checklist: d.checklist ?? undefined, ...(d.status === "DONE" && prev.status !== "DONE" ? { completedAt: new Date() } : d.status && d.status !== "DONE" ? { completedAt: null } : {}) },
  });
  if (prev.projectId) {
    const a = actorName(ctx);
    if (d.stageId && d.stageId !== prev.stageId) {
      const st = await db.projectStage.findUnique({ where: { id: d.stageId } });
      await logActivity(prev.projectId, a, "moved", `${t.title} → ${st?.name}`, t.id);
    }
    if (t.status === "DONE" && prev.status !== "DONE") await logActivity(prev.projectId, a, "completed", t.title, t.id);
    await refreshProject(prev.projectId);
  }
  const before = new Set([prev.assigneeId, ...prev.assigneeIds].filter(Boolean));
  const added = [t.assigneeId, ...t.assigneeIds].filter((x): x is string => Boolean(x) && !before.has(x));
  if (added.length) {
    await notifyAssigned(ctx.org.id, added, t, actorName(ctx));
    if (prev.projectId) await logActivity(prev.projectId, actorName(ctx), "assigned", t.title, t.id);
  }
  if (t.status === "DONE" && prev.status !== "DONE") await completeTaskSideEffects(ctx.org.id, t);
  return t;
}
