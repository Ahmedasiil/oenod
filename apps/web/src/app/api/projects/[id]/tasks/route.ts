import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { serialize } from "@/lib/resources";
import { loadProject, refreshProject } from "@/lib/projects";
import { createTask, TaskInput, updateTask } from "@/lib/tasks";

type P = { params: Promise<{ id: string }> };

export const POST = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects", "edit");
  const p = await loadProject(ctx, (await params).id);
  const raw = await req.json();
  // Accept one task or a list (quick-add, paste a list, AI plan).
  const items = z.array(TaskInput.extend({ title: z.string().trim().min(1).max(300) })).max(200).parse(Array.isArray(raw) ? raw : [raw]);
  const out = [];
  for (const t of items) out.push(await createTask(ctx, p.id, t));
  return ok({ data: out.map(serialize) }, 201);
});

// Drag and drop: move one or many cards (column + position) in a single request.
export const PATCH = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects", "edit");
  const p = await loadProject(ctx, (await params).id);
  const { moves } = await body(req, z.object({ moves: z.array(z.object({ id: z.string(), stageId: z.string(), order: z.number() })).min(1).max(500) }));
  const ids = moves.map((m) => m.id);
  if ((await db.task.count({ where: { id: { in: ids }, projectId: p.id } })) !== new Set(ids).size) throw new HttpError(422, "Some tasks aren't in this project.");
  for (const m of moves) {
    const cur = await db.task.findUnique({ where: { id: m.id }, select: { stageId: true } });
    if (cur?.stageId !== m.stageId) await updateTask(ctx, m.id, { stageId: m.stageId, order: m.order });
    else await db.task.update({ where: { id: m.id }, data: { order: m.order } });
  }
  await refreshProject(p.id);
  return ok({ ok: true });
});
