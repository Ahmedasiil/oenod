import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireUser, route } from "@/lib/http";

export const POST = route(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const ctx = await requireUser();
  const o = await db.organization.findUnique({ where: { slug: (await params).slug }, select: { id: true } });
  if (!o) throw new HttpError(404, "Company not found.");
  const { follow } = await body(req, z.object({ follow: z.boolean() }));
  if (follow) await db.companyFollow.upsert({ where: { orgId_userId: { orgId: o.id, userId: ctx.user.id } }, create: { orgId: o.id, userId: ctx.user.id }, update: {} });
  else await db.companyFollow.deleteMany({ where: { orgId: o.id, userId: ctx.user.id } });
  return ok({ following: follow });
});
