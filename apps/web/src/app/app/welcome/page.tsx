"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Clock, Sparkles, Smartphone } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "@/components/session";
import { useT } from "@/components/i18n";
import { greeting } from "@oenod/i18n";
import { Button, Loading, cx } from "@/components/ui";

// The first screen after sign-up: what to do next, worked out from the company's real data.
export default function Welcome() {
  const s = useSession();
  const t = useT();
  const router = useRouter();
  const { data } = useApi<any>("/api/onboarding");
  const [ask, setAsk] = useState("");
  useEffect(() => {
    try { const a = sessionStorage.getItem("oenod:ask"); if (a) { setAsk(a); sessionStorage.removeItem("oenod:ask"); } } catch {}
  }, []);
  const first = s.user.name.split(" ")[0];
  const days = s.org?.trialEndsAt ? Math.max(0, Math.ceil((new Date(s.org.trialEndsAt).getTime() - Date.now()) / 864e5)) : null;
  const pct = data?.percent ?? 0;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="navy-panel p-7 sm:p-10">
        <div className="pointer-events-none absolute -end-20 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(142,162,255,.45),transparent)]" />
        <p className="font-mono text-[11px] uppercase tracking-[.16em] text-[#9DB0FF]">{s.org?.name}{days !== null && s.org?.status === "TRIALING" ? ` · ${days} days left in your free trial` : ""}</p>
        <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight tracking-tight sm:text-[42px]">{greeting(t.locale, s.org?.timezone)}, {first}. Let's get you set up.</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[#C9D4FF]">Ask OENOD to do something, or work through the steps below. Most people are fully set up in under 30 minutes.</p>
        <form className="mt-6 flex max-w-2xl gap-2 rounded-2xl bg-white p-2" onSubmit={(e) => { e.preventDefault(); router.push(`/app/ai${ask ? `?ask=${encodeURIComponent(ask)}` : ""}`); }}>
          <Sparkles className="ms-2 h-5 w-5 shrink-0 self-center text-blue" />
          <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="e.g. Import my customers from a spreadsheet" className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none" />
          <button className="btn-pri h-11 shrink-0">Ask OENOD</button>
        </form>
      </section>

      {!data ? <Loading rows={4} /> : (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-5 border-b border-line p-6">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90"><circle cx="18" cy="18" r="15.5" fill="none" stroke="#EAEFFF" strokeWidth="4" /><circle cx="18" cy="18" r="15.5" fill="none" stroke="#2342E0" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 97.4} 97.4`} /></svg>
            <div className="min-w-0 flex-1"><b className="font-display text-xl">{data.done} of {data.total} done</b><p className="text-[13.5px] text-muted">{data.next ? <>Next up: <b className="text-ink">{data.next.title}</b></> : "Everything's set up. Nice work."}</p></div>
            {data.next && <Link href={data.next.href} className="btn-pri">{data.next.title.split(" ").slice(0, 3).join(" ")}…<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>}
          </div>
          <ul className="divide-y divide-line">
            {data.steps.map((st: any) => (
              <li key={st.key}>
                <Link href={st.href} className="flex items-center gap-4 px-6 py-4 transition hover:bg-bg/60">
                  <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full border-2", st.done ? "border-[#1FAF6B] bg-[#1FAF6B] text-white" : st.partial ? "border-blue text-blue" : "border-line text-transparent")}><Check className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><b className={cx("block text-[14px]", st.done && "text-muted line-through decoration-line")}>{st.title}{st.extra?.required && !st.done && <span className="ms-2 rounded-md bg-[#FFF4DF] px-1.5 py-0.5 text-[10.5px] font-bold text-[#8A5A00]">Required</span>}</b><small className="text-[12.5px] text-muted">{st.why}</small></span>
                  {!st.done && <small className="hidden items-center gap-1 text-xs text-muted sm:flex"><Clock className="h-3.5 w-3.5" />{st.minutes} min</small>}
                  <ArrowRight className="h-4 w-4 text-muted rtl:rotate-180" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3 border-t border-line bg-bg/50 px-6 py-4">
            <Smartphone className="h-4 w-4 text-muted" /><small className="flex-1 text-[13px] text-muted">Your team can use the OENOD app on iPhone and Android with only the parts you allow.</small>
            <Button variant="ghost" size="sm" onClick={async () => { await api("/api/onboarding", { body: { done: true } }); router.push("/app"); }}>I'll do this later</Button>
          </div>
        </section>
      )}
    </div>
  );
}
