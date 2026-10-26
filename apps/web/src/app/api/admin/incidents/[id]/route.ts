import { z } from "zod";
import { db } from "@/lib/db";
import { body, ok, requireSuperAdmin, route } from "@/lib/http";
import { adminAudit } from "@/lib/admin";

export const PATCH = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireSuperAdmin();
  const id = (await params).id;
  const d = await body(req, z.object({ status: z.enum(["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"]).optional(), message: z.string().min(3).max(2000).optional(), title: z.string().min(3).max(140).optional() }));
  const i = await db.statusIncident.update({ where: { id }, data: { ...d, ...(d.status === "RESOLVED" ? { resolvedAt: new Date() } : d.status ? { resolvedAt: null } : {}) } });
  await adminAudit(ctx.user.id, "incident.updated", "incident", id, d);
  return ok(i);
});
