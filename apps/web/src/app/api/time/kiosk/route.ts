import { z } from "zod";
import { db } from "@/lib/db";
import { body, clientIp, HttpError, ok, requireOrg, route } from "@/lib/http";
import { clock } from "@/lib/time";
import { limit } from "@/lib/ratelimit";

// A shared tablet signed in as a manager; employees clock with their PIN.
export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("time", "edit");
  if (!limit(`kiosk:${clientIp(req)}`, 60, 60_000)) throw new HttpError(429, "Too many attempts.");
  const d = await body(req, z.object({ pin: z.string().min(4).max(8), action: z.enum(["in", "out"]) }));
  const e = await db.employee.findFirst({ where: { orgId: ctx.org.id, kioskPin: d.pin, status: { not: "TERMINATED" } } });
  if (!e) throw new HttpError(404, "PIN not recognized.");
  const t = await clock(ctx.org.id, e.id, { action: d.action, source: "KIOSK" });
  return ok({ name: `${e.firstName} ${e.lastName}`, entry: t });
});
