import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { serialize } from "@/lib/resources";
import { isManager } from "@/lib/rbac";
import { token } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { emit } from "@/lib/webhooks";
import { DEFAULT_STAGES, duplicateProject, meEmployee, projectScope, refreshProject, setupProject } from "@/lib/projects";

// Portfolio view: every project with counts, health and team.
export const GET = route(async (req: Request) => {
  const ctx = await requireOrg("projects");
  const p = new URL(req.url).searchParams;
  const scope = await projectScope(ctx);
  const where = {
    orgId: ctx.org.id, isTemplate: p.get("templates") === "1", archivedAt: p.get("archived") === "1" ? { not: null } : null,
    ...(p.get("status") ? { status: p.get("status")! } : {}),
    ...(p.get("q") ? { OR: [{ name: { contains: p.get("q")!, mode: "insensitive" as const } }, { code: { contains: p.get("q")!, mode: "insensitive" as const } }] } : {}),
    ...(scope ? { AND: [scope.projects] } : {}),
  };
  const rows = await db.project.findMany({
    where, orderBy: [{ status: "asc" }, { dueDate: "asc" }], take: 200,
    include: { members: true, _count: { select: { tasks: true } }, milestones: { where: { status: "OPEN" }, orderBy: { dueDate: "asc" }, take: 1 } },
  });
  const ids = rows.map((r) => r.id);
  const [open, overdue, hours] = await Promise.all([
    db.task.groupBy({ by: ["projectId"], where: { projectId: { in: ids }, status: { not: "DONE" } }, _count: true }),
    db.task.groupBy({ by: ["projectId"], where: { projectId: { in: ids }, status: { not: "DONE" }, dueDate: { lt: new Date() } }, _count: true }),
    db.projectTimeLog.groupBy({ by: ["projectId"], where: { projectId: { in: ids } }, _sum: { hours: true } }),
  ]);
  const empIds = [...new Set(rows.flatMap((r) => [r.managerId, ...r.members.map((m) => m.employeeId)]).filter(Boolean))] as string[];
  const emps = await db.employee.findMany({ where: { id: { in: empIds } }, select: { id: true, firstName: true, lastName: true, photoUrl: true } });
  const clients = await db.contact.findMany({ where: { id: { in: rows.map((r) => r.contactId).filter(Boolean) as string[] } }, select: { id: true, firstName: true, lastName: true, company: true } });
  const data = rows.map((r) => ({
    ...serialize(r),
    openTasks: open.find((x) => x.projectId === r.id)?._count ?? 0,
    overdueTasks: overdue.find((x) => x.projectId === r.id)?._count ?? 0,
    hours: hours.find((x) => x.projectId === r.id)?._sum.hours ?? 0,
    nextMilestone: r.milestones[0] ? serialize(r.milestones[0]) : null,
    manager: emps.find((e) => e.id === r.managerId) ?? null,
    team: r.members.map((m) => emps.find((e) => e.id === m.employeeId)).filter(Boolean),
    client: clients.find((c) => c.id === r.contactId) ?? null,
  }));
  const summary = {
    active: data.filter((d) => d.status === "ACTIVE").length,
    atRisk: data.filter((d) => d.health !== "ON_TRACK" && d.status !== "DONE").length,
    overdueTasks: data.reduce((s, d) => s + d.overdueTasks, 0),
    budget: data.reduce((s, d) => s + Number(d.budget), 0),
    spent: data.reduce((s, d) => s + Number(d.spent), 0),
  };
  return ok({ data, summary });
});

const Create = z.object({
  name: z.string().trim().min(2).max(140),
  description: z.string().max(10000).optional(),
  templateId: z.string().optional(),
  contactId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  memberIds: z.array(z.string()).default([]),
  status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "DONE", "CANCELLED"]).default("ACTIVE"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  billingType: z.enum(["FIXED", "HOURLY", "MILESTONES", "NON_BILLABLE"]).default("FIXED"),
  hourlyRate: z.number().min(0).default(0),
  budget: z.number().min(0).default(0),
  estimateHours: z.number().min(0).default(0),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#2342E0"),
  visibility: z.enum(["TEAM", "ORG", "PRIVATE"]).default("TEAM"),
  tags: z.array(z.string()).default([]),
  clientPortal: z.boolean().default(false),
  stages: z.array(z.object({ name: z.string().min(1), color: z.string().default("#94A3B8"), isDone: z.boolean().default(false) })).optional(),
});

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("projects", "edit");
  const d = await body(req, Create);
  const me = await meEmployee(ctx);
  // Anyone with edit access can start a project; non-managers lead the projects they start.
  const managerId = d.managerId ?? (isManager(ctx.role) ? null : me?.id ?? null);
  for (const id of [managerId, ...d.memberIds].filter(Boolean) as string[]) {
    if (!(await db.employee.findFirst({ where: { id, orgId: ctx.org.id }, select: { id: true } }))) throw new HttpError(422, "One of the people isn't in this company.");
  }
  if (d.contactId && !(await db.contact.findFirst({ where: { id: d.contactId, orgId: ctx.org.id } }))) throw new HttpError(422, "Client not found.");

  let project;
  if (d.templateId) {
    project = await duplicateProject(ctx, d.templateId, { name: d.name, startDate: d.startDate ?? new Date(), contactId: d.contactId });
    project = await db.project.update({ where: { id: project.id }, data: { status: d.status, managerId: managerId ?? project.managerId, ...(d.dueDate ? { dueDate: d.dueDate } : {}), ...(d.budget ? { budget: d.budget } : {}) } });
  } else {
    const count = await db.project.count({ where: { orgId: ctx.org.id } });
    const { memberIds, stages, templateId, ...rest } = d;
    project = await db.project.create({ data: { ...rest, orgId: ctx.org.id, managerId, code: `PRJ-${String(count + 1001).padStart(5, "0")}`, createdById: ctx.user?.id, portalToken: d.clientPortal ? token(18) : null } });
    await setupProject(project.id, ctx, stages?.length ? stages : DEFAULT_STAGES);
  }
  for (const employeeId of d.memberIds) {
    await db.projectMember.upsert({ where: { projectId_employeeId: { projectId: project.id, employeeId } }, create: { projectId: project.id, employeeId }, update: {} });
  }
  if (managerId) await db.projectMember.upsert({ where: { projectId_employeeId: { projectId: project.id, employeeId: managerId } }, create: { projectId: project.id, employeeId: managerId, role: "LEAD" }, update: { role: "LEAD" } });
  await refreshProject(project.id);
  await audit(ctx, "projects.created", "projects", project.id, { name: project.name });
  await emit(ctx.org.id, "project.created", serialize(project));
  return ok({ data: serialize(project) }, 201);
});
