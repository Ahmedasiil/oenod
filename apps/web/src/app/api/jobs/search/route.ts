import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";

// Public: anyone can search jobs, no account needed.
export const GET = route(async (req: Request) => {
  const p = new URL(req.url).searchParams;
  const q = p.get("q")?.trim(), city = p.get("city")?.trim(), category = p.get("category"), workplace = p.get("workplace"), type = p.get("type");
  const page = Math.max(1, Number(p.get("page") || 1));
  const where = {
    status: "OPEN", isPublic: true,
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }, { skills: { has: q } }, { org: { name: { contains: q, mode: "insensitive" as const } } }] } : {}),
    ...(city ? { city: { contains: city, mode: "insensitive" as const } } : {}),
    ...(category ? { category } : {}), ...(workplace ? { workplace } : {}), ...(type ? { employmentType: type } : {}),
  };
  const [rows, total, categories] = await Promise.all([
    db.jobPosting.findMany({ where, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: 20, skip: (page - 1) * 20, include: { org: { select: { name: true, logoUrl: true, industry: true, brandColor: true } } } }),
    db.jobPosting.count({ where }),
    db.jobPosting.groupBy({ by: ["category"], where: { status: "OPEN", isPublic: true }, _count: true }),
  ]);
  return ok({
    total, page,
    categories: categories.map((c) => ({ name: c.category, count: c._count })),
    data: rows.map((j) => ({ id: j.id, slug: j.slug, title: j.title, company: j.org.name, companyColor: j.org.brandColor, logoUrl: j.org.logoUrl, city: j.city, workplace: j.workplace, employmentType: j.employmentType, category: j.category, salaryMin: j.salaryMin, salaryMax: j.salaryMax, salaryPeriod: j.salaryPeriod, currency: j.currency, skills: j.skills, publishedAt: j.publishedAt, featured: j.featured, description: j.description.slice(0, 280) })),
  });
});
