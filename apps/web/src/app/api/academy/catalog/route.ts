import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { ACADEMY_PASS } from "@/lib/academy";

// Public Academy catalogue: OENOD's library plus courses companies publish.
export const GET = route(async (req: Request) => {
  const p = new URL(req.url).searchParams;
  const q = p.get("q")?.trim(), category = p.get("category"), level = p.get("level"), price = p.get("price");
  const where = {
    published: true, isPublic: true,
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { summary: { contains: q, mode: "insensitive" as const } }, { tags: { has: q.toLowerCase() } }] } : {}),
    ...(category ? { category } : {}), ...(level ? { level } : {}),
    ...(price === "free" ? { priceCents: 0 } : price === "paid" ? { priceCents: { gt: 0 } } : {}),
  };
  const [rows, cats] = await Promise.all([
    db.course.findMany({ where, orderBy: [{ featured: "desc" }, { enrollCount: "desc" }, { createdAt: "desc" }], take: 120, include: { org: { select: { name: true, slug: true, verificationStatus: true } }, _count: { select: { lessons: true } } } }),
    db.course.groupBy({ by: ["category"], where: { published: true, isPublic: true }, _count: true }),
  ]);
  return ok({
    pass: { monthCents: ACADEMY_PASS.month.cents, yearCents: ACADEMY_PASS.year.cents, currency: "CAD" },
    categories: cats.map((c) => ({ name: c.category, count: c._count })).sort((a, b) => b.count - a.count),
    data: rows.map((c) => ({ id: c.id, slug: c.slug, title: c.title, summary: c.summary, category: c.category, level: c.level, priceCents: c.priceCents, compareAtCents: c.compareAtCents, currency: c.currency, coverColor: c.coverColor, coverUrl: `/api/academy/cover/${c.slug}`, durationMin: c.durationMin, lessons: c._count.lessons, rating: c.rating, enrollCount: c.enrollCount, featured: c.featured, certificate: c.certificate, by: c.org ? { name: c.org.name, slug: c.org.slug, verified: c.org.verificationStatus === "VERIFIED" } : { name: "OENOD Academy", slug: null, verified: true } })),
  });
});
