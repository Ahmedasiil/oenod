import { db } from "@/lib/db";
import { ok, requireOrg, route } from "@/lib/http";

export const GET = route(async (req: Request) => {
  const ctx = await requireOrg("ai");
  const status = new URL(req.url).searchParams.get("status");
  const rows = await db.aiAction.findMany({ where: { orgId: ctx.org.id, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
  const counts = await db.aiAction.groupBy({ by: ["status"], where: { orgId: ctx.org.id }, _count: true });
  return ok({ data: rows, counts: Object.fromEntries(counts.map((c) => [c.status, c._count])), paused: ctx.org.aiPaused, simulation: ctx.org.aiSimulation, autonomy: ctx.org.aiDefaultAutonomy });
});
