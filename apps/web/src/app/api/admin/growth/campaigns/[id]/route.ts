import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireSuperAdmin, route } from "@/lib/http";
import { CampaignInput, resolveAudience, sendGrowthCampaign } from "@/lib/growth";
import { adminAudit } from "@/lib/admin";

type P = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, { params }: P) => {
  await requireSuperAdmin();
  const c = await db.growthCampaign.findUnique({ where: { id: (await params).id } });
  if (!c) throw new HttpError(404, "Campaign not found.");
  const reach = (await resolveAudience(c.audience, c.channel === "SMS" ? "SMS" : "EMAIL")).length;
  return ok({ ...c, reach });
});

export const PATCH = route(async (req: Request, { params }: P) => {
  const ctx = await requireSuperAdmin();
  const id = (await params).id;
  const c = await db.growthCampaign.findUnique({ where: { id } });
  if (!c) throw new HttpError(404, "Campaign not found.");
  if (c.status === "SENT" || c.status === "SENDING") throw new HttpError(409, "This campaign has already gone out.");
  const d = await body(req, CampaignInput.partial().extend({ status: z.enum(["DRAFT", "SCHEDULED"]).optional() }));
  const r = await db.growthCampaign.update({ where: { id }, data: d });
  await adminAudit(ctx.user.id, "growth.campaign_updated", "growth_campaign", id);
  return ok(r);
});

// Send now. Only people who consented receive it; everyone else is skipped and counted.
export const POST = route(async (_req: Request, { params }: P) => {
  const ctx = await requireSuperAdmin();
  const id = (await params).id;
  const result = await sendGrowthCampaign(id);
  await adminAudit(ctx.user.id, "growth.campaign_sent", "growth_campaign", id, result);
  return ok(result);
});

export const DELETE = route(async (_req: Request, { params }: P) => {
  const ctx = await requireSuperAdmin();
  const id = (await params).id;
  await db.growthCampaign.deleteMany({ where: { id, status: { in: ["DRAFT", "SCHEDULED"] } } });
  await adminAudit(ctx.user.id, "growth.campaign_deleted", "growth_campaign", id);
  return ok({ ok: true });
});
