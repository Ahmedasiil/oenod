import { db } from "@/lib/db";
import { ok, requireSuperAdmin, route } from "@/lib/http";
import { DEFAULT_AUTOMATIONS } from "@/lib/growth";

// Lifecycle messages (welcome, trial ending, win-back...). Missing defaults are created on first view.
export const GET = route(async () => {
  await requireSuperAdmin();
  for (const a of DEFAULT_AUTOMATIONS) await db.growthAutomation.upsert({ where: { key: a.key }, create: a, update: {} });
  return ok({ data: await db.growthAutomation.findMany({ orderBy: { delayHours: "asc" } }) });
});
