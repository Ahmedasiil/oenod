import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { serialize } from "@/lib/resources";
import { token } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { emit } from "@/lib/webhooks";
import { actorName, canManageProject, loadProject, logActivity, refreshProject } from "@/lib/projects";
import { isManager } from "@/lib/rbac";

type P = { params: Promise<{ id: string }> };

// Everything the project page needs in one call: board, list, timeline, team, budget, activity.
export const GET = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg("projects");
  const p = await loadProject(ctx, (await params).id);
  const [stages, tasks, members, milestones, activity, files, logs, stats] = await Promise.all([
    db.projectStage.findMany({ where: { projectId: p.id }, orderBy: { order: "asc" } }),
    db.task.findMany({ where: { projectId: p.id }, orderBy: [{ order: "asc" }], include: { _count: { select: { comments: true, subtasks: true } } } }),
    db.projectMember.findMany({ where: { projectId: p.id } }),
    db.milestone.findMany({ where: { projectId: p.id }, orderBy: [{ order: "asc" }, { dueDate: "asc" }] }),
    db.projectActivity.findMany({ where: { projectId: p.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.projectFile.findMany({ where: { projectId: p.id }, select: { id: true, name: true, mime: true, size: true, url: true, taskId: true, uploadedBy: true, createdAt: true }, orderBy: { createdAt: "desc" } }),
    db.projectTimeLog.findMany({ where: { projectId: p.id }, orderBy: { date: "desc" }, take: 200 }),
    refreshProject(p.id),
  ]);
  const empIds = [...new Set([p.managerId, ...members.map((m) => m.employeeId), ...tasks.flatMap((t) => [t.assigneeId, ...t.assigneeIds]), ...logs.map((l) => l.employeeId)].filter(Boolean))] as string[];
  const people = await db.employee.findMany({ where: { id: { in: empIds } }, select: { id: true, firstName: true, lastName: true, photoUrl: true, jobTitle: true, email: true } });
  const client = p.contactId ? await db.contact.findUnique({ where: { id: p.contactId }, select: { id: true, firstName: true, lastName: true, company: true, email: true } }) : null;
  const unbilledHours = logs.filter((l) => l.billable && l.status !== "INVOICED" && !l.timerStartedAt).reduce((s, l) => s + l.hours, 0);
  return ok({
    project: serialize({ ...p, ...stats }),
    canManage: await canManageProject(ctx, p.id),
    stages, tasks: tasks.map(serialize), members: serialize(members), milestones: serialize(milestones), activity, files, timeLogs: serialize(logs), people, client,
    budget: { budget: Number(p.budget), spent: stats?.spent ?? 0, hours: stats?.hours ?? 0, estimateHours: p.estimateHours, unbilledHours, unbilledAmount: Math.round(unbilledHours * Number(p.hourlyRate) * 100) / 100 },
    portalUrl: p.portalToken ? `/p/${p.portalToken}` : null,
  });
});

const Patch = z.object({
  name: z.string().trim().min(2).max(140), description: z.string().max(10000).nullable(), contactId: z.string().nullable(), managerId: z.string().nullable(),
  status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "DONE", "CANCELLED"]), priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  billingType: z.enum(["FIXED", "HOURLY", "MILESTONES", "NON_BILLABLE"]), hourlyRate: z.number().min(0), budget: z.number().min(0), estimateHours: z.number().min(0),
  startDate: z.coerce.date().nullable(), dueDate: z.coerce.date().nullable(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), visibility: z.enum(["TEAM", "ORG", "PRIVATE"]),
  tags: z.array(z.string()), clientPortal: z.boolean(), isTemplate: z.boolean(), archived: z.boolean(),
}).partial();

export const PATCH = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects", "edit");
  const p = await loadProject(ctx, (await params).id);
  if (!(await canManageProject(ctx, p.id))) throw new HttpError(403, "Only the project lead or a manager can change project settings.");
  const { archived, ...d } = await body(req, Patch);
  for (const id of [d.managerId].filter(Boolean) as string[]) if (!(await db.employee.findFirst({ where: { id, orgId: ctx.org.id } }))) throw new HttpError(422, "Lead not found.");
  if (d.contactId && !(await db.contact.findFirst({ where: { id: d.contactId, orgId: ctx.org.id } }))) throw new HttpError(422, "Client not found.");
  const row = await db.project.update({
    where: { id: p.id },
    data: {
      ...d,
      ...(d.clientPortal && !p.portalToken ? { portalToken: token(18) } : {}),
      ...(d.status === "DONE" && p.status !== "DONE" ? { completedAt: new Date() } : {}),
      ...(archived !== undefined ? { archivedAt: archived ? new Date() : null } : {}),
    },
  });
  if (d.managerId) await db.projectMember.upsert({ where: { projectId_employeeId: { projectId: p.id, employeeId: d.managerId } }, create: { projectId: p.id, employeeId: d.managerId, role: "LEAD" }, update: { role: "LEAD" } });
  const changed = Object.keys(d).concat(archived !== undefined ? ["archived"] : []);
  await logActivity(p.id, actorName(ctx), "updated", changed.join(", "));
  if (d.status && d.status !== p.status) await emit(ctx.org.id, "project.status_changed", { id: p.id, from: p.status, to: d.status });
  await audit(ctx, "projects.updated", "projects", p.id, d);
  await refreshProject(p.id);
  return ok({ data: serialize(row) });
});

export const DELETE = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg("projects", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only managers can delete projects. Archive it instead.");
  const p = await loadProject(ctx, (await params).id);
  await db.project.delete({ where: { id: p.id } });
  await audit(ctx, "projects.deleted", "projects", p.id, { name: p.name });
  return ok({ ok: true });
});
