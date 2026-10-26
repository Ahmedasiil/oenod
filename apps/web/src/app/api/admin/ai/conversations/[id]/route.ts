import { db } from "@/lib/db";
import { HttpError, ok, requireSuperAdmin, route } from "@/lib/http";

type Block = { type: string; text?: string };
type Msg = { role: "user" | "assistant"; content: string | Block[] };

// A saved conversation as plain turns (tool calls and results are left out).
export const GET = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireSuperAdmin();
  const c = await db.adminConversation.findFirst({ where: { id: (await params).id, userId: ctx.user.id } });
  if (!c) throw new HttpError(404, "Conversation not found.");
  const turns = (c.messages as unknown as Msg[]).map((m) => ({ role: m.role, text: typeof m.content === "string" ? m.content : m.content.filter((b) => b.type === "text").map((b) => b.text).join("\n") })).filter((m) => m.text.trim());
  return ok({ id: c.id, title: c.title, turns });
});

export const DELETE = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireSuperAdmin();
  await db.adminConversation.deleteMany({ where: { id: (await params).id, userId: ctx.user.id } });
  return ok({ ok: true });
});
