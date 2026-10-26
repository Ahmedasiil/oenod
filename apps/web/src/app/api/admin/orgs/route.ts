import { db } from "@/lib/db";
import { ok, requireSuperAdmin, route } from "@/lib/http";

// Every customer company, searchable and filterable.
export const GET = route(async (req: Request) => {
  await requireSuperAdmin();
  const q = new URL(req.url).searchParams;
  const search = q.get("q")?.trim();
  const status = q.get("status") ?? undefined;
  const page = Math.max(1, Number(q.get("page") ?? 1));
  const where = {
    ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { slug: { contains: search.toLowerCase() } }, { email: { contains: search, mode: "insensitive" as const } }] } : {}),
    ...(status ? { subscriptionStatus: status as never } : {}),
    ...(q.get("verified") ? { verificationStatus: q.get("verified")! } : {}),
  };
  const [rows, total] = await Promise.all([
    db.organization.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50, select: { id: true, name: true, slug: true, industry: true, country: true, planKey: true, billingInterval: true, subscriptionStatus: true, trialEndsAt: true, verificationStatus: true, adBalanceCents: true, createdAt: true, _count: { select: { memberships: true, employees: true } } } }),
    db.organization.count({ where }),
  ]);
  return ok({ data: rows, total, page, pages: Math.ceil(total / 50) });
});
