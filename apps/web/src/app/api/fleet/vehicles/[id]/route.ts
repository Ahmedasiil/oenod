import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { APP_URL } from "@/lib/env";

export const GET = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("fleet");
  const { id } = await params;
  const v = await db.vehicle.findFirst({ where: { id, orgId: ctx.org.id } });
  if (!v) throw new HttpError(404, "Vehicle not found");
  const hours = Math.min(Number(new URL(req.url).searchParams.get("hours") || 24), 24 * 31);
  const since = new Date(Date.now() - hours * 36e5);
  const [positions, trips, events] = await Promise.all([
    db.vehiclePosition.findMany({ where: { vehicleId: id, at: { gte: since } }, orderBy: { at: "asc" }, take: 5000, select: { lat: true, lng: true, speedKmh: true, at: true } }),
    db.trip.findMany({ where: { vehicleId: id, startAt: { gte: since } }, orderBy: { startAt: "desc" } }),
    db.fleetEvent.findMany({ where: { vehicleId: id, at: { gte: since } }, orderBy: { at: "desc" } }),
  ]);
  return ok({
    vehicle: { ...v, deviceToken: undefined },
    setup: { ingestUrl: `${APP_URL}/api/fleet/ingest`, deviceId: v.deviceId, driverAppToken: ["OWNER", "ADMIN", "MANAGER"].includes(ctx.role) ? v.deviceToken : undefined },
    positions, trips, events,
  });
});
