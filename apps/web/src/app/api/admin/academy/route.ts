import { db } from "@/lib/db";
import { ok, requireSuperAdmin, route } from "@/lib/http";

// OENOD Academy catalogue with sales, enrollments and completions.
export const GET = route(async () => {
  await requireSuperAdmin();
  const courses = await db.course.findMany({ where: { orgId: null }, orderBy: { title: "asc" }, select: { id: true, slug: true, title: true, category: true, level: true, priceCents: true, compareAtCents: true, featured: true, published: true, _count: { select: { enrollments: true, lessons: true } } } });
  const [sales, completions, passes] = await Promise.all([
    db.coursePurchase.groupBy({ by: ["courseId"], where: { status: "PAID" }, _sum: { amountCents: true }, _count: true }),
    db.enrollment.groupBy({ by: ["courseId"], where: { completedAt: { not: null } }, _count: true }),
    db.user.count({ where: { academyPassUntil: { gt: new Date() } } }),
  ]);
  return ok({
    passHolders: passes,
    data: courses.map((c) => ({ ...c, revenueCents: sales.find((s) => s.courseId === c.id)?._sum.amountCents ?? 0, sales: sales.find((s) => s.courseId === c.id)?._count ?? 0, completions: completions.find((x) => x.courseId === c.id)?._count ?? 0 })),
  });
});
