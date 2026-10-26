import { z } from "zod";
import { db } from "@/lib/db";
import { body, clientIp, HttpError, ok, route } from "@/lib/http";
import { limit } from "@/lib/ratelimit";

export const POST = route(async (req: Request) => {
  if (!limit(`alert:${clientIp(req)}`, 10, 3600_000)) throw new HttpError(429, "Too many requests.");
  const d = await body(req, z.object({ email: z.string().trim().toLowerCase().email(), keywords: z.string().max(100).optional(), city: z.string().max(80).optional(), consent: z.literal(true) }));
  await db.jobAlert.create({ data: { email: d.email, keywords: d.keywords, city: d.city } });
  return ok({ ok: true });
});
