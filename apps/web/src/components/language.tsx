"use client";
import { useState } from "react";
import { Languages, Check } from "lucide-react";
import { LOCALES } from "@oenod/i18n";
import { api } from "@/lib/client/api";
import { useT } from "./i18n";
import { cx } from "./ui";

/** Language picker. Saves to the profile when signed in and to a cookie for visitors, then reloads in the new language and direction. */
export function LanguageSwitcher({ compact, tone = "light" }: { compact?: boolean; tone?: "light" | "dark" }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const current = LOCALES.find((l) => l.code === t.locale) ?? LOCALES[0];
  const choose = async (code: string) => {
    setOpen(false);
    if (code === t.locale) return;
    await api("/api/account/locale", { method: "PUT", body: { locale: code } }).catch(() => null);
    location.reload();
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={t("common.language")}
        className={cx("inline-flex h-10 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold transition", tone === "dark" ? "text-white/85 hover:bg-white/10" : "border border-line bg-paper text-[#353C57] shadow-card hover:text-ink")}>
        <Languages className="h-4 w-4" />{!compact && <span>{current.native}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul role="listbox" className="absolute end-0 z-50 mt-2 max-h-80 w-56 overflow-auto rounded-2xl border border-line bg-paper p-1.5 text-ink shadow-lift">
            {LOCALES.map((l) => (
              <li key={l.code}>
                <button role="option" aria-selected={l.code === t.locale} onClick={() => choose(l.code)} dir={l.dir}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start text-sm hover:bg-bg">
                  <span className="min-w-0 flex-1"><b className="block font-semibold">{l.native}</b><small className="text-muted">{l.name}</small></span>
                  {l.code === t.locale && <Check className="h-4 w-4 text-blue" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
