"use client";
import { useState } from "react";
import Link from "next/link";
import { Download, Sparkles, TrendingUp, Users, Wallet, Boxes, LifeBuoy, KanbanSquare, Star, Briefcase } from "lucide-react";
import { RESOURCES } from "@/lib/fields";
import { useApi } from "@/lib/client/api";
import { useSession } from "@/components/session";
import { useT } from "@/components/i18n";
import { AiChat } from "@/components/ai-chat";
import { Button, Card, ErrorNote, Loading, Modal, PageHeader, Stat, Tabs, TrendChart, cx } from "@/components/ui";

export default function Reports() {
  const t = useT();
  const s = useSession();
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<"overview" | "exports">("overview");
  const [ask, setAsk] = useState(false);
  const { data: r, error, loading, reload } = useApi<any>(`/api/reports/summary?days=${days}`);
  const cur = r?.currency ?? s.org?.currency;
  const exportCsv = () => {
    const rows = [["date", "sales", "labour_hours"], ...r.series.map((x: any) => [x.date, x.sales, x.hours])];
    const url = URL.createObjectURL(new Blob([rows.map((x) => x.join(",")).join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `oenod-report-${days}d.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Workspace" title={t("modules.reports")} sub="Your whole business on one page: sales, labour, cash, customers, stock and delivery."
        actions={<>
          <div className="flex rounded-xl border border-line bg-paper p-1">{[7, 30, 90, 365].map((d) => <button key={d} onClick={() => setDays(d)} className={cx("rounded-lg px-3 py-1.5 text-xs font-bold", days === d ? "bg-navy text-white" : "text-muted")}>{d === 365 ? "1 year" : `${d} days`}</button>)}</div>
          <Button onClick={() => setAsk(true)}><Sparkles className="h-4 w-4 text-blue" />Ask about it</Button>
        </>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "overview", label: "Overview" }, { key: "exports", label: "Data exports" }]} />
      {tab === "overview" && (loading && !r ? <Loading rows={6} /> : error || !r ? <ErrorNote error={error} onRetry={reload} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Sales" value={t.money(r.sales.total, cur)} delta={r.sales.change} spark={r.series.map((x: any) => x.sales)} />
            <Stat label="Labour cost" value={t.money(r.labour.cost, cur)} hint={r.labour.percentOfSales != null ? `${r.labour.percentOfSales}% of sales` : `${r.labour.hours} h`} tone={r.labour.percentOfSales > 35 ? "warn" : undefined} />
            <Stat label="Owed to you" value={t.money(r.cash.receivable, cur)} hint={r.cash.overdueInvoices ? `${r.cash.overdueInvoices} overdue` : "nothing overdue"} tone={r.cash.overdueInvoices ? "warn" : undefined} />
            <Stat label="Deals won" value={t.money(r.pipeline.won, cur)} hint={`${r.pipeline.wonCount} won · ${r.pipeline.openCount} open`} />
          </div>
          <Card title="Sales and labour hours" action={<Button size="sm" variant="ghost" onClick={exportCsv}><Download className="h-3.5 w-3.5" />CSV</Button>}>
            <TrendChart data={r.series.map((x: any) => ({ ...x, date: t.date(x.date, { month: "short", day: "numeric" }) }))} bar="sales" line="hours" barLabel="Sales" lineLabel="Labour hours" format={(n) => t.money(n, cur)} />
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Tile icon={<TrendingUp className="h-4 w-4" />} title="Sales" href="/app/sales" rows={[["This period", t.money(r.sales.total, cur)], ["Previous period", t.money(r.sales.previous, cur)], ["Invoices paid", t.money(r.sales.invoicesPaid, cur)]]} />
            <Tile icon={<Users className="h-4 w-4" />} title="People" href="/app/people" rows={[["Headcount", r.people.headcount], ["New hires", r.people.newHires], ["Hours worked", t.num(r.labour.hours)]]} />
            <Tile icon={<Wallet className="h-4 w-4" />} title="Cash" href="/app/accounting" rows={[["Receivable", t.money(r.cash.receivable, cur)], ["Overdue invoices", r.cash.overdueInvoices]]} />
            <Tile icon={<Briefcase className="h-4 w-4" />} title="Pipeline" href="/app/crm" rows={[["New contacts", r.pipeline.newContacts], ["Open pipeline", t.money(r.pipeline.open, cur)], ["Open deals", r.pipeline.openCount]]} />
            <Tile icon={<LifeBuoy className="h-4 w-4" />} title="Help desk" href="/app/support" rows={Object.entries(r.support).length ? Object.entries(r.support).map(([k, v]) => [k[0] + k.slice(1).toLowerCase(), v as number]) : [["Tickets", 0]]} />
            <Tile icon={<KanbanSquare className="h-4 w-4" />} title="Projects" href="/app/projects" rows={Object.entries(r.projects).length ? Object.entries(r.projects).map(([k, v]) => [k.replace("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()), v as number]) : [["Projects", 0]]} />
            <Tile icon={<Boxes className="h-4 w-4" />} title="Inventory" href="/app/inventory" rows={[["Items low on stock", r.inventory.lowStock]]} />
            {r.reviews && <Tile icon={<Star className="h-4 w-4" />} title="Reviews" href="/app/reviews" rows={[["Average rating", r.reviews.average ?? "–"], ["New reviews", r.reviews.count]]} />}
          </div>
        </>
      ))}
      {tab === "exports" && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCES.filter((x) => s.modules.includes(x.module)).map((x) => (
            <Link key={x.key} href={`/app/r/${x.key}`} className="card flex items-center justify-between p-4 transition hover:shadow-lift"><span><b className="block text-[14px]">{x.label}</b><small className="text-xs text-muted">Filter, then export to CSV</small></span><Download className="h-4 w-4 text-muted" /></Link>
          ))}
        </div>
      )}
      <Modal open={ask} onClose={() => setAsk(false)} title="Ask about your numbers" wide>
        <div className="h-[60vh]"><AiChat compact suggestions={[`Why did sales change over the last ${days} days?`, "Which days had the highest labour cost compared to sales?", "Who owes us money and how much?", "What should I focus on this week?"]} /></div>
      </Modal>
    </div>
  );
}

function Tile({ icon, title, href, rows }: { icon: React.ReactNode; title: string; href: string; rows: [string, React.ReactNode][] }) {
  return (
    <Link href={href} className="card block p-4 transition hover:shadow-lift">
      <div className="mb-3 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-sky text-navy">{icon}</span><b className="font-display text-[15px]">{title}</b></div>
      <dl className="space-y-1.5 text-[13px]">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>)}</dl>
    </Link>
  );
}
