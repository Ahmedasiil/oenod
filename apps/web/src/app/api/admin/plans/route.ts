import { db } from "@/lib/db";
import { ok, requireSuperAdmin, route } from "@/lib/http";

export const GET = route(async () => {
  await requireSuperAdmin();
  const [plans, counts] = await Promise.all([db.plan.findMany({ orderBy: { sortOrder: "asc" } }), db.organization.groupBy({ by: ["planKey", "subscriptionStatus"], _count: true })]);
  return ok({ data: plans.map((p) => ({ ...p, customers: Object.fromEntries(counts.filter((c) => c.planKey === p.key).map((c) => [c.subscriptionStatus, c._count])) })) });
});
