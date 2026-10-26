"use client";
import { useState } from "react";
import { Snowflake, Play, XCircle, Plus, ShieldCheck } from "lucide-react";
import { api, ApiError, useApi } from "@/lib/client/api";
import { Badge, Button, ErrorNote, Field, Input, Loading, Modal, Select, cx, useToast } from "@/components/ui";
import { CodePrompt, PageTitle, SetupBanner, readiness, type Overview } from "../bits";
import { CardFace } from "../card-face";

type Card = { id: string; last4: string; brand: string; type: string; status: string; expMonth: number; expYear: number; familyId: string | null };


export default function Cards() {
  const toast = useToast();
  const { data: o } = useApi<Overview>("/api/pay/overview");
  const { data, error, reload } = useApi<{ cards: Card[] }>("/api/pay/cards");
  const [order, setOrder] = useState(false);
  const [type, setType] = useState<"virtual" | "physical">("virtual");
  const [addr, setAddr] = useState({ line1: "", city: "", postal_code: "", country: "CA", state: "" });
  const [pending, setPending] = useState<null | { run: (code: string) => Promise<void>; title: string }>(null);
  const [busy, setBusy] = useState(false);
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data || !o) return <Loading rows={4} />;
  const mine = data.cards.filter((c) => !c.familyId);
  const setStatus = (c: Card, status: string) => async (code?: string) => {
    await api(`/api/pay/cards/${c.id}`, { method: "PATCH", body: { status, code } });
    toast(status === "FROZEN" ? "Card frozen" : status === "ACTIVE" ? "Card is active" : "Card cancelled", "ok"); setPending(null); reload();
  };
  const issue = async (code: string) => {
    await api("/api/pay/cards", { body: { type, code, ...(addr.line1 ? { address: { ...addr, state: addr.state || undefined } } : {}) } });
    toast(type === "virtual" ? "Your virtual card is ready" : "Your card is on its way", "ok"); setPending(null); setOrder(false); reload();
  };
  return (
    <div>
      <PageTitle title="Cards" sub="Spend from your oenodpay wallet anywhere Visa or Mastercard is accepted. Freeze a card instantly from here." action={<Button variant="pri" disabled={!!readiness(o)} onClick={() => setOrder(true)}><Plus className="h-4 w-4" />Get a card</Button>} />
      {readiness(o) && <div className="mb-5"><SetupBanner o={o} /></div>}
      {!mine.length ? (
        <div className="card grid place-items-center gap-4 p-10 text-center">
          <CardFace c={{ last4: "0000", brand: "visa", expMonth: 12, expYear: 2030, status: "ACTIVE", type: "virtual" }} name={o.profile.name ?? "Your name"} />
          <p className="max-w-sm text-[14px] text-muted">Get a virtual card in seconds for online shopping, or a physical card by mail.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">{mine.map((c) => (
          <section key={c.id} className="card space-y-4 p-5">
            <CardFace c={c} name={o.profile.name ?? ""} />
            <div className="flex flex-wrap items-center gap-2"><Badge status={c.status} /><span className="text-[13px] capitalize text-muted">{c.type.toLowerCase()} card</span><span className="flex-1" />
              {c.status === "ACTIVE" && <Button size="sm" onClick={async () => { try { await setStatus(c, "FROZEN")(); } catch (e: any) { toast(e.message, "err"); } }}><Snowflake className="h-4 w-4" />Freeze</Button>}
              {c.status === "FROZEN" && <Button size="sm" variant="pri" onClick={() => setPending({ title: "Unfreeze card", run: setStatus(c, "ACTIVE") })}><Play className="h-4 w-4" />Unfreeze</Button>}
              {c.status !== "CANCELED" && <Button size="sm" variant="ghost" onClick={() => setPending({ title: "Cancel card for good", run: setStatus(c, "CANCELED") })}><XCircle className="h-4 w-4" />Cancel</Button>}
            </div>
          </section>
        ))}</div>
      )}
      <Modal open={order} onClose={() => setOrder(false)} title="Get a card" footer={<><Button onClick={() => setOrder(false)}>Cancel</Button><Button variant="pri" loading={busy} onClick={() => setPending({ title: "Confirm new card", run: issue })}>Continue</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">{(["virtual", "physical"] as const).map((t) => <button key={t} onClick={() => setType(t)} className={cx("rounded-xl border p-3 text-start", type === t ? "border-blue bg-sky/60 ring-1 ring-blue" : "border-line")}><b className="block capitalize">{t}</b><small className="text-muted">{t === "virtual" ? "Ready now, for online and phone wallets" : "Mailed to you in 5 to 7 days"}</small></button>)}</div>
          <p className="text-[13px] text-muted">Your home address (needed once for card security checks):</p>
          <Field label="Street address"><Input value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} autoComplete="street-address" /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="City"><Input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} /></Field><Field label="Postal code"><Input value={addr.postal_code} onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })} /></Field></div>
          <div className="grid grid-cols-2 gap-3"><Field label="Province or state"><Input value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} /></Field><Field label="Country"><Select value={addr.country} onChange={(e) => setAddr({ ...addr, country: e.target.value })} options={[{ value: "CA", label: "Canada" }, { value: "US", label: "United States" }]} /></Field></div>
          <p className="flex items-center gap-1.5 text-[12.5px] text-muted"><ShieldCheck className="h-4 w-4 text-[#1FAF6B]" />Every payment is checked in real time. You get a notification for each one.</p>
        </div>
      </Modal>
      <CodePrompt open={!!pending} onClose={() => setPending(null)} title={pending?.title ?? ""} onConfirm={async (code) => { setBusy(true); try { await pending!.run(code); } catch (e) { if (e instanceof ApiError) throw e; throw e; } finally { setBusy(false); } }} />
    </div>
  );
}
