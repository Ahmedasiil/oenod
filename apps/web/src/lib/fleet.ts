import type { Vehicle } from "@prisma/client";
import { db } from "./db";
import { distanceM } from "./format";
import { emit } from "./webhooks";
import { raiseAlert } from "./monitors";

export interface Fix {
  lat: number;
  lng: number;
  speedKmh?: number;
  heading?: number;
  altitude?: number;
  accuracy?: number;
  ignition?: boolean;
  at?: Date;
}

const MOVING_KMH = 5;

/**
 * Process one GPS position: store it, update live status and trips, and raise
 * speeding, long-stop, idle and geofence alerts. Alerts are de-duplicated so a
 * driver going 120 km/h for ten minutes produces one alert, not hundreds.
 */
export async function ingestPosition(v: Vehicle, fix: Fix) {
  const at = fix.at ?? new Date();
  const speed = Math.max(0, fix.speedKmh ?? 0);
  const moving = speed >= MOVING_KMH;
  const prev = v.lastLat != null && v.lastLng != null ? { lat: v.lastLat, lng: v.lastLng } : null;
  const stepKm = prev ? distanceM(prev, fix) / 1000 : 0;

  await db.vehiclePosition.create({ data: { vehicleId: v.id, lat: fix.lat, lng: fix.lng, speedKmh: speed, heading: fix.heading, altitude: fix.altitude, accuracy: fix.accuracy, ignition: fix.ignition, at } });

  // Trips: open on movement, close after 5 minutes stopped.
  let trip = await db.trip.findFirst({ where: { vehicleId: v.id, endAt: null }, orderBy: { startAt: "desc" } });
  if (moving && !trip) trip = await db.trip.create({ data: { vehicleId: v.id, driverId: v.driverId, startAt: at, startLat: fix.lat, startLng: fix.lng } });
  if (trip) {
    const dur = Math.max(1, (at.getTime() - trip.startAt.getTime()) / 36e5);
    const distanceKm = trip.distanceKm + (stepKm < 5 ? stepKm : 0); // ignore GPS jumps
    await db.trip.update({ where: { id: trip.id }, data: { distanceKm, maxSpeedKmh: Math.max(trip.maxSpeedKmh, speed), avgSpeedKmh: distanceKm / dur, endLat: fix.lat, endLng: fix.lng } });
  }

  let stoppedSince = v.stoppedSince;
  if (moving) stoppedSince = null;
  else if (!stoppedSince) stoppedSince = at;
  const stoppedMin = stoppedSince ? (at.getTime() - stoppedSince.getTime()) / 60000 : 0;
  if (trip && !moving && stoppedMin >= 5) await db.trip.update({ where: { id: trip.id }, data: { endAt: stoppedSince } });

  const status = moving ? "MOVING" : fix.ignition ? "IDLE" : "STOPPED";
  await db.vehicle.update({
    where: { id: v.id },
    data: { lastLat: fix.lat, lastLng: fix.lng, lastSpeedKmh: speed, lastHeading: fix.heading, lastSeenAt: at, status, stoppedSince, odometerKm: v.odometerKm + (stepKm < 5 ? stepKm : 0) },
  });

  // Speeding (one event per 10 minutes).
  if (speed > v.speedLimitKmh) {
    const recent = await db.fleetEvent.findFirst({ where: { vehicleId: v.id, kind: "SPEEDING", at: { gte: new Date(at.getTime() - 10 * 60000) } } });
    if (!recent) await fleetEvent(v, "SPEEDING", `${v.name} is going ${Math.round(speed)} km/h (limit ${v.speedLimitKmh})`, fix, speed, "CRIT");
  }

  // Long stop / idling (once per stop).
  if (!moving && stoppedSince) {
    const kind = fix.ignition ? "IDLE" : "LONG_STOP";
    const limitMin = fix.ignition ? v.idleAlertMin : v.stopAlertMin;
    if (stoppedMin >= limitMin) {
      const already = await db.fleetEvent.findFirst({ where: { vehicleId: v.id, kind, at: { gte: stoppedSince } } });
      if (!already) await fleetEvent(v, kind, `${v.name} has been ${fix.ignition ? "idling" : "stopped"} for ${Math.round(stoppedMin)} min`, fix, stoppedMin, "WARN");
    }
  }

  // Geofences.
  if (prev) {
    const fences = await db.geofence.findMany({ where: { orgId: v.orgId } });
    for (const g of fences) {
      const wasIn = distanceM(prev, g) <= g.radiusM;
      const isIn = distanceM(fix, g) <= g.radiusM;
      if (!wasIn && isIn && g.alertOnEnter) await fleetEvent(v, "GEOFENCE_ENTER", `${v.name} arrived at ${g.name}`, fix, null, "INFO");
      if (wasIn && !isIn && g.alertOnExit) await fleetEvent(v, "GEOFENCE_EXIT", `${v.name} left ${g.name}`, fix, null, "INFO");
    }
  }

  if (v.nextServiceKm && v.odometerKm < v.nextServiceKm && v.odometerKm + stepKm >= v.nextServiceKm) {
    await fleetEvent(v, "SERVICE_DUE", `${v.name} reached its service mileage (${Math.round(v.nextServiceKm)} km)`, fix, v.nextServiceKm, "WARN");
  }
}

async function fleetEvent(v: Vehicle, kind: string, message: string, fix: Fix, value: number | null, severity: "INFO" | "WARN" | "CRIT") {
  const ev = await db.fleetEvent.create({ data: { orgId: v.orgId, vehicleId: v.id, kind, message, lat: fix.lat, lng: fix.lng, value } });
  if (kind === "SPEEDING") await db.trip.updateMany({ where: { vehicleId: v.id, endAt: null }, data: { speedingEvents: { increment: 1 } } });
  const evName = kind === "SPEEDING" ? "fleet.speeding" : kind === "LONG_STOP" || kind === "IDLE" ? "fleet.long_stop" : "fleet.geofence";
  await emit(v.orgId, evName, { vehicleId: v.id, vehicle: v.name, kind, message, lat: fix.lat, lng: fix.lng, at: ev.at });
  if (severity !== "INFO") await raiseAlert(v.orgId, { title: kind === "SPEEDING" ? "Speeding" : kind === "IDLE" ? "Vehicle idling" : kind === "SERVICE_DUE" ? "Service due" : "Long stop", message, severity, link: `/app/fleet?v=${v.id}`, dedupeKey: `${kind}:${v.id}:${ev.id}` });
}

/** Mark vehicles offline when no position for 15 minutes. */
export async function markOffline() {
  const cutoff = new Date(Date.now() - 15 * 60000);
  const r = await db.vehicle.updateMany({ where: { status: { not: "OFFLINE" }, lastSeenAt: { lt: cutoff } }, data: { status: "OFFLINE" } });
  return r.count;
}
