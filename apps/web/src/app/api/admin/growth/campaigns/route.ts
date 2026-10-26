import { db } from "@/lib/db";
import { body, ok, requireSuperAdmin, route } from "@/lib/http";
import { CampaignInput, AUDIENCES, resolveAudience } from "@/lib/growth";
import { adminAudit } from "@/lib/admin";


// OENOD's own marketing to people who agreed to hear from us.
export const GET = route(async () => {
  await requireSuperAdmin();
  const rows = await db.growthCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return ok({ data: rows, audiences: AUDIENCES });
});

export const POST = route(async (req: Request) => {
  const ctx = await requireSuperAdmin();
  const d = await body(req, CampaignInput);
  const reach = (await resolveAudience(d.audience, d.channel === "SMS" ? "SMS" : "EMAIL")).length;
  const c = await db.growthCampaign.create({ data: { ...d, status: d.scheduledAt ? "SCHEDULED" : "DRAFT", createdBy: ctx.user.name } });
  await adminAudit(ctx.user.id, "growth.campaign_created", "growth_campaign", c.id);
  return ok({ ...c, reach }, 201);
});
