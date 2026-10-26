import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { serialize } from "@/lib/resources";
import { audit } from "@/lib/audit";
import { AdInput, AUDIENCES, OBJECTIVES, PLACEMENTS } from "@/lib/ads";

// Ads manager: campaigns with live results.
export const GET = route(async () => {
  const ctx = await requireOrg("marketing");
  const rows = await db.adCampaign.findMany({ where: { orgId: ctx.org.id }, orderBy: { createdAt: "desc" }, omit: { imageData: true } });
  const totals = rows.reduce((t, r) => ({ impressions: t.impressions + r.impressions, clicks: t.clicks + r.clicks, leads: t.leads + r.leads, spentCents: t.spentCents + r.spentCents }), { impressions: 0, clicks: 0, leads: 0, spentCents: 0 });
  return ok({
    data: rows.map((r) => ({ ...serialize(r), ctr: r.impressions ? Math.round((r.clicks / r.impressions) * 10000) / 100 : 0, cpcCents: r.clicks ? Math.round(r.spentCents / r.clicks) : 0 })),
    totals, balanceCents: ctx.org.adBalanceCents, verified: ctx.org.verificationStatus === "VERIFIED", placements: PLACEMENTS, audiences: AUDIENCES, objectives: OBJECTIVES,
  });
});

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("marketing", "edit");
  const d = await body(req, AdInput);
  if (d.endAt && d.startAt && d.endAt <= d.startAt) throw new HttpError(422, "End date must be after the start date.");
  const c = await db.adCampaign.create({ data: { ...d, orgId: ctx.org.id, status: "DRAFT" } });
  await audit(ctx, "ads.created", "ad", c.id, { name: c.name });
  return ok({ data: serialize({ ...c, imageData: undefined }) }, 201);
});
