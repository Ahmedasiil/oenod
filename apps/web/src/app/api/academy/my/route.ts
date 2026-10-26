import { db } from "@/lib/db";
import { ok, requireUser, route } from "@/lib/http";

// My learning: enrolled courses, progress, assigned training and certificates.
export const GET = route(async () => {
  const ctx = await requireUser();
  const rows = await db.enrollment.findMany({ where: { userId: ctx.user.id }, include: { course: { include: { _count: { select: { lessons: true } } } } }, orderBy: { createdAt: "desc" } });
  const emps = await db.employee.findMany({ where: { membership: { userId: ctx.user.id } }, select: { id: true } });
  const assigned = await db.trainingAssignment.findMany({ where: { employeeId: { in: emps.map((e) => e.id) } }, include: { course: { select: { slug: true, title: true } } } });
  return ok({
    passUntil: ctx.user.academyPassUntil,
    data: rows.map((e) => ({ slug: e.course.slug, title: e.course.title, coverUrl: `/api/academy/cover/${e.course.slug}`, progress: e.progress, lessons: e.course._count.lessons, completedAt: e.completedAt, certificateCode: e.certificateCode, source: e.source, lastLessonId: e.lastLessonId })),
    assigned: assigned.map((a) => ({ slug: a.course.slug, title: a.course.title, dueDate: a.dueDate, done: rows.some((e) => e.course.slug === a.course.slug && e.completedAt) })),
  });
});
