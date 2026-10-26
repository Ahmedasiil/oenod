import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { actorName, canManageProject, loadProject, logActivity } from "@/lib/projects";
import { notify } from "@/lib/audit";

type P = { params: Promise<{ id: string }> };

// Add people (or change their role / rate / allocation).
export const POST = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects", "edit");
  const p = await loadProject(ctx, (await params).id);
  if (!(await canManageProject(ctx, p.id))) throw new HttpError(403, "Only the project lead or a manager can change the team.");
  const d = await body(req, z.object({ employeeIds: z.array(z.string()).min(1), role: z.enum(["LEAD", "MEMBER", "VIEWER"]).default("MEMBER"), hourlyRate: z.number().min(0).nullable().optional(), allocationPct: z.number().int().min(0).max(100).optional() }));
  const emps = await db.employee.findMany({ where: { orgId: ctx.org.id, id: { in: d.employeeIds } }, include: { membership: true } });
  if (emps.length !== d.employeeIds.length) throw new HttpError(422, "Some people weren't found in this company.");
  for (const e of emps) {
    const existed = await db.projectMember.findUnique({ where: { projectId_employeeId: { projectId: p.id, employeeId: e.id } } });
    await db.projectMember.upsert({
      where: { projectId_employeeId: { projectId: p.id, employeeId: e.id } },
      create: { projectId: p.id, employeeId: e.id, role: d.role, hourlyRate: d.hourlyRate ?? undefined, allocationPct: d.allocationPct ?? 100 },
      update: { role: d.role, ...(d.hourlyRate !== undefined ? { hourlyRate: d.hourlyRate } : {}), ...(d.allocationPct !== undefined ? { allocationPct: d.allocationPct } : {}) },
    });
    if (!existed) {
      await logActivity(p.id, actorName(ctx), "added_member", `${e.firstName} ${e.lastName ?? ""}`.trim());
      if (e.membership?.userId) await notify(ctx.org.id, `You were added to ${p.name}`, { userId: e.membership.userId, link: `/app/projects/${p.id}` });
    }
  }
  return ok({ ok: true });
});

export const DELETE = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects", "edit");
  const p = await loadProject(ctx, (await params).id);
  if (!(await canManageProject(ctx, p.id))) throw new HttpError(403, "Only the project lead or a manager can change the team.");
  const employeeId = new URL(req.url).searchParams.get("employeeId");
  if (!employeeId) throw new HttpError(422, "employeeId is required.");
  await db.projectMember.deleteMany({ where: { projectId: p.id, employeeId } });
  if (p.managerId === employeeId) await db.project.update({ where: { id: p.id }, data: { managerId: null } });
  await logActivity(p.id, actorName(ctx), "removed_member", employeeId);
  return ok({ ok: true });
});
