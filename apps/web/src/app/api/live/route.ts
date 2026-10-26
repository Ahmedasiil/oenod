import { db } from "@/lib/db";
import { ok, requireOrg, route } from "@/lib/http";

// Everything on the live map: team on shift (opted in), vehicles, today's jobs, locations.
export const GET = route(async () => {
  const ctx = await requireOrg("live");
  const orgId = ctx.org.id;
  const since = new Date(Date.now() - 30 * 60000);
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const [onClock, pings, vehicles, jobs, locations, events] = await Promise.all([
    db.timeEntry.findMany({ where: { orgId, clockOut: null }, include: { employee: { include: { location: true } } } }),
    db.locationPing.findMany({ where: { orgId, at: { gte: since } }, orderBy: { at: "desc" } }),
    db.vehicle.findMany({ where: { orgId } }),
    db.workOrder.findMany({ where: { orgId, scheduledAt: { gte: dayStart, lte: new Date(dayStart.getTime() + 864e5) } } }),
    db.location.findMany({ where: { orgId, active: true } }),
    db.fleetEvent.findMany({ where: { orgId }, orderBy: { at: "desc" }, take: 15, include: { vehicle: { select: { name: true } } } }),
  ]);
  const team = onClock.map((t) => {
    const p = t.employee.shareLiveLocation ? pings.find((x) => x.employeeId === t.employeeId) : null;
    const lat = p?.lat ?? (t.employee.shareLiveLocation ? t.inLat : null) ?? t.employee.location?.lat ?? null;
    const lng = p?.lng ?? (t.employee.shareLiveLocation ? t.inLng : null) ?? t.employee.location?.lng ?? null;
    return { id: t.employeeId, name: `${t.employee.firstName} ${t.employee.lastName}`, jobTitle: t.employee.jobTitle, since: t.clockIn, onSite: t.onSite, lat, lng, live: Boolean(p), location: t.employee.location?.name };
  });
  return ok({
    asOf: new Date(),
    team,
    vehicles: vehicles.map((v) => ({ id: v.id, name: v.name, plate: v.plate, kind: v.kind, status: v.status, lat: v.lastLat, lng: v.lastLng, speed: v.lastSpeedKmh, heading: v.lastHeading, lastSeenAt: v.lastSeenAt, limit: v.speedLimitKmh })),
    jobs: jobs.map((j) => ({ id: j.id, title: j.title, number: j.number, status: j.status, address: j.address, lat: j.lat, lng: j.lng, scheduledAt: j.scheduledAt })),
    locations: locations.map((l) => ({ id: l.id, name: l.name, lat: l.lat, lng: l.lng, radiusM: l.radiusM })),
    events: events.map((e) => ({ id: e.id, vehicle: e.vehicle.name, kind: e.kind, message: e.message, at: e.at })),
  });
});
