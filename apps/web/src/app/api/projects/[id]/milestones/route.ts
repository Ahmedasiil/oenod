import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { serialize } from "@/lib/resources";
import { actorName, canManageProject, loadProject, logActivity } from "@/lib/projects";
import { emit } from "@/lib/webhooks";

type P = { params: Promise<{ id: string }> };
const M = z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(140), description: z.string().max(4000).nullable().optional(), dueDate: z.coerce.date().nullable().optional(), amount: z.number().min(0).default(0), status: z.enum(["OPEN", "DONE", "MISSED"]).default("OPEN"), order: z.number().int().optional() });

// Create or update a milestone. Completing a billing milestone makes it ready to invoice.
export const POST = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects", "edit");
  const p = await loadProject(ctx, (await params).id);
  if (!(await canManageProject(ctx, p.id))) throw new HttpError(403, "Only the project lead or a manager can change milestones.");
  const { id, ...d } = await body(req, M);
  let m;
  if (id) {
    const prev = await db.milestone.findFirst({ where: { id, projectId: p.id } });
    if (!prev) throw new HttpError(404, "Milestone not found.");
    m = await db.milestone.update({ where: { id }, data: { ...d, completedAt: d.status === "DONE" && prev.status !== "DONE" ? new Date() : prev.completedAt } });
    if (d.status === "DONE" && prev.status !== "DONE") {
      await logActivity(p.id, actorName(ctx), "milestone_done", m.name);
      await emit(ctx.org.id, "milestone.completed", { id: m.id, projectId: p.id, name: m.name, amount: Number(m.amount) });
    }
  } else {
    m = await db.milestone.create({ data: { ...d, projectId: p.id, order: d.order ?? (await db.milestone.count({ where: { projectId: p.id } })) } });
    await logActivity(p.id, actorName(ctx), "milestone_added", m.name);
  }
  return ok({ data: serialize(m) });
});

export const DELETE = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects", "edit");
  const p = await loadProject(ctx, (await params).id);
  if (!(await canManageProject(ctx, p.id))) throw new HttpError(403, "Only the project lead or a manager can change milestones.");
  const id = new URL(req.url).searchParams.get("milestoneId") ?? "";
  await db.milestone.deleteMany({ where: { id, projectId: p.id } });
  return ok({ ok: true });
});
