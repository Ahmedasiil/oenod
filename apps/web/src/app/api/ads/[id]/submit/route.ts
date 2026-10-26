import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { reviewAd } from "@/lib/ads";
import { audit } from "@/lib/audit";

// Send a campaign for review: AI policy check first, then the OENOD team approves.
export const POST = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("marketing", "edit");
  const c = await db.adCampaign.findFirst({ where: { id: (await params).id, orgId: ctx.org.id } });
  if (!c) throw new HttpError(404, "Campaign not found.");
  if (!["DRAFT", "REJECTED"].includes(c.status)) throw new HttpError(409, "This campaign is already submitted.");
  if (ctx.org.adBalanceCents < c.dailyBudgetCents) throw new HttpError(402, "Add at least one day's budget to your ad wallet before submitting.");
  const review = await reviewAd(c);
  await db.adCampaign.update({ where: { id: c.id }, data: { status: "REVIEW", aiReview: review, reviewNote: null } });
  await db.adminAction.create({ data: {
    kind: review.allowed ? "approve_ad" : "reject_ad",
    title: `${review.allowed ? "Approve" : "Reject"} ad: ${c.headline}`,
    summary: `${ctx.org.name}${ctx.org.verificationStatus === "VERIFIED" ? " ✓" : ""} — ${review.allowed ? "AI found no policy issues." : `AI flagged: ${review.issues.join("; ")}`}`,
    payload: { campaignId: c.id, orgId: ctx.org.id, issues: review.issues },
  } });
  await audit(ctx, "ads.submitted", "ad", c.id);
  return ok({ status: "REVIEW", review });
});
