import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";

// Phone sends a location only while clocked in and only if the employee opted in.
export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("me", "edit");
  const d = await body(req, z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracy: z.number().optional() }));
  const e = await db.employee.findFirst({ where: { orgId: ctx.org.id, membershipId: ctx.membership?.id } });
  if (!e) throw new HttpError(404, "No employee profile.");
  if (!e.shareLiveLocation) return ok({ stored: false, reason: "Live location sharing is off." });
  const open = await db.timeEntry.findFirst({ where: { employeeId: e.id, clockOut: null } });
  if (!open) return ok({ stored: false, reason: "Not clocked in." });
  await db.locationPing.create({ data: { orgId: ctx.org.id, employeeId: e.id, ...d } });
  return ok({ stored: true });
});
