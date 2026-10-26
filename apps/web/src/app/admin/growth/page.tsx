"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Mail, MessageSquare, Plus, Send, Bell } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { ago, dateTime, num } from "@/lib/format";
import { Badge, Button, Callout, Card, ErrorNote, Field, Input, Loading, Modal, PageHeader, Select, Tabs, Textarea, Toggle, humanize, useToast } from "@/components/ui";
import { Pager, SearchBox, Table, useDebounced } from "../bits";

type Tab = "campaigns" | "automations" | "leads" | "log";
type Campaign = { id: string; name: string; channel: string; audience: string; subject: string | null; preheader: string | null; content: string; ctaLabel: string | null; ctaUrl: string | null; status: string; scheduledAt: string | null; sentAt: string | null; sent: number; skipped: number; opened: number; clicked: number; conversions: number; createdAt: string };
type Audience = { key: string; name: string; description: string };

export default function Growth() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<Tab>((sp.get("tab") as Tab) || "campaigns");
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Grow" title="Growth and marketing" sub="Bring people back and turn trials into customers. Only people who agreed to hear from OENOD are contacted, and every message has an unsubscribe link." />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "campaigns", label: "Campaigns" }, { key: "automations", label: "Automatic messages" }, { key: "leads", label: "Leads" }, { key: "log", label: "Message log" }]} />
      {tab === "campaigns" ? <Campaigns /> : tab === "automations" ? <Automations /> : tab === "leads" ? <Leads /> : <Log />}
    </div>
  );
}

const ICON = { EMAIL: Mail, SMS: MessageSquare, IN_APP: Bell } as Record<string, typeof Mail>;

function Campaigns() {
  const { data, error, reload } = useApi<{ data: Campaign[]; audiences: Audience[] }>("/api/admin/growth/campaigns");
  const [edit, setEdit] = useState<Campaign | "new" | null>(null);
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  return (
    <>
      <div className="flex justify-end"><Button variant="pri" onClick={() => setEdit("new")}><Plus className="h-4 w-4" />New campaign</Button></div>
      <Card pad={false}>
        <Table head={["Campaign", "Audience", "Status", "Sent", "Opened", "Clicked", "Converted"]} empty={!data.data.length}>
          {data.data.map((c) => { const I = ICON[c.channel] ?? Mail; return (
            <tr key={c.id} onClick={() => setEdit(c)} className="cursor-pointer hover:bg-bg/60">
              <td className="px-5 py-3"><span className="flex items-center gap-2.5"><I className="h-4 w-4 text-blue" /><span><b className="block">{c.name}</b><small className="text-muted">{c.subject ?? humanize(c.channel)}</small></span></span></td>
              <td className="px-5 py-3">{data.audiences.find((a) => a.key === c.audience)?.name ?? humanize(c.audience)}</td>
              <td className="px-5 py-3"><Badge status={c.status} />{c.status === "SCHEDULED" && <small className="block text-muted">{dateTime(c.scheduledAt)}</small>}{c.sentAt && <small className="block text-muted">{ago(c.sentAt)}</small>}</td>
              <td className="px-5 py-3 tabular-nums">{num(c.sent)}{c.skipped > 0 && <small className="block text-muted">{num(c.skipped)} skipped</small>}</td>
              <td className="px-5 py-3 tabular-nums">{c.sent ? `${Math.round((c.opened / c.sent) * 100)}%` : "—"}</td>
              <td className="px-5 py-3 tabular-nums">{c.sent ? `${Math.round((c.clicked / c.sent) * 100)}%` : "—"}</td>
              <td className="px-5 py-3 tabular-nums">{num(c.conversions)}</td>
            </tr>
          ); })}
        </Table>
      </Card>
      {edit && <CampaignModal c={edit === "new" ? null : edit} audiences={data.audiences} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </>
  );
}

function CampaignModal({ c, audiences, onClose, onSaved }: { c: Campaign | null; audiences: Audience[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const locked = c && (c.status === "SENT" || c.status === "SENDING");
  const [v, setV] = useState({ name: c?.name ?? "", channel: c?.channel ?? "EMAIL", audience: c?.audience ?? audiences[0]?.key ?? "", subject: c?.subject ?? "", preheader: c?.preheader ?? "", content: c?.content ?? "", ctaLabel: c?.ctaLabel ?? "", ctaUrl: c?.ctaUrl ?? "", scheduledAt: c?.scheduledAt ? new Date(c.scheduledAt).toISOString().slice(0, 16) : "" });
  const [id, setId] = useState(c?.id);
  const [reach, setReach] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const payload = () => ({ name: v.name, channel: v.channel, audience: v.audience, subject: v.subject || undefined, preheader: v.preheader || undefined, content: v.content, ctaLabel: v.ctaLabel || undefined, ctaUrl: v.ctaUrl || undefined, ...(v.scheduledAt ? { scheduledAt: new Date(v.scheduledAt).toISOString() } : {}) });
  const save = async (): Promise<string | undefined> => {
    setBusy("save");
    try {
      if (id) { await api(`/api/admin/growth/campaigns/${id}`, { method: "PATCH", body: { ...payload(), ...(v.scheduledAt ? { status: "SCHEDULED" } : {}) } }); const r = await api<{ reach: number }>(`/api/admin/growth/campaigns/${id}`); setReach(r.reach); toast("Saved", "ok"); return id; }
      const r = await api<{ id: string; reach: number }>("/api/admin/growth/campaigns", { body: payload() }); setId(r.id); setReach(r.reach); toast(v.scheduledAt ? "Scheduled" : "Saved as a draft", "ok"); return r.id;
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(null); }
  };
  const send = async () => {
    const cid = await save(); if (!cid) return;
    setBusy("send");
    try { const r = await api<{ sent: number; skipped: number }>(`/api/admin/growth/campaigns/${cid}`, { method: "POST" }); toast(`Sent to ${num(r.sent)}. ${num(r.skipped)} skipped (no consent or no address).`, "ok"); onSaved(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(null); setConfirm(false); }
  };
  const del = async () => { if (!id) return; await api(`/api/admin/growth/campaigns/${id}`, { method: "DELETE" }); onSaved(); };
  const aud = audiences.find((a) => a.key === v.audience);
  return (
    <Modal open wide onClose={onClose} title={c ? c.name : "New campaign"} footer={locked ? undefined : <>
      {id && <Button variant="ghost" onClick={del}>Delete</Button>}
      <Button loading={busy === "save"} disabled={!v.name || v.content.length < 5} onClick={() => save().then((x) => x && onSaved())}>{v.scheduledAt ? "Schedule" : "Save draft"}</Button>
      <Button variant="pri" disabled={!v.name || v.content.length < 5 || !!v.scheduledAt} onClick={() => setConfirm(true)}><Send className="h-4 w-4" />Send now</Button>
    </>}>
      {locked ? (
        <div className="space-y-3 text-[14px]"><Badge status={c!.status} /><p><b>{num(c!.sent)}</b> sent, <b>{num(c!.skipped)}</b> skipped without consent, <b>{num(c!.opened)}</b> opened, <b>{num(c!.clicked)}</b> clicked, <b>{num(c!.conversions)}</b> converted.</p><div className="rounded-xl bg-bg p-4 whitespace-pre-wrap text-[13.5px]">{c!.content}</div></div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name (internal)" required><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Spring win-back" /></Field>
            <Field label="Channel"><Select value={v.channel} onChange={(e) => setV({ ...v, channel: e.target.value })} options={[{ value: "EMAIL", label: "Email" }, { value: "SMS", label: "Text message" }]} /></Field>
          </div>
          <Field label="Audience" help={aud?.description}><Select value={v.audience} onChange={(e) => setV({ ...v, audience: e.target.value })} options={audiences.map((a) => ({ value: a.key, label: a.name }))} /></Field>
          {v.channel === "EMAIL" && <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subject"><Input value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} /></Field>
            <Field label="Preview text"><Input value={v.preheader} onChange={(e) => setV({ ...v, preheader: e.target.value })} /></Field>
          </div>}
          <Field label="Message" help={v.channel === "SMS" ? `${v.content.length} characters. "Reply STOP to opt out" is added automatically.` : "Use {{first_name}} and {{company}} to personalise it."}><Textarea rows={v.channel === "SMS" ? 3 : 8} value={v.content} onChange={(e) => setV({ ...v, content: e.target.value })} /></Field>
          {v.channel !== "SMS" && <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Button label"><Input value={v.ctaLabel} onChange={(e) => setV({ ...v, ctaLabel: e.target.value })} placeholder="Come back to OENOD" /></Field>
            <Field label="Button link"><Input type="url" value={v.ctaUrl} onChange={(e) => setV({ ...v, ctaUrl: e.target.value })} placeholder="https://" /></Field>
          </div>}
          <Field label="Send later (optional)"><Input type="datetime-local" value={v.scheduledAt} onChange={(e) => setV({ ...v, scheduledAt: e.target.value })} /></Field>
          {reach !== null && <Callout tone="info">{num(reach)} people in this audience have agreed to hear from OENOD and will receive it.</Callout>}
          {confirm && (
            <div className="rounded-2xl border border-[#FFD98A] bg-[#FFF8E6] p-4 text-[13.5px]">
              <b>Send "{v.name}" now?</b> It goes to everyone in <b>{aud?.name}</b> who agreed to marketing. This can't be undone.
              <div className="mt-3 flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button size="sm" variant="pri" loading={busy === "send"} onClick={send}>Yes, send it</Button></div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

type Auto = { key: string; name: string; trigger: string; delayHours: number; channel: string; subject: string; content: string; ctaLabel: string | null; ctaUrl: string | null; enabled: boolean; sentCount: number };
function Automations() {
  const toast = useToast();
  const { data, error, reload } = useApi<{ data: Auto[] }>("/api/admin/growth/automations");
  const [edit, setEdit] = useState<Auto | null>(null);
  const patch = async (key: string, body: Partial<Auto>) => { try { await api(`/api/admin/growth/automations/${key}`, { method: "PATCH", body }); reload(); } catch (e: any) { toast(e.message, "err"); } };
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {data.data.map((a) => (
          <div key={a.key} className="card flex items-start gap-4 p-5">
            <div className="min-w-0 flex-1">
              <b className="block">{a.name}</b>
              <small className="text-muted">{humanize(a.trigger)}{a.delayHours ? `, after ${a.delayHours < 48 ? `${a.delayHours} hours` : `${Math.round(a.delayHours / 24)} days`}` : ""} · sent {num(a.sentCount)} times</small>
              <p className="mt-2 line-clamp-2 text-[13px] text-[#353C57]">{a.subject}</p>
              <button onClick={() => setEdit(a)} className="mt-2 text-[13px] font-semibold text-blue">Edit message</button>
            </div>
            <Toggle checked={a.enabled} onChange={(x) => patch(a.key, { enabled: x })} />
          </div>
        ))}
      </div>
      {edit && (
        <Modal open wide onClose={() => setEdit(null)} title={edit.name} footer={<Button variant="pri" onClick={async () => { await patch(edit.key, { subject: edit.subject, content: edit.content, delayHours: edit.delayHours, ctaLabel: edit.ctaLabel || null, ctaUrl: edit.ctaUrl || null }); setEdit(null); }}>Save</Button>}>
          <div className="space-y-4">
            <Field label="Subject"><Input value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /></Field>
            <Field label="Message"><Textarea rows={8} value={edit.content} onChange={(e) => setEdit({ ...edit, content: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Delay (hours)"><Input type="number" min={0} value={edit.delayHours} onChange={(e) => setEdit({ ...edit, delayHours: Number(e.target.value) })} /></Field>
              <Field label="Button label"><Input value={edit.ctaLabel ?? ""} onChange={(e) => setEdit({ ...edit, ctaLabel: e.target.value })} /></Field>
              <Field label="Button link"><Input type="url" value={edit.ctaUrl ?? ""} onChange={(e) => setEdit({ ...edit, ctaUrl: e.target.value })} /></Field>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

type Lead = { id: string; email: string; name: string | null; company: string | null; source: string; emailConsent: boolean; smsConsent: boolean; consentAt: string | null; unsubscribedAt: string | null; createdAt: string };
function Leads() {
  const [q, setQ] = useState(""); const [page, setPage] = useState(1); const [consented, setConsented] = useState(false);
  const dq = useDebounced(q);
  const qs = `q=${encodeURIComponent(dq)}${consented ? "&consented=1" : ""}`;
  const { data, error, reload } = useApi<{ data: Lead[]; total: number; pages: number }>(`/api/admin/leads?page=${page}&${qs}`);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={(x) => { setQ(x); setPage(1); }} placeholder="Email, name or company" />
        <Toggle checked={consented} onChange={(x) => { setConsented(x); setPage(1); }} label="Can be contacted" />
        <a href={`/api/admin/leads?format=csv&${qs}`} className="btn ms-auto"><Download className="h-4 w-4" />Download CSV</a>
      </div>
      <Card pad={false}>
        {error ? <div className="p-5"><ErrorNote error={error} onRetry={reload} /></div> : !data ? <div className="p-5"><Loading /></div> : <>
          <Table head={["Lead", "Source", "Consent", "Added"]} empty={!data.data.length}>
            {data.data.map((l) => (
              <tr key={l.id}>
                <td className="px-5 py-3"><b className="block">{l.name ?? l.email}</b><small className="text-muted">{l.name ? l.email : ""}{l.company ? ` · ${l.company}` : ""}</small></td>
                <td className="px-5 py-3 text-muted">{humanize(l.source)}</td>
                <td className="px-5 py-3">{l.unsubscribedAt ? <Badge tone="gray">Unsubscribed</Badge> : l.emailConsent ? <Badge tone="green">Email{l.smsConsent ? " + SMS" : ""}</Badge> : <span className="text-muted">None</span>}</td>
                <td className="px-5 py-3 text-muted">{ago(l.createdAt)}</td>
              </tr>
            ))}
          </Table>
          <Pager page={page} pages={data.pages} onPage={setPage} />
        </>}
      </Card>
    </>
  );
}

type Msg = { id: string; channel: string; to: string; subject: string | null; status: string; error: string | null; createdAt: string };
function Log() {
  const [status, setStatus] = useState(""); const [page, setPage] = useState(1);
  const { data, error, reload } = useApi<{ data: Msg[]; pages: number }>(`/api/admin/messages?page=${page}${status ? `&status=${status}` : ""}`);
  return (
    <>
      <Tabs value={status} onChange={(s) => { setStatus(s); setPage(1); }} tabs={[{ key: "", label: "All" }, { key: "SENT", label: "Sent" }, { key: "FAILED", label: "Failed" }, { key: "SKIPPED_NO_CONSENT", label: "Skipped, no consent" }]} />
      <Card pad={false}>
        {error ? <div className="p-5"><ErrorNote error={error} onRetry={reload} /></div> : !data ? <div className="p-5"><Loading /></div> : <>
          <Table head={["To", "Subject", "Channel", "Status", "When"]} empty={!data.data.length}>
            {data.data.map((m) => (
              <tr key={m.id}><td className="px-5 py-2.5 font-mono text-[12.5px]">{m.to}</td><td className="px-5 py-2.5">{m.subject ?? "—"}{m.error && <small className="block text-crit">{m.error}</small>}</td><td className="px-5 py-2.5">{humanize(m.channel)}</td><td className="px-5 py-2.5"><Badge status={m.status} /></td><td className="px-5 py-2.5 text-muted">{ago(m.createdAt)}</td></tr>
            ))}
          </Table>
          <Pager page={page} pages={data.pages} onPage={setPage} />
        </>}
      </Card>
    </>
  );
}
