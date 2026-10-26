"use client";
import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Palmtree, Wallet, GraduationCap, ListTodo, Megaphone, MapPin, Check, ArrowRightLeft, Plus, Award } from "lucide-react";
import { greeting } from "@oenod/i18n";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "@/components/session";
import { useT } from "@/components/i18n";
import { ClockCard } from "@/components/clock-card";
import { Sponsored } from "@/components/sponsored";
import { Badge, Button, Callout, Card, Empty, Field, Input, Loading, Modal, Select, Textarea, Toggle, cx, useToast } from "@/components/ui";

export default function Me() {
  const t = useT();
  const s = useSession();
  const toast = useToast();
  const { data, loading, reload } = useApi<any>("/api/me");
  const [leave, setLeave] = useState(false);
  const [slip, setSlip] = useState<any>(null);
  const [swap, setSwap] = useState<any>(null);
  const cur = s.org?.currency;
  if (loading && !data) return <Loading rows={6} />;
  if (!data?.employee) return (
    <div className="mx-auto max-w-xl py-10"><Empty icon={<CalendarDays className="h-5 w-5" />} title="No employee profile yet" body="Ask your manager to link your account to your employee profile. Then your shifts, pay and training show up here." /></div>
  );
  const e = data.employee;
  const act = async (id: string, action: string, note?: string) => { try { await api(`/api/me/shifts/${id}`, { body: { action, note } }); toast(action === "pickup" ? "It's yours. Your manager has been told." : action === "swap" ? "Swap request sent to your manager" : "Done"); reload(); } catch (er: any) { toast(er.message, "err"); } };
  const balance = (type: string) => e.leaveBalances.find((b: any) => b.type === type);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">{e.location ?? s.org?.name}</p><h1 className="h1 mt-1">{greeting(t.locale, s.org?.timezone)}, {e.name.split(" ")[0]}</h1><p className="text-muted">{e.jobTitle}</p></div>
        <Button variant="pri" onClick={() => setLeave(true)}><Palmtree className="h-4 w-4" />Request time off</Button>
      </div>
      {data.announcements.filter((a: any) => !a.acked).map((a: any) => (
        <div key={a.id} className="navy-panel flex flex-wrap items-start gap-3 rounded-2xl p-4 text-white">
          <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-[#7EA2FF]" />
          <div className="min-w-0 flex-1"><b className="block">{a.title}</b><p className="whitespace-pre-wrap text-[13px] text-white/80">{a.body}</p></div>
          <Button size="sm" onClick={async () => { await api(`/api/announcements/${a.id}/ack`, { body: {} }); reload(); }}><Check className="h-3.5 w-3.5" />Got it</Button>
        </div>
      ))}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card title="Your next shifts" action={<Link href="/app/scheduling" className="text-xs font-bold text-blue">Full schedule</Link>} pad={false}>
            {!data.shifts.length ? <p className="p-4 text-sm text-muted">No upcoming shifts.</p> : (
              <ul className="divide-y divide-line">{data.shifts.map((x: any) => {
                const today = new Date(x.start).toDateString() === new Date().toDateString();
                return (
                  <li key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className={cx("grid h-12 w-12 shrink-0 place-items-center rounded-xl text-center leading-none", today ? "bg-navy text-white" : "bg-bg")}><span><small className="block text-[10px] font-bold uppercase">{t.date(x.start, { weekday: "short" })}</small><b className="font-display text-lg">{new Date(x.start).getDate()}</b></span></span>
                    <span className="min-w-0 flex-1"><b className="block font-mono text-[13px] tabular-nums">{t.time(x.start)} – {t.time(x.end)}</b><small className="text-xs text-muted">{x.role ?? e.jobTitle}{x.location ? ` · ${x.location.name}` : ""}</small></span>
                    {x.status === "SWAP_REQUESTED" ? <><Badge tone="warn">Swap requested</Badge><Button size="sm" variant="ghost" onClick={() => act(x.id, "cancel_swap")}>Undo</Button></> : <Button size="sm" variant="ghost" onClick={() => setSwap(x)}><ArrowRightLeft className="h-3.5 w-3.5" />Swap</Button>}
                  </li>
                );
              })}</ul>
            )}
          </Card>
          {data.openShifts.length > 0 && (
            <Card title="Open shifts you can pick up" pad={false}>
              <ul className="divide-y divide-line">{data.openShifts.map((x: any) => (
                <li key={x.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1"><b className="block text-[13px]">{t.date(x.start, { weekday: "long", month: "short", day: "numeric" })}</b><small className="font-mono text-xs text-muted">{t.time(x.start)} – {t.time(x.end)} · {x.role ?? "Shift"}{x.location ? ` · ${x.location.name}` : ""}</small></span>
                  <Button size="sm" variant="pri" onClick={() => act(x.id, "pickup")}>Pick up</Button>
                </li>
              ))}</ul>
            </Card>
          )}
          <Card title="Payslips" pad={false}>
            {!data.payslips.length ? <p className="p-4 text-sm text-muted">Your payslips will appear here after payday.</p> : (
              <ul className="divide-y divide-line">{data.payslips.map((p: any) => (
                <li key={p.id}><button onClick={() => setSlip(p)} className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-bg">
                  <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-sky text-navy"><Wallet className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><b className="block text-[13px]">Paid {t.date(p.payDate)}</b><small className="text-xs text-muted">{t.date(p.periodStart, { month: "short", day: "numeric" })} – {t.date(p.periodEnd, { month: "short", day: "numeric" })} · {p.regularHours + p.overtimeHours} h</small></span>
                  <b className="font-display tabular-nums">{t.money(p.net, cur)}</b>
                </button></li>
              ))}</ul>
            )}
          </Card>
          {data.tasks.length > 0 && (
            <Card title="Your tasks" pad={false}>
              <ul className="divide-y divide-line">{data.tasks.map((x: any) => <li key={x.id}><Link href={`/app/projects/${x.projectId}?task=${x.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg"><ListTodo className="h-4 w-4 text-muted" /><span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{x.title}</span>{x.dueDate && <small className={cx("text-xs", new Date(x.dueDate) < new Date() ? "font-bold text-crit" : "text-muted")}>{t.date(x.dueDate, { month: "short", day: "numeric" })}</small>}</Link></li>)}</ul>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <ClockCard />
          <Card title="Time off">
            <div className="grid grid-cols-3 gap-2 text-center">
              {["VACATION", "SICK", "PERSONAL"].map((k) => { const b = balance(k); return <div key={k} className="rounded-xl bg-bg p-2.5"><b className="block font-display text-xl tabular-nums">{b ? Math.round(Number(b.hours) / 8 * 10) / 10 : 0}</b><small className="text-[11px] text-muted">{k === "VACATION" ? "vacation" : k === "SICK" ? "sick" : "personal"} days</small></div>; })}
            </div>
            {data.leave.length > 0 && <ul className="mt-3 space-y-1.5 text-[13px]">{data.leave.slice(0, 4).map((l: any) => <li key={l.id} className="flex items-center justify-between gap-2"><span>{l.type[0] + l.type.slice(1).toLowerCase()} · {t.date(l.startDate, { month: "short", day: "numeric" })}{l.endDate !== l.startDate ? `–${t.date(l.endDate, { month: "short", day: "numeric" })}` : ""}</span><Badge status={l.status} /></li>)}</ul>}
          </Card>
          {data.trainings.length > 0 && (
            <Card title="Training" action={<Link href="/app/academy" className="text-xs font-bold text-blue">Academy</Link>}>
              <ul className="space-y-2.5">{data.trainings.map((tr: any) => (
                <li key={tr.id} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[10px] bg-sky text-navy">{tr.completedAt ? <Award className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><b className="block truncate text-[13px]">{tr.course?.title}</b><small className="text-xs text-muted">{tr.completedAt ? "Completed" : tr.dueDate ? `Due ${t.date(tr.dueDate)}` : "Assigned"}</small></span></li>
              ))}</ul>
            </Card>
          )}
          {e.certifications?.length > 0 && <Card title="Certifications"><ul className="space-y-1.5 text-[13px]">{e.certifications.map((c: any) => <li key={c.id} className="flex justify-between gap-2"><span>{c.name}</span>{c.expiresAt && <small className={cx(new Date(c.expiresAt) < new Date(Date.now() + 30 * 864e5) ? "font-bold text-warn" : "text-muted")}>expires {t.date(c.expiresAt)}</small>}</li>)}</ul></Card>}
          <Card title="Privacy">
            <Toggle checked={e.shareLiveLocation} onChange={async (x) => { await api("/api/me", { method: "PATCH", body: { shareLiveLocation: x } }); reload(); }} label={<span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />Share my location while clocked in</span>} help="Only while you're on the clock. Never when you're off shift." />
          </Card>
        </div>
      </div>
      <Sponsored placement="employee_home" />
      {leave && <LeaveModal employeeId={e.id} balances={e.leaveBalances} onClose={() => { setLeave(false); reload(); }} />}
      <Modal open={!!slip} onClose={() => setSlip(null)} title={slip ? `Payslip · ${t.date(slip.payDate)}` : ""}>
        {slip && (
          <div className="space-y-3 text-[13.5px]">
            <p className="text-muted">{s.org?.name} · {t.date(slip.periodStart)} – {t.date(slip.periodEnd)}</p>
            <div className="flex justify-between"><span>Regular hours</span><b className="tabular-nums">{slip.regularHours}</b></div>
            {slip.overtimeHours > 0 && <div className="flex justify-between"><span>Overtime hours</span><b className="tabular-nums">{slip.overtimeHours}</b></div>}
            <div className="flex justify-between border-t border-line pt-2"><span>Gross pay</span><b className="tabular-nums">{t.money(slip.gross, cur)}</b></div>
            {(slip.deductions ?? []).map((d: any) => <div key={d.name} className="flex justify-between text-muted"><span>{d.name}</span><span className="tabular-nums">−{t.money(d.amount, cur)}</span></div>)}
            <div className="flex items-baseline justify-between rounded-xl bg-navy p-3 text-white"><span>Net pay</span><b className="font-display text-xl tabular-nums">{t.money(slip.net, cur)}</b></div>
          </div>
        )}
      </Modal>
      <SwapModal shift={swap} onClose={() => setSwap(null)} onSend={(note) => { act(swap.id, "swap", note); setSwap(null); }} />
    </div>
  );
}

function SwapModal({ shift, onClose, onSend }: { shift: any; onClose: () => void; onSend: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <Modal open={!!shift} onClose={onClose} title="Ask to swap this shift" footer={<Button variant="pri" onClick={() => onSend(note)}>Send request</Button>}>
      <Field label="Reason or who could cover (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} /></Field>
      <p className="mt-2 text-xs text-muted">Your manager decides. You keep the shift until it's approved.</p>
    </Modal>
  );
}

function LeaveModal({ employeeId, balances, onClose }: { employeeId: string; balances: any[]; onClose: () => void }) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState({ type: "VACATION", startDate: today, endDate: today, reason: "" });
  const [busy, setBusy] = useState(false);
  const b = balances.find((x) => x.type === v.type);
  return (
    <Modal open onClose={onClose} title="Request time off" footer={<Button variant="pri" loading={busy} onClick={async () => { setBusy(true); try { await api("/api/v1/leave", { body: { ...v, employeeId, reason: v.reason || undefined } }); toast("Request sent to your manager"); onClose(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } }}><Plus className="h-4 w-4" />Send request</Button>}>
      <div className="space-y-3">
        <Field label="Type"><Select value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })} options={[{ value: "VACATION", label: "Vacation" }, { value: "SICK", label: "Sick" }, { value: "PERSONAL", label: "Personal" }, { value: "UNPAID", label: "Unpaid" }, { value: "PARENTAL", label: "Parental" }]} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><Input type="date" value={v.startDate} min={today} onChange={(e) => setV({ ...v, startDate: e.target.value, endDate: e.target.value > v.endDate ? e.target.value : v.endDate })} /></Field>
          <Field label="To"><Input type="date" value={v.endDate} min={v.startDate} onChange={(e) => setV({ ...v, endDate: e.target.value })} /></Field>
        </div>
        <Field label="Note (optional)"><Textarea value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} /></Field>
        {b && <Callout>You have {Math.round(Number(b.hours) / 8 * 10) / 10} days ({Number(b.hours)} h) of {v.type.toLowerCase()} left.</Callout>}
      </div>
    </Modal>
  );
}
