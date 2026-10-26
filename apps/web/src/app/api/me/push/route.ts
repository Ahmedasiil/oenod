import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireUser, route } from "@/lib/http";
import { isPushToken } from "@/lib/push";

// The mobile app registers this phone for push notifications after the person allows them.
export const PUT = route(async (req: Request) => {
  const ctx = await requireUser();
  const { token } = await body(req, z.object({ token: z.string().max(200) }));
  if (!isPushToken(token)) throw new HttpError(422, "That isn't a valid push token.");
  // A phone belongs to one account at a time.
  await db.user.updateMany({ where: { pushToken: token, id: { not: ctx.user.id } }, data: { pushToken: null } });
  await db.user.update({ where: { id: ctx.user.id }, data: { pushToken: token } });
  return ok({ ok: true });
});

export const DELETE = route(async () => {
  const ctx = await requireUser();
  await db.user.update({ where: { id: ctx.user.id }, data: { pushToken: null } });
  return ok({ ok: true });
});
