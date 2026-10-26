import type Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import type { OrgCtx } from "../http";
import { canAccess, HUMAN_APPROVAL_REQUIRED, type Grants } from "../rbac";
import { RESOURCES, resourceByKey, createResource, updateResource, listResource, serialize } from "../resources";
import { createPayRun } from "../payroll";
import { emailLayout, sendEmail } from "../messaging";
import { APP_URL } from "../env";
import { emit } from "../webhooks";
import { money } from "../format";
import { projectScope } from "../projects";
import { runCustom } from "../integrations/custom";

type Input = Record<string, any>;
type Tool = Anthropic.Beta.BetaTool & { kind: "read" | "action"; worker: string; module?: string; humanOnly?: string };

const resourceEnum = RESOURCES.filter((r) => !r.readOnly).map((r) => r.key);

export const TOOLS: Tool[] = [
  { kind: "read", worker: "REPORTING", name: "business_snapshot", description: "Today's key numbers: sales, labour, cash owed, overdue invoices, stock, open shifts, alerts, approvals and fleet. Call this first for any 'how are we doing' question.", input_schema: { type: "object", properties: {} } },
  { kind: "read", worker: "COORDINATOR", name: "search_records", description: `Search any OENOD records. Resources: ${RESOURCES.map((r) => r.key).join(", ")}.`, input_schema: { type: "object", properties: { resource: { type: "string", enum: RESOURCES.map((r) => r.key) }, query: { type: "string" }, status: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 50 } }, required: ["resource"] } },
  { kind: "read", worker: "FINANCE", module: "sales", name: "overdue_invoices", description: "List unpaid invoices past their due date, excluding disputed ones.", input_schema: { type: "object", properties: {} } },
  { kind: "read", worker: "INVENTORY", module: "inventory", name: "low_stock", description: "Products at or below reorder point with on-hand quantity and supplier.", input_schema: { type: "object", properties: {} } },
  { kind: "read", worker: "SCHEDULING", module: "scheduling", name: "schedule", description: "Shifts in a date range with assignee, plus uncovered shifts and approved leave.", input_schema: { type: "object", properties: { from: { type: "string", description: "ISO date" }, to: { type: "string", description: "ISO date" } }, required: ["from", "to"] } },
  { kind: "read", worker: "REPORTING", module: "reports", name: "sales_summary", description: "Sales totals by day and by location for the last N days, with top products.", input_schema: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 365 } }, required: ["days"] } },
  { kind: "read", worker: "OPERATIONS", module: "fleet", name: "fleet_status", description: "Live status of every vehicle and the latest fleet events (speeding, long stops, geofences).", input_schema: { type: "object", properties: {} } },
  { kind: "read", worker: "COORDINATOR", name: "pending_approvals", description: "Everything waiting for a person: AI actions, leave requests, bills, expenses.", input_schema: { type: "object", properties: {} } },
  { kind: "read", worker: "OPERATIONS", module: "projects", name: "project_status", description: "Status of active projects: progress, health, budget used, overdue and blocked tasks, upcoming milestones. Pass projectId for one project in detail.", input_schema: { type: "object", properties: { projectId: { type: "string" } } } },
  { kind: "read", worker: "COORDINATOR", module: "integrations", name: "list_connectors", description: "Apps this company connected through the connector builder, with the actions each one offers.", input_schema: { type: "object", properties: {} } },
  { kind: "action", worker: "COORDINATOR", module: "integrations", name: "call_connector", description: "Run one action of a connected app (from list_connectors), for example create a record in their own system. Read actions (GET) run under the same autonomy rules as any other action.", input_schema: { type: "object", properties: { connectorId: { type: "string" }, action: { type: "string" }, input: { type: "object" }, reason: { type: "string" } }, required: ["connectorId", "action", "reason"] } },
  { kind: "action", worker: "COORDINATOR", name: "create_record", description: `Create a record in any module (task, contact, shift, work order, booking, product, job posting, monitor, etc). Resources: ${resourceEnum.join(", ")}. Field names follow the API docs.`, input_schema: { type: "object", properties: { resource: { type: "string", enum: resourceEnum }, data: { type: "object" }, reason: { type: "string" } }, required: ["resource", "data", "reason"] } },
  { kind: "action", worker: "COORDINATOR", name: "update_record", description: "Update fields on an existing record (for example approve leave, move a deal stage, assign a shift).", input_schema: { type: "object", properties: { resource: { type: "string", enum: resourceEnum }, id: { type: "string" }, data: { type: "object" }, reason: { type: "string" } }, required: ["resource", "id", "data", "reason"] } },
  { kind: "action", worker: "FINANCE", module: "sales", name: "send_invoice_reminders", description: "Email polite payment reminders for the given overdue invoices.", input_schema: { type: "object", properties: { invoiceIds: { type: "array", items: { type: "string" } }, reason: { type: "string" } }, required: ["invoiceIds", "reason"] } },
  { kind: "action", worker: "INVENTORY", module: "purchasing", name: "create_purchase_order", description: "Prepare a purchase order for a supplier. Orders above the spending limit always need approval.", input_schema: { type: "object", properties: { supplierId: { type: "string" }, items: { type: "array", items: { type: "object", properties: { productId: { type: "string" }, name: { type: "string" }, qty: { type: "number" }, price: { type: "number" } }, required: ["name", "qty", "price"] } }, reason: { type: "string" } }, required: ["items", "reason"] } },
  { kind: "action", worker: "PAYROLL", module: "payroll", name: "prepare_payroll", description: "Calculate a draft pay run from approved hours. Releasing payroll always requires a person's approval.", input_schema: { type: "object", properties: { periodStart: { type: "string" }, periodEnd: { type: "string" }, payDate: { type: "string" }, reason: { type: "string" } }, required: ["periodStart", "periodEnd", "payDate", "reason"] } },
  { kind: "action", worker: "MARKETING", module: "marketing", name: "draft_campaign", description: "Draft an email or SMS campaign. It is only ever saved as a draft; sending needs a person and only reaches contacts who gave consent.", humanOnly: "send_campaign", input_schema: { type: "object", properties: { name: { type: "string" }, channel: { type: "string", enum: ["EMAIL", "SMS"] }, subject: { type: "string" }, content: { type: "string" }, segmentId: { type: "string" }, reason: { type: "string" } }, required: ["name", "channel", "content", "reason"] } },
  { kind: "action", worker: "MARKETING", module: "reviews", name: "reply_to_review", description: "Reply to a customer review (posted to Google when connected).", input_schema: { type: "object", properties: { reviewId: { type: "string" }, reply: { type: "string" }, reason: { type: "string" } }, required: ["reviewId", "reply", "reason"] } },
];

export const toolByName = (n: string) => TOOLS.find((t) => t.name === n);

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export async function runReadTool(ctx: OrgCtx, name: string, input: Input): Promise<unknown> {
  const orgId = ctx.org.id;
  switch (name) {
    case "business_snapshot": {
      const today = startOfDay();
      const [sales, ordersN, overdue, openShifts, onClock, alerts, approvals, vehicles, ar] = await Promise.all([
        db.order.aggregate({ where: { orgId, status: "PAID", createdAt: { gte: today } }, _sum: { total: true }, _count: true }),
        db.order.count({ where: { orgId, createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } }),
        db.invoice.aggregate({ where: { orgId, status: { in: ["SENT", "PARTIAL", "OVERDUE"] }, dueDate: { lt: new Date() } }, _sum: { total: true }, _count: true }),
        db.shift.count({ where: { orgId, employeeId: null, start: { gte: new Date(), lte: new Date(Date.now() + 7 * 864e5) } } }),
        db.timeEntry.count({ where: { orgId, clockOut: null } }),
        db.alert.findMany({ where: { orgId, status: "OPEN" }, take: 10, orderBy: { createdAt: "desc" } }),
        db.aiAction.count({ where: { orgId, status: "NEEDS_APPROVAL" } }),
        db.vehicle.groupBy({ by: ["status"], where: { orgId }, _count: true }),
        db.invoice.aggregate({ where: { orgId, status: { in: ["SENT", "PARTIAL", "OVERDUE"] } }, _sum: { total: true, amountPaid: true } }),
      ]);
      return {
        asOf: new Date().toISOString(),
        salesToday: Number(sales._sum.total ?? 0), ordersToday: sales._count, ordersLast7Days: ordersN,
        receivable: Number(ar._sum.total ?? 0) - Number(ar._sum.amountPaid ?? 0),
        overdueInvoices: overdue._count, overdueAmount: Number(overdue._sum.total ?? 0),
        uncoveredShiftsNext7Days: openShifts, employeesClockedIn: onClock,
        openAlerts: alerts.map((a) => ({ title: a.title, message: a.message, severity: a.severity })),
        pendingApprovals: approvals,
        fleet: Object.fromEntries(vehicles.map((v) => [v.status, v._count])),
      };
    }
    case "search_records": {
      const spec = resourceByKey(input.resource);
      if (!spec || !canAccess(ctx.role, spec.module, ctx.membership?.grants as Grants | null)) return { error: "No access to that resource." };
      const p = new URLSearchParams({ limit: String(input.limit ?? 20) });
      if (input.query) p.set("q", input.query);
      if (input.status) p.set("status", input.status);
      return listResource(spec, ctx, p);
    }
    case "overdue_invoices": {
      const rows = await db.invoice.findMany({ where: { orgId, status: { in: ["SENT", "PARTIAL", "OVERDUE"] }, dueDate: { lt: new Date() } }, include: { contact: true }, orderBy: { dueDate: "asc" }, take: 50 });
      return rows.map((i) => ({ id: i.id, number: i.number, customer: i.contact ? `${i.contact.firstName} ${i.contact.lastName ?? ""}`.trim() : null, email: i.contact?.email, balance: Number(i.total) - Number(i.amountPaid), dueDate: i.dueDate, daysOverdue: Math.floor((Date.now() - i.dueDate.getTime()) / 864e5), remindersSent: i.remindersSent }));
    }
    case "low_stock": {
      const products = await db.product.findMany({ where: { orgId, trackStock: true, active: true, reorderPoint: { gt: 0 } }, include: { stock: true, supplier: true } });
      return products.map((p) => ({ id: p.id, name: p.name, onHand: p.stock.reduce((s, x) => s + Number(x.quantity), 0), reorderPoint: p.reorderPoint, reorderQty: p.reorderQty, cost: Number(p.cost), supplierId: p.supplierId, supplier: p.supplier?.name })).filter((p) => p.onHand <= p.reorderPoint);
    }
    case "schedule": {
      const from = new Date(input.from), to = new Date(input.to);
      const [shifts, leave] = await Promise.all([
        db.shift.findMany({ where: { orgId, start: { gte: from, lte: to } }, include: { employee: true, location: true }, orderBy: { start: "asc" }, take: 300 }),
        db.leaveRequest.findMany({ where: { orgId, status: "APPROVED", startDate: { lte: to }, endDate: { gte: from } }, include: { employee: true } }),
      ]);
      return {
        shifts: shifts.map((s) => ({ id: s.id, start: s.start, end: s.end, role: s.role, status: s.status, location: s.location?.name, employee: s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : null })),
        uncovered: shifts.filter((s) => !s.employeeId).length,
        approvedLeave: leave.map((l) => ({ employee: `${l.employee.firstName} ${l.employee.lastName}`, from: l.startDate, to: l.endDate, type: l.type })),
      };
    }
    case "sales_summary": {
      const since = new Date(Date.now() - Number(input.days) * 864e5);
      const orders = await db.order.findMany({ where: { orgId, status: "PAID", createdAt: { gte: since } }, include: { items: true, location: true } });
      const byDay: Record<string, number> = {}, byLoc: Record<string, number> = {}, byProd: Record<string, number> = {};
      for (const o of orders) {
        const d = o.createdAt.toISOString().slice(0, 10);
        byDay[d] = (byDay[d] ?? 0) + Number(o.total);
        const l = o.location?.name ?? "Online";
        byLoc[l] = (byLoc[l] ?? 0) + Number(o.total);
        for (const i of o.items) byProd[i.name] = (byProd[i.name] ?? 0) + Number(i.price) * Number(i.quantity);
      }
      return { from: since.toISOString(), orders: orders.length, total: orders.reduce((s, o) => s + Number(o.total), 0), byDay, byLocation: byLoc, topProducts: Object.entries(byProd).sort((a, b) => b[1] - a[1]).slice(0, 10) };
    }
    case "fleet_status": {
      const [vehicles, events] = await Promise.all([
        db.vehicle.findMany({ where: { orgId } }),
        db.fleetEvent.findMany({ where: { orgId }, orderBy: { at: "desc" }, take: 20, include: { vehicle: true } }),
      ]);
      return { vehicles: vehicles.map((v) => ({ id: v.id, name: v.name, plate: v.plate, status: v.status, speedKmh: v.lastSpeedKmh, lastSeenAt: v.lastSeenAt, lat: v.lastLat, lng: v.lastLng })), events: events.map((e) => ({ vehicle: e.vehicle.name, kind: e.kind, message: e.message, at: e.at })) };
    }
    case "project_status": {
      const scope = await projectScope(ctx);
      const where = { orgId, archivedAt: null, isTemplate: false, ...(input.projectId ? { id: input.projectId } : { status: { in: ["PLANNED", "ACTIVE", "ON_HOLD"] } }), ...(scope ? scope.projects : {}) };
      const projects = await db.project.findMany({ where, take: input.projectId ? 1 : 30, orderBy: [{ health: "desc" }, { dueDate: "asc" }], include: { milestones: { where: { completedAt: null }, orderBy: { dueDate: "asc" }, take: 3 } } });
      const now = new Date();
      return Promise.all(projects.map(async (p) => {
        const [overdue, blocked, open] = await Promise.all([
          db.task.findMany({ where: { projectId: p.id, status: { not: "DONE" }, dueDate: { lt: now } }, take: input.projectId ? 20 : 3, select: { id: true, title: true, dueDate: true } }),
          db.task.findMany({ where: { projectId: p.id, status: "BLOCKED" }, take: 10, select: { id: true, title: true } }),
          db.task.count({ where: { projectId: p.id, status: { not: "DONE" } } }),
        ]);
        return { id: p.id, code: p.code, name: p.name, status: p.status, health: p.health, progress: p.progress, dueDate: p.dueDate, budget: Number(p.budget), spent: Number(p.spent), budgetUsedPct: Number(p.budget) ? Math.round((Number(p.spent) / Number(p.budget)) * 100) : null, openTasks: open, overdueTasks: overdue, blockedTasks: blocked, nextMilestones: p.milestones.map((m: any) => ({ name: m.name, dueDate: m.dueDate })) };
      }));
    }
    case "list_connectors": {
      const cs = await db.customConnector.findMany({ where: { orgId, status: { not: "PAUSED" } }, select: { id: true, name: true, description: true, status: true, actions: true } });
      return cs.map((c) => ({ id: c.id, name: c.name, description: c.description, status: c.status, actions: ((c.actions ?? []) as any[]).map((a) => ({ key: a.key, name: a.name, method: a.method, description: a.description })) }));
    }
    case "pending_approvals": {
      const [actions, leave, bills, expenses] = await Promise.all([
        db.aiAction.findMany({ where: { orgId, status: "NEEDS_APPROVAL" }, take: 30 }),
        db.leaveRequest.findMany({ where: { orgId, status: "PENDING" }, include: { employee: true } }),
        db.bill.findMany({ where: { orgId, status: "AWAITING_APPROVAL" } }),
        db.expense.findMany({ where: { orgId, status: "SUBMITTED" } }),
      ]);
      return { aiActions: actions.map((a) => ({ id: a.id, title: a.title, worker: a.worker })), leave: leave.map((l) => ({ id: l.id, employee: `${l.employee.firstName} ${l.employee.lastName}`, from: l.startDate, to: l.endDate })), bills: bills.map((b) => ({ id: b.id, number: b.number, amount: Number(b.amount) })), expenses: expenses.map((e) => ({ id: e.id, vendor: e.vendor, amount: Number(e.amount) })) };
    }
  }
  return { error: `Unknown tool ${name}` };
}

/** Carry out an approved (or automatic) action. Called once per AiAction (idempotent). */
export async function executeAction(ctx: OrgCtx, tool: string, input: Input): Promise<unknown> {
  const orgId = ctx.org.id;
  switch (tool) {
    case "create_record": {
      const spec = resourceByKey(input.resource);
      if (!spec || !canAccess(ctx.role, spec.module, ctx.membership?.grants as Grants | null)) throw new Error("No access to that resource.");
      return serialize(await createResource(spec, ctx, input.data));
    }
    case "update_record": {
      const spec = resourceByKey(input.resource);
      if (!spec || !canAccess(ctx.role, spec.module, ctx.membership?.grants as Grants | null)) throw new Error("No access to that resource.");
      return serialize(await updateResource(spec, ctx, input.id, input.data));
    }
    case "send_invoice_reminders": {
      const invoices = await db.invoice.findMany({ where: { orgId, id: { in: input.invoiceIds }, status: { in: ["SENT", "PARTIAL", "OVERDUE"] } }, include: { contact: true } });
      let sent = 0;
      for (const inv of invoices) {
        if (!inv.contact?.email) continue;
        const balance = Number(inv.total) - Number(inv.amountPaid);
        const r = await sendEmail({
          to: inv.contact.email, scope: "ORG", orgId, idempotencyKey: `reminder:${inv.id}:${inv.remindersSent + 1}`,
          subject: `Reminder: invoice ${inv.number} from ${ctx.org.name}`,
          html: emailLayout({ brand: ctx.org.name, title: `Invoice ${inv.number} is due`, body: `Hi ${inv.contact.firstName},\n\nThis is a friendly reminder that invoice ${inv.number} for ${money(balance, inv.currency)} was due on ${inv.dueDate.toLocaleDateString("en-CA")}.\n\nYou can view and pay it online with the button below. If you've already paid, thank you and please ignore this message.`, ctaLabel: "View and pay", ctaUrl: `${APP_URL}/pay/${inv.publicToken}` }),
        });
        if (r.ok) {
          sent++;
          await db.invoice.update({ where: { id: inv.id }, data: { remindersSent: { increment: 1 }, lastReminderAt: new Date(), status: "OVERDUE" } });
          await emit(orgId, "invoice.overdue", { id: inv.id, number: inv.number });
        }
      }
      return { sent, of: invoices.length };
    }
    case "create_purchase_order": {
      const spec = resourceByKey("purchaseorders")!;
      return serialize(await createResource(spec, ctx, { supplierId: input.supplierId, items: input.items, status: "ORDERED" }));
    }
    case "prepare_payroll": {
      const run = await createPayRun(orgId, new Date(input.periodStart), new Date(input.periodEnd), new Date(input.payDate));
      return { payRunId: run.id, gross: Number(run.gross), net: Number(run.net), employees: run.stubs.length, status: "DRAFT — needs approval in Payroll before release" };
    }
    case "call_connector": {
      const c = await db.customConnector.findFirst({ where: { id: input.connectorId, orgId } });
      if (!c) throw new Error("Connector not found.");
      if (c.status === "PAUSED") throw new Error(`${c.name} is paused.`);
      const r = await runCustom(c, input.action, input.input ?? {});
      if (!r.ok) throw new Error(`${c.name} answered with HTTP ${r.status}.`);
      return { status: r.status, data: typeof r.data === "string" ? r.data.slice(0, 4000) : r.data };
    }
    case "draft_campaign": {
      const c = await db.campaign.create({ data: { orgId, name: input.name, channel: input.channel, subject: input.subject, content: input.content, segmentId: input.segmentId || null, status: "DRAFT" } });
      return { campaignId: c.id, status: "DRAFT" };
    }
    case "reply_to_review": {
      const rv = await db.review.findFirst({ where: { id: input.reviewId, orgId } });
      if (!rv) throw new Error("Review not found");
      if (rv.source === "GOOGLE" && rv.externalId) {
        const { replyToGoogleReview } = await import("../integrations/google");
        await replyToGoogleReview(orgId, rv.externalId, input.reply);
      }
      await db.review.update({ where: { id: rv.id }, data: { reply: input.reply, repliedAt: new Date() } });
      return { replied: true };
    }
  }
  throw new Error(`Unknown action ${tool}`);
}

/** Decide what happens to an action the AI proposes. */
export async function proposeAction(ctx: OrgCtx, tool: Tool, input: Input, autonomyOverride?: string) {
  const orgId = ctx.org.id;
  const title = describe(tool.name, input);
  if (tool.module && !canAccess(ctx.role, tool.module, ctx.membership?.grants as Grants | null)) return { status: "BLOCKED", message: "The person asking doesn't have access to this area." };

  const rule = await db.automationRule.findFirst({ where: { orgId, enabled: true, action: tool.name.toUpperCase() } });
  let autonomy = autonomyOverride ?? rule?.autonomy ?? ctx.org.aiDefaultAutonomy;
  if (tool.humanOnly || HUMAN_APPROVAL_REQUIRED.has(tool.name)) autonomy = autonomy === "AUTO" ? "APPROVE" : autonomy;
  if (tool.name === "create_purchase_order") {
    const total = (input.items ?? []).reduce((s: number, i: any) => s + Number(i.qty) * Number(i.price), 0);
    const cap = rule?.spendLimit ? Number(rule.spendLimit) : 300;
    if (total > cap) autonomy = "APPROVE";
  }

  const base = { orgId, worker: tool.worker, title, reason: input.reason ?? null, tool: tool.name, input, autonomy, requestedBy: ctx.user?.name ?? "API" };
  if (ctx.org.aiPaused) {
    const a = await db.aiAction.create({ data: { ...base, status: "BLOCKED", error: "Automations are paused (emergency stop is on)." } });
    return { status: "BLOCKED", actionId: a.id, message: "Automations are paused, so this was not done." };
  }
  if (ctx.org.aiSimulation) {
    const a = await db.aiAction.create({ data: { ...base, status: "SIMULATED" } });
    return { status: "SIMULATED", actionId: a.id, message: "Simulation mode: recorded what would happen, nothing was changed." };
  }
  if (autonomy !== "AUTO") {
    const a = await db.aiAction.create({ data: { ...base, status: "NEEDS_APPROVAL" } });
    return { status: "NEEDS_APPROVAL", actionId: a.id, message: "Prepared and waiting for approval in the AI control centre." };
  }
  const a = await db.aiAction.create({ data: { ...base, status: "IN_PROGRESS", decidedBy: "automatic rule" } });
  return runApproved(ctx, a.id);
}

export async function runApproved(ctx: OrgCtx, actionId: string) {
  const a = await db.aiAction.findFirst({ where: { id: actionId, orgId: ctx.org.id } });
  if (!a) throw new Error("Action not found");
  if (a.status === "COMPLETED") return { status: "COMPLETED", actionId, result: a.result };
  try {
    const result = await executeAction(ctx, a.tool!, a.input as Input);
    await db.aiAction.update({ where: { id: a.id }, data: { status: "COMPLETED", result: JSON.parse(JSON.stringify(result ?? null)), executedAt: new Date() } });
    if (a.tool && a.input) await db.automationRule.updateMany({ where: { orgId: ctx.org.id, action: a.tool.toUpperCase() }, data: { runCount: { increment: 1 }, lastRunAt: new Date() } });
    await emit(ctx.org.id, "ai.action_completed", { id: a.id, title: a.title, result });
    return { status: "COMPLETED", actionId, result };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await db.aiAction.update({ where: { id: a.id }, data: { status: "FAILED", error } });
    return { status: "FAILED", actionId, error };
  }
}

function describe(tool: string, i: Input) {
  switch (tool) {
    case "create_record": return `Create ${resourceByKey(i.resource)?.singular.toLowerCase() ?? i.resource}${i.data?.title || i.data?.name ? `: ${i.data.title ?? i.data.name}` : ""}`;
    case "update_record": return `Update ${resourceByKey(i.resource)?.singular.toLowerCase() ?? i.resource}`;
    case "call_connector": return `Run "${i.action}" on a connected app`;
    case "send_invoice_reminders": return `Send ${i.invoiceIds?.length ?? 0} payment reminder(s)`;
    case "create_purchase_order": return `Order ${i.items?.length ?? 0} item(s) from supplier`;
    case "prepare_payroll": return `Prepare payroll ${i.periodStart} to ${i.periodEnd}`;
    case "draft_campaign": return `Draft campaign: ${i.name}`;
    case "reply_to_review": return "Reply to a review";
  }
  return tool;
}
