"use client";
import { useState } from "react";
import { Star, TrendingUp, TrendingDown, Bell, Moon } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { Button, ErrorNote, Field, Input, Loading, Modal, Sparkline, Tabs, Toggle, cx, useToast } from "@/components/ui";
import { PageTitle } from "../bits";

type Q = { symbol: string; name: string; kind: string; price: number | null; changePct: number | null; currency: string; halal: boolean; source: string; at: string };
type W = { id: string; symbol: string; alertAbove: number | null; alertBelow: number | null };

const fmt = (p: number | null, cur: string) => (p == null ? "—" : new Intl.NumberFormat("en-CA", { style: "currency", currency: cur.length === 3 ? cur : "USD", currencyDisplay: "narrowSymbol", maximumFractionDigits: p < 10 ? 4 : 2 }).format(p));

function Detail({ q, w, onClose, onSaved }: { q: Q; w?: W; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { data } = useApi<{ closes: number[] }>(`/api/pay/markets/${encodeURIComponent(q.symbol)}`);
  const [above, setAbove] = useState(w?.alertAbove ? String(w.alertAbove) : "");
  const [below, setBelow] = useState(w?.alertBelow ? String(w.alertBelow) : "");
  return (
    <Modal open onClose={onClose} title={`${q.name} (${q.symbol})`} footer={<>{w && <Button variant="ghost" onClick={async () => { await api(`/api/pay/watchlist?symbol=${encodeURIComponent(q.symbol)}`, { method: "DELETE" }); onSaved(); onClose(); }}>Remove from watchlist</Button>}<Button variant="pri" onClick={async () => { try { await api("/api/pay/watchlist", { body: { symbol: q.symbol, alertAbove: above ? Number(above) : null, alertBelow: below ? Number(below) : null } }); toast("Saved to your watchlist", "ok"); onSaved(); onClose(); } catch (e: any) { toast(e.message, "err"); } }}><Star className="h-4 w-4" />{w ? "Save alerts" : "Watch"}</Button></>}>
      <div className="space-y-4">
        <div className="flex items-end justify-between"><div className="font-display text-[34px] font-semibold text-navy">{fmt(q.price, q.currency)}</div>{q.changePct != null && <span className={cx("font-bold", q.changePct >= 0 ? "text-[#1FAF6B]" : "text-crit")}>{q.changePct >= 0 ? "+" : ""}{q.changePct.toFixed(2)}% today</span>}</div>
        {data?.closes?.length ? <Sparkline values={data.closes} className="h-28 w-full" color={data.closes.at(-1)! >= data.closes[0] ? "#1FAF6B" : "#D9334C"} /> : <div className="grid h-28 place-items-center rounded-xl bg-bg text-[13px] text-muted">30-day chart loading…</div>}
        <div className="grid grid-cols-2 gap-3"><Field label="Alert me above"><Input inputMode="decimal" value={above} onChange={(e) => setAbove(e.target.value)} /></Field><Field label="Alert me below"><Input inputMode="decimal" value={below} onChange={(e) => setBelow(e.target.value)} /></Field></div>
        <p className="text-[12px] text-muted">Source: {q.source}. Prices may be delayed and are for information only, not investment advice.</p>
      </div>
    </Modal>
  );
}

export default function Markets() {
  const [tab, setTab] = useState("ALL");
  const [halal, setHalal] = useState(false);
  const [open, setOpen] = useState<Q | null>(null);
  const { data, error, reload } = useApi<{ quotes: Q[]; note: string }>("/api/pay/markets", { refreshMs: 30_000 });
  const { data: wl, reload: reloadW } = useApi<{ watch: W[] }>("/api/pay/watchlist");
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading rows={8} />;
  const watched = new Set(wl?.watch.map((w) => w.symbol));
  const list = data.quotes.filter((q) => (tab === "ALL" || (tab === "WATCH" ? watched.has(q.symbol) : q.kind === tab)) && (!halal || q.halal));
  return (
    <div>
      <PageTitle title="Markets" sub="Live stocks, crypto, gold and currencies. Watch what matters and get an alert when a price moves." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={tab} onChange={setTab} tabs={[{ key: "ALL", label: "All" }, { key: "WATCH", label: "Watchlist", count: wl?.watch.length }, { key: "STOCK", label: "Stocks" }, { key: "CRYPTO", label: "Crypto" }, { key: "METAL", label: "Gold & silver" }, { key: "FX", label: "Currencies" }]} />
        <span className="flex-1" />
        <span className="flex items-center gap-2"><Moon className="h-4 w-4 text-[#1FAF6B]" /><Toggle checked={halal} onChange={setHalal} label="Halal only" /></span>
      </div>
      <div className="card divide-y divide-line overflow-hidden">
        {list.map((q) => (
          <button key={q.symbol} onClick={() => setOpen(q)} className="flex w-full items-center gap-4 px-5 py-3.5 text-start transition hover:bg-bg">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky font-display text-[12px] font-semibold text-navy">{q.symbol.split("/")[0].slice(0, 4)}</span>
            <span className="min-w-0 flex-1"><b className="flex items-center gap-1.5 text-[14.5px]">{q.name}{watched.has(q.symbol) && <Star className="h-3.5 w-3.5 fill-[#FFB020] text-[#FFB020]" />}{(wl?.watch.find((w) => w.symbol === q.symbol)?.alertAbove || wl?.watch.find((w) => w.symbol === q.symbol)?.alertBelow) && <Bell className="h-3.5 w-3.5 text-blue" />}</b><small className="text-muted">{q.symbol}{q.halal ? " · Halal screen" : ""}</small></span>
            <span className="text-end"><b className="block text-[14.5px]">{fmt(q.price, q.currency)}</b>{q.changePct != null ? <small className={cx("flex items-center justify-end gap-0.5 font-bold", q.changePct >= 0 ? "text-[#1FAF6B]" : "text-crit")}>{q.changePct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{q.changePct.toFixed(2)}%</small> : <small className="text-muted">{q.price == null ? "Connect data" : ""}</small>}</span>
          </button>
        ))}
        {!list.length && <p className="p-10 text-center text-[13.5px] text-muted">Nothing here yet. Tap any price to add it to your watchlist.</p>}
      </div>
      <p className="mt-3 text-[12px] text-muted">{data.note} Halal flags follow common Shariah screens and are a guide only.</p>
      {open && <Detail q={open} w={wl?.watch.find((w) => w.symbol === open.symbol)} onClose={() => setOpen(null)} onSaved={reloadW} />}
    </div>
  );
}
