import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { isManager } from "@/lib/rbac";
import { notify } from "@/lib/audit";

// Assign a course to employees.
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("academy", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only managers can assign training.");
  const d = await body(req, z.object({ employeeIds: z.array(z.string()).min(1), dueDate: z.coerce.date().optional() }));
  const id = (await params).id;
  const course = await db.course.findFirst({ where: { id, OR: [{ orgId: ctx.org.id }, { orgId: null }] } });
  if (!course) throw new HttpError(404, "Course not found");
  const emps = await db.employee.findMany({ where: { orgId: ctx.org.id, id: { in: d.employeeIds } }, include: { membership: true } });
  const fresh = [];
  for (const e of emps) if (!(await db.trainingAssignment.findFirst({ where: { courseId: id, employeeId: e.id } }))) fresh.push(e);
  // Paid OENOD courses use seats the company bought.
  if (course.priceCents > 0 && course.orgId === null) {
    const seat = await db.courseSeat.findUnique({ where: { orgId_courseId: { orgId: ctx.org.id, courseId: id } } });
    const left = (seat?.seats ?? 0) - (seat?.used ?? 0);
    if (left < fresh.length) throw new HttpError(402, `You need ${fresh.length - left} more seat(s) for this course. Buy seats in Academy.`);
    await db.courseSeat.update({ where: { id: seat!.id }, data: { used: { increment: fresh.length } } });
  }
  await db.trainingAssignment.createMany({ data: fresh.map((e) => ({ orgId: ctx.org.id, courseId: id, employeeId: e.id, dueDate: d.dueDate })) });
  for (const e of fresh) {
    const uid = e.membership?.userId;
    if (!uid) continue;
    await db.enrollment.upsert({ where: { courseId_userId: { courseId: id, userId: uid } }, create: { courseId: id, userId: uid, completedLessons: [], source: "COMPANY", sponsorOrgId: ctx.org.id }, update: { sponsorOrgId: ctx.org.id } });
    await notify(ctx.org.id, `New training: ${course.title}`, { userId: uid, link: `/academy/learn/${course.slug}`, body: d.dueDate ? `Due ${d.dueDate.toDateString()}` : undefined });
  }
  return ok({ assigned: fresh.length });
});
