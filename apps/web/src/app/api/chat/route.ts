import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";

export const GET = route(async () => {
  const ctx = await requireOrg("chat");
  const channels = await db.chatChannel.findMany({ where: { orgId: ctx.org.id }, orderBy: { name: "asc" } });
  return ok(channels);
});

// Managers create channels (#kitchen, #drivers…). Everyone in the company can read and post.
export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("chat", "edit");
  if (!["OWNER", "ADMIN", "MANAGER"].includes(ctx.role)) throw new HttpError(403, "Only managers can create channels.");
  const { name } = await body(req, z.object({ name: z.string().trim().min(2).max(40).transform((s) => s.toLowerCase().replace(/[^a-z0-9À-ɏ؀-ۿ-]+/g, "-").replace(/^-+|-+$/g, "")) }));
  if (!name) throw new HttpError(422, "Pick a channel name.");
  if (await db.chatChannel.findFirst({ where: { orgId: ctx.org.id, name } })) throw new HttpError(409, "That channel already exists.");
  return ok(await db.chatChannel.create({ data: { orgId: ctx.org.id, name } }), 201);
});
