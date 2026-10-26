import en, { type Dict } from "./locales/en";
import fr from "./locales/fr";
import es from "./locales/es";
import ar from "./locales/ar";
import pt from "./locales/pt";
import zh from "./locales/zh";
import hi from "./locales/hi";
import pa from "./locales/pa";
import tl from "./locales/tl";
import de from "./locales/de";
import type { DeepPartial } from "./types";

export type { Dict, DeepPartial };

/** Languages OENOD ships with. Add one by creating locales/<code>.ts and listing it here. */
export const LOCALES = [
  { code: "en", name: "English", native: "English", dir: "ltr", intl: "en-CA" },
  { code: "fr", name: "French", native: "Français", dir: "ltr", intl: "fr-CA" },
  { code: "es", name: "Spanish", native: "Español", dir: "ltr", intl: "es" },
  { code: "ar", name: "Arabic", native: "العربية", dir: "rtl", intl: "ar" },
  { code: "pt", name: "Portuguese", native: "Português", dir: "ltr", intl: "pt-BR" },
  { code: "zh", name: "Chinese (Simplified)", native: "简体中文", dir: "ltr", intl: "zh-CN" },
  { code: "hi", name: "Hindi", native: "हिन्दी", dir: "ltr", intl: "hi-IN" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", dir: "ltr", intl: "pa-IN" },
  { code: "tl", name: "Tagalog", native: "Tagalog", dir: "ltr", intl: "fil-PH" },
  { code: "de", name: "German", native: "Deutsch", dir: "ltr", intl: "de-DE" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";
const DICTS: Record<Locale, DeepPartial<Dict>> = { en, fr, es, ar, pt, zh, hi, pa, tl, de };

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && LOCALES.some((l) => l.code === v);
export const localeInfo = (l: string) => LOCALES.find((x) => x.code === l) ?? LOCALES[0];
export const dir = (l: string) => localeInfo(l).dir;

// "a.b.c" style keys, checked by TypeScript.
type Leaves<T, P extends string = ""> = { [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`> }[keyof T & string];
export type Key = Leaves<Dict>;

function pick(obj: unknown, path: string[]): string | undefined {
  let cur: unknown = obj;
  for (const p of path) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[p];
    else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Translate a key. Missing translations fall back to English; {placeholders} are filled from vars. */
export function t(locale: string, key: Key, vars?: Record<string, string | number>) {
  const path = key.split(".");
  const raw = pick(DICTS[(isLocale(locale) ? locale : "en") as Locale], path) ?? pick(en, path) ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : raw;
}

/** A translator bound to one locale: const tr = translator("fr"); tr("common.save") */
export const translator = (locale: string) => (key: Key, vars?: Record<string, string | number>) => t(locale, key, vars);

/** The whole dictionary for a locale, merged over English (send this to the browser or the apps). */
export function messages(locale: string): Dict {
  const merge = (base: any, over: any): any => {
    if (!over) return base;
    const out: any = Array.isArray(base) ? [...base] : { ...base };
    for (const k of Object.keys(over)) out[k] = typeof over[k] === "object" && over[k] ? merge(base?.[k] ?? {}, over[k]) : over[k];
    return out;
  };
  return merge(en, DICTS[(isLocale(locale) ? locale : "en") as Locale]);
}

/** Pick the best locale from an Accept-Language header (or a list of preferences). */
export function negotiate(acceptLanguage: string | null | undefined, fallback: Locale = DEFAULT_LOCALE): Locale {
  if (!acceptLanguage) return fallback;
  const prefs = acceptLanguage.split(",").map((part) => {
    const [tag, q] = part.trim().split(";q=");
    return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
  }).sort((a, b) => b.q - a.q);
  for (const p of prefs) {
    const base = p.tag.split("-")[0];
    if (base === "fil") return "tl";
    if (isLocale(base)) return base;
  }
  return fallback;
}

// ---------- Formatting (numbers, money, dates) in the person's language ----------

export const formatMoney = (locale: string, cents: number, currency = "CAD") =>
  new Intl.NumberFormat(localeInfo(locale).intl, { style: "currency", currency }).format(cents / 100);
export const formatNumber = (locale: string, n: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(localeInfo(locale).intl, opts).format(n);
export const formatDate = (locale: string, d: Date | string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) =>
  new Intl.DateTimeFormat(localeInfo(locale).intl, opts).format(typeof d === "string" ? new Date(d) : d);
export const formatTime = (locale: string, d: Date | string, timeZone?: string) =>
  new Intl.DateTimeFormat(localeInfo(locale).intl, { timeStyle: "short", timeZone }).format(typeof d === "string" ? new Date(d) : d);
export function formatRelative(locale: string, d: Date | string) {
  const diff = (new Date(d).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(localeInfo(locale).intl, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, s] of units) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), u);
  return rtf.format(Math.round(diff), "second");
}

/** Morning / afternoon / evening greeting in the person's language and time zone. */
export function greeting(locale: string, timeZone?: string) {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
  return t(locale, h < 12 ? "me.greetingMorning" : h < 18 ? "me.greetingAfternoon" : "me.greetingEvening");
}

/** Language name for AI prompts ("Reply in French"). */
export const languageName = (locale: string) => localeInfo(locale).name;
