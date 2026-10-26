import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { slugify } from "@/lib/format";
import { token } from "@/lib/crypto";
import { isManager } from "@/lib/rbac";

// Company courses (internal training or published to the public Academy marketplace).
export const GET = route(async () => {
  const ctx = await requireOrg("academy");
  const courses = await db.course.findMany({ where: { OR: [{ orgId: ctx.org.id }, { orgId: null, isPublic: true }] }, include: { _count: { select: { lessons: true, enrollments: true, assignments: true } } }, orderBy: { createdAt: "desc" } });
  return ok({ data: courses.map((c) => ({ ...c, mine: c.orgId === ctx.org.id })) });
});

const Lesson = z.object({ title: z.string().min(2), content: z.string().min(1), videoUrl: z.string().url().optional().or(z.literal("")), durationMin: z.number().int().min(1).default(10), quiz: z.array(z.object({ q: z.string(), options: z.array(z.string()).min(2), answer: z.number().int() })).optional() });
const Schema = z.object({ title: z.string().min(3).max(140), summary: z.string().min(10).max(400), description: z.string().optional(), category: z.string().default("Business"), level: z.string().default("Beginner"), priceCents: z.number().int().min(0).default(0), isPublic: z.boolean().default(false), coverColor: z.string().default("#2342E0"), lessons: z.array(Lesson).min(1) });

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("academy", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only managers can publish courses.");
  const d = await body(req, Schema);
  const course = await db.course.create({
    data: {
      orgId: ctx.org.id, slug: `${slugify(d.title)}-${token(3).toLowerCase()}`, title: d.title, summary: d.summary, description: d.description, category: d.category, level: d.level,
      priceCents: d.priceCents, isPublic: d.isPublic, coverColor: d.coverColor, instructorName: ctx.org.name, currency: ctx.org.currency, rating: 5, enrollCount: 0,
      durationMin: d.lessons.reduce((s, l) => s + l.durationMin, 0),
      lessons: { create: d.lessons.map((l, i) => ({ title: l.title, content: l.content, videoUrl: l.videoUrl || null, durationMin: l.durationMin, quiz: l.quiz, order: i + 1 })) },
    },
  });
  return ok({ data: course }, 201);
});
