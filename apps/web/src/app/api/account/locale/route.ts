import { z } from "zod";
import { cookies } from "next/headers";
import { LOCALES } from "@oenod/i18n";
import { db } from "@/lib/db";
import { getCtx } from "@/lib/auth";
import { body, ok, route } from "@/lib/http";
import { LOCALE_COOKIE } from "@/lib/i18n";

// Change language. Saved on the profile when signed in (so emails, the apps and the AI follow), and in a cookie for visitors.
export const PUT = route(async (req: Request) => {
  const d = await body(req, z.object({ locale: z.enum(LOCALES.map((l) => l.code) as [string, ...string[]]) }));
  (await cookies()).set(LOCALE_COOKIE, d.locale, { path: "/", maxAge: 365 * 86400, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  const ctx = await getCtx();
  if (ctx.user) await db.user.update({ where: { id: ctx.user.id }, data: { locale: d.locale } });
  return ok({ locale: d.locale });
});
