"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { cx } from "@/components/ui";

const PROMPTS = ["Launch a win-back campaign", "Build next week's schedule", "Hire two baristas", "Chase unpaid invoices", "Train the team on food safety", "Why were sales down on Tuesday?"];

/** The hero "Ask OENOD" box. It types example requests and sends visitors to sign up with their own. */
export function AskBox() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [shown, setShown] = useState("");
  const [value, setValue] = useState("");
  useEffect(() => {
    if (value) return;
    const full = PROMPTS[i];
    if (shown.length < full.length) { const t = setTimeout(() => setShown(full.slice(0, shown.length + 1)), 45); return () => clearTimeout(t); }
    const t = setTimeout(() => { setShown(""); setI((i + 1) % PROMPTS.length); }, 2200);
    return () => clearTimeout(t);
  }, [shown, i, value]);
  return (
    <form onSubmit={(e) => { e.preventDefault(); router.push(`/signup?ask=${encodeURIComponent(value || PROMPTS[i])}`); }}
      className="mx-auto flex w-full max-w-xl items-center gap-2 rounded-2xl border border-[#C9D4FF] bg-white p-2 shadow-[0_20px_50px_-24px_rgba(0,15,85,.45)]">
      <Sparkles className="ms-2 h-5 w-5 shrink-0 text-blue" />
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={shown} aria-label="Ask OENOD" className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#2B3150]" />
      <button className="btn-pri h-10 shrink-0">Ask OENOD</button>
    </form>
  );
}

/** Monthly / yearly toggle for the pricing table. */
export function PriceTable({ plans }: { plans: { key: string; name: string; tagline: string | null; priceMonthly: number; priceYearly: number; features: string[] }[] }) {
  const [yearly, setYearly] = useState(false);
  const fmt = (c: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(c / 100);
  return (
    <div>
      <div className="mx-auto mb-8 flex w-fit items-center gap-1 rounded-full border border-line bg-white p-1 text-[13px] font-bold">
        <button onClick={() => setYearly(false)} className={cx("rounded-full px-4 py-2", !yearly ? "bg-navy text-white" : "text-muted")}>Monthly</button>
        <button onClick={() => setYearly(true)} className={cx("rounded-full px-4 py-2", yearly ? "bg-navy text-white" : "text-muted")}>Yearly <span className={cx("ms-1 rounded-full px-1.5 py-0.5 text-[10px]", yearly ? "bg-white/15" : "bg-sky text-blue")}>2 months free</span></button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => {
          const popular = p.key === "GROWTH";
          return (
            <div key={p.key} className={cx("relative flex flex-col rounded-[22px] border p-6", popular ? "border-transparent bg-navy text-white shadow-[0_30px_60px_-30px_rgba(0,15,85,.7)]" : "border-line bg-white")}>
              {popular && <span className="absolute -top-3 start-6 rounded-full bg-blue px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white">Most popular</span>}
              <b className="font-display text-xl">{p.name}</b>
              <p className={cx("mt-1 min-h-[40px] text-[13px]", popular ? "text-[#C9D4FF]" : "text-muted")}>{p.tagline}</p>
              {p.priceMonthly > 0 ? <>
                <div className="mt-4 flex items-end gap-1"><b className="font-display text-[40px] leading-none tracking-tight">{fmt(yearly ? p.priceYearly / 12 : p.priceMonthly)}</b><span className={cx("pb-1 text-sm", popular ? "text-[#C9D4FF]" : "text-muted")}>/ month</span></div>
                <small className={cx("mt-1 text-xs", popular ? "text-[#C9D4FF]" : "text-muted")}>{yearly ? `${fmt(p.priceYearly)} billed yearly` : "Billed monthly · CAD"}</small>
                <a href={`/signup?plan=${p.key}${yearly ? "&yearly=1" : ""}`} className={cx("mt-5", popular ? "btn border-transparent bg-white text-navy" : "btn-pri")}>Start 14-day free trial</a>
              </> : <>
                <b className="mt-4 font-display text-[40px] leading-none tracking-tight">Custom</b>
                <small className="mt-1 text-xs text-muted">Priced for your organization</small>
                <a href={`/contact?topic=${p.key.toLowerCase()}`} className="btn mt-5">Talk to sales</a>
              </>}
              <ul className="mt-6 space-y-2.5 text-[13.5px]">{p.features.map((f) => <li key={f} className="flex gap-2"><span className={cx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", popular ? "bg-[#9DB0FF]" : "bg-blue")} />{f}</li>)}</ul>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col items-start gap-4 rounded-[22px] border border-dashed border-[#C9D4FF] bg-sky/40 p-6 sm:flex-row sm:items-center">
        <span className="min-w-0 flex-1"><b className="font-display text-xl">Partner &amp; reseller</b><p className="mt-1 text-[13.5px] text-muted">Sell OENOD under your own brand and domain, manage every client from one console, set your own prices and keep the margin.</p></span>
        <a href="/partners" className="btn shrink-0">Talk to us<ArrowRight className="h-4 w-4 rtl:rotate-180" /></a>
      </div>
    </div>
  );
}
