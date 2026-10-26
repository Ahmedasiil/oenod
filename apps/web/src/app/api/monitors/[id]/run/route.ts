import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { runMonitor } from "@/lib/monitors";

export const POST = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("monitors", "edit");
  const m = await db.monitor.findFirst({ where: { id: (await params).id, orgId: ctx.org.id } });
  if (!m) throw new HttpError(404, "Monitor not found");
  return ok(await runMonitor(m));
});
