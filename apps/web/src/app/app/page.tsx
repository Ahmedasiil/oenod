"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Sponsored } from "@/components/sponsored";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Circle, Sparkles, CalendarPlus, FileText, UserPlus, ShoppingCart, Megaphone, Briefcase, X } from "lucide-react";
import { greeting } from "@oenod/i18n";
import { api, useApi } from "@/lib/client/api";
import { useSession, isManagerRole } from "@/components/session";
import { useT } from "@/components/i18n";
import { Badge, Button, Card, Loading, Stat, TrendChart, cx, useToast } from "@/components/ui";

export default function Overview() {
  const s = useSession();
  const t = useT();
  const router = useRouter();
  const manager = isManagerRole(s.role) || ["FINANCE", "ACCOUNTANT"].includes(s.role ?? "");
  useEffect(() => { if (!manager && s.employee) router.replace("/me"); }, [manager, s.employee, router]);
  const canReports = s.modules.includes("reports");
  const report = useApi<any>(manager && canReports ? "/api/reports/summary?days=30" : null);
  const onboarding = useApi<any>(manager && !s.org?.onboardingDone ? "/api/onboarding" : null);
  const actions = useApi<any>(s.modules.includes("ai") ? "/api/ai/actions?status=NEEDS_APPROVAL" : null, { refreshMs: 45_000 });
  const r = report.data;
  const cur = s.org?.currency ?? "CAD";
  const first = s.user.name.split(" ")[0];
  const week = r?.series?.slice(-7) ?? [];

  const brief = r ? buildBrief(r, actions.data?.data?.length ?? 0, t) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <div>
          <div className="eyebrow">{t.date(new Date(), { weekday: "long", month: "long", day: "numeric" })}</div>
          <h1 className="h1 mt-1">{greeting(t.locale, s.org?.timezone)}, {first}</h1>
          <p className="mt-1 text-muted">{t("welcome.title")}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {s.modules.includes("scheduling") && <Link href="/app/scheduling" className="btn"><CalendarPlus className="h-4 w-4" />Schedule</Link>}
          {s.modules.includes("sales") && <Link href="/app/r/invoices/new" className="btn"><FileText className="h-4 w-4" />Invoice</Link>}
          {s.modules.includes("pos") && <Link href="/app/pos" className="btn-pri"><ShoppingCart className="h-4 w-4" />Open register</Link>}
        </div>
      </div>

      {/* AI briefing */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="navy-panel p-6">
          <Orb />
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.14em] text-[#C9D4FF]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5BF0A9]" />AI briefing · {t.time(new Date(), s.org?.timezone)}</div>
          <h2 className="mt-3 max-w-[26ch] font-display text-[22px] font-semibold leading-tight tracking-tight">{brief?.headline ?? "Your AI Business Manager is watching everything for you."}</h2>
          <p className="mt-2 max-w-[56ch] text-[14px] leading-6 text-[#D8E0FF]">{brief?.body ?? "Ask about sales, staffing, cash or anything else. It looks at your real data, does the routine work and brings you only the decisions that need you."}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(actions.data?.data?.length ?? 0) > 0 && <Link href="/app/ai?tab=approvals" className="btn border-0 bg-white text-navy">Review {actions.data.data.length} approval{actions.data.data.length > 1 ? "s" : ""}</Link>}
            <Link href="/app/ai" className="btn border-0 bg-white/10 text-white hover:bg-white/20"><Sparkles className="h-4 w-4" />Ask the AI</Link>
          </div>
        </section>
        {onboarding.data && !onboarding.data.finished ? <SetupCard data={onboarding.data} reload={onboarding.reload} /> : <Approvals list={actions.data?.data ?? []} reload={actions.reload} />}
      </div>

      {/* KPIs */}
      {manager && canReports && (report.loading ? <Loading rows={2} /> : r && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Sales, 30 days" value={t.money(r.sales.total, cur)} delta={r.sales.change} spark={r.series.map((d: any) => d.sales)} />
          <Stat label="Owed to you" value={t.money(r.cash.receivable, cur)} hint={r.cash.overdueInvoices ? `${r.cash.overdueInvoices} overdue` : "nothing overdue"} tone={r.cash.overdueInvoices ? "warn" : undefined} />
          <Stat label="Labour vs sales" value={r.labour.percentOfSales != null ? `${r.labour.percentOfSales}%` : "–"} hint={`${t.num(r.labour.hours)} h worked`} tone={r.labour.percentOfSales > 35 ? "warn" : undefined} spark={r.series.map((d: any) => d.hours)} />
          <Stat label="Open pipeline" value={t.money(r.pipeline.open, cur)} hint={`${r.pipeline.openCount} deals`} />
        </div>
      ))}

      {manager && canReports && r && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Card title="Sales and hours" eyebrow="Last 30 days" action={<Link href="/app/reports" className="text-xs font-bold text-blue">Reports →</Link>}>
            <TrendChart data={r.series} bar="sales" line="hours" barLabel="Sales" lineLabel="Hours worked" format={(n) => t.money(n, cur)} />
          </Card>
          <Card title="At a glance" eyebrow={`As of ${t.time(r.asOf)}`}>
            <ul className="divide-y divide-line text-[13px]">
              <Row label="This week's sales" value={t.money(week.reduce((a: number, d: any) => a + d.sales, 0), cur)} href="/app/pos" />
              <Row label="Team" value={`${r.people.headcount ?? "–"} people`} href="/app/people" />
              <Row label="Customer rating" value={r.reviews?.average ? `${r.reviews.average} ★ (${r.reviews.count})` : "–"} href="/app/reviews" />
              <Row label="Low stock items" value={String(r.inventory.lowStock)} href="/app/inventory" warn={r.inventory.lowStock > 0} />
              <Row label="Projects at risk" value={String((r.projects.AT_RISK ?? 0) + (r.projects.OFF_TRACK ?? 0))} href="/app/projects" warn={(r.projects.AT_RISK ?? 0) + (r.projects.OFF_TRACK ?? 0) > 0} />
              <Row label="Deals won" value={`${t.money(r.pipeline.won, cur)} (${r.pipeline.wonCount})`} href="/app/crm" />
            </ul>
          </Card>
        </div>
      )}

      {/* Quick start tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { m: "recruiting", href: "/app/recruiting", icon: <Briefcase className="h-5 w-5" />, title: "Hire on OENOD Jobs", body: "Free public job posts. No account needed to apply." },
          { m: "marketing", href: "/app/ads", icon: <Megaphone className="h-5 w-5" />, title: "Promote your business", body: "Self-serve ads shown across OENOD." },
          { m: "settings", href: "/app/settings/team", icon: <UserPlus className="h-5 w-5" />, title: "Invite your team", body: "Give each person only what they need." },
          { m: "academy", href: "/app/academy", icon: <Sparkles className="h-5 w-5" />, title: "Train your team", body: "Courses with certificates in your brand." },
        ].filter((x) => s.modules.includes(x.m)).map((x) => (
          <Link key={x.href} href={x.href} className="card group flex flex-col gap-2 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky text-navy">{x.icon}</span>
            <b className="font-display text-sm font-semibold">{x.title}</b><small className="text-xs leading-5 text-muted">{x.body}</small>
          </Link>
        ))}
      </div>
      <Sponsored placement="app_home" n={2} />
    </div>
  );
}

function buildBrief(r: any, approvals: number, t: ReturnType<typeof useT>) {
  const parts: string[] = [];
  const cur = r.currency;
  if (r.sales.change != null && Math.abs(r.sales.change) < 1000) parts.push(`Sales are ${r.sales.change >= 0 ? "up" : "down"} ${Math.abs(r.sales.change)}% on the previous 30 days at ${t.money(r.sales.total, cur)}.`);
  else parts.push(`You've taken ${t.money(r.sales.total, cur)} in the last 30 days.`);
  if (r.cash.overdueInvoices) parts.push(`${r.cash.overdueInvoices} invoice${r.cash.overdueInvoices > 1 ? "s are" : " is"} overdue; I can send polite reminders.`);
  if (r.labour.percentOfSales > 35) parts.push(`Labour is ${r.labour.percentOfSales}% of sales, above the usual 25 to 35%.`);
  if (r.inventory.lowStock) parts.push(`${r.inventory.lowStock} item${r.inventory.lowStock > 1 ? "s are" : " is"} low on stock.`);
  const headline = approvals ? `${approvals} decision${approvals > 1 ? "s" : ""} waiting for you, everything else is handled.` : r.cash.overdueInvoices ? "Cash to collect, and a clear plan to get it in." : "A steady day. Here's what moved.";
  return { headline, body: parts.join(" ") };
}

function Row({ label, value, href, warn }: { label: string; value: string; href: string; warn?: boolean }) {
  return <li><Link href={href} className="flex items-center justify-between gap-3 py-2.5 hover:text-navy"><span className="text-muted">{label}</span><b className={cx("font-semibold tabular-nums", warn && "text-warn")}>{value}</b></Link></li>;
}

function SetupCard({ data, reload }: { data: any; reload: () => void }) {
  const t = useT();
  return (
    <Card title={t("welcome.setupTitle")} eyebrow={`${data.done} of ${data.total} done`} action={<button className="btn-ghost btn-sm" aria-label="Hide" onClick={async () => { await api("/api/onboarding", { body: { done: true } }); reload(); }}><X className="h-4 w-4" /></button>}>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-bg"><i className="block h-full rounded-full bg-gradient-to-r from-navy to-blue transition-all" style={{ width: `${data.percent}%` }} /></div>
      <ul className="space-y-1">
        {data.steps.slice(0, 7).map((st: any) => (
          <li key={st.key}>
            <Link href={st.href} className={cx("flex items-center gap-3 rounded-xl px-2 py-2 text-[13px] transition hover:bg-bg", st.done && "opacity-60")}>
              {st.done ? <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-ok" /> : <Circle className="h-[18px] w-[18px] shrink-0 text-[#C2C9DC]" />}
              <span className="min-w-0 flex-1"><b className={cx("block font-semibold", st.done && "line-through")}>{st.title}</b>{!st.done && <small className="block truncate text-xs text-muted">{st.why}</small>}</span>
              {!st.done && <span className="font-mono text-[10.5px] text-muted">{st.minutes} min</span>}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Approvals({ list, reload }: { list: any[]; reload: () => void }) {
  const toast = useToast();
  const decide = async (id: string, decision: "approve" | "reject") => {
    try { const r = await api(`/api/ai/actions/${id}`, { body: { decision } }); toast(decision === "approve" ? (r.status === "COMPLETED" ? "Done" : `Status: ${r.status}`) : "Rejected"); reload(); }
    catch (e: any) { toast(e.message, "err"); }
  };
  return (
    <Card title="Waiting for your approval" eyebrow="AI actions" action={<Link href="/app/ai?tab=approvals" className="text-xs font-bold text-blue">All →</Link>}>
      {!list.length ? <p className="py-6 text-center text-sm text-muted">Nothing waiting. The AI will ask before anything important.</p> : (
        <ul className="space-y-2">
          {list.slice(0, 4).map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky text-navy"><Sparkles className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><b className="block truncate text-[13px] font-semibold">{a.title}</b><small className="block truncate text-xs text-muted">{a.reason ?? a.worker}</small></span>
              <Button size="sm" variant="ghost" onClick={() => decide(a.id, "reject")}>No</Button>
              <Button size="sm" variant="pri" onClick={() => decide(a.id, "approve")}>Approve</Button>
            </li>
          ))}
        </ul>
      )}
      {list.length > 0 && <Badge tone="amber" className="mt-3">{list.length} waiting</Badge>}
    </Card>
  );
}

function Orb() {
  return (
    <svg className="pointer-events-none absolute -end-16 -top-14 h-72 w-72 opacity-90" viewBox="0 0 200 200" aria-hidden>
      <defs><radialGradient id="orbg" cx="40%" cy="35%"><stop offset="0" stopColor="#8EA2FF" stopOpacity=".9" /><stop offset=".55" stopColor="#2342E0" stopOpacity=".35" /><stop offset="1" stopColor="#000F55" stopOpacity="0" /></radialGradient></defs>
      <circle cx="100" cy="100" r="90" fill="url(#orbg)" />
      {[60, 75, 90].map((r, i) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#fff" strokeOpacity={0.12 - i * 0.03} strokeDasharray="2 6"><animateTransform attributeName="transform" type="rotate" from={`0 100 100`} to={`${i % 2 ? -360 : 360} 100 100`} dur={`${40 + i * 15}s`} repeatCount="indefinite" /></circle>)}
    </svg>
  );
}
