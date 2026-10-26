"use client";
import { useState } from "react";
import { AlertTriangle, Banknote, CheckCircle2, ShieldCheck, Plus } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "@/components/session";
import { useT } from "@/components/i18n";
import { ResourceTable } from "@/components/resource";
import { Badge, Button, Callout, Card, ConfirmButton, Empty, Field, Input, Loading, Modal, PageHeader, Stat, Tabs, useToast } from "@/components/ui";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export default function Payroll() {
  const t = useT();
  const s = useSession();
  const cur = s.org?.currency ?? "CAD";
  const runs = useApi<{ data: any[] }>("/api/payroll/runs");
  const [tab, setTab] = useState<"runs" | "rules">("runs");
  const [open, setOpen] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  const list = runs.data?.data ?? [];
  const last = list.find((r) => r.status === "PAID" || r.status === "APPROVED");
  const drafts = list.filter((r) => r.status === "DRAFT");
  const canApprove = ["OWNER", "ADMIN", "FINANCE"].includes(s.role ?? "");
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="People" title={t("modules.payroll")} sub="Hours flow in from approved timesheets. The AI checks for missing punches, overtime and unusual shifts before anything is paid. A person always approves the release."
        actions={<Button variant="pri" onClick={() => setCreate(true)}><Plus className="h-4 w-4" />Run payroll</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Last net pay" value={last ? t.money(Number(last.net), cur) : "–"} hint={last ? `paid ${t.date(last.payDate)}` : undefined} />
        <Stat label="Employer cost" value={last ? t.money(Number(last.employerCost), cur) : "–"} hint="incl. contributions" />
        <Stat label="Waiting for approval" value={drafts.length} tone={drafts.length ? "warn" : undefined} />
        <Stat label="Runs this year" value={list.filter((r) => new Date(r.payDate).getFullYear() === new Date().getFullYear() && r.status !== "CANCELLED").length} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "runs", label: "Pay runs", count: list.length }, { key: "rules", label: "Deductions & contributions" }]} />
      {tab === "runs" && (runs.loading && !runs.data ? <Loading /> : !list.length ? (
        <Empty icon={<Banknote className="h-5 w-5" />} title="No pay runs yet" body="Pick a pay period and OENOD calculates gross pay, overtime, deductions and net pay for everyone." action={<Button variant="pri" onClick={() => setCreate(true)}>Run your first payroll</Button>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>Period</th><th>Pay date</th><th>Status</th><th className="text-end">Gross</th><th className="text-end">Deductions</th><th className="text-end">Net</th><th>Checks</th></tr></thead>
            <tbody>{list.map((r) => (
              <tr key={r.id} className="cursor-pointer" onClick={() => setOpen(r.id)}>
                <td className="font-semibold">{t.date(r.periodStart, { month: "short", day: "numeric" })} – {t.date(r.periodEnd, { month: "short", day: "numeric", year: "numeric" })}</td>
                <td>{t.date(r.payDate)}</td><td><Badge status={r.status} /></td>
                <td className="text-end tabular-nums">{t.money(Number(r.gross), cur)}</td><td className="text-end tabular-nums text-muted">{t.money(Number(r.deductions), cur)}</td><td className="text-end font-semibold tabular-nums">{t.money(Number(r.net), cur)}</td>
                <td>{(r.exceptions as any[])?.length ? <span className="inline-flex items-center gap-1 text-xs font-bold text-warn"><AlertTriangle className="h-3.5 w-3.5" />{r.exceptions.length} to review</span> : <span className="inline-flex items-center gap-1 text-xs font-bold text-ok"><CheckCircle2 className="h-3.5 w-3.5" />Clean</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}
      {tab === "rules" && <div className="space-y-3"><Callout title="Set these up with your accountant">Add each statutory deduction and employer contribution for your region (for example CPP, EI and income tax in Canada, or FICA in the US). Rates can be a percentage or a fixed amount with an optional annual cap. OENOD does not file remittances for you.</Callout><ResourceTable resource="payrules" /></div>}
      {create && <NewRun onClose={() => setCreate(false)} onCreated={(id) => { setCreate(false); runs.reload(); setOpen(id); }} />}
      {open && <RunDetail id={open} canApprove={canApprove} onClose={() => { setOpen(null); runs.reload(); }} />}
    </div>
  );
}

function NewRun({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const t = useT();
  const s = useSession();
  const toast = useToast();
  const now = new Date();
  const [v, setV] = useState({ periodStart: ymd(new Date(now.getTime() - 14 * 864e5)), periodEnd: ymd(new Date(now.getTime() - 864e5)), payDate: ymd(new Date(now.getTime() + 4 * 864e5)) });
  const [preview, setPreview] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (isPreview: boolean) => {
    setBusy(true);
    try {
      const r = await api("/api/payroll/runs", { body: { ...v, preview: isPreview } });
      if (isPreview) setPreview(r.preview); else { toast("Draft pay run created"); onCreated(r.data.id); }
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  const total = (k: string) => (preview ?? []).reduce((a, x) => a + Number(x[k]), 0);
  return (
    <Modal open onClose={onClose} wide title="Run payroll" footer={<>{preview && <Button variant="pri" loading={busy} onClick={() => run(false)}>Create draft run</Button>}<Button variant={preview ? "default" : "pri"} loading={busy && !preview} onClick={() => run(true)}>{preview ? "Recalculate" : "Calculate"}</Button></>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Period start"><Input type="date" value={v.periodStart} onChange={(e) => { setV({ ...v, periodStart: e.target.value }); setPreview(null); }} /></Field>
        <Field label="Period end"><Input type="date" value={v.periodEnd} onChange={(e) => { setV({ ...v, periodEnd: e.target.value }); setPreview(null); }} /></Field>
        <Field label="Pay date"><Input type="date" value={v.payDate} onChange={(e) => setV({ ...v, payDate: e.target.value })} /></Field>
      </div>
      {preview && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-bg p-3"><small className="text-xs text-muted">Gross</small><b className="block font-display text-lg tabular-nums">{t.money(total("gross"), s.org?.currency)}</b></div>
            <div className="rounded-xl bg-bg p-3"><small className="text-xs text-muted">Deductions</small><b className="block font-display text-lg tabular-nums">{t.money(total("totalDeductions"), s.org?.currency)}</b></div>
            <div className="rounded-xl bg-navy p-3 text-white"><small className="text-xs text-white/70">Net pay</small><b className="block font-display text-lg tabular-nums">{t.money(total("net"), s.org?.currency)}</b></div>
          </div>
          <StubTable stubs={preview} />
        </div>
      )}
    </Modal>
  );
}

function StubTable({ stubs }: { stubs: any[] }) {
  const t = useT();
  const s = useSession();
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="table">
        <thead><tr><th>Employee</th><th className="text-end">Regular h</th><th className="text-end">OT h</th><th className="text-end">Gross</th><th className="text-end">Deductions</th><th className="text-end">Net</th></tr></thead>
        <tbody>{stubs.map((x) => (
          <tr key={x.employeeId}>
            <td><b>{x.name ?? (x.employee ? `${x.employee.firstName} ${x.employee.lastName}` : "")}</b>{x.exceptions?.length > 0 && <small className="mt-0.5 flex items-start gap-1 text-[11.5px] text-warn"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{x.exceptions.join("; ")}</small>}</td>
            <td className="text-end tabular-nums">{Number(x.regularHours)}</td><td className="text-end tabular-nums">{Number(x.overtimeHours) || "–"}</td>
            <td className="text-end tabular-nums">{t.money(Number(x.gross), s.org?.currency)}</td>
            <td className="text-end tabular-nums text-muted" title={(x.deductions ?? []).map((d: any) => `${d.name}: ${d.amount}`).join("\n")}>{t.money(Number(x.totalDeductions), s.org?.currency)}</td>
            <td className="text-end font-semibold tabular-nums">{t.money(Number(x.net), s.org?.currency)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function RunDetail({ id, canApprove, onClose }: { id: string; canApprove: boolean; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { data, reload } = useApi<{ data: any }>(`/api/payroll/runs/${id}`);
  const r = data?.data;
  const act = async (action: string) => { try { await api(`/api/payroll/runs/${id}`, { body: { action } }); toast(action === "approve" ? "Approved. Payslips sent to employees." : action === "paid" ? "Marked as paid" : "Cancelled"); reload(); } catch (e: any) { toast(e.message, "err"); } };
  return (
    <Modal open onClose={onClose} wide title={r ? `Pay run · ${t.date(r.periodStart, { month: "short", day: "numeric" })} – ${t.date(r.periodEnd, { month: "short", day: "numeric" })}` : "Pay run"}
      footer={r && canApprove && <>
        {r.status !== "PAID" && r.status !== "CANCELLED" && <ConfirmButton onConfirm={() => act("cancel")}>Cancel run</ConfirmButton>}
        {r.status === "DRAFT" && <ConfirmButton variant="pri" size="md" confirmLabel="Yes, approve and send payslips" onConfirm={() => act("approve")}><ShieldCheck className="h-4 w-4" />Approve payroll</ConfirmButton>}
        {r.status === "APPROVED" && <Button variant="pri" onClick={() => act("paid")}>Mark as paid</Button>}
      </>}>
      {!r ? <Loading /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3"><Badge status={r.status} /><span className="text-sm text-muted">Pay date {t.date(r.payDate)}{r.approvedBy ? ` · approved by ${r.approvedBy}` : ""}</span></div>
          {(r.exceptions as any[])?.length > 0 && <Callout tone="warn" title="Review before approving">{r.exceptions.map((e: any) => <div key={e.name}><b>{e.name}</b>: {e.issues.join("; ")}</div>)}</Callout>}
          <StubTable stubs={r.stubs} />
          {!canApprove && <p className="text-xs text-muted">Only owners, admins and finance can approve payroll.</p>}
        </div>
      )}
    </Modal>
  );
}
