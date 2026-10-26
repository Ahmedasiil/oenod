import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";

// Public business directory.
export const GET = route(async (req: Request) => {
  const p = new URL(req.url).searchParams;
  const q = p.get("q")?.trim(), city = p.get("city")?.trim(), industry = p.get("industry"), page = Math.max(1, Number(p.get("page") || 1));
  const where = {
    publicProfile: true, subscriptionStatus: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] as ("TRIALING" | "ACTIVE" | "PAST_DUE")[] },
    ...(p.get("verified") === "1" ? { verificationStatus: "VERIFIED" } : {}),
    ...(industry ? { industry } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { tagline: { contains: q, mode: "insensitive" as const } }, { services: { has: q } }] } : {}),
    ...(city ? { address: { path: ["city"], string_contains: city } } : {}),
  };
  const [rows, total] = await Promise.all([
    db.organization.findMany({ where, orderBy: [{ verificationStatus: "desc" }, { createdAt: "desc" }], take: 24, skip: (page - 1) * 24, select: { name: true, slug: true, tagline: true, industry: true, logoUrl: true, coverUrl: true, brandColor: true, address: true, verificationStatus: true, services: true, _count: { select: { jobs: { where: { status: "OPEN", isPublic: true } }, followers: true } } } }),
    db.organization.count({ where }),
  ]);
  return ok({ total, page, data: rows.map(({ verificationStatus, address, _count, ...r }) => ({ ...r, verified: verificationStatus === "VERIFIED", city: (address as Record<string, string> | null)?.city ?? null, openJobs: _count.jobs, followers: _count.followers })) });
});
