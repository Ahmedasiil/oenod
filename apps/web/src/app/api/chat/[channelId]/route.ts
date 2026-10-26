import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";

type P = { params: Promise<{ channelId: string }> };

async function channel(orgId: string, id: string) {
  const c = await db.chatChannel.findFirst({ where: { id, orgId } });
  if (!c) throw new HttpError(404, "Channel not found");
  return c;
}

export const GET = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("chat");
  const c = await channel(ctx.org.id, (await params).channelId);
  const after = new URL(req.url).searchParams.get("after");
  const msgs = await db.chatMessage.findMany({ where: { channelId: c.id, ...(after ? { createdAt: { gt: new Date(after) } } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
  return ok(msgs.reverse());
});

export const POST = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("chat", "edit");
  if (!ctx.user) throw new HttpError(400, "Sign in to chat.");
  const c = await channel(ctx.org.id, (await params).channelId);
  const { text } = await body(req, z.object({ text: z.string().trim().min(1).max(4000) }));
  return ok(await db.chatMessage.create({ data: { channelId: c.id, userId: ctx.user.id, userName: ctx.user.name, body: text } }), 201);
});
