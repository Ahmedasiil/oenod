"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Search, Trash2, CreditCard, Banknote, Gift, ScanBarcode, Receipt, X } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { useT } from "@/components/i18n";
import { Button, Input, Loading, Modal, Select, cx, useToast } from "@/components/ui";

type P = { id: string; name: string; category: string; price: number; taxable: boolean; color: string | null; sku: string | null; barcode: string | null; onHand: number | null };

// Touch register: tap products, take payment. Works with a USB/Bluetooth barcode scanner (it types into the search box).
export default function Pos() {
  const t = useT();
  const toast = useToast();
  const { data, loading } = useApi<{ currency: string; taxRate: number; taxName: string; locations: { id: string; name: string }[]; products: P[] }>("/api/pos/catalog");
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<{ p: P; qty: number }[]>([]);
  const [tipPct, setTipPct] = useState(0);
  const [coupon, setCoupon] = useState("");
  const [loc, setLoc] = useState<string>("");
  const [pay, setPay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [cash, setCash] = useState("");
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => { if (data?.locations[0] && !loc) setLoc(data.locations[0].id); }, [data, loc]);

  const cur = data?.currency ?? "CAD";
  const cats = ["All", ...Array.from(new Set((data?.products ?? []).map((p) => p.category)))];
  const shown = (data?.products ?? []).filter((p) => (cat === "All" || p.category === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku === q || p.barcode === q));
  const add = (p: P) => setCart((c) => { const i = c.findIndex((x) => x.p.id === p.id); return i >= 0 ? c.map((x, j) => j === i ? { ...x, qty: x.qty + 1 } : x) : [...c, { p, qty: 1 }]; });
  const sub = cart.reduce((s, l) => s + l.p.price * l.qty, 0);
  const tax = cart.reduce((s, l) => s + (l.p.taxable ? l.p.price * l.qty : 0), 0) * (data?.taxRate ?? 0);
  const tip = Math.round(sub * tipPct) / 100;
  const total = sub + tax + tip;
  const key = useMemo(() => `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`, [pay]); // one idempotency key per payment attempt

  const charge = async (method: "CARD" | "CASH" | "GIFT_CARD") => {
    setBusy(true);
    try {
      const r = await api("/api/pos/order", { body: { locationId: loc || undefined, items: cart.map((l) => ({ productId: l.p.id, quantity: l.qty })), tip, couponCode: coupon || undefined, paymentMethod: method, idempotencyKey: key } });
      setReceipt({ ...r.data, method, change: method === "CASH" && cash ? Number(cash) - Number(r.data.total) : null });
      setCart([]); setTipPct(0); setCoupon(""); setCash(""); setPay(false);
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };

  if (loading || !data) return <Loading rows={6} />;
  return (
    <div className="grid gap-4 lg:h-[calc(100dvh-120px)] lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Products */}
      <section className="flex min-h-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <ScanBarcode className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted" />
            <Input ref={search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or scan a barcode" className="ps-9"
              onKeyDown={(e) => { if (e.key === "Enter") { const hit = data.products.find((p) => p.barcode === q || p.sku === q) ?? (shown.length === 1 ? shown[0] : null); if (hit) { add(hit); setQ(""); } } }} />
          </div>
          {data.locations.length > 1 && <Select value={loc} onChange={(e) => setLoc(e.target.value)} options={data.locations.map((l) => ({ value: l.id, label: l.name }))} className="w-auto" />}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={cx("shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition", cat === c ? "bg-ink text-white" : "border border-line bg-paper text-[#353C57]")}>{c}</button>)}
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2.5 overflow-y-auto pb-2 sm:grid-cols-3 xl:grid-cols-4">
          {shown.map((p) => (
            <button key={p.id} onClick={() => add(p)} className="card group relative flex h-[104px] flex-col justify-between overflow-hidden p-3 text-start transition active:scale-[.98] hover:-translate-y-0.5 hover:shadow-lift">
              <span className="absolute inset-y-0 start-0 w-1" style={{ background: p.color ?? "#000F55" }} />
              <b className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{p.name}</b>
              <span className="flex items-end justify-between gap-2"><span className="font-display text-base font-semibold tabular-nums">{t.money(p.price, cur)}</span>{p.onHand != null && <small className={cx("font-mono text-[10.5px]", p.onHand <= 0 ? "text-crit" : "text-muted")}>{p.onHand} left</small>}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Cart */}
      <aside className="card flex min-h-[420px] flex-col">
        <header className="flex items-center justify-between border-b border-line px-4 py-3"><b className="font-display">Current sale</b>{cart.length > 0 && <button className="text-xs font-bold text-crit" onClick={() => setCart([])}>Clear</button>}</header>
        <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {!cart.length && <li className="grid h-full place-items-center p-8 text-center text-sm text-muted">Tap a product to start a sale.</li>}
          {cart.map((l) => (
            <li key={l.p.id} className="flex items-center gap-2 px-4 py-2.5">
              <span className="min-w-0 flex-1"><b className="block truncate text-[13px] font-semibold">{l.p.name}</b><small className="font-mono text-[11px] text-muted">{t.money(l.p.price, cur)}</small></span>
              <span className="flex items-center gap-1">
                <button className="grid h-8 w-8 place-items-center rounded-lg border border-line" onClick={() => setCart((c) => c.flatMap((x) => x.p.id === l.p.id ? (x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []) : [x]))} aria-label="Less">{l.qty > 1 ? <Minus className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}</button>
                <b className="w-6 text-center tabular-nums">{l.qty}</b>
                <button className="grid h-8 w-8 place-items-center rounded-lg border border-line" onClick={() => add(l.p)} aria-label="More"><Plus className="h-3.5 w-3.5" /></button>
              </span>
              <b className="w-20 text-end tabular-nums">{t.money(l.p.price * l.qty, cur)}</b>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-line p-4 text-[13px]">
          <div className="flex gap-2"><Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code" className="h-9" /></div>
          <div className="flex items-center gap-1.5"><span className="me-1 text-xs font-semibold text-muted">Tip</span>{[0, 10, 15, 18, 20].map((p) => <button key={p} onClick={() => setTipPct(p)} className={cx("h-8 flex-1 rounded-lg text-xs font-bold", tipPct === p ? "bg-navy text-white" : "bg-bg text-[#353C57]")}>{p ? `${p}%` : "None"}</button>)}</div>
          <div className="flex justify-between text-muted"><span>Subtotal</span><span className="tabular-nums">{t.money(sub, cur)}</span></div>
          <div className="flex justify-between text-muted"><span>{data.taxName}</span><span className="tabular-nums">{t.money(tax, cur)}</span></div>
          {tip > 0 && <div className="flex justify-between text-muted"><span>Tip</span><span className="tabular-nums">{t.money(tip, cur)}</span></div>}
          <div className="flex items-baseline justify-between pt-1"><b className="font-display text-base">Total</b><b className="font-display text-2xl tabular-nums">{t.money(total, cur)}</b></div>
          <Button variant="pri" className="mt-1 h-14 w-full text-base" disabled={!cart.length} onClick={() => setPay(true)}>Charge {t.money(total, cur)}</Button>
          {coupon && <p className="text-[11px] text-muted">Coupon discounts are applied when you charge.</p>}
        </div>
      </aside>

      <Modal open={pay} onClose={() => setPay(false)} title={`Take payment · ${t.money(total, cur)}`}>
        <div className="grid gap-3">
          <Button variant="pri" className="h-14 text-base" loading={busy} onClick={() => charge("CARD")}><CreditCard className="h-5 w-5" />Card or tap</Button>
          <div className="flex gap-2"><Input type="number" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="Cash received" className="h-14 text-base" /><Button className="h-14 px-6" loading={busy} onClick={() => charge("CASH")}><Banknote className="h-5 w-5" />Cash</Button></div>
          {cash && Number(cash) >= total && <p className="text-sm font-semibold text-ok">Change due: {t.money(Number(cash) - total, cur)}</p>}
          <Button className="h-12" loading={busy} onClick={() => charge("GIFT_CARD")}><Gift className="h-5 w-5" />Gift card</Button>
          <p className="text-xs text-muted">Card payments are taken on your card terminal. Connect Stripe Terminal or Square in Integrations to send the amount automatically.</p>
        </div>
      </Modal>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Sale complete" footer={<Button variant="pri" onClick={() => { setReceipt(null); search.current?.focus(); }}>New sale</Button>}>
        {receipt && (
          <div className="space-y-3 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#E7F7EF] text-ok"><Receipt className="h-7 w-7" /></div>
            <div className="font-display text-3xl font-semibold tabular-nums">{t.money(Number(receipt.total), cur)}</div>
            <p className="text-sm text-muted">Order {receipt.number} · {receipt.method.toLowerCase().replace("_", " ")}</p>
            {receipt.change != null && receipt.change > 0 && <p className="font-semibold text-ok">Give change: {t.money(receipt.change, cur)}</p>}
          </div>
        )}
      </Modal>
      {/* keep focus for barcode scanners */}
      <button className="hidden" onClick={() => search.current?.focus()} aria-hidden tabIndex={-1}><X /><Search /></button>
    </div>
  );
}
