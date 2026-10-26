import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { audit, notify } from "@/lib/audit";
import { emit } from "@/lib/webhooks";

// Employee actions on shifts: pick up an open shift, or ask to swap/give away one of yours.
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("me", "edit");
  const me = ctx.membership ? await db.employee.findFirst({ where: { orgId: ctx.org.id, membershipId: ctx.membership.id } }) : null;
  if (!me) throw new HttpError(422, "Shifts are for people with an employee profile.");
  const { action, note } = await body(req, z.object({ action: z.enum(["pickup", "swap", "cancel_swap"]), note: z.string().max(300).optional() }));
  const shift = await db.shift.findFirst({ where: { id: (await params).id, orgId: ctx.org.id } });
  if (!shift) throw new HttpError(404, "Shift not found.");
  if (shift.start < new Date()) throw new HttpError(409, "This shift has already started.");

  if (action === "pickup") {
    if (shift.employeeId || shift.status !== "OPEN") throw new HttpError(409, "Someone already took this shift.");
    const clash = await db.shift.findFirst({ where: { orgId: ctx.org.id, employeeId: me.id, start: { lt: shift.end }, end: { gt: shift.start } } });
    if (clash) throw new HttpError(409, "You already have a shift at that time.");
    const away = await db.leaveRequest.findFirst({ where: { employeeId: me.id, status: "APPROVED", startDate: { lte: shift.end }, endDate: { gte: new Date(shift.start.toDateString()) } } });
    if (away) throw new HttpError(409, "You're on approved leave that day.");
    // Only one person wins if two tap at once.
    const r = await db.shift.updateMany({ where: { id: shift.id, employeeId: null, status: "OPEN" }, data: { employeeId: me.id, status: "PUBLISHED" } });
    if (!r.count) throw new HttpError(409, "Someone already took this shift.");
    await notify(ctx.org.id, `${me.firstName} ${me.lastName} picked up an open shift`, { body: `${shift.role ?? "Shift"} on ${shift.start.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}`, link: "/app/scheduling", level: "info" });
    await emit(ctx.org.id, "shift.picked_up", { shiftId: shift.id, employeeId: me.id });
    await audit(ctx, "shift.picked_up", "shift", shift.id);
    return ok({ ok: true });
  }
  if (shift.employeeId !== me.id) throw new HttpError(403, "That isn't your shift.");
  const status = action === "swap" ? "SWAP_REQUESTED" : "PUBLISHED";
  await db.shift.update({ where: { id: shift.id }, data: { status, notes: action === "swap" && note ? `${shift.notes ? shift.notes + "\n" : ""}Swap: ${note}` : shift.notes } });
  if (action === "swap") await notify(ctx.org.id, `${me.firstName} ${me.lastName} asked to swap a shift`, { body: note ?? `${shift.start.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}`, link: "/app/scheduling", level: "warn" });
  await audit(ctx, `shift.${action}`, "shift", shift.id);
  return ok({ ok: true });
});
