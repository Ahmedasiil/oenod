import { db } from "@/lib/db";
import { body, ok, requireOrg, route } from "@/lib/http";
import { audit } from "@/lib/audit";
import { ClockSchema as Schema, clock, myEmployee } from "@/lib/time";

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("time", "edit");
  const d = await body(req, Schema);
  const e = await myEmployee(ctx.org.id, ctx.membership?.id);
  const t = await clock(ctx.org.id, e.id, d);
  await audit(ctx, `time.${d.action}`, "timeEntry", t.id);
  return ok(t);
});

export const GET = route(async () => {
  const ctx = await requireOrg("time");
  const e = await myEmployee(ctx.org.id, ctx.membership?.id);
  const open = await db.timeEntry.findFirst({ where: { orgId: ctx.org.id, employeeId: e.id, clockOut: null } });
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); weekStart.setHours(0, 0, 0, 0);
  const week = await db.timeEntry.findMany({ where: { orgId: ctx.org.id, employeeId: e.id, clockIn: { gte: weekStart } } });
  const hours = week.reduce((s, t) => s + ((t.clockOut ?? new Date()).getTime() - t.clockIn.getTime()) / 36e5 - t.breakMinutes / 60, 0);
  return ok({ open, onBreak: /\[break:\d+\]$/.test(open?.notes ?? ""), hoursThisWeek: Math.round(hours * 100) / 100 });
});
