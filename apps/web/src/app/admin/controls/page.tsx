"use client";
import { useEffect, useState } from "react";
import { Globe, Monitor, Smartphone, Laptop, Code2, Power, Megaphone, AlertTriangle, Flag, Plus } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { ago, dateTime } from "@/lib/format";
import { Badge, Button, Card, ErrorNote, Field, Input, Loading, Modal, PageHeader, Select, Textarea, Toggle, cx, humanize, useToast } from "@/components/ui";

type Control = { surface: string; mode: string; title?: string; message?: string; endsAt?: string | null; allowAdmins?: boolean; minVersion?: string | null; latestVersion?: string | null; updateUrl?: string | null; pausedModules?: string[]; updatedBy?: string | null; updatedAt?: string };
type Row = { key: string; name: string; help: string; control: Control };
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { all: Power, marketing: Globe, app: Monitor, mobile: Smartphone, desktop: Laptop, api: Code2 };
const MODES = [["LIVE", "Live", "Working normally"], ["READ_ONLY", "Read only", "People can view, but changes are paused"], ["MAINTENANCE", "Under construction", "Shows your message instead"]] as const;

export default function Controls() {
  const { data, error, reload } = useApi<{ data: Row[]; modules: { key: string; name: string }[] }>("/api/admin/controls");
  const [edit, setEdit] = useState<Row | null>(null);
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading rows={6} />;
  const all = data.data.find((r) => r.key === "all")!;
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Platform" title="Controls and status" sub="Put any part of OENOD under construction, force app updates, pause single modules, and keep customers informed." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.data.map((r) => {
          const I = ICONS[r.key] ?? Power;
          const live = r.control.mode === "LIVE";
          return (
            <button key={r.key} onClick={() => setEdit(r)} className={cx("card flex flex-col gap-3 p-5 text-start transition hover:-translate-y-0.5 hover:shadow-lift", !live && "border-[#FFD98A] bg-[#FFFCF3]", r.key === "all" && "sm:col-span-2 xl:col-span-1")}>
              <div className="flex items-center gap-3"><span className={cx("grid h-10 w-10 place-items-center rounded-xl", live ? "bg-sky text-blue" : "bg-[#FFF1D6] text-warn")}><I className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block">{r.name}</b><small className="text-muted">{r.help}</small></span></div>
              <div className="flex flex-wrap items-center gap-2"><Badge status={r.control.mode}>{MODES.find((m) => m[0] === r.control.mode)?.[1]}</Badge>
                {r.control.endsAt && !live && <small className="text-muted">back {dateTime(r.control.endsAt)}</small>}
                {r.control.minVersion && <small className="chip">min v{r.control.minVersion}</small>}
                {r.control.updatedBy && <small className="ms-auto text-[11px] text-muted">{r.control.updatedBy} · {ago(r.control.updatedAt)}</small>}
              </div>
            </button>
          );
        })}
      </div>
      <PausedModules row={all} modules={data.modules} onSaved={reload} />
      <Banner />
      <Incidents />
      <Flags />
      {edit && <SurfaceModal row={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}

function SurfaceModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const c = row.control;
  const [v, setV] = useState({ mode: c.mode, title: c.title ?? "We'll be right back", message: c.message ?? "OENOD is getting an upgrade. Everything will be back shortly.", endsAt: c.endsAt ? new Date(c.endsAt).toISOString().slice(0, 16) : "", allowAdmins: c.allowAdmins ?? true, minVersion: c.minVersion ?? "", latestVersion: c.latestVersion ?? "", updateUrl: c.updateUrl ?? "" });
  const [busy, setBusy] = useState(false);
  const apps = row.key === "mobile" || row.key === "desktop";
  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/admin/controls/${row.key}`, { method: "PUT", body: { mode: v.mode, title: v.title, message: v.message, endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null, allowAdmins: v.allowAdmins, ...(apps ? { minVersion: v.minVersion || null, latestVersion: v.latestVersion || null, updateUrl: v.updateUrl || null } : {}) } });
      toast(v.mode === "LIVE" ? `${row.name} is live` : `${row.name} updated`, "ok"); onSaved();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={row.name} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="pri" loading={busy} onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-2">
          {MODES.map(([k, l, d]) => (
            <label key={k} className={cx("flex cursor-pointer items-center gap-3 rounded-xl border p-3", v.mode === k ? "border-navy bg-sky/50" : "border-line")}>
              <input type="radio" name="mode" checked={v.mode === k} onChange={() => setV({ ...v, mode: k })} /><span><b className="block text-[14px]">{l}</b><small className="text-muted">{d}</small></span>
            </label>
          ))}
        </div>
        {row.key === "all" && v.mode !== "LIVE" && <p className="flex gap-2 rounded-xl bg-[#FFF5F7] p-3 text-[13px] text-crit"><AlertTriangle className="h-4 w-4 shrink-0" />This affects the website, apps and API for every customer at once.</p>}
        {v.mode !== "LIVE" && <>
          <Field label="Headline"><Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></Field>
          <Field label="Message to customers"><Textarea rows={3} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} /></Field>
          <Field label="Expected back" help="Shown to customers. It switches back to live automatically at this time."><Input type="datetime-local" value={v.endsAt} onChange={(e) => setV({ ...v, endsAt: e.target.value })} /></Field>
          <Toggle checked={v.allowAdmins} onChange={(x) => setV({ ...v, allowAdmins: x })} label="Super admins can still use it" help="So you can test before going live again." />
        </>}
        {apps && (
          <div className="space-y-3 rounded-2xl border border-line p-4">
            <b className="text-[14px]">App versions</b>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Minimum version" help="Older apps must update."><Input placeholder="1.0.0" value={v.minVersion} onChange={(e) => setV({ ...v, minVersion: e.target.value })} /></Field>
              <Field label="Latest version" help="Older apps see a gentle reminder."><Input placeholder="1.2.0" value={v.latestVersion} onChange={(e) => setV({ ...v, latestVersion: e.target.value })} /></Field>
            </div>
            <Field label="Update link"><Input type="url" placeholder="https://apps.apple.com/…" value={v.updateUrl} onChange={(e) => setV({ ...v, updateUrl: e.target.value })} /></Field>
          </div>
        )}
      </div>
    </Modal>
  );
}

function PausedModules({ row, modules, onSaved }: { row: Row; modules: { key: string; name: string }[]; onSaved: () => void }) {
  const toast = useToast();
  const [paused, setPaused] = useState<string[]>(row.control.pausedModules ?? []);
  useEffect(() => setPaused(row.control.pausedModules ?? []), [row.control.pausedModules]);
  const toggle = async (k: string) => {
    const next = paused.includes(k) ? paused.filter((x) => x !== k) : [...paused, k];
    setPaused(next);
    try { await api("/api/admin/controls/all", { method: "PUT", body: { mode: row.control.mode, pausedModules: next } }); onSaved(); } catch (e: any) { toast(e.message, "err"); setPaused(paused); }
  };
  return (
    <Card title="Pause single modules" eyebrow="Everywhere, for every company">
      <p className="-mt-2 mb-4 text-[13px] text-muted">A paused module shows "under maintenance" on the web, apps and API while everything else keeps working.</p>
      <div className="flex flex-wrap gap-2">
        {modules.map((m) => <button key={m.key} onClick={() => toggle(m.key)} className={cx("chip px-3 py-1.5 text-[12px]", paused.includes(m.key) ? "border-[#FFD98A] bg-[#FFF4DF] text-[#8A5A00]" : "bg-paper hover:border-[#C9D4FF]")}>{paused.includes(m.key) ? "Paused · " : ""}{m.name}</button>)}
      </div>
    </Card>
  );
}

function Banner() {
  const toast = useToast();
  const { data, reload } = useApi<{ data: { id: string; message: string; level: string; active: boolean; createdAt: string }[] }>("/api/admin/banner");
  const [v, setV] = useState({ message: "", level: "info", link: "" });
  const current = data?.data.find((b) => b.active);
  const publish = async () => {
    try { await api("/api/admin/banner", { body: { message: v.message, level: v.level, link: v.link || undefined } }); toast("Announcement published", "ok"); setV({ message: "", level: "info", link: "" }); reload(); } catch (e: any) { toast(e.message, "err"); }
  };
  return (
    <Card title={<span className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-blue" />Announcement bar</span>} eyebrow="Shown to every signed-in customer">
      {current && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-sky/60 p-3 text-[13.5px]"><Badge status={current.level.toUpperCase()}>{humanize(current.level)}</Badge><span className="min-w-0 flex-1">{current.message}</span><Button size="sm" variant="ghost" onClick={async () => { await api("/api/admin/banner", { method: "DELETE" }); reload(); }}>Take down</Button></div>}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_220px_auto] md:items-end">
        <Field label="Message"><Input value={v.message} maxLength={240} onChange={(e) => setV({ ...v, message: e.target.value })} placeholder="New: payroll for Quebec is here" /></Field>
        <Field label="Style"><Select value={v.level} onChange={(e) => setV({ ...v, level: e.target.value })} options={[["info", "Information"], ["success", "Good news"], ["warning", "Warning"], ["critical", "Critical"]].map(([value, label]) => ({ value, label }))} /></Field>
        <Field label="Link (optional)"><Input type="url" value={v.link} onChange={(e) => setV({ ...v, link: e.target.value })} placeholder="https://" /></Field>
        <Button variant="pri" disabled={v.message.length < 3} onClick={publish}>Publish</Button>
      </div>
    </Card>
  );
}

type Incident = { id: string; title: string; status: string; message: string; components: string[]; createdAt: string; resolvedAt: string | null };
function Incidents() {
  const toast = useToast();
  const { data, reload } = useApi<{ data: Incident[] }>("/api/admin/incidents");
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ title: "", message: "", status: "INVESTIGATING" });
  const create = async () => {
    try { await api("/api/admin/incidents", { body: v }); toast("Posted on the status page", "ok"); setOpen(false); setV({ title: "", message: "", status: "INVESTIGATING" }); reload(); } catch (e: any) { toast(e.message, "err"); }
  };
  const update = async (id: string, status: string) => { await api(`/api/admin/incidents/${id}`, { method: "PATCH", body: { status } }); reload(); };
  return (
    <section id="incidents">
      <Card title={<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-blue" />Status page incidents</span>} action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Post incident</Button>}>
        {!data ? <Loading rows={2} /> : !data.data.length ? <p className="text-[13.5px] text-muted">No incidents. The status page shows all systems working.</p> : (
          <ul className="divide-y divide-line">
            {data.data.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="min-w-0 flex-1"><b className="block text-[14px]">{i.title}</b><small className="text-muted">{i.message.slice(0, 120)} · {ago(i.createdAt)}</small></span>
                <Select value={i.status} onChange={(e) => update(i.id, e.target.value)} options={["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"].map((s) => ({ value: s, label: humanize(s) }))} className="w-40" />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Post an incident" footer={<Button variant="pri" disabled={v.title.length < 3 || v.message.length < 3} onClick={create}>Post</Button>}>
        <div className="space-y-4">
          <Field label="Title"><Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Slow payroll calculations" /></Field>
          <Field label="What customers should know"><Textarea rows={4} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} /></Field>
          <Field label="Status"><Select value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })} options={["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"].map((s) => ({ value: s, label: humanize(s) }))} /></Field>
        </div>
      </Modal>
    </section>
  );
}

type FlagRow = { key: string; description: string | null; enabled: boolean; rolloutPercent: number; orgIds: string[] };
function Flags() {
  const toast = useToast();
  const { data, reload } = useApi<{ data: FlagRow[] }>("/api/admin/flags");
  const [nk, setNk] = useState("");
  const save = async (f: Partial<FlagRow> & { key: string }) => {
    const cur = data?.data.find((x) => x.key === f.key);
    try { await api("/api/admin/flags", { method: "PUT", body: { enabled: cur?.enabled ?? false, rolloutPercent: cur?.rolloutPercent ?? 100, orgIds: cur?.orgIds ?? [], description: cur?.description ?? undefined, ...f } }); reload(); } catch (e: any) { toast(e.message, "err"); }
  };
  return (
    <Card title={<span className="flex items-center gap-2"><Flag className="h-4 w-4 text-blue" />Feature flags</span>} eyebrow="Roll features out gradually">
      <ul className="divide-y divide-line">
        {data?.data.map((f) => (
          <li key={f.key} className="flex flex-wrap items-center gap-4 py-3">
            <span className="min-w-0 flex-1"><b className="font-mono text-[13px]">{f.key}</b>{f.description && <small className="block text-muted">{f.description}</small>}</span>
            <label className="flex items-center gap-2 text-[12.5px] text-muted">Rollout<input type="range" min={0} max={100} step={5} defaultValue={f.rolloutPercent} onMouseUp={(e) => save({ key: f.key, rolloutPercent: Number((e.target as HTMLInputElement).value) })} onTouchEnd={(e) => save({ key: f.key, rolloutPercent: Number((e.target as HTMLInputElement).value) })} /><span className="w-9 tabular-nums">{f.rolloutPercent}%</span></label>
            <Toggle checked={f.enabled} onChange={(x) => save({ key: f.key, enabled: x })} />
          </li>
        ))}
      </ul>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); save({ key: nk, enabled: false, rolloutPercent: 0 }); setNk(""); }}>
        <Input value={nk} onChange={(e) => setNk(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} placeholder="new_flag_name" className="max-w-xs font-mono" />
        <Button disabled={!nk}>Add flag</Button>
      </form>
    </Card>
  );
}
