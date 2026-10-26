import { z } from "zod";
import { db } from "@/lib/db";
import { body, ok, requireSuperAdmin, route } from "@/lib/http";
import { adminAudit } from "@/lib/admin";

export const GET = route(async () => {
  await requireSuperAdmin();
  return ok({ data: await db.statusIncident.findMany({ orderBy: { createdAt: "desc" }, take: 50 }) });
});

export const POST = route(async (req: Request) => {
  const ctx = await requireSuperAdmin();
  const d = await body(req, z.object({ title: z.string().min(3).max(140), message: z.string().min(3).max(2000), components: z.array(z.string()).default([]), status: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]).default("INVESTIGATING") }));
  const i = await db.statusIncident.create({ data: { ...d, resolvedAt: d.status === "RESOLVED" ? new Date() : null } });
  await adminAudit(ctx.user.id, "incident.created", "incident", i.id, d);
  return ok(i, 201);
});
