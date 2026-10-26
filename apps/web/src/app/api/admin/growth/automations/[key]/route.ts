import { z } from "zod";
import { db } from "@/lib/db";
import { body, ok, requireSuperAdmin, route } from "@/lib/http";
import { adminAudit } from "@/lib/admin";

export const PATCH = route(async (req: Request, { params }: { params: Promise<{ key: string }> }) => {
  const ctx = await requireSuperAdmin();
  const key = (await params).key;
  const d = await body(req, z.object({ enabled: z.boolean().optional(), subject: z.string().min(2).max(160).optional(), content: z.string().min(5).max(20000).optional(), delayHours: z.number().int().min(0).max(24 * 90).optional(), ctaLabel: z.string().max(40).nullable().optional(), ctaUrl: z.string().url().nullable().optional() }));
  const a = await db.growthAutomation.update({ where: { key }, data: d });
  await adminAudit(ctx.user.id, "growth.automation_updated", "growth_automation", key, d);
  return ok(a);
});
