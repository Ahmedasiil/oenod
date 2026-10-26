import { z } from "zod";
import { db } from "@/lib/db";
import { body, ok, requireUser, route } from "@/lib/http";

export const POST = route(async (req: Request) => {
  const ctx = await requireUser();
  const { jobId, saved } = await body(req, z.object({ jobId: z.string(), saved: z.boolean() }));
  if (saved) await db.savedJob.upsert({ where: { userId_jobId: { userId: ctx.user.id, jobId } }, create: { userId: ctx.user.id, jobId }, update: {} });
  else await db.savedJob.deleteMany({ where: { userId: ctx.user.id, jobId } });
  return ok({ saved });
});
