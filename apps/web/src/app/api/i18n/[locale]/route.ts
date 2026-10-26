import { isLocale, LOCALES, messages } from "@oenod/i18n";

// Translations for the web app, mobile and desktop. Cached at the edge; changes ship with each release.
export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  if (locale === "index") return Response.json({ locales: LOCALES }, { headers: { "Cache-Control": "public, max-age=3600" } });
  if (!isLocale(locale)) return Response.json({ error: "Unknown language." }, { status: 404 });
  return Response.json({ locale, dir: LOCALES.find((l) => l.code === locale)!.dir, messages: messages(locale) }, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
