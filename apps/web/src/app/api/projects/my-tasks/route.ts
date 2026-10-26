import { db } from "@/lib/db";
import { ok, requireOrg, route } from "@/lib/http";
import { serialize } from "@/lib/resources";
import { meEmployee } from "@/lib/projects";

// "My work": everything assigned to me across projects, grouped for web, mobile and desktop.
export const GET = route(async () => {
  const ctx = await requireOrg("projects");
  const me = await meEmployee(ctx);
  if (!me) return ok({ overdue: [], today: [], upcoming: [], later: [], done: [] });
  const tasks = await db.task.findMany({
    where: { orgId: ctx.org.id, OR: [{ assigneeId: me.id }, { assigneeIds: { has: me.id } }] },
    include: { project: { select: { id: true, name: true, color: true, code: true } } }, orderBy: [{ dueDate: "asc" }], take: 300,
  });
  const now = new Date(), end = new Date(now); end.setHours(23, 59, 59, 999);
  const week = new Date(end.getTime() + 7 * 864e5);
  const open = tasks.filter((t) => t.status !== "DONE");
  return ok({
    overdue: open.filter((t) => t.dueDate && t.dueDate < now && t.dueDate.toDateString() !== now.toDateString()).map(serialize),
    today: open.filter((t) => t.dueDate && t.dueDate.toDateString() === now.toDateString()).map(serialize),
    upcoming: open.filter((t) => t.dueDate && t.dueDate > end && t.dueDate <= week).map(serialize),
    later: open.filter((t) => !t.dueDate || t.dueDate > week).map(serialize),
    done: tasks.filter((t) => t.status === "DONE").slice(0, 20).map(serialize),
  });
});
