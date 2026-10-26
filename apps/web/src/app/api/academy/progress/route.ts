import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireUser, route } from "@/lib/http";
import { token } from "@/lib/crypto";
import { hasAccess } from "@/lib/academy";
import { emailLayout, sendEmail } from "@/lib/messaging";
import { APP_URL } from "@/lib/env";

export const POST = route(async (req: Request) => {
  const ctx = await requireUser();
  const d = await body(req, z.object({ courseId: z.string(), lessonId: z.string(), answers: z.array(z.number()).optional() }));
  const e = await db.enrollment.findUnique({ where: { courseId_userId: { courseId: d.courseId, userId: ctx.user.id } }, include: { course: { include: { lessons: true } } } });
  if (!e) throw new HttpError(404, "Enroll first.");
  if (!(await hasAccess(ctx.user.id, d.courseId))) throw new HttpError(402, "Buy this course or get the Academy Pass to continue.");
  const lesson = e.course.lessons.find((l) => l.id === d.lessonId);
  if (!lesson) throw new HttpError(404, "Lesson not found");
  const quiz = (lesson.quiz ?? []) as { answer: number }[];
  if (quiz.length) {
    const correct = quiz.filter((q, i) => d.answers?.[i] === q.answer).length;
    if (correct / quiz.length < 0.7) return ok({ passed: false, correct, total: quiz.length });
  }
  const done = Array.from(new Set([...e.completedLessons, lesson.id]));
  const progress = Math.round((done.length / e.course.lessons.length) * 100);
  const complete = progress >= 100;
  const r = await db.enrollment.update({ where: { id: e.id }, data: { completedLessons: done, progress, lastLessonId: lesson.id, completedAt: complete && !e.completedAt ? new Date() : e.completedAt, certificateCode: complete && e.course.certificate && !e.certificateCode ? `OEN-${token(6).toUpperCase().replace(/[-_]/g, "X")}` : e.certificateCode } });
  // First time the certificate is earned: send it, with the company's logo when the company provided the course.
  if (r.certificateCode && !e.certificateCode) {
    const sponsor = r.sponsorOrgId ? await db.organization.findUnique({ where: { id: r.sponsorOrgId }, select: { name: true, logoUrl: true } }) : null;
    await sendEmail({
      to: ctx.user.email, scope: "PLATFORM", idempotencyKey: `academycert:${r.id}`,
      subject: `Your certificate: ${e.course.title}`,
      html: emailLayout({ brand: sponsor?.name, brandLogo: sponsor?.logoUrl, title: `Congratulations, ${ctx.user.name.split(" ")[0]}!`, body: `You completed "${e.course.title}" on OENOD Academy.\n\nYour certificate is ready to download and share. Anyone can confirm it's genuine with the ID ${r.certificateCode}.`, ctaLabel: "View my certificate", ctaUrl: `${APP_URL}/verify/${r.certificateCode}` }),
    }).catch(() => {});
  }
  return ok({ passed: true, progress: r.progress, certificateCode: r.certificateCode });
});
