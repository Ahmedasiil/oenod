import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { safeEqual, sha256 } from "@/lib/crypto";
import { limit } from "@/lib/ratelimit";
import { runVerification } from "@/lib/verification";

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("settings", "edit");
  if (!limit(`verifcode:${ctx.org.id}`, 10, 3600_000)) throw new HttpError(429, "Too many tries. Wait an hour.");
  const { code } = await body(req, z.object({ code: z.string().regex(/^\d{6}$/) }));
  const v = await db.verificationRequest.findFirst({ where: { orgId: ctx.org.id, emailCode: { not: null }, emailVerifiedAt: null }, orderBy: { submittedAt: "desc" } });
  if (!v || Date.now() - v.submittedAt.getTime() > 864e5) throw new HttpError(400, "No pending code. Submit again.");
  if (!safeEqual(sha256(code), v.emailCode!)) throw new HttpError(400, "That code isn't right.");
  await db.verificationRequest.update({ where: { id: v.id }, data: { emailVerifiedAt: new Date(), emailCode: null } });
  runVerification(v.id).catch(console.error);
  return ok({ ok: true });
});
