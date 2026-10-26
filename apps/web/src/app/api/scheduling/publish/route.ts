import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { isManager } from "@/lib/rbac";
import { audit, notify } from "@/lib/audit";
import { emit } from "@/lib/webhooks";

// Publish every draft shift in a date range and tell each person their schedule is ready.
export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("scheduling", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only managers can publish schedules.");
  const { from, to } = await body(req, z.object({ from: z.coerce.date(), to: z.coerce.date() }));
  const where = { orgId: ctx.org.id, status: "DRAFT", start: { gte: from, lt: to } };
  const drafts = await db.shift.findMany({ where, include: { employee: { include: { membership: true } } } });
  await db.shift.updateMany({ where: { id: { in: drafts.filter((s) => s.employeeId).map((s) => s.id) } }, data: { status: "PUBLISHED" } });
  await db.shift.updateMany({ where: { id: { in: drafts.filter((s) => !s.employeeId).map((s) => s.id) } }, data: { status: "OPEN" } });
  const people = new Map(drafts.filter((s) => s.employee?.membership).map((s) => [s.employee!.membership!.userId, s.employee!.firstName]));
  for (const [userId] of people) await notify(ctx.org.id, "Your new schedule is ready", { body: `Shifts from ${from.toISOString().slice(0, 10)} are published.`, link: "/me", userId });
  for (const s of drafts) await emit(ctx.org.id, "shift.published", { id: s.id, employeeId: s.employeeId, start: s.start, end: s.end });
  await audit(ctx, "schedule.published", "shift", undefined, { from, to, count: drafts.length });
  return ok({ published: drafts.length, notified: people.size });
});
