import { Prisma } from "@prisma/client";
import { db } from "./db";
import { HttpError, type OrgCtx } from "./http";
import { isManager } from "./rbac";
import { notify } from "./audit";
import { emit } from "./webhooks";
import { emailLayout, sendEmail } from "./messaging";
import { APP_URL } from "./env";

export const DEFAULT_STAGES = [
  { name: "To do", color: "#94A3B8", isDone: false },
  { name: "In progress", color: "#2342E0", isDone: false },
  { name: "Review", color: "#F59E0B", isDone: false },
  { name: "Done", color: "#16A34A", isDone: true },
];
const STAGE_STATUS = ["TODO", "DOING", "REVIEW", "DONE"];

/** The employee record of the signed-in person (null for API keys and owners without one). */
export async function meEmployee(ctx: OrgCtx) {
  if (!ctx.membership?.id) return null;
  return db.employee.findFirst({ where: { orgId: ctx.org.id, membershipId: ctx.membership.id } });
}

/**
 * Which projects/tasks a person can see. Managers see everything; others see
 * company-wide projects, projects they belong to or lead, and tasks assigned to them.
 */
export async function projectScope(ctx: OrgCtx) {
  if (isManager(ctx.role) || ctx.actor === "api") return null;
  const me = await meEmployee(ctx);
  const id = me?.id ?? "__none__";
  const visible: Prisma.ProjectWhereInput = { OR: [{ visibility: "ORG" }, { managerId: id }, { members: { some: { employeeId: id } } }] };
  return {
    me,
    projects: visible,
    tasks: { OR: [{ assigneeId: id }, { assigneeIds: { has: id } }, { project: visible }] } as Prisma.TaskWhereInput,
  };
}

export async function loadProject(ctx: OrgCtx, id: string) {
  const scope = await projectScope(ctx);
  const p = await db.project.findFirst({ where: { id, orgId: ctx.org.id, ...(scope ? { AND: [scope.projects] } : {}) } });
  if (!p) throw new HttpError(404, "Project not found.");
  return p;
}

/** Can this person change the project (not just its tasks)? */
export async function canManageProject(ctx: OrgCtx, projectId: string) {
  if (isManager(ctx.role) || ctx.actor === "api") return true;
  const me = await meEmployee(ctx);
  if (!me) return false;
  const p = await db.project.findFirst({ where: { id: projectId, OR: [{ managerId: me.id }, { members: { some: { employeeId: me.id, role: "LEAD" } } }] } });
  return Boolean(p);
}

export async function logActivity(projectId: string, actor: string, action: string, detail?: string, taskId?: string) {
  await db.projectActivity.create({ data: { projectId, actor, action, detail, taskId } });
}

export const actorName = (ctx: OrgCtx) => ctx.user?.name ?? (ctx.actor === "api" ? "API" : "System");

/** New projects get a board, and the lead becomes a member. */
export async function setupProject(projectId: string, ctx: OrgCtx, stages = DEFAULT_STAGES) {
  const p = await db.project.findUnique({ where: { id: projectId }, include: { stages: true } });
  if (!p) return;
  if (!p.stages.length) await db.projectStage.createMany({ data: stages.map((s, i) => ({ projectId, name: s.name, color: s.color, isDone: s.isDone, order: i })) });
  if (p.managerId) await db.projectMember.upsert({ where: { projectId_employeeId: { projectId, employeeId: p.managerId } }, create: { projectId, employeeId: p.managerId, role: "LEAD" }, update: { role: "LEAD" } });
  await logActivity(projectId, actorName(ctx), "created", p.name);
}

/** Place a new task at the end of the right column with the next number. */
export async function taskDefaults(projectId: string, status?: string) {
  const stages = await db.projectStage.findMany({ where: { projectId }, orderBy: { order: "asc" } });
  const idx = Math.max(0, STAGE_STATUS.indexOf(status ?? "TODO"));
  const stage = status === "DONE" ? stages.find((s) => s.isDone) : stages[Math.min(idx, stages.length - 1)];
  const [last, count] = await Promise.all([
    db.task.findFirst({ where: { projectId, stageId: stage?.id }, orderBy: { order: "desc" } }),
    db.task.count({ where: { projectId } }),
  ]);
  return { stageId: stage?.id, order: (last?.order ?? 0) + 1000, number: count + 1 };
}

/** Recalculate progress, hours, cost and health after any change. */
export async function refreshProject(projectId: string) {
  const p = await db.project.findUnique({ where: { id: projectId }, include: { members: true } });
  if (!p) return;
  const [tasks, logs, expenses] = await Promise.all([
    db.task.findMany({ where: { projectId, parentId: null }, select: { status: true, dueDate: true, estimateHours: true } }),
    db.projectTimeLog.findMany({ where: { projectId, timerStartedAt: null } }),
    db.expense.aggregate({ where: { orgId: p.orgId, projectId }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: null } })),
  ]);
  const done = tasks.filter((t) => t.status === "DONE").length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : p.status === "DONE" ? 100 : 0;
  // Labour cost: member cost rate, else employee pay rate.
  const emps = await db.employee.findMany({ where: { id: { in: [...new Set(logs.map((l) => l.employeeId))] } }, select: { id: true, payRate: true, payType: true } });
  const rate = (eid: string) => {
    const m = p.members.find((x) => x.employeeId === eid);
    if (m?.hourlyRate) return Number(m.hourlyRate);
    const e = emps.find((x) => x.id === eid);
    return e ? (e.payType === "SALARY" ? Number(e.payRate) / 2080 : Number(e.payRate)) : 0;
  };
  const labour = logs.reduce((s, l) => s + l.hours * rate(l.employeeId), 0);
  const spent = Math.round((labour + Number(expenses._sum.amount ?? 0)) * 100) / 100;
  const hours = logs.reduce((s, l) => s + l.hours, 0);
  const now = Date.now();
  const overdue = tasks.filter((t) => t.status !== "DONE" && t.dueDate && t.dueDate.getTime() < now).length;
  const budget = Number(p.budget);
  const elapsed = p.startDate && p.dueDate ? (now - p.startDate.getTime()) / Math.max(1, p.dueDate.getTime() - p.startDate.getTime()) : null;
  let health = "ON_TRACK";
  if ((budget > 0 && spent > budget) || (p.dueDate && p.dueDate.getTime() < now && progress < 100) || overdue >= 5) health = "OFF_TRACK";
  else if ((budget > 0 && spent > budget * 0.85) || overdue > 0 || (elapsed !== null && elapsed * 100 - progress > 25) || (p.estimateHours > 0 && hours > p.estimateHours)) health = "AT_RISK";
  if (p.status === "DONE") health = "ON_TRACK";
  await db.project.update({ where: { id: projectId }, data: { progress, spent, health } });
  return { progress, spent, health, hours, overdue, labour };
}

/** Tell people they were assigned (in-app + email). */
export async function notifyAssigned(orgId: string, employeeIds: string[], task: { id: string; title: string; projectId: string | null; dueDate?: Date | null }, by: string) {
  if (!employeeIds.length) return;
  const emps = await db.employee.findMany({ where: { orgId, id: { in: employeeIds } }, include: { membership: { include: { user: true } } } });
  const project = task.projectId ? await db.project.findUnique({ where: { id: task.projectId } }) : null;
  const org = await db.organization.findUnique({ where: { id: orgId } });
  for (const e of emps) {
    const u = e.membership?.user;
    const link = `/app/projects/${task.projectId}?task=${task.id}`;
    await notify(orgId, `${by} assigned you: ${task.title}`, { body: project?.name, link, userId: u?.id, level: "info" });
    const to = u?.email ?? e.email;
    if (to) await sendEmail({ to, scope: "ORG", orgId, idempotencyKey: `assign:${task.id}:${e.id}`, subject: `New task: ${task.title}`, html: emailLayout({ brand: org?.name, title: "You have a new task", body: `${by} assigned you "${task.title}"${project ? ` in ${project.name}` : ""}.${task.dueDate ? `\nDue ${task.dueDate.toDateString()}.` : ""}`, ctaLabel: "Open task", ctaUrl: `${APP_URL}${link}` }) }).catch(() => {});
  }
}

export async function completeTaskSideEffects(orgId: string, task: { id: string; projectId: string | null; title: string; recurrence: string | null; dueDate: Date | null }) {
  await emit(orgId, "task.completed", { id: task.id, title: task.title, projectId: task.projectId });
  // Recurring tasks come back with the next due date.
  if (task.recurrence && task.dueDate) {
    const t = await db.task.findUnique({ where: { id: task.id } });
    if (!t) return;
    const next = new Date(task.dueDate);
    if (task.recurrence === "DAILY") next.setDate(next.getDate() + 1);
    if (task.recurrence === "WEEKLY") next.setDate(next.getDate() + 7);
    if (task.recurrence === "MONTHLY") next.setMonth(next.getMonth() + 1);
    const d = task.projectId ? await taskDefaults(task.projectId, "TODO") : {};
    await db.task.create({ data: { orgId, projectId: t.projectId, milestoneId: t.milestoneId, title: t.title, description: t.description, priority: t.priority, assigneeId: t.assigneeId, assigneeIds: t.assigneeIds, watcherIds: t.watcherIds, estimateHours: t.estimateHours, tags: t.tags, checklist: t.checklist ? (t.checklist as any[]).map((c) => ({ ...c, done: false })) : undefined, recurrence: t.recurrence, dueDate: next, ...d } });
  }
}

/** Copy a project (or template) with its board, milestones and tasks, shifting dates. */
export async function duplicateProject(ctx: OrgCtx, sourceId: string, opts: { name: string; startDate?: Date; contactId?: string | null; asTemplate?: boolean }) {
  const src = await db.project.findFirst({ where: { id: sourceId, orgId: ctx.org.id }, include: { stages: { orderBy: { order: "asc" } }, milestones: true, tasks: true, members: true } });
  if (!src) throw new HttpError(404, "Project not found.");
  const shift = opts.startDate && src.startDate ? opts.startDate.getTime() - src.startDate.getTime() : 0;
  const mv = (d: Date | null) => (d ? new Date(d.getTime() + shift) : null);
  const count = await db.project.count({ where: { orgId: ctx.org.id } });
  return db.$transaction(async (tx) => {
    const p = await tx.project.create({ data: {
      orgId: ctx.org.id, code: `PRJ-${String(count + 1001).padStart(5, "0")}`, name: opts.name, description: src.description, color: src.color, priority: src.priority, billingType: src.billingType,
      hourlyRate: src.hourlyRate, budget: src.budget, estimateHours: src.estimateHours, tags: src.tags, visibility: src.visibility, managerId: src.managerId, contactId: opts.contactId ?? src.contactId,
      isTemplate: Boolean(opts.asTemplate), status: "PLANNED", startDate: opts.startDate ?? src.startDate, dueDate: mv(src.dueDate), createdById: ctx.user?.id,
    } });
    const stageMap = new Map<string, string>(), msMap = new Map<string, string>(), taskMap = new Map<string, string>();
    for (const s of src.stages) stageMap.set(s.id, (await tx.projectStage.create({ data: { projectId: p.id, name: s.name, color: s.color, order: s.order, isDone: s.isDone, wipLimit: s.wipLimit } })).id);
    for (const m of src.milestones) msMap.set(m.id, (await tx.milestone.create({ data: { projectId: p.id, name: m.name, description: m.description, amount: m.amount, order: m.order, dueDate: mv(m.dueDate) } })).id);
    const firstStage = src.stages[0] ? stageMap.get(src.stages[0].id) : undefined;
    for (const t of [...src.tasks].sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0))) {
      const n = await tx.task.create({ data: {
        orgId: ctx.org.id, projectId: p.id, stageId: firstStage, milestoneId: t.milestoneId ? msMap.get(t.milestoneId) : null, parentId: t.parentId ? taskMap.get(t.parentId) : null,
        number: t.number, title: t.title, description: t.description, priority: t.priority, assigneeId: t.assigneeId, assigneeIds: t.assigneeIds, order: t.order, estimateHours: t.estimateHours,
        tags: t.tags, checklist: t.checklist ? (t.checklist as any[]).map((c) => ({ ...c, done: false })) : undefined, startDate: mv(t.startDate), dueDate: mv(t.dueDate), recurrence: t.recurrence,
      } });
      taskMap.set(t.id, n.id);
    }
    for (const [oldId, newId] of taskMap) {
      const deps = src.tasks.find((t) => t.id === oldId)?.dependsOn ?? [];
      if (deps.length) await tx.task.update({ where: { id: newId }, data: { dependsOn: deps.map((d) => taskMap.get(d)).filter(Boolean) as string[] } });
    }
    for (const m of src.members) await tx.projectMember.create({ data: { projectId: p.id, employeeId: m.employeeId, role: m.role, hourlyRate: m.hourlyRate, allocationPct: m.allocationPct } });
    await tx.projectActivity.create({ data: { projectId: p.id, actor: actorName(ctx), action: "created", detail: `from ${src.name}` } });
    return p;
  });
}
