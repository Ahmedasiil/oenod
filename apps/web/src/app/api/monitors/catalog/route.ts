import { db } from "@/lib/db";
import { ok, requireOrg, route } from "@/lib/http";
import { MONITOR_CATALOG } from "@/lib/monitors";

export const GET = route(async () => {
  const ctx = await requireOrg("monitors");
  const [monitors, alerts, checks] = await Promise.all([
    db.monitor.findMany({ where: { orgId: ctx.org.id }, orderBy: { createdAt: "asc" } }),
    db.alert.findMany({ where: { orgId: ctx.org.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.monitorCheck.findMany({ where: { monitor: { orgId: ctx.org.id }, createdAt: { gte: new Date(Date.now() - 864e5) } }, orderBy: { createdAt: "asc" }, select: { monitorId: true, status: true, value: true, createdAt: true } }),
  ]);
  return ok({ catalog: MONITOR_CATALOG, monitors, alerts, checks });
});
