"use client";
import { useState } from "react";
import Link from "next/link";
import { Tablet, CheckCheck } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { ClockCard } from "@/components/clock-card";
import { ResourceTable } from "@/components/resource";
import { useSession, isManagerRole } from "@/components/session";
import { useT } from "@/components/i18n";
import { Avatar, Badge, Button, Card, Empty, PageHeader, Tabs, cx, useToast } from "@/components/ui";

export default function TimePage() {
  const s = useSession();
  const t = useT();
  const mgr = isManagerRole(s.role);
  const [tab, setTab] = useState<"approve" | "all">("approve");
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="People" title={t("modules.time")} sub="Clock in from phone, browser, desktop or a shared kiosk, with geofence checks." actions={mgr && <Link href="/app/time/kiosk" className="btn"><Tablet className="h-4 w-4" />Kiosk mode</Link>} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {s.employee ? <ClockCard /> : <Card title="Clock"><p className="text-sm text-muted">Link your account to an employee profile to clock in.</p></Card>}
        {mgr && <OnTheClock />}
      </div>
      {mgr && (
        <>
          <Tabs value={tab} onChange={setTab} tabs={[{ key: "approve", label: "Timesheets to approve" }, { key: "all", label: "All time entries" }]} />
          {tab === "approve" ? <Approvals /> : <ResourceTable resource="timeentries" />}
        </>
      )}
    </div>
  );
}

function OnTheClock() {
  const t = useT();
  const { data } = useApi<any>("/api/live", { refreshMs: 30_000 });
  return (
    <Card title="On the clock now" eyebrow={data ? `${data.team.length} people` : undefined} action={<Link href="/app/live" className="text-xs font-bold text-blue">Live map →</Link>}>
      {!data?.team.length ? <p className="py-6 text-center text-sm text-muted">Nobody is clocked in right now.</p> : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.team.map((p: any) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl bg-bg p-2.5">
              <Avatar name={p.name} size={34} />
              <span className="min-w-0 flex-1"><b className="block truncate text-[13px]">{p.name}</b><small className="block truncate text-xs text-muted">{p.jobTitle} · since {t.time(p.since)}</small></span>
              {p.onSite === false ? <Badge tone="amber">Off site</Badge> : <Badge tone="green">On site</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Approvals() {
  const t = useT();
  const toast = useToast();
  const { data, reload } = useApi<{ data: any[] }>("/api/v1/timeentries?status=SUBMITTED&limit=200");
  const people = useApi<{ id: string; label: string }[]>("/api/refs/employees");
  const names = Object.fromEntries((people.data ?? []).map((p) => [p.id, p.label]));
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const rows = data?.data ?? [];
  const hrs = (r: any) => Math.max(0, (new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime()) / 36e5 - r.breakMinutes / 60);
  const decide = async (status: "APPROVED" | "REJECTED", ids: string[]) => {
    setBusy(status);
    try { const r = await api("/api/time/approve", { body: { ids, status } }); toast(`${r.updated} ${status === "APPROVED" ? "approved" : "rejected"}`); setSel(new Set()); reload(); }
    catch (e: any) { toast(e.message, "err"); } finally { setBusy(null); }
  };
  if (!rows.length) return <Empty icon={<CheckCheck className="h-5 w-5" />} title="All timesheets are approved" body="New entries show up here when people clock out." />;
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <span className="text-sm font-semibold">{rows.length} waiting · {t.num(rows.reduce((s, r) => s + hrs(r), 0), { maximumFractionDigits: 1 })} h</span>
        <div className="ms-auto flex gap-2">
          {sel.size > 0 && <Button size="sm" loading={busy === "REJECTED"} onClick={() => decide("REJECTED", [...sel])}>Reject {sel.size}</Button>}
          <Button size="sm" variant="pri" loading={busy === "APPROVED"} onClick={() => decide("APPROVED", sel.size ? [...sel] : rows.map((r) => r.id))}>Approve {sel.size || "all"}</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th className="w-8"><input type="checkbox" aria-label="Select all" checked={sel.size === rows.length} onChange={(e) => setSel(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} /></th><th>Employee</th><th>Date</th><th>In</th><th>Out</th><th>Break</th><th className="text-end">Hours</th><th>Where</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={cx(sel.has(r.id) && "bg-sky/50")}>
                <td><input type="checkbox" aria-label="Select" checked={sel.has(r.id)} onChange={(e) => { const n = new Set(sel); e.target.checked ? n.add(r.id) : n.delete(r.id); setSel(n); }} /></td>
                <td className="font-semibold">{names[r.employeeId] ?? "…"}</td>
                <td>{t.date(r.clockIn, { weekday: "short", month: "short", day: "numeric" })}</td>
                <td className="tabular-nums">{t.time(r.clockIn)}</td>
                <td className="tabular-nums">{t.time(r.clockOut)}</td>
                <td>{r.breakMinutes} min</td>
                <td className={cx("text-end font-semibold tabular-nums", hrs(r) > 10 && "text-warn")}>{hrs(r).toFixed(2)}</td>
                <td>{r.onSite === false ? <Badge tone="amber">Off site</Badge> : <Badge tone="gray">{r.source?.toLowerCase()}</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
