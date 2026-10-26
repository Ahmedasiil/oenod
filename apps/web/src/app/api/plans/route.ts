import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";

// Public price list for the pricing page and billing settings.
export const GET = route(async () => {
  const plans = await db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { key: true, name: true, tagline: true, priceMonthly: true, priceYearly: true, seats: true, aiCredits: true, modules: true, features: true } });
  return ok(plans);
});
