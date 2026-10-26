"use client";
import { createContext, useContext, useMemo } from "react";
import type { Dict } from "@oenod/i18n";
import { formatDate, formatMoney, formatNumber, formatRelative, formatTime, localeInfo } from "@oenod/i18n";

type Ctx = { locale: string; dict: Dict };
const I18n = createContext<Ctx | null>(null);

export function I18nProvider({ locale, dict, children }: Ctx & { children: React.ReactNode }) {
  return <I18n.Provider value={{ locale, dict }}>{children}</I18n.Provider>;
}

/** t("common.save") with {var} interpolation; falls back to the key. */
export function useT() {
  const c = useContext(I18n);
  return useMemo(() => {
    const t = (key: string, vars?: Record<string, string | number>) => {
      let v: any = c?.dict;
      for (const p of key.split(".")) v = v?.[p];
      let s = typeof v === "string" ? v : key.split(".").pop()!;
      if (vars) for (const [k, x] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(x));
      return s;
    };
    const locale = c?.locale ?? "en";
    return Object.assign(t, {
      locale, dir: localeInfo(locale).dir,
      money: (amount: number, currency = "CAD") => formatMoney(locale, Math.round(amount * 100), currency),
      num: (n: number, o?: Intl.NumberFormatOptions) => formatNumber(locale, n, o),
      date: (d: Date | string, o?: Intl.DateTimeFormatOptions) => formatDate(locale, d, o),
      time: (d: Date | string, tz?: string) => formatTime(locale, d, tz),
      ago: (d: Date | string) => formatRelative(locale, d),
    });
  }, [c]);
}
