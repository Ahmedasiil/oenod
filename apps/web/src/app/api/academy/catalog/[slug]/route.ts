import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { getCtx } from "@/lib/auth";
import { hasAccess } from "@/lib/academy";

// Course page: outline for everyone; lesson text only for previews or people with access.
export const GET = route(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const c = await db.course.findUnique({ where: { slug: (await params).slug }, include: { lessons: { orderBy: { order: "asc" } }, org: { select: { name: true, slug: true, verificationStatus: true } } } });
  if (!c || !c.published) throw new HttpError(404, "Course not found.");
  const ctx = await getCtx();
  if (!c.isPublic && ctx.org?.id !== c.orgId) throw new HttpError(404, "Course not found.");
  const access = await hasAccess(ctx.user?.id, c.id);
  const enrollment = ctx.user ? await db.enrollment.findUnique({ where: { courseId_userId: { courseId: c.id, userId: ctx.user.id } } }) : null;
  return ok({
    course: { id: c.id, slug: c.slug, title: c.title, summary: c.summary, description: c.description, category: c.category, level: c.level, priceCents: c.priceCents, compareAtCents: c.compareAtCents, currency: c.currency, coverColor: c.coverColor, coverUrl: `/api/academy/cover/${c.slug}`, durationMin: c.durationMin, outcomes: c.outcomes, audience: c.audience, tags: c.tags, rating: c.rating, enrollCount: c.enrollCount, certificate: c.certificate, instructorName: c.instructorName, updatedAt: c.updatedAt, by: c.org ? { name: c.org.name, slug: c.org.slug, verified: c.org.verificationStatus === "VERIFIED" } : { name: "OENOD Academy", slug: null, verified: true } },
    access, enrollment,
    lessons: c.lessons.map((l) => {
      const open = access || l.isPreview;
      return { id: l.id, title: l.title, order: l.order, durationMin: l.durationMin, isPreview: l.isPreview, locked: !open, content: open ? l.content : null, videoUrl: open ? l.videoUrl : null, quiz: open && l.quiz ? (l.quiz as { q: string; options: string[] }[]).map((x) => ({ q: x.q, options: x.options })) : null };
    }),
  });
});
