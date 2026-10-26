import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";

// "I've read this" on announcements that need acknowledgement (policies, safety notices).
export const POST = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("me");
  if (!ctx.user) throw new HttpError(401, "Please sign in.");
  const a = await db.announcement.findFirst({ where: { id: (await params).id, orgId: ctx.org.id } });
  if (!a) throw new HttpError(404, "Announcement not found.");
  if (!a.acks.includes(ctx.user.id)) await db.announcement.update({ where: { id: a.id }, data: { acks: { push: ctx.user.id } } });
  return ok({ ok: true });
});
