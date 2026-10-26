import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireUser, route } from "@/lib/http";
import { academyCheckout } from "@/lib/academy";

export const POST = route(async (req: Request) => {
  const ctx = await requireUser();
  const { courseId } = await body(req, z.object({ courseId: z.string() }));
  const c = await db.course.findUnique({ where: { id: courseId } });
  if (!c || !c.published) throw new HttpError(404, "Course not found");
  const passActive = Boolean(ctx.user.academyPassUntil && ctx.user.academyPassUntil > new Date() && !c.orgId);
  if (c.priceCents > 0 && !passActive) {
    const existing = await db.enrollment.findUnique({ where: { courseId_userId: { courseId, userId: ctx.user.id } } });
    if (existing) return ok(existing);
    return ok({ checkoutUrl: await academyCheckout({ userId: ctx.user.id, email: ctx.user.email, kind: "COURSE", courseId }) }, 402);
  }
  const e = await db.enrollment.upsert({ where: { courseId_userId: { courseId, userId: ctx.user.id } }, create: { courseId, userId: ctx.user.id, completedLessons: [], source: c.priceCents > 0 ? "PASS" : "FREE" }, update: {} });
  await db.course.update({ where: { id: courseId }, data: { enrollCount: { increment: 1 } } });
  return ok(e);
});
