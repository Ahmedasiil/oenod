"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Send, Sparkles, Plus, AlertTriangle } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { useSession, isManagerRole } from "@/components/session";
import { useT } from "@/components/i18n";
import { AiChat } from "@/components/ai-chat";
import { Avatar, Badge, Button, ConfirmButton, Field, Input, Modal, PageHeader, Select, cx, useToast } from "@/components/ui";

const DAY = 864e5;
const startOfWeek = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Shift = { id: string; employeeId: string | null; locationId: string | null; role: string | null; start: string; end: string; breakMinutes: number; status: string; notes: string | null };

export default function Scheduling() {
  const s = useSession();
  const t = useT();
  const toast = useToast();
  const mgr = isManagerRole(s.role);
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const days = Array.from({ length: 7 }, (_, i) => new Date(week.getTime() + i * DAY));
  const to = new Date(week.getTime() + 7 * DAY);
  const shifts = useApi<{ data: Shift[] }>(`/api/v1/shifts?from=${week.toISOString()}&to=${to.toISOString()}&limit=500`);
  const people = useApi<{ data: any[] }>("/api/v1/employees?status=ACTIVE&limit=200");
  const locations = useApi<{ id: string; label: string }[]>("/api/refs/locations");
  const leave = useApi<{ data: any[] }>(`/api/v1/leave?status=APPROVED&limit=200`);
  const [edit, setEdit] = useState<Partial<Shift> | null>(null);
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const list = shifts.data?.data ?? [];
  const emps = people.data?.data ?? [];
  const drafts = list.filter((x) => x.status === "DRAFT").length;
  const open = list.filter((x) => !x.employeeId);
  const hours = (x: Shift) => Math.max(0, (new Date(x.end).getTime() - new Date(x.start).getTime()) / 36e5 - x.breakMinutes / 60);
  const byCell = useMemo(() => {
    const m = new Map<string, Shift[]>();
    for (const x of list) { const k = `${x.employeeId ?? "open"}|${ymd(new Date(x.start))}`; m.set(k, [...(m.get(k) ?? []), x]); }
    return m;
  }, [list]);
  const onLeave = (empId: string, d: Date) => (leave.data?.data ?? []).some((l) => l.employeeId === empId && new Date(l.startDate) <= d && new Date(l.endDate).getTime() + DAY > d.getTime());
  const totalHours = list.reduce((a, x) => a + hours(x), 0);
  const cost = list.reduce((a, x) => a + hours(x) * Number(emps.find((e) => e.id === x.employeeId)?.payRate ?? 0) * (emps.find((e) => e.id === x.employeeId)?.payType === "SALARY" ? 0 : 1), 0);

  const publish = async () => { setBusy("pub"); try { const r = await api("/api/scheduling/publish", { body: { from: week, to } }); toast(`Published ${r.published} shifts, ${r.notified} people notified`); shifts.reload(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(null); } };
  const copy = async () => { setBusy("copy"); try { const r = await api("/api/scheduling/copy", { body: { weekStart: week } }); toast(`Copied ${r.created} shifts${r.uncovered ? `, ${r.uncovered} need cover` : ""}`); shifts.reload(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(null); } };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="People" title={t("modules.scheduling")} sub="Build the week in minutes. The AI fills gaps by skills, availability and labour budget."
        actions={mgr && <>
          <Button onClick={() => setAi(true)}><Sparkles className="h-4 w-4 text-blue" />AI fill gaps</Button>
          <Button loading={busy === "copy"} onClick={copy}><Copy className="h-4 w-4" />Copy last week</Button>
          <Button variant="pri" loading={busy === "pub"} disabled={!drafts} onClick={publish}><Send className="h-4 w-4" />Publish{drafts ? ` ${drafts}` : ""}</Button>
        </>} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-paper p-1">
          <button className="btn-ghost btn-sm" onClick={() => setWeek(new Date(week.getTime() - 7 * DAY))} aria-label="Previous week"><ChevronLeft className="h-4 w-4 rtl:rotate-180" /></button>
          <button className="btn-ghost btn-sm" onClick={() => setWeek(startOfWeek(new Date()))}>{t("common.thisWeek")}</button>
          <button className="btn-ghost btn-sm" onClick={() => setWeek(new Date(week.getTime() + 7 * DAY))} aria-label="Next week"><ChevronRight className="h-4 w-4 rtl:rotate-180" /></button>
        </div>
        <b className="font-display text-[15px]">{t.date(week, { month: "long", day: "numeric" })} – {t.date(new Date(to.getTime() - DAY), { month: "long", day: "numeric", year: "numeric" })}</b>
        <div className="ms-auto flex flex-wrap gap-2 text-xs font-semibold">
          <span className="chip bg-paper">{t.num(totalHours, { maximumFractionDigits: 1 })} h scheduled</span>
          {mgr && <span className="chip bg-paper">≈ {t.money(cost, s.org?.currency)} labour cost</span>}
          {open.length > 0 && <span className="chip border-[#F5DDAF] bg-[#FFF9EC] text-warn"><AlertTriangle className="h-3.5 w-3.5" />{open.length} open shift{open.length > 1 ? "s" : ""}</span>}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[960px] border-separate border-spacing-0 text-[12.5px]">
          <thead>
            <tr>
              <th className="sticky start-0 z-[2] w-52 border-b border-e border-line bg-paper px-3 py-3 text-start text-[11px] font-bold uppercase tracking-wide text-muted">Team</th>
              {days.map((d) => {
                const today = ymd(d) === ymd(new Date());
                return <th key={d.toISOString()} className={cx("border-b border-line px-2 py-3 text-start", today && "bg-sky/60")}><div className="text-[11px] font-bold uppercase tracking-wide text-muted">{t.date(d, { weekday: "short" })}</div><div className={cx("font-display text-base font-semibold", today && "text-blue")}>{d.getDate()}</div></th>;
              })}
            </tr>
          </thead>
          <tbody>
            <Row label={<span className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#FFF4DF] text-warn"><AlertTriangle className="h-4 w-4" /></span><span><b className="block">Open shifts</b><small className="text-muted">Anyone can pick up</small></span></span>}
              days={days} cell={(d) => byCell.get(`open|${ymd(d)}`) ?? []} onAdd={mgr ? (d) => setEdit(newShift(d, null)) : undefined} onOpen={mgr ? setEdit : undefined} hours={hours} t={t} />
            {emps.map((e) => {
              const h = list.filter((x) => x.employeeId === e.id).reduce((a, x) => a + hours(x), 0);
              return (
                <Row key={e.id} label={<span className="flex items-center gap-2"><Avatar name={`${e.firstName} ${e.lastName}`} src={e.photoUrl} size={32} /><span className="min-w-0"><b className="block truncate">{e.firstName} {e.lastName}</b><small className={cx("block truncate", h > 40 ? "font-bold text-warn" : "text-muted")}>{e.jobTitle ?? ""} · {t.num(h, { maximumFractionDigits: 1 })} h</small></span></span>}
                  days={days} cell={(d) => byCell.get(`${e.id}|${ymd(d)}`) ?? []} leave={(d) => onLeave(e.id, d)} onAdd={mgr ? (d) => setEdit(newShift(d, e.id, e.jobTitle, e.locationId)) : undefined} onOpen={mgr ? setEdit : undefined} hours={hours} t={t} />
              );
            })}
          </tbody>
        </table>
      </div>

      {edit && <ShiftEditor shift={edit} people={emps} locations={locations.data ?? []} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); shifts.reload(); }} />}
      <Modal open={ai} onClose={() => { setAi(false); shifts.reload(); }} title="AI scheduling assistant" wide>
        <div className="h-[60vh]"><AiChat suggestions={[`Fill the open shifts for the week of ${ymd(week)} with available people, keeping everyone under 40 hours`, `Who could cover a barista shift on ${t.date(days[4], { weekday: "long" })}?`, `Is labour on track for the week of ${ymd(week)}?`]} /></div>
      </Modal>
    </div>
  );
}

const newShift = (d: Date, employeeId: string | null, role?: string, locationId?: string): Partial<Shift> => {
  const st = new Date(d); st.setHours(9, 0, 0, 0); const en = new Date(d); en.setHours(17, 0, 0, 0);
  return { employeeId, role: role ?? "", locationId: locationId ?? null, start: st.toISOString(), end: en.toISOString(), breakMinutes: 30, status: "DRAFT" };
};

function Row({ label, days, cell, onAdd, onOpen, leave, hours, t }: { label: React.ReactNode; days: Date[]; cell: (d: Date) => Shift[]; onAdd?: (d: Date) => void; onOpen?: (s: Shift) => void; leave?: (d: Date) => boolean; hours: (s: Shift) => number; t: ReturnType<typeof useT> }) {
  return (
    <tr className="group/row">
      <td className="sticky start-0 z-[1] border-b border-e border-line bg-paper px-3 py-2">{label}</td>
      {days.map((d) => {
        const items = cell(d);
        const away = leave?.(d);
        return (
          <td key={d.toISOString()} className={cx("h-[64px] border-b border-line p-1 align-top", away && "bg-[repeating-linear-gradient(135deg,#F5F7FC,#F5F7FC_6px,#fff_6px,#fff_12px)]")}>
            <div className="flex flex-col gap-1">
              {away && !items.length && <span className="px-1 pt-1 text-[11px] font-semibold text-muted">On leave</span>}
              {items.map((x) => (
                <button key={x.id} onClick={() => onOpen?.(x)} className={cx("rounded-lg border px-2 py-1.5 text-start transition hover:shadow-card", x.status === "DRAFT" ? "border-dashed border-[#B8C3E6] bg-paper" : !x.employeeId ? "border-[#F5DDAF] bg-[#FFF9EC]" : "border-transparent bg-sky")}>
                  <b className="block font-mono text-[11px] tabular-nums text-navy">{shortTime(t.time(x.start))}–{shortTime(t.time(x.end))}</b>
                  <small className="block truncate text-[11px] text-muted">{x.role ?? "Shift"} · {hours(x).toFixed(1)}h</small>
                </button>
              ))}
              {onAdd && <button onClick={() => onAdd(d)} className="grid h-7 place-items-center rounded-lg text-muted opacity-0 transition hover:bg-bg hover:text-navy focus:opacity-100 group-hover/row:opacity-100" aria-label="Add shift"><Plus className="h-4 w-4" /></button>}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

function ShiftEditor({ shift, people, locations, onClose, onSaved }: { shift: Partial<Shift>; people: any[]; locations: { id: string; label: string }[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const t = useT();
  const [v, setV] = useState(shift);
  const [busy, setBusy] = useState(false);
  const local = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
  const save = async () => {
    setBusy(true);
    try {
      const body = { employeeId: v.employeeId || null, locationId: v.locationId || null, role: v.role || null, start: v.start, end: v.end, breakMinutes: Number(v.breakMinutes ?? 0), status: v.employeeId ? (v.status === "OPEN" ? "DRAFT" : v.status) : v.status === "PUBLISHED" ? "OPEN" : v.status, notes: v.notes || null };
      await api(`/api/v1/shifts${v.id ? `/${v.id}` : ""}`, { method: v.id ? "PATCH" : "POST", body });
      toast(t("common.saved")); onSaved();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={v.id ? "Edit shift" : "New shift"} footer={<>
      {v.id && <ConfirmButton onConfirm={async () => { await api(`/api/v1/shifts/${v.id}`, { method: "DELETE" }); onSaved(); }}>{t("common.delete")}</ConfirmButton>}
      <Button variant="pri" loading={busy} onClick={save}>{t("common.save")}</Button>
    </>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Employee" className="sm:col-span-2"><Select value={v.employeeId ?? ""} onChange={(e) => setV({ ...v, employeeId: e.target.value || null })} options={people.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }))} placeholder="Open shift (anyone can pick up)" /></Field>
        <Field label="Role"><Input value={v.role ?? ""} onChange={(e) => setV({ ...v, role: e.target.value })} placeholder="Barista" /></Field>
        <Field label="Location"><Select value={v.locationId ?? ""} onChange={(e) => setV({ ...v, locationId: e.target.value || null })} options={locations.map((l) => ({ value: l.id, label: l.label }))} placeholder="—" /></Field>
        <Field label="Start"><Input type="datetime-local" value={local(v.start)} onChange={(e) => setV({ ...v, start: new Date(e.target.value).toISOString() })} /></Field>
        <Field label="End"><Input type="datetime-local" value={local(v.end)} onChange={(e) => setV({ ...v, end: new Date(e.target.value).toISOString() })} /></Field>
        <Field label="Break (minutes)"><Input type="number" min={0} value={v.breakMinutes ?? 0} onChange={(e) => setV({ ...v, breakMinutes: Number(e.target.value) })} /></Field>
        <Field label="Status"><div className="flex h-10 items-center"><Badge status={v.status ?? "DRAFT"} /></div></Field>
        <Field label="Notes" className="sm:col-span-2"><Input value={v.notes ?? ""} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

// "11:00 a.m." → "11a", "5:30 p.m." → "5:30p"; 24-hour locales are left alone.
const shortTime = (s: string) => /[ap]\.?\s?m\.?/i.test(s) ? s.replace(":00", "").replace(/\s?([ap])\.?\s?m\.?/i, "$1").toLowerCase() : s;
