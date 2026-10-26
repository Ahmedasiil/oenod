"use client";
import Link from "next/link";
import { ArrowRight, Sparkles, AlertTriangle } from "lucide-react";
import { useApi } from "@/lib/client/api";
import { num } from "@/lib/format";
import { Card, ErrorNote, Loading, PageHeader, Stat, TrendChart, Badge } from "@/components/ui";
import { cents } from "./bits";

type Stats = {
  mrrCents: number; arrCents: number; orgs: number; users: number; active7: number; status: Record<string, number>;
  signups30: number; signupsPrev30: number; signupsDaily: { date: string; count: number }[]; churn30: number; churnRate: number;
  adRevenue30Cents: number; academyRevenue30Cents: number; academySales30: number; approvalsWaiting: number; aiTokens30: number;
  messages30: { channel: string; status: string; count: number }[]; openIncidents: number; leads30: number; openJobs: number; applications30: number;
  plans: { key: string; name: string; active: number }[];
};

export default function AdminOverview() {
  const { data: s, error, reload } = useApi<Stats>("/api/admin/stats", { refreshMs: 60_000 });
  const { data: ctl } = useApi<{ data: { key: string; name: string; control: { mode: string } }[] }>("/api/admin/controls");
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!s) return <Loading rows={6} />;
  const delta = s.signupsPrev30 ? Math.round(((s.signups30 - s.signupsPrev30) / s.signupsPrev30) * 100) : null;
  const paused = ctl?.data.filter((c) => c.control.mode !== "LIVE") ?? [];
  const sent = s.messages30.filter((m) => m.status === "SENT").reduce((a, m) => a + m.count, 0);
  const failed = s.messages30.filter((m) => m.status === "FAILED").reduce((a, m) => a + m.count, 0);
  const totalActive = s.plans.reduce((a, p) => a + p.active, 0) || 1;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="OENOD platform" title="Overview" sub="Revenue, customers and everything that needs you, across every company on OENOD." actions={<Link href="/admin/ai" className="btn-pri"><Sparkles className="h-4 w-4" />Ask the AI operator</Link>} />

      {(s.approvalsWaiting > 0 || paused.length > 0 || s.openIncidents > 0) && (
        <div className="grid gap-3 md:grid-cols-3">
          {s.approvalsWaiting > 0 && <Link href="/admin/approvals" className="card flex items-center gap-3 border-blue/30 bg-sky/60 p-4"><Sparkles className="h-5 w-5 text-blue" /><span className="flex-1 text-[14px]"><b>{s.approvalsWaiting} AI proposal{s.approvalsWaiting === 1 ? "" : "s"}</b> waiting for your approval</span><ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>}
          {paused.length > 0 && <Link href="/admin/controls" className="card flex items-center gap-3 border-[#FFD98A] bg-[#FFF8E6] p-4"><AlertTriangle className="h-5 w-5 text-warn" /><span className="flex-1 text-[14px]"><b>{paused.map((p) => p.name).join(", ")}</b> {paused.length === 1 ? "is" : "are"} not live</span><ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>}
          {s.openIncidents > 0 && <Link href="/admin/controls#incidents" className="card flex items-center gap-3 border-crit/30 bg-[#FFF5F7] p-4"><AlertTriangle className="h-5 w-5 text-crit" /><span className="flex-1 text-[14px]"><b>{s.openIncidents} open incident{s.openIncidents === 1 ? "" : "s"}</b> on the status page</span><ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>}
        </div>
      )}

      <section className="navy-panel grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4 sm:p-8">
        {[["Monthly recurring revenue", cents(s.mrrCents)], ["Annual run rate", cents(s.arrCents)], ["Ad revenue, 30 days", cents(s.adRevenue30Cents)], [`Academy, 30 days (${s.academySales30} sales)`, cents(s.academyRevenue30Cents)]].map(([l, v]) => (
          <div key={l}><div className="font-mono text-[10.5px] uppercase tracking-[.14em] text-[#9DB0FF]">{l}</div><div className="mt-1.5 font-display text-[30px] font-semibold tracking-tight">{v}</div></div>
        ))}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Companies" value={num(s.orgs)} hint={`${s.status.ACTIVE ?? 0} paying · ${s.status.TRIALING ?? 0} trial`} />
        <Stat label="New in 30 days" value={num(s.signups30)} delta={delta} />
        <Stat label="Users" value={num(s.users)} hint={`${num(s.active7)} active this week`} />
        <Stat label="Churn, 30 days" value={`${s.churnRate}%`} hint={`${s.churn30} cancelled`} tone={s.churnRate > 5 ? "warn" : undefined} />
        <Stat label="Past due" value={num(s.status.PAST_DUE ?? 0)} tone={(s.status.PAST_DUE ?? 0) > 0 ? "crit" : undefined} />
        <Stat label="Website leads" value={num(s.leads30)} hint="last 30 days" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="New companies per day" eyebrow="Last 30 days"><TrendChart data={s.signupsDaily.map((d) => ({ count: d.count, date: d.date.slice(5) }))} bar="count" barLabel="Sign-ups" /></Card>
        <Card title="Paying customers by plan">
          <ul className="space-y-3">
            {s.plans.map((p) => (
              <li key={p.key}>
                <div className="flex justify-between text-[13.5px]"><b>{p.name}</b><span className="tabular-nums text-muted">{p.active}</span></div>
                <div className="mt-1 h-2 rounded-full bg-bg"><div className="h-2 rounded-full bg-blue" style={{ width: `${(p.active / totalActive) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
          <Link href="/admin/plans" className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-blue">Plans and pricing<ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" /></Link>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Marketplaces"><p className="text-[13.5px] text-muted"><b className="text-ink">{num(s.openJobs)}</b> open jobs · <b className="text-ink">{num(s.applications30)}</b> applications in 30 days</p></Card>
        <Card title="Messages, 30 days"><p className="text-[13.5px] text-muted"><b className="text-ink">{num(sent)}</b> delivered{failed > 0 && <> · <span className="font-semibold text-crit">{num(failed)} failed</span></>}</p><Link href="/admin/growth?tab=log" className="mt-2 inline-block text-[12.5px] font-semibold text-blue">Message log</Link></Card>
        <Card title="AI usage, 30 days"><p className="text-[13.5px] text-muted"><b className="text-ink">{num(s.aiTokens30)}</b> tokens across all companies</p></Card>
        <Card title="Surfaces">
          <ul className="space-y-1.5 text-[13px]">{ctl?.data.filter((c) => c.key !== "all").map((c) => <li key={c.key} className="flex items-center justify-between"><span>{c.name}</span><Badge status={c.control.mode} /></li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
