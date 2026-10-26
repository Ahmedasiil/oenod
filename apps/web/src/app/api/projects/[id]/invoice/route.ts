import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { createResource, getSpec, serialize } from "@/lib/resources";
import { actorName, loadProject, logActivity } from "@/lib/projects";
import { isFinance, isManager } from "@/lib/rbac";

type P = { params: Promise<{ id: string }> };

// Bill the client: unbilled approved hours and/or completed milestones become a draft invoice.
export const POST = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects", "edit");
  if (!isManager(ctx.role) && !isFinance(ctx.role)) throw new HttpError(403, "Only managers or finance can invoice a project.");
  const p = await loadProject(ctx, (await params).id);
  if (!p.contactId) throw new HttpError(422, "Add a client to the project first.");
  const d = await body(req, z.object({ includeTime: z.boolean().default(true), milestoneIds: z.array(z.string()).default([]), until: z.coerce.date().optional(), groupBy: z.enum(["person", "task", "single"]).default("task") }));
  const logs = d.includeTime ? await db.projectTimeLog.findMany({ where: { projectId: p.id, billable: true, status: { not: "INVOICED" }, timerStartedAt: null, ...(d.until ? { date: { lte: d.until } } : {}) } }) : [];
  const ms = d.milestoneIds.length ? await db.milestone.findMany({ where: { projectId: p.id, id: { in: d.milestoneIds }, invoiceId: null } }) : [];
  const rate = Number(p.hourlyRate);
  const items: { name: string; qty: number; price: number }[] = [];
  if (logs.length) {
    if (rate <= 0) throw new HttpError(422, "Set an hourly rate on the project to bill hours.");
    const groups = new Map<string, number>();
    const tasks = await db.task.findMany({ where: { id: { in: logs.map((l) => l.taskId).filter(Boolean) as string[] } }, select: { id: true, title: true } });
    const emps = await db.employee.findMany({ where: { id: { in: logs.map((l) => l.employeeId) } }, select: { id: true, firstName: true, lastName: true } });
    for (const l of logs) {
      const key = d.groupBy === "single" ? `${p.name} — professional services` : d.groupBy === "person" ? (() => { const e = emps.find((x) => x.id === l.employeeId); return `${p.name} — ${e?.firstName ?? ""} ${e?.lastName ?? ""}`.trim(); })() : `${p.name} — ${tasks.find((t) => t.id === l.taskId)?.title ?? "General work"}`;
      groups.set(key, (groups.get(key) ?? 0) + l.hours);
    }
    for (const [name, hours] of groups) items.push({ name: `${name} (hours)`, qty: Math.round(hours * 100) / 100, price: rate });
  }
  for (const m of ms) items.push({ name: `${p.name} — milestone: ${m.name}`, qty: 1, price: Number(m.amount) });
  if (!items.length) throw new HttpError(422, "Nothing to bill yet.");
  const inv = await createResource(getSpec("invoices", ctx, "edit"), ctx, { contactId: p.contactId, items, status: "DRAFT", notes: `Project ${p.code}: ${p.name}` });
  await db.projectTimeLog.updateMany({ where: { id: { in: logs.map((l) => l.id) } }, data: { status: "INVOICED", invoiceId: inv.id } });
  await db.milestone.updateMany({ where: { id: { in: ms.map((m) => m.id) } }, data: { invoiceId: inv.id } });
  await logActivity(p.id, actorName(ctx), "invoiced", inv.number);
  return ok({ data: serialize(inv) }, 201);
});
