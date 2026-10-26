import { z } from "zod";
import { db } from "@/lib/db";
import { body, ok, requireSuperAdmin, route } from "@/lib/http";
import { adminAudit } from "@/lib/admin";

export const GET = route(async () => {
  await requireSuperAdmin();
  return ok({ data: await db.featureFlag.findMany({ orderBy: { key: "asc" } }) });
});

export const PUT = route(async (req: Request) => {
  const ctx = await requireSuperAdmin();
  const d = await body(req, z.object({ key: z.string().regex(/^[a-z0-9_]+$/), enabled: z.boolean(), rolloutPercent: z.number().int().min(0).max(100).default(100), orgIds: z.array(z.string()).default([]), description: z.string().max(200).optional() }));
  const f = await db.featureFlag.upsert({ where: { key: d.key }, create: d, update: d });
  await adminAudit(ctx.user.id, "flag.updated", "feature_flag", d.key, d);
  return ok(f);
});
