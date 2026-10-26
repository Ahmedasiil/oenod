import { db } from "./db";
import { HttpError, type OrgCtx } from "./http";
import { audit, notify } from "./audit";
import { emit } from "./webhooks";
import { isManager } from "./rbac";
import { sendEmail, emailLayout } from "./messaging";

const PAID_TYPES = new Set(["VACATION", "SICK", "PERSONAL"]);

/** Working hours requested: hours entered, or 8h per weekday in the range. */
export function leaveHours(start: Date, end: Date, entered?: number | null) {
  if (entered && entered > 0) return entered;
  let h = 0;
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 864e5)) if (d.getUTCDay() % 6 !== 0) h += 8;
  return h;
}

/** What a manager should know before deciding: balance after, overlapping shifts, others off at the same time. */
export async function leaveContext(orgId: string, id: string) {
  const r = await db.leaveRequest.findFirst({ where: { id, orgId }, include: { employee: { include: { leaveBalances: true } } } });
  if (!r) throw new HttpError(404, "Leave request not found.");
  const hours = leaveHours(r.startDate, r.endDate, Number(r.hours));
  const balance = r.employee.leaveBalances.find((b) => b.type === r.type);
  const [shifts, others] = await Promise.all([
    db.shift.findMany({ where: { orgId, employeeId: r.employeeId, start: { lte: new Date(r.endDate.getTime() + 864e5) }, end: { gte: r.startDate } }, select: { id: true, start: true, end: true, role: true } }),
    db.leaveRequest.findMany({ where: { orgId, status: "APPROVED", id: { not: r.id }, startDate: { lte: r.endDate }, endDate: { gte: r.startDate }, employee: { locationId: r.employee.locationId } }, include: { employee: { select: { firstName: true, lastName: true } } } }),
  ]);
  return {
    request: r, hours,
    balance: balance ? Number(balance.hours) : null,
    balanceAfter: balance && PAID_TYPES.has(r.type) ? Number(balance.hours) - hours : null,
    shiftsAffected: shifts,
    othersOff: others.map((o) => `${o.employee.firstName} ${o.employee.lastName}`),
  };
}

/** Approve or reject leave: deducts the balance, opens affected shifts for cover, tells the employee. */
export async function decideLeave(ctx: OrgCtx, id: string, decision: "APPROVED" | "REJECTED", note?: string) {
  if (!isManager(ctx.role) && ctx.actor !== "api") throw new HttpError(403, "Only managers can approve or reject leave.");
  const c = await leaveContext(ctx.org.id, id);
  const r = c.request;
  if (r.status !== "PENDING") throw new HttpError(409, `This request is already ${r.status.toLowerCase()}.`);
  const me = ctx.membership ? await db.employee.findFirst({ where: { orgId: ctx.org.id, membershipId: ctx.membership.id } }) : null;
  if (me && me.id === r.employeeId && ctx.role !== "OWNER") throw new HttpError(403, "You can't approve your own leave. Ask another manager.");
  if (decision === "APPROVED" && c.balanceAfter !== null && c.balanceAfter < 0 && !note) {
    throw new HttpError(422, `This would put ${r.employee.firstName}'s ${r.type.toLowerCase()} balance at ${c.balanceAfter}h. Add a note to approve anyway.`);
  }
  const by = ctx.user?.name ?? "API";
  const updated = await db.$transaction(async (tx) => {
    const u = await tx.leaveRequest.update({ where: { id: r.id }, data: { status: decision, decidedBy: by, hours: c.hours } });
    if (decision === "APPROVED" && PAID_TYPES.has(r.type)) {
      await tx.leaveBalance.upsert({ where: { employeeId_type: { employeeId: r.employeeId, type: r.type } }, create: { employeeId: r.employeeId, type: r.type, hours: -c.hours }, update: { hours: { decrement: c.hours } } });
    }
    // Shifts during approved leave become open shifts so someone else can pick them up.
    if (decision === "APPROVED" && c.shiftsAffected.length) await tx.shift.updateMany({ where: { id: { in: c.shiftsAffected.map((s) => s.id) } }, data: { employeeId: null, status: "OPEN" } });
    return u;
  });
  await audit(ctx, `leave.${decision.toLowerCase()}`, "leaveRequest", r.id, { note, hours: c.hours });
  await emit(ctx.org.id, "leave.decided", { id: r.id, status: decision, employeeId: r.employeeId });
  const word = decision === "APPROVED" ? "approved" : "not approved";
  const range = `${r.startDate.toISOString().slice(0, 10)} to ${r.endDate.toISOString().slice(0, 10)}`;
  const emp = await db.employee.findUnique({ where: { id: r.employeeId }, include: { membership: true } });
  if (emp?.membership) await notify(ctx.org.id, `Your leave was ${word}`, { body: `${range}${note ? `. Note: ${note}` : ""}`, link: "/me/leave", userId: emp.membership.userId, level: decision === "APPROVED" ? "success" : "info" });
  if (emp?.email) await sendEmail({ to: emp.email, scope: "ORG", orgId: ctx.org.id, idempotencyKey: `leave:${r.id}:${decision}`, subject: `Your leave request was ${word}`, html: emailLayout({ brand: ctx.org.name, brandLogo: ctx.org.logoUrl, title: `Leave ${word}`, body: `Hi ${emp.firstName},\n\nYour ${r.type.toLowerCase()} request for ${range} was ${word} by ${by}.${note ? `\n\nNote: ${note}` : ""}`, ctaLabel: "Open the app", ctaUrl: `${process.env.APP_URL ?? ""}/me` }) }).catch(() => null);
  return { request: updated, shiftsOpened: decision === "APPROVED" ? c.shiftsAffected.length : 0, balanceAfter: decision === "APPROVED" ? c.balanceAfter : c.balance };
}
