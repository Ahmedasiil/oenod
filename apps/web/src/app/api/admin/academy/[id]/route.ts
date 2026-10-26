import { z } from "zod";
import { db } from "@/lib/db";
import { body, ok, requireSuperAdmin, route } from "@/lib/http";
import { adminAudit } from "@/lib/admin";

export const PATCH = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireSuperAdmin();
  const id = (await params).id;
  const d = await body(req, z.object({ priceCents: z.number().int().min(0).optional(), compareAtCents: z.number().int().min(0).nullable().optional(), featured: z.boolean().optional(), published: z.boolean().optional(), title: z.string().min(3).optional(), summary: z.string().optional() }));
  const c = await db.course.update({ where: { id }, data: d });
  await adminAudit(ctx.user.id, "academy.course_updated", "course", id, d);
  return ok(c);
});
