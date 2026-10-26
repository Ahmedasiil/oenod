import { z, type ZodTypeAny } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { RESOURCES, resourceByKey, type Field, type ResourceSpec } from "./fields";
import { HttpError, type OrgCtx } from "./http";
import { accessLevel, type Grants } from "./rbac";
import { audit } from "./audit";
import { emit } from "./webhooks";
import { slugify } from "./format";
import { token } from "./crypto";
import { setupProject, refreshProject, taskDefaults, projectScope } from "./projects";
import { postInvoice } from "./accounting";
import { decideLeave } from "./leave";

export { RESOURCES, resourceByKey };

function fieldSchema(f: Field): ZodTypeAny {
  const optStr = z.string().trim().max(10000);
  switch (f.type) {
    case "number": case "money": case "percent":
      return z.preprocess((v) => (v === "" || v === null ? null : v), z.coerce.number().nullable());
    case "date": case "datetime":
      return z.preprocess((v) => (v === "" || v === null ? null : v), z.coerce.date().nullable());
    case "boolean":
      return z.preprocess((v) => v === "true" || v === true || v === "on", z.boolean());
    case "tags":
      return z.preprocess((v) => (typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : v ?? []), z.array(z.string().max(200)).max(100));
    case "items":
      return z.array(z.object({ name: z.string().min(1).max(300), qty: z.coerce.number().min(0), price: z.coerce.number(), productId: z.string().optional().nullable(), taxable: z.boolean().optional() })).min(1);
    case "email":
      return z.preprocess((v) => (v === "" ? null : v), z.string().email().nullable());
    case "ref":
      return z.preprocess((v) => (v === "" ? null : v), z.string().nullable());
    case "select":
      return f.options ? z.preprocess((v) => (v === "" && !f.options!.includes("") ? undefined : v), z.enum(f.options as [string, ...string[]]).optional()) : optStr;
    default:
      return z.preprocess((v) => (v === "" ? null : v), optStr.nullable());
  }
}

export function schemaFor(spec: ResourceSpec, partial: boolean) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const f of spec.fields) {
    if (f.readOnly) continue;
    let s = fieldSchema(f);
    if (!f.required || partial) s = s.optional();
    shape[f.name] = s;
  }
  return z.object(shape).strip();
}

// Fields we never return over the API.
const HIDDEN = new Set(["resumeData", "accessToken", "refreshToken", "secret", "kioskPin", "data"]);

export function serialize<T>(row: T): T {
  return JSON.parse(JSON.stringify(row, (k, v) => (HIDDEN.has(k) ? undefined : v instanceof Prisma.Decimal ? Number(v) : v)));
}

const delegate = (spec: ResourceSpec) => (db as unknown as Record<string, any>)[spec.model];

export function getSpec(key: string, ctx: OrgCtx, need: "view" | "edit" = "view") {
  const spec = resourceByKey(key);
  if (!spec) throw new HttpError(404, `Unknown resource "${key}".`);
  const level = accessLevel(ctx.role, spec.module, (ctx.membership?.grants ?? null) as Grants | null);
  if (level === "none") throw new HttpError(403, "You don't have access to this area. Ask your manager to give you access.");
  if (need === "edit" && level === "view") throw new HttpError(403, "You have view-only access here. Ask your manager for edit access.");
  return spec;
}

/** Next document number (INV-01001, Q-01002…). Based on the highest number used, so deleting one never causes a clash. */
export async function nextNumber(orgId: string, model: string, prefix: string) {
  const rows: { number: string }[] = await (db as unknown as Record<string, any>)[model].findMany({ where: { orgId, number: { startsWith: `${prefix}-` } }, select: { number: true } });
  const max = rows.reduce((m, r) => Math.max(m, Number(r.number.slice(prefix.length + 1)) || 0), 1000);
  return `${prefix}-${String(max + 1).padStart(5, "0")}`;
}

async function totals(orgId: string, items: { qty: number; price: number; taxable?: boolean }[]) {
  const tax = await db.taxRate.findFirst({ where: { orgId }, orderBy: { rate: "desc" } });
  const rate = tax ? Number(tax.rate) : 0;
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const taxAmt = items.reduce((s, i) => s + (i.taxable === false ? 0 : i.qty * i.price * rate), 0);
  return { subtotal: round(subtotal), tax: round(taxAmt), total: round(subtotal + taxAmt) };
}
const round = (n: number) => Math.round(n * 100) / 100;

/** Resource-specific rules applied before insert/update. */
async function prepare(spec: ResourceSpec, ctx: OrgCtx, data: Record<string, any>, creating: boolean) {
  const orgId = ctx.org.id;
  if (typeof data.filter === "string") {
    try { data.filter = JSON.parse(data.filter || "{}"); } catch { throw new HttpError(422, "Filter must be valid JSON."); }
  }
  if (typeof data.config === "string") {
    try { data.config = data.config ? JSON.parse(data.config) : null; } catch { throw new HttpError(422, "Settings must be valid JSON."); }
  }
  switch (spec.key) {
    case "quotes":
    case "invoices": {
      if (data.items) Object.assign(data, await totals(orgId, data.items));
      if (creating) data.number = await nextNumber(orgId, spec.model, spec.key === "quotes" ? "Q" : "INV");
      if (creating && spec.key === "invoices") {
        data.currency = ctx.org.currency;
        data.dueDate ??= new Date(Date.now() + 14 * 864e5);
      }
      break;
    }
    case "purchaseorders": {
      if (data.items) data.total = (await totals(orgId, data.items.map((i: any) => ({ ...i, taxable: false })))).total;
      if (creating) data.number = await nextNumber(orgId, spec.model, "PO");
      if (creating) data.createdBy = ctx.user?.name ?? "API";
      break;
    }
    case "projects":
      if (creating) { data.code = await nextNumber(orgId, spec.model, "PRJ"); data.createdById = ctx.user?.id; }
      if (data.clientPortal && creating) data.portalToken = token(18);
      break;
    case "tasks":
      if (creating && data.projectId) Object.assign(data, await taskDefaults(data.projectId, data.status));
      if (data.status === "DONE") data.completedAt ??= new Date();
      break;
    case "workorders":
      if (creating) data.number = await nextNumber(orgId, spec.model, "WO");
      break;
    case "jobs":
      if (creating) data.slug = `${slugify(data.title)}-${token(4).toLowerCase()}`;
      if (creating) { data.currency = ctx.org.currency; data.country = ctx.org.country; }
      break;
    case "vehicles":
      if (creating && !data.deviceId) data.deviceId = `oen-${token(6).toLowerCase()}`;
      break;
    case "webhooks":
      if (creating) data.secret = `whsec_${token(24)}`;
      break;
    case "contacts":
      if (data.emailConsent || data.smsConsent) { data.consentAt ??= new Date(); data.consentSource ??= ctx.actor === "api" ? "api" : "staff-entered"; }
      break;
    case "announcements":
      if (creating) data.acks = [];
      break;
  }
  // Ref fields must point at records in the same company.
  for (const f of spec.fields) {
    if (f.type !== "ref" || !data[f.name]) continue;
    const refSpec = resourceByKey(f.ref!);
    if (!refSpec) continue;
    const found = await delegate(refSpec).findFirst({ where: { id: data[f.name], orgId }, select: { id: true } });
    if (!found) throw new HttpError(422, `${f.label} was not found.`);
  }
}

async function after(spec: ResourceSpec, ctx: OrgCtx, row: any, verb: "created" | "updated" | "deleted", before?: any) {
  const orgId = ctx.org.id;
  await audit(ctx, `${spec.key}.${verb}`, spec.key, row.id, verb === "deleted" ? undefined : row);
  if (spec.event) {
    await emit(orgId, `${spec.event}.${verb === "deleted" ? "deleted" : verb}`, serialize(row));
    if (spec.key === "applications" && before && before.stage !== row.stage) await emit(orgId, "application.stage_changed", serialize(row));
    if (spec.key === "invoices" && row.status === "PAID" && before?.status !== "PAID") await emit(orgId, "invoice.paid", serialize(row));
  }
  if (spec.key === "invoices" && verb !== "deleted" && row.status !== "DRAFT" && row.status !== "VOID") await postInvoice(row).catch(console.error);
  if (spec.key === "projects" && verb === "created") await setupProject(row.id, ctx);
  if (spec.key === "tasks" && row.projectId && verb !== "deleted") await refreshProject(row.projectId);
  if (spec.key === "jobs" && verb === "created") await emit(orgId, "job.created", serialize(row));
}

const DATE_FIELD: Record<string, string> = { shifts: "start", timeentries: "clockIn", leave: "startDate", bookings: "start", workorders: "scheduledAt", orders: "createdAt", invoices: "issueDate", tasks: "dueDate", fleetevents: "at", activities: "dueAt" };

export async function listResource(spec: ResourceSpec, ctx: OrgCtx, params: URLSearchParams) {
  const take = Math.min(Number(params.get("limit") || 50), 500);
  const page = Math.max(Number(params.get("page") || 1), 1);
  const where: Record<string, any> = { orgId: ctx.org.id };
  const q = params.get("q")?.trim();
  if (q) where.OR = spec.search.map((f) => ({ [f]: { contains: q, mode: "insensitive" } }));
  if (spec.statusField && params.get("status")) where[spec.statusField] = params.get("status");
  for (const f of spec.fields) {
    const v = params.get(f.name);
    if (v && f.type === "ref") where[f.name] = v;
  }
  // Date window (?from=&to=) on the record's main date, used by calendars and boards.
  const dateField = DATE_FIELD[spec.key];
  if (dateField && (params.get("from") || params.get("to"))) {
    where[dateField] = { ...(params.get("from") ? { gte: new Date(params.get("from")!) } : {}), ...(params.get("to") ? { lt: new Date(params.get("to")!) } : {}) };
  }
  // Employees only see their own records where it applies.
  if (ctx.role === "EMPLOYEE" && ["leave", "timeentries", "shifts"].includes(spec.key)) {
    const me = await db.employee.findFirst({ where: { orgId: ctx.org.id, membershipId: ctx.membership?.id } });
    where.employeeId = me?.id ?? "__none__";
  }
  if (spec.key === "projects" || spec.key === "tasks") {
    const scope = await projectScope(ctx);
    if (scope) where.AND = [spec.key === "projects" ? scope.projects : scope.tasks];
    if (spec.key === "projects" && params.get("templates") !== "1") where.isTemplate = false;
    if (spec.key === "projects" && params.get("archived") !== "1") where.archivedAt = null;
  }
  const order = spec.order ?? { createdAt: "desc" };
  const [rows, total] = await Promise.all([
    delegate(spec).findMany({ where, take, skip: (page - 1) * take, orderBy: order }),
    delegate(spec).count({ where }),
  ]);
  return { data: rows.map(serialize), page, limit: take, total };
}

const SELF_SCOPED = ["leave", "timeentries", "shifts"];
/** Employees only reach their own leave, time entries and shifts. */
async function selfEmployeeId(spec: ResourceSpec, ctx: OrgCtx) {
  if (ctx.role !== "EMPLOYEE" || !SELF_SCOPED.includes(spec.key)) return null;
  const me = await db.employee.findFirst({ where: { orgId: ctx.org.id, membershipId: ctx.membership?.id } });
  return me?.id ?? "__none__";
}

export async function getResource(spec: ResourceSpec, ctx: OrgCtx, id: string) {
  const own = await selfEmployeeId(spec, ctx);
  const row = await delegate(spec).findFirst({ where: { id, orgId: ctx.org.id, ...(own ? { employeeId: own } : {}) } });
  if (!row) throw new HttpError(404, `${spec.singular} not found.`);
  return row;
}

export async function createResource(spec: ResourceSpec, ctx: OrgCtx, input: unknown) {
  if (spec.readOnly) throw new HttpError(405, `${spec.label} are created automatically.`);
  const data = schemaFor(spec, false).parse(input) as Record<string, any>;
  for (const f of spec.fields) if (data[f.name] === undefined && f.default !== undefined && !f.readOnly) data[f.name] = f.default;
  const own = await selfEmployeeId(spec, ctx);
  if (own) {
    if (spec.key !== "leave") throw new HttpError(403, spec.key === "shifts" ? "Ask your manager to add shifts." : "Use the clock in button to record time.");
    data.employeeId = own;
    data.status = "PENDING";
  } else if (spec.key === "leave" && data.status && data.status !== "PENDING") {
    data.status = "PENDING"; // decided through decideLeave so balances and shifts stay right
  }
  await prepare(spec, ctx, data, true);
  const row = await delegate(spec).create({ data: { ...data, orgId: ctx.org.id } });
  await after(spec, ctx, row, "created");
  return row;
}

export async function updateResource(spec: ResourceSpec, ctx: OrgCtx, id: string, input: unknown) {
  const before = await getResource(spec, ctx, id);
  if (spec.readOnly && !(spec.statusField && input && typeof input === "object" && Object.keys(input).every((k) => k === spec.statusField))) {
    throw new HttpError(405, `${spec.label} can't be edited.`);
  }
  const data = spec.readOnly ? (input as Record<string, any>) : (schemaFor(spec, true).parse(input) as Record<string, any>);
  const own = await selfEmployeeId(spec, ctx);
  if (own) {
    if (spec.key !== "leave") throw new HttpError(403, "Ask your manager to change this.");
    if (before.status !== "PENDING") throw new HttpError(409, "This request was already decided. Ask your manager.");
    if (data.status && data.status !== "CANCELLED" && data.status !== "PENDING") throw new HttpError(403, "Only a manager can approve leave.");
    delete data.employeeId;
  }
  if (spec.key === "leave" && (data.status === "APPROVED" || data.status === "REJECTED")) {
    const { status, ...rest } = data;
    if (Object.keys(rest).length) await delegate(spec).update({ where: { id: before.id }, data: rest });
    return (await decideLeave(ctx, before.id, status, (input as any)?.note)).request;
  }
  await prepare(spec, ctx, data, false);
  const row = await delegate(spec).update({ where: { id: before.id }, data });
  await after(spec, ctx, row, "updated", before);
  return row;
}

export async function deleteResource(spec: ResourceSpec, ctx: OrgCtx, id: string) {
  if (!["OWNER", "ADMIN", "MANAGER", "FINANCE"].includes(ctx.role)) throw new HttpError(403, "Only managers can delete records.");
  const before = await getResource(spec, ctx, id);
  await delegate(spec).delete({ where: { id: before.id } });
  await after(spec, ctx, before, "deleted");
}

/** Options for ref dropdowns: [{id,label}] */
export async function refOptions(spec: ResourceSpec, ctx: OrgCtx, q?: string) {
  const where: Record<string, any> = { orgId: ctx.org.id };
  if (q) where.OR = spec.search.map((f) => ({ [f]: { contains: q, mode: "insensitive" } }));
  const rows = await delegate(spec).findMany({ where, take: 50, orderBy: spec.order ?? { createdAt: "desc" } });
  return rows.map((r: any) => ({ id: r.id, label: labelFor(spec, r) }));
}

export function labelFor(spec: ResourceSpec, r: any) {
  if (spec.key === "employees" || spec.key === "contacts") return [r.firstName, r.lastName].filter(Boolean).join(" ") + (r.company ? ` · ${r.company}` : "");
  if (spec.key === "shifts") return `${r.role ?? "Shift"} ${new Date(r.start).toLocaleString("en-CA")}`;
  return String(r[spec.title] ?? r.id);
}
