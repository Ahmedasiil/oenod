import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { isManager } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("ai", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only owners and managers can change AI controls.");
  const d = await body(req, z.object({ paused: z.boolean().optional(), simulation: z.boolean().optional(), autonomy: z.enum(["ASSIST", "APPROVE", "AUTO"]).optional() }));
  const org = await db.organization.update({ where: { id: ctx.org.id }, data: { aiPaused: d.paused, aiSimulation: d.simulation, aiDefaultAutonomy: d.autonomy } });
  await audit(ctx, "ai.controls", "organization", org.id, d);
  return ok({ paused: org.aiPaused, simulation: org.aiSimulation, autonomy: org.aiDefaultAutonomy });
});
