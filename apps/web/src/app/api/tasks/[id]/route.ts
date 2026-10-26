import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { serialize } from "@/lib/resources";
import { actorName, logActivity, projectScope, refreshProject } from "@/lib/projects";
import { TaskInput, updateTask } from "@/lib/tasks";

type P = { params: Promise<{ id: string }> };

async function find(ctx: Awaited<ReturnType<typeof requireOrg>>, id: string) {
  const scope = await projectScope(ctx);
  const t = await db.task.findFirst({ where: { id, orgId: ctx.org.id, ...(scope ? { AND: [scope.tasks] } : {}) } });
  if (!t) throw new HttpError(404, "Task not found.");
  return t;
}

export const GET = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg("projects");
  const t = await find(ctx, (await params).id);
  const [comments, subtasks, files, logs, deps] = await Promise.all([
    db.taskComment.findMany({ where: { taskId: t.id }, orderBy: { createdAt: "asc" } }),
    db.task.findMany({ where: { parentId: t.id }, orderBy: { order: "asc" } }),
    db.projectFile.findMany({ where: { taskId: t.id }, select: { id: true, name: true, mime: true, size: true, url: true, createdAt: true } }),
    db.projectTimeLog.findMany({ where: { taskId: t.id }, orderBy: { date: "desc" } }),
    db.task.findMany({ where: { id: { in: t.dependsOn } }, select: { id: true, title: true, status: true, number: true } }),
  ]);
  const activity = t.projectId ? await db.projectActivity.findMany({ where: { taskId: t.id }, orderBy: { createdAt: "desc" }, take: 30 }) : [];
  return ok({ data: serialize(t), comments, subtasks: subtasks.map(serialize), files, timeLogs: serialize(logs), dependencies: deps, activity });
});

export const PATCH = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects", "edit");
  const t = await find(ctx, (await params).id);
  return ok({ data: serialize(await updateTask(ctx, t.id, TaskInput.parse(await req.json()))) });
});

export const DELETE = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg("projects", "edit");
  const t = await find(ctx, (await params).id);
  await db.task.delete({ where: { id: t.id } });
  for (const d of await db.task.findMany({ where: { dependsOn: { has: t.id } }, select: { id: true, dependsOn: true } }))
    await db.task.update({ where: { id: d.id }, data: { dependsOn: d.dependsOn.filter((x) => x !== t.id) } });
  if (t.projectId) {
    await logActivity(t.projectId, actorName(ctx), "deleted_task", t.title);
    await refreshProject(t.projectId);
  }
  return ok({ ok: true });
});
