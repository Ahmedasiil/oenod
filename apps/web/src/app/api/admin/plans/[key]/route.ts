import { z } from "zod";
import { db } from "@/lib/db";
import { body, ok, requireSuperAdmin, route } from "@/lib/http";
import { adminAudit } from "@/lib/admin";

// Changing a price clears the cached Stripe price so a new one is created on next checkout; existing subscribers keep their price.
export const PATCH = route(async (req: Request, { params }: { params: Promise<{ key: string }> }) => {
  const ctx = await requireSuperAdmin();
  const key = (await params).key;
  const d = await body(req, z.object({ name: z.string().min(2).optional(), tagline: z.string().max(140).optional(), priceMonthly: z.number().int().min(0).optional(), priceYearly: z.number().int().min(0).optional(), seats: z.number().int().min(1).optional(), aiCredits: z.number().int().min(0).optional(), modules: z.array(z.string()).optional(), features: z.array(z.string()).optional(), active: z.boolean().optional() }));
  const p = await db.plan.update({ where: { key }, data: { ...d, ...(d.priceMonthly !== undefined ? { stripePriceMonthly: null } : {}), ...(d.priceYearly !== undefined ? { stripePriceYearly: null } : {}) } });
  await adminAudit(ctx.user.id, "plan.updated", "plan", key, d);
  return ok(p);
});
