import { z } from "zod";
import { db } from "@/lib/db";
import { body, ok, requireSuperAdmin, route } from "@/lib/http";
import { adminAudit } from "@/lib/admin";

// The announcement bar shown to every signed-in customer.
export const GET = route(async () => {
  await requireSuperAdmin();
  return ok({ data: await db.platformBanner.findMany({ orderBy: { createdAt: "desc" }, take: 20 }) });
});

export const POST = route(async (req: Request) => {
  const ctx = await requireSuperAdmin();
  const d = await body(req, z.object({ message: z.string().min(3).max(240), level: z.enum(["info", "success", "warning", "critical"]).default("info"), link: z.string().url().optional() }));
  await db.platformBanner.updateMany({ data: { active: false } });
  const b = await db.platformBanner.create({ data: d });
  await adminAudit(ctx.user.id, "banner.published", "banner", b.id, d);
  return ok(b, 201);
});

export const DELETE = route(async () => {
  const ctx = await requireSuperAdmin();
  await db.platformBanner.updateMany({ data: { active: false } });
  await adminAudit(ctx.user.id, "banner.cleared");
  return ok({ ok: true });
});
