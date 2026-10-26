import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { actorName, logActivity, projectScope } from "@/lib/projects";
import { notify } from "@/lib/audit";

type P = { params: Promise<{ id: string }> };

// Comments with @mentions: mentioned people and watchers get notified.
export const POST = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects");
  const scope = await projectScope(ctx);
  const t = await db.task.findFirst({ where: { id: (await params).id, orgId: ctx.org.id, ...(scope ? { AND: [scope.tasks] } : {}) } });
  if (!t) throw new HttpError(404, "Task not found.");
  const d = await body(req, z.object({ body: z.string().trim().min(1).max(10000), mentions: z.array(z.string()).max(30).default([]) }));
  const c = await db.taskComment.create({ data: { taskId: t.id, authorId: ctx.user?.id, authorName: actorName(ctx), body: d.body, mentions: d.mentions } });
  if (t.projectId) await logActivity(t.projectId, actorName(ctx), "commented", t.title, t.id);
  const notifyIds = [...new Set([...d.mentions, ...t.watcherIds, t.assigneeId].filter(Boolean))] as string[];
  const emps = await db.employee.findMany({ where: { orgId: ctx.org.id, id: { in: notifyIds } }, include: { membership: true } });
  for (const e of emps) {
    const uid = e.membership?.userId;
    if (!uid || uid === ctx.user?.id) continue;
    await notify(ctx.org.id, d.mentions.includes(e.id) ? `${actorName(ctx)} mentioned you on ${t.title}` : `New comment on ${t.title}`, { body: d.body.slice(0, 140), userId: uid, link: `/app/projects/${t.projectId}?task=${t.id}` });
  }
  return ok({ data: c }, 201);
});
