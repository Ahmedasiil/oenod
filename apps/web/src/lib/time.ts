import { z } from "zod";
import { db } from "./db";
import { HttpError } from "./http";
import { distanceM } from "./format";
import { emit } from "./webhooks";

export const ClockSchema = z.object({
  action: z.enum(["in", "out", "break_start", "break_end"]),
  lat: z.number().optional(),
  lng: z.number().optional(),
  source: z.enum(["WEB", "MOBILE", "KIOSK", "DESKTOP"]).default("WEB"),
  notes: z.string().max(500).optional(),
});

export async function myEmployee(orgId: string, membershipId?: string | null) {
  const e = membershipId ? await db.employee.findFirst({ where: { orgId, membershipId } }) : null;
  if (!e) throw new HttpError(404, "Your account isn't linked to an employee profile yet. Ask a manager to link it in People.");
  return e;
}

export async function clock(orgId: string, employeeId: string, d: z.input<typeof ClockSchema>) {
  const open = await db.timeEntry.findFirst({ where: { orgId, employeeId, clockOut: null }, orderBy: { clockIn: "desc" } });
  const emp = await db.employee.findUniqueOrThrow({ where: { id: employeeId }, include: { location: true } });
  let onSite: boolean | null = null;
  if (d.lat != null && d.lng != null && emp.location?.lat != null && emp.location.lng != null) {
    onSite = distanceM({ lat: d.lat, lng: d.lng }, { lat: emp.location.lat, lng: emp.location.lng }) <= emp.location.radiusM;
  }
  if (d.action === "in") {
    if (open) throw new HttpError(409, "You're already clocked in.");
    const now = new Date();
    const shift = await db.shift.findFirst({ where: { orgId, employeeId, start: { lte: new Date(now.getTime() + 2 * 36e5) }, end: { gte: now } } });
    const t = await db.timeEntry.create({ data: { orgId, employeeId, shiftId: shift?.id, clockIn: now, source: d.source, inLat: d.lat, inLng: d.lng, onSite, notes: d.notes } });
    if (d.lat != null && d.lng != null && emp.shareLiveLocation) await db.locationPing.create({ data: { orgId, employeeId, lat: d.lat, lng: d.lng } });
    await emit(orgId, "timeentry.clock_in", t);
    return t;
  }
  if (!open) throw new HttpError(409, "You're not clocked in.");
  if (d.action === "out") {
    const t = await db.timeEntry.update({ where: { id: open.id }, data: { clockOut: new Date(), outLat: d.lat, outLng: d.lng, status: "SUBMITTED", notes: d.notes ?? open.notes } });
    await emit(orgId, "timeentry.clock_out", t);
    return t;
  }
  // Breaks are tracked as minutes on the open entry; break_start stamps a note.
  if (d.action === "break_start") return db.timeEntry.update({ where: { id: open.id }, data: { notes: `${open.notes ?? ""}[break:${Date.now()}]` } });
  const m = /\[break:(\d+)\]$/.exec(open.notes ?? "");
  const mins = m ? Math.round((Date.now() - Number(m[1])) / 60000) : 0;
  return db.timeEntry.update({ where: { id: open.id }, data: { breakMinutes: open.breakMinutes + mins, notes: (open.notes ?? "").replace(/\[break:\d+\]$/, "") } });
}

