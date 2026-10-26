import { z } from "zod";
import { db } from "@/lib/db";
import { body, ok, requireSuperAdmin, route } from "@/lib/http";
import { notify } from "@/lib/audit";
import { adminAudit } from "@/lib/admin";

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireSuperAdmin();
  const id = (await params).id;
  const d = await body(req, z.object({ decision: z.enum(["approve", "reject", "pause"]), note: z.string().max(600).optional() }));
  const status = d.decision === "approve" ? "ACTIVE" : d.decision === "reject" ? "REJECTED" : "PAUSED";
  const c = await db.adCampaign.update({ where: { id }, data: { status, reviewNote: d.decision === "approve" ? null : d.note ?? null } });
  await notify(c.orgId, d.decision === "approve" ? `Your ad "${c.headline}" is live` : `Your ad "${c.headline}" was ${d.decision === "reject" ? "not approved" : "paused by OENOD"}`, { body: d.note, link: "/app/ads", level: d.decision === "approve" ? "success" : "warning" });
  await db.adminAction.updateMany({ where: { status: "PROPOSED", kind: { in: ["approve_ad", "reject_ad"] }, payload: { path: ["campaignId"], equals: id } }, data: { status: "DONE", decidedBy: ctx.user.name, decidedAt: new Date() } });
  await adminAudit(ctx.user.id, `ad.${d.decision}`, "ad_campaign", id, d);
  return ok(c);
});
