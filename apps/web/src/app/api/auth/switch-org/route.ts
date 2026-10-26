import { z } from "zod";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ORG_COOKIE } from "@/lib/auth";
import { body, HttpError, ok, requireUser, route } from "@/lib/http";

export const POST = route(async (req: Request) => {
  const ctx = await requireUser();
  const { orgId } = await body(req, z.object({ orgId: z.string() }));
  const m = await db.membership.findUnique({ where: { userId_orgId: { userId: ctx.user.id, orgId } } });
  if (!m) throw new HttpError(403, "You're not a member of that workspace.");
  (await cookies()).set(ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 365 * 86400 });
  return ok({ ok: true });
});
