import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { canManageProject, loadProject } from "@/lib/projects";

type P = { params: Promise<{ id: string }> };
const Stage = z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(40), color: z.string().default("#94A3B8"), isDone: z.boolean().default(false), wipLimit: z.number().int().min(1).nullable().optional() });

// Replace the board columns in one go (add, rename, recolour, reorder, remove).
export const PUT = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects", "edit");
  const p = await loadProject(ctx, (await params).id);
  if (!(await canManageProject(ctx, p.id))) throw new HttpError(403, "Only the project lead or a manager can change the board.");
  const { stages } = await body(req, z.object({ stages: z.array(Stage).min(1).max(12) }));
  if (!stages.some((s) => s.isDone)) stages[stages.length - 1].isDone = true;
  const existing = await db.projectStage.findMany({ where: { projectId: p.id } });
  await db.$transaction(async (tx) => {
    const kept: string[] = [];
    for (const [i, s] of stages.entries()) {
      if (s.id && existing.some((e) => e.id === s.id)) {
        await tx.projectStage.update({ where: { id: s.id }, data: { name: s.name, color: s.color, isDone: s.isDone, wipLimit: s.wipLimit ?? null, order: i } });
        kept.push(s.id);
      } else kept.push((await tx.projectStage.create({ data: { projectId: p.id, name: s.name, color: s.color, isDone: s.isDone, wipLimit: s.wipLimit ?? null, order: i } })).id);
    }
    const removed = existing.filter((e) => !kept.includes(e.id)).map((e) => e.id);
    if (removed.length) {
      await tx.task.updateMany({ where: { stageId: { in: removed } }, data: { stageId: kept[0] } });
      await tx.projectStage.deleteMany({ where: { id: { in: removed } } });
    }
  });
  return ok({ data: await db.projectStage.findMany({ where: { projectId: p.id }, orderBy: { order: "asc" } }) });
});
