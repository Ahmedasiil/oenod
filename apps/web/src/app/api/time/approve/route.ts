import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { isManager } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("time", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only managers can approve timesheets.");
  const d = await body(req, z.object({ ids: z.array(z.string()).min(1).max(500), status: z.enum(["APPROVED", "REJECTED"]) }));
  const r = await db.timeEntry.updateMany({ where: { orgId: ctx.org.id, id: { in: d.ids }, clockOut: { not: null } }, data: { status: d.status } });
  await audit(ctx, `time.${d.status.toLowerCase()}`, "timeEntry", undefined, { count: r.count });
  return ok({ updated: r.count });
});
