import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { serialize } from "@/lib/resources";
import { audit } from "@/lib/audit";
import { AdInput } from "@/lib/ads";

type P = { params: Promise<{ id: string }> };
async function find(orgId: string, id: string) {
  const c = await db.adCampaign.findFirst({ where: { id, orgId }, omit: { imageData: true } });
  if (!c) throw new HttpError(404, "Campaign not found.");
  return c;
}

export const GET = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg("marketing");
  const c = await find(ctx.org.id, (await params).id);
  const [daily, leads] = await Promise.all([
    db.adStat.findMany({ where: { campaignId: c.id }, orderBy: { date: "asc" } }),
    db.adLead.findMany({ where: { campaignId: c.id }, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  const byPlacement = Object.values(daily.reduce<Record<string, { placement: string; impressions: number; clicks: number; spentCents: number }>>((a, s) => {
    a[s.placement] ??= { placement: s.placement, impressions: 0, clicks: 0, spentCents: 0 };
    a[s.placement].impressions += s.impressions; a[s.placement].clicks += s.clicks; a[s.placement].spentCents += s.spentCents;
    return a;
  }, {}));
  return ok({ data: serialize(c), daily, byPlacement, leads });
});

// Edits to a live ad send it back to review.
export const PATCH = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("marketing", "edit");
  const c = await find(ctx.org.id, (await params).id);
  const raw = (await req.json()) as Record<string, unknown>;
  const action = raw.action as string | undefined;
  if (action === "pause" || action === "resume") {
    if (action === "resume" && !["PAUSED", "OUT_OF_FUNDS"].includes(c.status)) throw new HttpError(409, "Only paused campaigns can be resumed.");
    if (action === "resume" && ctx.org.adBalanceCents <= 0) throw new HttpError(402, "Add funds to your ad wallet first.");
    const row = await db.adCampaign.update({ where: { id: c.id }, data: { status: action === "pause" ? "PAUSED" : "ACTIVE" } });
    return ok({ data: serialize({ ...row, imageData: undefined }) });
  }
  const d = AdInput.partial().parse(raw);
  const creative = ["headline", "body", "imageUrl", "ctaLabel", "destinationUrl"].some((k) => k in d);
  const row = await db.adCampaign.update({ where: { id: c.id }, data: { ...d, ...(creative && ["ACTIVE", "PAUSED", "REJECTED"].includes(c.status) ? { status: "DRAFT" } : {}) } });
  await audit(ctx, "ads.updated", "ad", c.id);
  return ok({ data: serialize({ ...row, imageData: undefined }), needsReview: creative });
});

export const DELETE = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg("marketing", "edit");
  const c = await find(ctx.org.id, (await params).id);
  if (c.spentCents > 0) await db.adCampaign.update({ where: { id: c.id }, data: { status: "ENDED" } });
  else await db.adCampaign.delete({ where: { id: c.id } });
  return ok({ ok: true });
});
