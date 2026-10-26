import { db } from "@/lib/db";
import { ingestPosition } from "@/lib/fleet";
import { clientIp, HttpError, ok, route } from "@/lib/http";
import { limit } from "@/lib/ratelimit";
import { safeEqual } from "@/lib/crypto";

/**
 * GPS ingest. Compatible with the OsmAnd protocol used by Traccar Client and many
 * hardware trackers: ?id=DEVICE&lat=..&lon=..&speed=KNOTS&bearing=..&altitude=..&timestamp=..
 * The OENOD Driver app posts JSON: { deviceId, token, lat, lng, speedKmh, heading, accuracy, at }.
 */
async function handle(req: Request) {
  const url = new URL(req.url);
  let p: Record<string, any> = Object.fromEntries(url.searchParams);
  if (req.method === "POST") {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("json")) p = { ...p, ...(await req.json().catch(() => ({}))) };
    else if (ct.includes("form")) p = { ...p, ...Object.fromEntries(await req.formData()) };
  }
  const deviceId = String(p.id ?? p.deviceid ?? p.deviceId ?? "");
  if (!deviceId) throw new HttpError(400, "Missing device id");
  if (!limit(`gps:${deviceId}:${clientIp(req)}`, 120, 60_000)) throw new HttpError(429, "Too many positions");
  const v = await db.vehicle.findUnique({ where: { deviceId } });
  if (!v) throw new HttpError(404, "Unknown device. Add it as a vehicle in Fleet GPS first.");
  // The Driver app must present the vehicle's device token; hardware trackers are identified by IMEI.
  // OsmAnd-style trackers (?id=IMEI) may omit it; every other sender must present the device token.
  const osmAnd = url.searchParams.has("id") && !p.deviceId;
  if ((p.token || !osmAnd) && !(v.deviceToken && typeof p.token === "string" && safeEqual(p.token, v.deviceToken))) throw new HttpError(403, "Invalid device token");

  const positions: Record<string, any>[] = Array.isArray(p.positions) ? p.positions : [p];
  for (const x of positions) {
    const lat = Number(x.lat ?? x.latitude), lng = Number(x.lng ?? x.lon ?? x.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    const speedKmh = x.speedKmh != null ? Number(x.speedKmh) : x.speed != null ? Number(x.speed) * (p.speedUnit === "kmh" ? 1 : p.speedUnit === "ms" ? 3.6 : 1.852) : 0;
    const ts = x.at ?? x.timestamp;
    const at = ts ? new Date(/^\d+$/.test(String(ts)) ? Number(ts) * (String(ts).length <= 10 ? 1000 : 1) : String(ts)) : new Date();
    await ingestPosition(await db.vehicle.findUniqueOrThrow({ where: { id: v.id } }), {
      lat, lng, speedKmh, heading: x.bearing != null ? Number(x.bearing) : x.heading != null ? Number(x.heading) : undefined,
      altitude: x.altitude != null ? Number(x.altitude) : undefined, accuracy: x.accuracy != null ? Number(x.accuracy) : undefined,
      ignition: x.ignition != null ? String(x.ignition) === "true" : undefined, at: isNaN(at.getTime()) ? new Date() : at,
    });
  }
  return ok({ ok: true });
}

export const GET = route(handle);
export const POST = route(handle);
