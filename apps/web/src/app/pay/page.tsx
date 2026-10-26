"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Send, CreditCard, Users, Plane, Sparkles, ArrowUpRight, ArrowDownLeft, LineChart, ShieldCheck } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { ago } from "@/lib/format";
import { Badge, Button, ErrorNote, Input, Loading, Modal, cx, useToast } from "@/components/ui";
import { money, SetupBanner, type Overview } from "./bits";

function Ring({ score }: { score: number }) {
  const r = 34, c = 2 * Math.PI * r;
  const color = score >= 70 ? "#1FAF6B" : score >= 45 ? "#FFB020" : "#D9334C";
  return (
    <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#E4E8F2" strokeWidth="8" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      <text x="40" y="46" textAnchor="middle" className="fill-navy font-display text-[20px] font-semibold" transform="rotate(90 40 40)">{score}</text>
    </svg>
  );
}

function TopUp({ open, onClose, currency }: { open: boolean; onClose: () => void; currency: string }) {
  const toast = useToast();
  const [amount, setAmount] = useState("100");
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Add money" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="pri" loading={busy} onClick={async () => { setBusy(true); try { const r = await api<{ url: string }>("/api/pay/topup", { body: { amountCents: Math.round(Number(amount) * 100), returnPath: "/pay" } }); location.href = r.url; } catch (e: any) { toast(e.message, "err"); setBusy(false); } }}>Continue to secure payment</Button></>}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-2xl border border-line px-4"><span className="font-display text-2xl text-muted">{currency}</span><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} className="h-16 border-0 px-0 font-display text-3xl shadow-none" /></div>
        <div className="flex gap-2">{["50", "100", "250", "500"].map((a) => <button key={a} onClick={() => setAmount(a)} className={cx("flex-1 rounded-xl border py-2 text-[13.5px] font-semibold", amount === a ? "border-navy bg-navy text-white" : "border-line")}>{a}</button>)}</div>
        <p className="flex items-center gap-1.5 text-[12.5px] text-muted"><ShieldCheck className="h-4 w-4 text-[#1FAF6B]" />Card details go straight to Stripe. oenodpay never sees them.</p>
      </div>
    </Modal>
  );
}

export default function PayHome() {
  const sp = useSearchParams();
  const toast = useToast();
  const [topup, setTopup] = useState(false);
  const { data: o, error, reload } = useApi<Overview>("/api/pay/overview", { refreshMs: 30_000 });
  useEffect(() => { if (sp.get("topup") === "done") toast("Payment received. Your balance updates in a few seconds.", "ok"); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!o) return <Loading rows={6} />;
  const actions = [
    { label: "Add money", icon: Plus, onClick: () => setTopup(true) },
    { label: "Send", icon: Send, href: "/pay/send" },
    { label: "Cards", icon: CreditCard, href: "/pay/cards" },
    { label: "Family", icon: Users, href: "/pay/family" },
    { label: "eSIM", icon: Plane, href: "/pay/travel" },
  ];
  return (
    <div className="space-y-6">
      <SetupBanner o={o} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(120%_140%_at_100%_0%,#3A5BFF_0%,#2342E0_35%,#000F55_80%)] p-7 text-white shadow-lift">
          <img src="/brand/oenodpay-mark-white.svg" alt="" className="pointer-events-none absolute -bottom-10 -end-6 h-56 w-56 opacity-[.08]" />
          <div className="flex items-center justify-between"><span className="font-mono text-[11px] uppercase tracking-[.18em] text-[#B9C6FF]">Wallet · {o.currency}</span>{o.profile.kycStatus === "VERIFIED" && <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11.5px] font-semibold"><ShieldCheck className="h-3.5 w-3.5" />Verified</span>}</div>
          <div className="mt-3 font-display text-[44px] font-semibold leading-none tracking-tight sm:text-[52px]">{money(o.availableCents, o.currency)}</div>
          {o.balanceCents !== o.availableCents && <p className="mt-2 text-[13px] text-[#B9C6FF]">{money(o.balanceCents - o.availableCents, o.currency)} held for a transfer in review</p>}
          <div className="mt-7 grid grid-cols-5 gap-2">
            {actions.map((a) => {
              const inner = <><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15 transition group-hover:bg-white/20"><a.icon className="h-5 w-5" /></span><span className="text-[12px] font-semibold text-[#DCE3FF]">{a.label}</span></>;
              return a.href ? <Link key={a.label} href={a.href} className="group flex flex-col items-center gap-1.5">{inner}</Link> : <button key={a.label} onClick={a.onClick} className="group flex flex-col items-center gap-1.5">{inner}</button>;
            })}
          </div>
        </section>
        <Link href="/pay/coach" className="card flex items-center gap-5 p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
          <Ring score={o.health.score} />
          <div className="min-w-0 flex-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[.14em] text-muted">Financial Health Score</span>
            <b className="mt-1 block font-display text-[19px] text-navy">{o.health.score >= 70 ? "You're in good shape" : o.health.score >= 45 ? "A few quick wins ahead" : "Let's build a plan together"}</b>
            <p className="mt-1 text-[13px] text-muted">{o.health.bufferMonths} months of spending set aside. Ask Oeno, your AI coach, how to raise it.</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-blue"><Sparkles className="h-4 w-4" />Talk to Oeno</span>
          </div>
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-[17px] font-semibold text-navy">Transfers</h2><Link href="/pay/send" className="text-[13px] font-bold text-blue">Send money</Link></div>
          {!o.transfers.length ? <p className="py-6 text-center text-[13.5px] text-muted">Send to bank accounts, mobile wallets, InstaPay and cash pickup in 14+ countries.</p> : (
            <ul className="divide-y divide-line">{o.transfers.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-sky text-blue"><ArrowUpRight className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><b className="block truncate text-[14px]">{t.recipient.name}</b><small className="text-muted">{t.recipient.label ?? t.recipient.country} · {ago(t.createdAt)}</small></div>
                <div className="text-end"><b className="block text-[14px]">{money(t.sendCents, t.sendCurrency)}</b><Badge status={t.status} /></div></li>
            ))}</ul>
          )}
        </section>
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-[17px] font-semibold text-navy">Activity</h2><Link href="/pay/markets" className="flex items-center gap-1 text-[13px] font-bold text-blue"><LineChart className="h-4 w-4" />Markets</Link></div>
          {!o.recent.length ? <p className="py-6 text-center text-[13.5px] text-muted">Your payments, top-ups and card spending will show here.</p> : (
            <ul className="divide-y divide-line">{o.recent.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3"><span className={cx("grid h-10 w-10 place-items-center rounded-full", a.amountCents >= 0 ? "bg-[#EEFAF4] text-[#1FAF6B]" : "bg-bg text-muted")}>{a.amountCents >= 0 ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</span>
                <div className="min-w-0 flex-1"><b className="block truncate text-[14px]">{a.memo ?? a.kind.toLowerCase()}</b><small className="text-muted">{ago(a.at)}</small></div>
                <b className={cx("text-[14px]", a.amountCents >= 0 && "text-[#1FAF6B]")}>{a.amountCents >= 0 ? "+" : ""}{money(a.amountCents, a.currency)}</b></li>
            ))}</ul>
          )}
        </section>
      </div>
      <TopUp open={topup} onClose={() => setTopup(false)} currency={o.currency} />
    </div>
  );
}
