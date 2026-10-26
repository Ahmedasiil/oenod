"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Delete } from "lucide-react";
import { api } from "@/lib/client/api";
import { Logo } from "@/components/logo";
import { useSession } from "@/components/session";
import { useT } from "@/components/i18n";
import { cx } from "@/components/ui";

// Shared tablet at the door: staff enter their PIN to clock in or out.
export default function Kiosk() {
  const s = useSession();
  const t = useT();
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const x = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(x); }, []);
  useEffect(() => { if (!msg) return; const x = setTimeout(() => setMsg(null), 3500); return () => clearTimeout(x); }, [msg]);
  const go = async (action: "in" | "out") => {
    if (pin.length < 4) return;
    try { const r = await api("/api/time/kiosk", { body: { pin, action } }); setMsg({ text: `${action === "in" ? "Welcome" : "See you soon"}, ${r.name.split(" ")[0]}! ${action === "in" ? "Clocked in" : "Clocked out"} at ${t.time(new Date())}.`, ok: true }); }
    catch (e: any) { setMsg({ text: e.message, ok: false }); }
    setPin("");
  };
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-navy p-6 text-white" style={{ backgroundImage: "radial-gradient(60% 50% at 50% 0, rgba(35,66,224,.5), transparent 70%)" }}>
      <Link href="/app/time" className="absolute end-5 top-5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">Exit kiosk</Link>
      <div className="w-full max-w-sm text-center">
        <Logo tone="white" href={null} className="mx-auto h-7 w-auto" />
        <div className="mt-2 text-sm text-[#C9D4FF]">{s.org?.name}</div>
        <div className="mt-6 font-mono text-5xl tabular-nums">{t.time(now)}</div>
        <div className="mt-1 text-sm text-[#C9D4FF]">{t.date(now, { weekday: "long", month: "long", day: "numeric" })}</div>
        <div className="mt-8 flex justify-center gap-3" aria-label="PIN">{Array.from({ length: 4 }, (_, i) => <span key={i} className={cx("h-4 w-4 rounded-full border-2 border-white/60", pin.length > i && "bg-white")} />)}</div>
        <div className={cx("mt-4 min-h-[44px] text-sm font-semibold", msg && (msg.ok ? "text-[#5BF0A9]" : "text-[#FF9AAA]"))} aria-live="assertive">{msg?.text ?? "Enter your PIN"}</div>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k) => k === "" ? <span key="x" /> : (
            <button key={k} onClick={() => setPin((p) => k === "del" ? p.slice(0, -1) : p.length < 8 ? p + k : p)} className="grid h-16 place-items-center rounded-2xl bg-white/10 font-display text-2xl font-semibold transition active:scale-95 active:bg-white/20" aria-label={k === "del" ? "Delete" : k}>
              {k === "del" ? <Delete className="h-6 w-6" /> : k}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={() => go("in")} disabled={pin.length < 4} className="h-14 rounded-2xl bg-white font-bold text-navy disabled:opacity-40">{t("me.clockIn")}</button>
          <button onClick={() => go("out")} disabled={pin.length < 4} className="h-14 rounded-2xl border-2 border-white/40 font-bold disabled:opacity-40">{t("me.clockOut")}</button>
        </div>
      </div>
    </div>
  );
}
