"use client";
import { useEffect, useState } from "react";
import { Coffee, LogIn, LogOut, MapPin } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { useT } from "./i18n";
import { Button, cx, useToast } from "./ui";

function position(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((res) => {
    if (!("geolocation" in navigator)) return res(null);
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
  });
}

/** Clock in / out / break with a live timer. Location is attached when the browser allows it (geofence check). */
export function ClockCard() {
  const t = useT();
  const toast = useToast();
  const { data, reload } = useApi<{ open: any; onBreak: boolean; hoursThisWeek: number }>("/api/time/clock");
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const x = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(x); }, []);
  const act = async (action: "in" | "out" | "break_start" | "break_end") => {
    setBusy(action);
    try {
      const pos = action === "in" || action === "out" ? await position() : null;
      const r = await api("/api/time/clock", { body: { action, source: /OENOD-Desktop/.test(navigator.userAgent) ? "DESKTOP" : "WEB", ...(pos ?? {}) } });
      if (action === "in" && r.onSite === false) toast(t("me.outsideZone"), "info");
      else toast(action === "in" ? t("me.clockedIn") : action === "out" ? t("me.clockOut") : action === "break_start" ? t("me.onBreak") : t("me.endBreak"));
      reload();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(null); }
  };
  const open = data?.open;
  const secs = open ? Math.max(0, Math.floor((now - new Date(open.clockIn).getTime()) / 1000) - (open.breakMinutes ?? 0) * 60) : 0;
  const hh = String(Math.floor(secs / 3600)).padStart(2, "0"), mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");
  return (
    <section className={cx("relative overflow-hidden rounded-[22px] p-5 text-white shadow-lift", open ? "bg-[linear-gradient(135deg,#000F55,#0A1E8C_60%,#2342E0_130%)]" : "bg-ink")}>
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.14em] text-[#C9D4FF]">
        <span className={cx("h-2 w-2 rounded-full", open ? (data?.onBreak ? "bg-[#FFC764]" : "animate-pulse bg-[#5BF0A9]") : "bg-white/30")} />
        {open ? (data?.onBreak ? t("me.onBreak") : t("me.clockedIn")) : t("me.clockedOut")}
      </div>
      <div className="mt-3 font-mono text-[44px] font-medium leading-none tabular-nums tracking-tight" aria-live="polite">{open ? `${hh}:${mm}:${ss}` : t.time(new Date(now))}</div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#D8E0FF]">
        <span>{t("me.hours")} {t("common.thisWeek").toLowerCase()}: <b className="text-white">{data?.hoursThisWeek ?? 0} h</b></span>
        {open && open.onSite != null && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{open.onSite ? "On site" : "Outside the work area"}</span>}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {!open ? <Button className="h-12 border-0 bg-white px-6 text-base text-navy" loading={busy === "in"} onClick={() => act("in")}><LogIn className="h-5 w-5" />{t("me.clockIn")}</Button> : (
          <>
            <Button className="h-12 border-0 bg-white px-6 text-base text-navy" loading={busy === "out"} onClick={() => act("out")}><LogOut className="h-5 w-5" />{t("me.clockOut")}</Button>
            <Button className="h-12 border-0 bg-white/10 px-5 text-white hover:bg-white/20" loading={busy?.startsWith("break")} onClick={() => act(data?.onBreak ? "break_end" : "break_start")}><Coffee className="h-5 w-5" />{data?.onBreak ? t("me.endBreak") : t("me.startBreak")}</Button>
          </>
        )}
      </div>
    </section>
  );
}
