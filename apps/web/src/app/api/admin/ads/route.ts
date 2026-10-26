import { db } from "@/lib/db";
import { ok, requireSuperAdmin, route } from "@/lib/http";

// Ads waiting for review (with the AI policy notes), plus everything live.
export const GET = route(async (req: Request) => {
  await requireSuperAdmin();
  const status = new URL(req.url).searchParams.get("status") ?? "REVIEW";
  const rows = await db.adCampaign.findMany({ where: { status }, orderBy: { updatedAt: "desc" }, take: 100, include: { org: { select: { id: true, name: true, slug: true, verificationStatus: true } } } });
  const actions = await db.adminAction.findMany({ where: { status: "PROPOSED", kind: { in: ["approve_ad", "reject_ad"] } } });
  return ok({ data: rows.map((c) => ({ ...c, ai: actions.find((a) => (a.payload as { campaignId?: string }).campaignId === c.id) ?? null })) });
});
