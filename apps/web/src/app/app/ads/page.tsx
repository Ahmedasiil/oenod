"use client";
import { useState } from "react";
import { BadgeCheck, Megaphone, Plus, Wallet, Pause, Play, Send, ImagePlus, Eye, MousePointerClick, Users } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "@/components/session";
import { useT } from "@/components/i18n";
import { Badge, Button, Callout, Card, ConfirmButton, Empty, Field, Input, Loading, Modal, PageHeader, Select, Stat, Tabs, Textarea, TrendChart, cx, useToast } from "@/components/ui";

const OBJ: Record<string, string> = { PROFILE_VISITS: "Visits to my company page", WEBSITE: "Visits to my website", JOBS: "Applicants for my jobs", BOOKINGS: "Bookings", LEADS: "Leads (contact form)", CALLS: "Phone calls", APP: "App installs" };

export default function Ads() {
  const t = useT();
  const s = useSession();
  const { data, loading, reload } = useApi<any>("/api/ads");
  const [edit, setEdit] = useState<any>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [fund, setFund] = useState(false);
  const cur = "USD";
  if (loading && !data) return <Loading rows={5} />;
  const ctr = data.totals.impressions ? Math.round((data.totals.clicks / data.totals.impressions) * 1000) / 10 : 0;
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Grow" title="Ads manager" sub="Promote your company across OENOD: the business directory, Jobs, Academy, dashboards and the mobile apps. Every ad is labelled Sponsored and reviewed before it runs."
        actions={<><Button onClick={() => setFund(true)}><Wallet className="h-4 w-4" />Wallet · {t.money(data.balanceCents / 100, cur)}</Button><Button variant="pri" onClick={() => setEdit({})}><Plus className="h-4 w-4" />New campaign</Button></>} />
      {!data.verified && <Callout title="Verified companies get more reach">Ads from companies with the blue badge show the badge and get priority in review. <a href="/app/settings?tab=profile" className="font-bold text-blue">Verify your company →</a></Callout>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Impressions" value={t.num(data.totals.impressions)} />
        <Stat label="Clicks" value={t.num(data.totals.clicks)} hint={`${ctr}% click rate`} />
        <Stat label="Leads" value={t.num(data.totals.leads)} />
        <Stat label="Spent" value={t.money(data.totals.spentCents / 100, cur)} />
      </div>
      {!data.data.length ? <Empty icon={<Megaphone className="h-5 w-5" />} title="No campaigns yet" body="Create an ad in a couple of minutes. You only pay for clicks or views, and you set the daily limit." action={<Button variant="pri" onClick={() => setEdit({})}>Create your first ad</Button>} /> : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Campaign</th><th>Status</th><th className="text-end">Impressions</th><th className="text-end">Clicks</th><th className="text-end">CTR</th><th className="text-end">Spent</th><th className="text-end">Daily budget</th></tr></thead>
            <tbody>{data.data.map((c: any) => (
              <tr key={c.id} className="cursor-pointer" onClick={() => setOpen(c.id)}>
                <td><b className="block">{c.name}</b><small className="text-xs text-muted">{c.headline}</small></td>
                <td><Badge status={c.status} /></td>
                <td className="text-end tabular-nums">{t.num(c.impressions)}</td><td className="text-end tabular-nums">{t.num(c.clicks)}</td><td className="text-end tabular-nums">{c.ctr}%</td>
                <td className="text-end tabular-nums">{t.money(c.spentCents / 100, cur)}</td><td className="text-end tabular-nums">{t.money(c.dailyBudgetCents / 100, cur)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {edit && <Editor initial={edit} placements={data.placements} audiences={data.audiences} company={s.org?.name ?? ""} logo={s.org?.logoUrl} verified={data.verified} onClose={() => { setEdit(null); reload(); }} />}
      {open && <Detail id={open} onEdit={(c) => { setOpen(null); setEdit(c); }} onClose={() => { setOpen(null); reload(); }} />}
      {fund && <Fund balance={data.balanceCents} onClose={() => setFund(false)} />}
    </div>
  );
}

function Preview({ v, company, logo, verified, image }: { v: any; company: string; logo?: string | null; verified: boolean; image?: string | null }) {
  return (
    <div className="card flex gap-3 p-3">
      {image && <img src={image} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-24 w-24 shrink-0 rounded-xl object-cover" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted">{logo && <img src={logo} alt="" className="h-4 w-4 rounded object-contain" />}<span className="truncate font-semibold text-ink">{company}</span>{verified && <BadgeCheck className="h-3.5 w-3.5 text-blue" />}<span className="ms-auto rounded-full bg-bg px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider">Sponsored</span></div>
        <b className="mt-1 block text-[14px]">{v.headline || "Your headline"}</b>
        <p className="text-[12.5px] leading-[1.45] text-muted">{v.body || "A short line about your offer."}</p>
        <span className="mt-1 inline-block text-xs font-bold text-blue">{v.ctaLabel || "Learn more"} →</span>
      </div>
    </div>
  );
}

function Editor({ initial, placements, audiences, company, logo, verified, onClose }: { initial: any; placements: any[]; audiences: string[]; company: string; logo?: string | null; verified: boolean; onClose: () => void }) {
  const toast = useToast();
  const [v, setV] = useState<any>({ name: "", objective: "PROFILE_VISITS", headline: "", body: "", ctaLabel: "Learn more", destinationUrl: "", placements: ["web_feed", "directory", "app_home"], pricing: "CPC", bidCents: 75, dailyBudgetCents: 1000, ...initial, targeting: { countries: [], cities: [], audiences: [], ...(initial.targeting ?? {}) } });
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<string | null>(initial.imageUrl ?? (initial.id ? `/api/ads/${initial.id}/image` : null));
  const [busy, setBusy] = useState(false);
  const set = (k: string, val: any) => setV((x: any) => ({ ...x, [k]: val }));
  const tg = (k: string, val: any) => setV((x: any) => ({ ...x, targeting: { ...x.targeting, [k]: val } }));
  const toggle = (arr: string[], x: string) => arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x];
  const save = async (submit: boolean) => {
    setBusy(true);
    try {
      const body = { name: v.name || v.headline, objective: v.objective, headline: v.headline, body: v.body, ctaLabel: v.ctaLabel, destinationUrl: v.destinationUrl || null, placements: v.placements, pricing: v.pricing, bidCents: Number(v.bidCents), dailyBudgetCents: Number(v.dailyBudgetCents), totalBudgetCents: v.totalBudgetCents ? Number(v.totalBudgetCents) : null, targeting: Object.fromEntries(Object.entries(v.targeting).filter(([, x]) => Array.isArray(x) ? x.length : x != null)), startAt: v.startAt || null, endAt: v.endAt || null };
      const r = await api(v.id ? `/api/ads/${v.id}` : "/api/ads", { method: v.id ? "PATCH" : "POST", body });
      const id = r.data.id;
      if (file) { const f = new FormData(); f.append("file", file); const u = await fetch(`/api/ads/${id}/image`, { method: "POST", body: f }); if (!u.ok) throw new Error((await u.json()).error); }
      if (submit) { const s = await api(`/api/ads/${id}/submit`, { body: {} }); toast(s.review?.allowed ? "Submitted. Our team will approve it shortly." : "Submitted. Our review flagged something; we'll be in touch."); }
      else toast("Saved as draft");
      onClose();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  const est = v.pricing === "CPC" ? Math.round(Number(v.dailyBudgetCents) / Math.max(1, Number(v.bidCents))) : Math.round((Number(v.dailyBudgetCents) / Math.max(1, Number(v.bidCents))) * 1000);
  return (
    <Modal open onClose={onClose} wide title={v.id ? "Edit campaign" : "New campaign"} footer={<><Button loading={busy} onClick={() => save(false)}>Save draft</Button><Button variant="pri" loading={busy} onClick={() => save(true)}><Send className="h-4 w-4" />Submit for review</Button></>}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Goal"><Select value={v.objective} onChange={(e) => set("objective", e.target.value)} options={Object.entries(OBJ).map(([value, label]) => ({ value, label }))} /></Field>
            <Field label="Campaign name (only you see this)"><Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Fall catering promo" /></Field>
            <Field label="Headline" help={`${(v.headline ?? "").length}/60`} className="sm:col-span-2"><Input value={v.headline} maxLength={60} onChange={(e) => set("headline", e.target.value)} /></Field>
            <Field label="Text" help={`${(v.body ?? "").length}/220`} className="sm:col-span-2"><Textarea value={v.body} maxLength={220} onChange={(e) => set("body", e.target.value)} /></Field>
            <Field label="Button"><Input value={v.ctaLabel} maxLength={24} onChange={(e) => set("ctaLabel", e.target.value)} /></Field>
            {["WEBSITE", "BOOKINGS", "APP"].includes(v.objective) && <Field label="Link"><Input value={v.destinationUrl ?? ""} onChange={(e) => set("destinationUrl", e.target.value)} placeholder="https://" /></Field>}
            <Field label="Image (optional)"><label className="btn cursor-pointer"><ImagePlus className="h-4 w-4" />{file ? file.name.slice(0, 18) : "Choose image"}<input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setImg(URL.createObjectURL(f)); } }} /></label></Field>
          </div>
          <div>
            <b className="text-[13px]">Where it shows</b>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">{placements.map((p) => (
              <label key={p.key} className={cx("flex cursor-pointer items-start gap-2 rounded-xl border p-3", v.placements.includes(p.key) ? "border-[#BFD0FF] bg-sky/50" : "border-line")}><input type="checkbox" className="mt-1" checked={v.placements.includes(p.key)} onChange={() => set("placements", toggle(v.placements, p.key))} /><span><b className="block text-[13px]">{p.name}</b><small className="text-xs text-muted">{p.where}</small></span></label>
            ))}</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Who should see it"><div className="flex flex-wrap gap-1.5">{audiences.map((a) => <button type="button" key={a} onClick={() => tg("audiences", toggle(v.targeting.audiences ?? [], a))} className={cx("rounded-full border px-3 py-1 text-xs font-bold", (v.targeting.audiences ?? []).includes(a) ? "border-navy bg-navy text-white" : "border-line text-muted")}>{a.replace("_", " ")}</button>)}</div></Field>
            <Field label="Countries" help="Two-letter codes, e.g. CA, US. Empty = everywhere."><Input value={(v.targeting.countries ?? []).join(", ")} onChange={(e) => tg("countries", e.target.value.toUpperCase().split(/[\s,]+/).filter(Boolean))} /></Field>
            <Field label="Cities" help="Empty = all cities."><Input value={(v.targeting.cities ?? []).join(", ")} onChange={(e) => tg("cities", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></Field>
            <Field label="Pay per"><Select value={v.pricing} onChange={(e) => set("pricing", e.target.value)} options={[{ value: "CPC", label: "Click" }, { value: "CPM", label: "1,000 views" }]} /></Field>
            <Field label={`Max bid (USD per ${v.pricing === "CPC" ? "click" : "1,000 views"})`}><Input type="number" step="0.05" min="0.10" value={Number(v.bidCents) / 100} onChange={(e) => set("bidCents", Math.round(Number(e.target.value) * 100))} /></Field>
            <Field label="Daily budget (USD)" help={`Up to about ${est.toLocaleString()} ${v.pricing === "CPC" ? "clicks" : "views"} a day`}><Input type="number" step="1" min="5" value={Number(v.dailyBudgetCents) / 100} onChange={(e) => set("dailyBudgetCents", Math.round(Number(e.target.value) * 100))} /></Field>
          </div>
        </div>
        <div className="space-y-3">
          <b className="text-[13px]">Preview</b>
          <Preview v={v} company={company} logo={logo} verified={verified} image={img} />
          <p className="text-xs leading-5 text-muted">Ads must be honest and legal: no misleading claims, adult content, weapons, gambling or discrimination in jobs or housing. Our AI and team review every ad.</p>
        </div>
      </div>
    </Modal>
  );
}

function Detail({ id, onEdit, onClose }: { id: string; onEdit: (c: any) => void; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { data, reload } = useApi<any>(`/api/ads/${id}`);
  const [tab, setTab] = useState<"results" | "leads">("results");
  const c = data?.data;
  const act = async (action: string) => { try { await api(`/api/ads/${id}`, { method: "PATCH", body: { action } }); reload(); } catch (e: any) { toast(e.message, "err"); } };
  const series = Object.values((data?.daily ?? []).reduce((a: any, d: any) => { const k = d.date.slice(0, 10); a[k] ??= { date: t.date(k, { month: "short", day: "numeric" }), clicks: 0, impressions: 0 }; a[k].clicks += d.clicks; a[k].impressions += d.impressions; return a; }, {}));
  return (
    <Modal open onClose={onClose} wide title={c?.name ?? "Campaign"} footer={c && <>
      <ConfirmButton onConfirm={async () => { await api(`/api/ads/${id}`, { method: "DELETE" }); onClose(); }}>Delete</ConfirmButton>
      <Button onClick={() => onEdit(c)}>Edit</Button>
      {c.status === "ACTIVE" && <Button onClick={() => act("pause")}><Pause className="h-4 w-4" />Pause</Button>}
      {["PAUSED", "OUT_OF_FUNDS"].includes(c.status) && <Button variant="pri" onClick={() => act("resume")}><Play className="h-4 w-4" />Resume</Button>}
      {["DRAFT", "REJECTED"].includes(c.status) && <Button variant="pri" onClick={async () => { try { await api(`/api/ads/${id}/submit`, { body: {} }); toast("Submitted for review"); reload(); } catch (e: any) { toast(e.message, "err"); } }}><Send className="h-4 w-4" />Submit</Button>}
    </>}>
      {!c ? <Loading /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2"><Badge status={c.status} />{c.reviewNote && <span className="text-sm text-crit">{c.reviewNote}</span>}</div>
          <div className="grid grid-cols-3 gap-2">
            {[[<Eye key="e" className="h-4 w-4" />, "Impressions", t.num(c.impressions)], [<MousePointerClick key="c" className="h-4 w-4" />, "Clicks", t.num(c.clicks)], [<Users key="l" className="h-4 w-4" />, "Leads", t.num(c.leads)]].map(([i, l, n]) => <div key={l as string} className="rounded-xl bg-bg p-3"><span className="flex items-center gap-1.5 text-xs text-muted">{i}{l}</span><b className="font-display text-xl tabular-nums">{n}</b></div>)}
          </div>
          <Tabs value={tab} onChange={setTab} tabs={[{ key: "results", label: "Results" }, { key: "leads", label: "Leads", count: data.leads.length }]} />
          {tab === "results" && (series.length ? <TrendChart data={series as any[]} bar="clicks" line="impressions" barLabel="Clicks" lineLabel="Impressions" /> : <p className="text-sm text-muted">Results appear once the ad starts running.</p>)}
          {tab === "results" && data.byPlacement.length > 0 && <table className="table"><thead><tr><th>Placement</th><th className="text-end">Views</th><th className="text-end">Clicks</th><th className="text-end">Spent</th></tr></thead><tbody>{data.byPlacement.map((p: any) => <tr key={p.placement}><td>{p.placement.replace("_", " ")}</td><td className="text-end tabular-nums">{t.num(p.impressions)}</td><td className="text-end tabular-nums">{t.num(p.clicks)}</td><td className="text-end tabular-nums">{t.money(p.spentCents / 100, "USD")}</td></tr>)}</tbody></table>}
          {tab === "leads" && (!data.leads.length ? <p className="text-sm text-muted">No leads yet.</p> : <table className="table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Message</th><th>When</th></tr></thead><tbody>{data.leads.map((l: any) => <tr key={l.id}><td>{l.name}</td><td>{l.email}</td><td>{l.phone ?? ""}</td><td className="max-w-[240px] truncate">{l.message ?? ""}</td><td>{t.ago(l.createdAt)}</td></tr>)}</tbody></table>)}
        </div>
      )}
    </Modal>
  );
}

function Fund({ balance, onClose }: { balance: number; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { data } = useApi<any>("/api/ads/wallet");
  const [amt, setAmt] = useState(50);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title="Ad wallet" footer={<Button variant="pri" loading={busy} onClick={async () => { setBusy(true); try { const r = await api("/api/ads/wallet", { body: { amountCents: amt * 100 } }); location.href = r.url; } catch (e: any) { toast(e.message, "err"); setBusy(false); } }}>Add {t.money(amt, "USD")}</Button>}>
      <div className="space-y-4">
        <div className="navy-panel rounded-2xl p-5 text-white"><small className="text-white/70">Balance</small><b className="block font-display text-3xl">{t.money(balance / 100, "USD")}</b></div>
        <div className="flex flex-wrap gap-2">{[20, 50, 100, 250, 500].map((x) => <button key={x} onClick={() => setAmt(x)} className={cx("rounded-xl border px-4 py-2 font-bold", amt === x ? "border-navy bg-navy text-white" : "border-line")}>{t.money(x, "USD")}</button>)}</div>
        <Field label="Other amount (USD)"><Input type="number" min={20} value={amt} onChange={(e) => setAmt(Number(e.target.value))} /></Field>
        {data?.ledger?.length > 0 && <ul className="space-y-1 text-[13px]">{data.ledger.slice(0, 8).map((l: any) => <li key={l.id} className="flex justify-between"><span>{l.description ?? l.kind}</span><span className={cx("tabular-nums", l.amountCents < 0 ? "text-muted" : "text-ok")}>{l.amountCents < 0 ? "−" : "+"}{t.money(Math.abs(l.amountCents) / 100, "USD")}</span></li>)}</ul>}
        <p className="text-xs text-muted">Payments by Stripe. Unused balance stays in your wallet.</p>
      </div>
    </Modal>
  );
}
