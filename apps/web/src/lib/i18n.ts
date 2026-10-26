import { cookies, headers } from "next/headers";
import { isLocale, negotiate, translator, type Locale } from "@oenod/i18n";

export const LOCALE_COOKIE = "oenod_locale";

/**
 * The language for this request: the person's own choice (cookie or ?lang / x-oenod-locale from the apps),
 * then their profile, then their company's default, then the browser's Accept-Language.
 */
export async function requestLocale(pref?: { userLocale?: string | null; orgLocale?: string | null }): Promise<Locale> {
  const h = await headers();
  const c = await cookies();
  for (const v of [h.get("x-oenod-locale"), c.get(LOCALE_COOKIE)?.value, pref?.userLocale, pref?.orgLocale]) if (isLocale(v)) return v;
  return negotiate(h.get("accept-language"));
}

export async function serverT(pref?: { userLocale?: string | null; orgLocale?: string | null }) {
  const locale = await requestLocale(pref);
  return { locale, t: translator(locale) };
}
