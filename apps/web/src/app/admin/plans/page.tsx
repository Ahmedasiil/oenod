"use client";
import { useState } from "react";
import { api, useApi } from "@/lib/client/api";
import { MODULES } from "@/lib/modules";
import { num } from "@/lib/format";
import { Badge, Button, Callout, ErrorNote, Field, Input, Loading, Modal, PageHeader, Textarea, Toggle, cx, useToast } from "@/components/ui";
import { cents } from "../bits";

type Plan = { key: string; name: string; tagline: string | null; priceMonthly: number; priceYearly: number; seats: number; aiCredits: number; modules: string[]; features: string[]; active: boolean; customers: Record<string, number> };

export default function Plans() {
  const { data, error, reload } = useApi<{ data: Plan[] }>("/api/admin/plans");
  const [edit, setEdit] = useState<Plan | null>(null);
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Platform" title="Plans and pricing" sub="What each plan costs and includes. These power the pricing page, sign-up and billing." />
      <Callout tone="info">Changing a price applies to new subscriptions. Existing customers keep the price they signed up at.</Callout>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.data.map((p) => {
          const paying = p.customers.ACTIVE ?? 0, trial = p.customers.TRIALING ?? 0;
          return (
            <div key={p.key} className={cx("card flex flex-col p-5", !p.active && "opacity-60")}>
              <div className="flex items-center justify-between"><b className="font-display text-lg">{p.name}</b>{!p.active && <Badge>Hidden</Badge>}</div>
              <p className="mt-1 min-h-[40px] text-[13px] text-muted">{p.tagline}</p>
              <div className="mt-3 font-display text-[28px] font-semibold">{p.priceMonthly ? cents(p.priceMonthly) : "Custom"}<small className="text-[13px] font-normal text-muted">{p.priceMonthly ? " / month" : ""}</small></div>
              {p.priceYearly > 0 && <small className="text-muted">{cents(p.priceYearly)} a year</small>}
              <ul className="mt-4 space-y-1 text-[13px]"><li>{p.seats >= 9999 ? "Unlimited" : num(p.seats)} team members</li><li>{num(p.aiCredits)} AI actions a month</li><li>{p.modules.includes("*") ? "Every module" : `${p.modules.length} modules`}</li></ul>
              <div className="mt-4 flex gap-3 border-t border-line pt-3 text-[12.5px] text-muted"><span><b className="text-ink">{paying}</b> paying</span><span><b className="text-ink">{trial}</b> on trial</span></div>
              <Button className="mt-4" onClick={() => setEdit(p)}>Edit plan</Button>
            </div>
          );
        })}
      </div>
      {edit && <PlanModal p={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}

function PlanModal({ p, onClose, onSaved }: { p: Plan; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [v, setV] = useState({ name: p.name, tagline: p.tagline ?? "", monthly: (p.priceMonthly / 100).toString(), yearly: (p.priceYearly / 100).toString(), seats: p.seats, aiCredits: p.aiCredits, modules: p.modules, features: p.features.join("\n"), active: p.active });
  const [busy, setBusy] = useState(false);
  const all = v.modules.includes("*");
  const toggle = (k: string) => setV({ ...v, modules: v.modules.includes(k) ? v.modules.filter((x) => x !== k) : [...v.modules.filter((x) => x !== "*"), k] });
  const save = async () => {
    setBusy(true);
    const body: Record<string, unknown> = { name: v.name, tagline: v.tagline, seats: Number(v.seats), aiCredits: Number(v.aiCredits), modules: v.modules, features: v.features.split("\n").map((x) => x.trim()).filter(Boolean), active: v.active };
    const m = Math.round(Number(v.monthly) * 100), y = Math.round(Number(v.yearly) * 100);
    if (m !== p.priceMonthly) body.priceMonthly = m;
    if (y !== p.priceYearly) body.priceYearly = y;
    try { await api(`/api/admin/plans/${p.key}`, { method: "PATCH", body }); toast("Plan saved", "ok"); onSaved(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  return (
    <Modal open wide onClose={onClose} title={`Edit ${p.name}`} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="pri" loading={busy} onClick={save}>Save plan</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
          <Field label="Tagline"><Input value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} /></Field>
          <Field label="Monthly price (CAD)" help="0 shows Custom and Talk to sales."><Input type="number" min={0} step="0.01" value={v.monthly} onChange={(e) => setV({ ...v, monthly: e.target.value })} /></Field>
          <Field label="Yearly price (CAD)"><Input type="number" min={0} step="0.01" value={v.yearly} onChange={(e) => setV({ ...v, yearly: e.target.value })} /></Field>
          <Field label="Team members"><Input type="number" min={1} value={v.seats} onChange={(e) => setV({ ...v, seats: Number(e.target.value) })} /></Field>
          <Field label="AI actions a month"><Input type="number" min={0} value={v.aiCredits} onChange={(e) => setV({ ...v, aiCredits: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Modules included">
          <div className="space-y-2">
            <Toggle checked={all} onChange={(x) => setV({ ...v, modules: x ? ["*"] : [] })} label="Every module, including new ones" />
            {!all && <div className="flex flex-wrap gap-1.5">{MODULES.map((m) => <button type="button" key={m.key} onClick={() => toggle(m.key)} className={cx("chip px-2.5 py-1", v.modules.includes(m.key) ? "border-navy bg-navy text-white" : "bg-paper")}>{m.name}</button>)}</div>}
          </div>
        </Field>
        <Field label="Feature list" help="One per line. Shown on the pricing page."><Textarea rows={6} value={v.features} onChange={(e) => setV({ ...v, features: e.target.value })} /></Field>
        <Toggle checked={v.active} onChange={(x) => setV({ ...v, active: x })} label="Show on the pricing page" help="Current customers keep the plan either way." />
      </div>
    </Modal>
  );
}
