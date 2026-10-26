import { z } from "zod";
import { body, clientIp, HttpError, ok, route } from "@/lib/http";
import { limit } from "@/lib/ratelimit";
import { getCtx } from "@/lib/auth";
import { translateTexts } from "@/lib/translate";
import { requestLocale } from "@/lib/i18n";

// "Translate" button on job posts, lessons, reviews, chat and announcements. Open to visitors (rate-limited).
export const POST = route(async (req: Request) => {
  const ctx = await getCtx();
  const who = ctx.user?.id ?? clientIp(req) ?? "anon";
  if (!limit(`translate:${who}`, ctx.user ? 120 : 20, 3600_000)) throw new HttpError(429, "Translation limit reached for now. Try again later.");
  const d = await body(req, z.object({ texts: z.array(z.string().max(20000)).min(1).max(50), locale: z.string().optional() }));
  if (d.texts.join("").length > 60000) throw new HttpError(413, "That's too much text to translate at once.");
  const locale = d.locale ?? (await requestLocale({ userLocale: ctx.user?.locale, orgLocale: ctx.org?.locale }));
  return ok({ locale, texts: await translateTexts(d.texts, locale) });
});
