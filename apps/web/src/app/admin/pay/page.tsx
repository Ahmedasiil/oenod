"use client";
import Link from "next/link";
import { ArrowRight, ShieldAlert, Headphones } from "lucide-react";
import { useApi } from "@/lib/client/api";
import { ago, num } from "@/lib/format";
import { Badge, Card, ErrorNote, Loading, PageHeader, Stat } from "@/components/ui";
import { cents, Table } from "../bits";

type O = {
  currency: string; customers: { total: number; verified: number; frozen: number }; walletsCents: number;
  sent24: { cents: number; count: number }; sent30: { cents: number; count: number; feesCents: number }; revenue30Cents: number;
  reviewQueue: number; openRisks: number; activeCards: number; esims30: number; openCases: number;
  recent: { id: string; sendCents: number; sendCurrency: string; receiveCents: number; receiveCurrency: string; status: string; provider: string; createdAt: string; riskFlags: string[]; recipient: { name: string; country: string; method: string } }[];
  corridors: { currency: string; cents: number; count: number }[];
};

export default function PayAdmin() {
  const { data: s, error, reload } = useApi<O>("/api/admin/pay/overview", { refreshMs: 30_000 });
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!s) return <Loading rows={6} />;
  const c = (v: number) => cents(v, s.currency);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="oenodpay" title="Pay overview" sub="Money held, money moving, and what needs a person." />
      {(s.reviewQueue > 0 || s.openRisks > 0 || s.openCases > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {(s.reviewQueue > 0 || s.openRisks > 0) && <Link href="/admin/compliance" className="card flex items-center gap-3 border-crit/30 bg-[#FFF5F7] p-4"><ShieldAlert className="h-5 w-5 text-crit" /><span className="flex-1 text-[14px]"><b>{s.reviewQueue} transfer{s.reviewQueue === 1 ? "" : "s"}</b> held for review · <b>{s.openRisks}</b> open risk alert{s.openRisks === 1 ? "" : "s"}</span><ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>}
          {s.openCases > 0 && <Link href="/admin/support" className="card flex items-center gap-3 border-blue/30 bg-sky/60 p-4"><Headphones className="h-5 w-5 text-blue" /><span className="flex-1 text-[14px]"><b>{s.openCases} open support case{s.openCases === 1 ? "" : "s"}</b></span><ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>}
        </div>
      )}
      <section className="navy-panel grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4 sm:p-8">
        {[["Customer money held", c(s.walletsCents)], ["Sent, last 24 hours", `${c(s.sent24.cents)} · ${s.sent24.count}`], ["Sent, 30 days", c(s.sent30.cents)], ["Revenue, 30 days", c(s.revenue30Cents)]].map(([l, v]) => (
          <div key={l}><div className="font-mono text-[10.5px] uppercase tracking-[.14em] text-[#9DB0FF]">{l}</div><div className="mt-1.5 font-display text-[28px] font-semibold tracking-tight">{v}</div></div>
        ))}
      </section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Customers" value={num(s.customers.total)} hint={`${num(s.customers.verified)} verified`} />
        <Stat label="Frozen accounts" value={num(s.customers.frozen)} tone={s.customers.frozen ? "warn" : undefined} />
        <Stat label="Transfers, 30 days" value={num(s.sent30.count)} hint={`${c(s.sent30.feesCents)} in fees`} />
        <Stat label="Active cards" value={num(s.activeCards)} />
        <Stat label="eSIMs sold, 30 days" value={num(s.esims30)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="Latest transfers" pad={false}>
          <Table head={["When", "To", "Sent", "They get", "Route", "Status"]} empty={!s.recent.length}>
            {s.recent.map((t) => (
              <tr key={t.id}>
                <td className="px-5 py-3 text-muted">{ago(t.createdAt)}</td>
                <td className="px-5 py-3"><b>{t.recipient.name}</b><small className="block text-muted">{t.recipient.country} · {t.recipient.method.replace("_", " ").toLowerCase()}</small></td>
                <td className="px-5 py-3 font-semibold">{cents(t.sendCents, t.sendCurrency)}</td>
                <td className="px-5 py-3">{cents(t.receiveCents, t.receiveCurrency)}</td>
                <td className="px-5 py-3 capitalize text-muted">{t.provider}</td>
                <td className="px-5 py-3"><Badge status={t.status} />{t.riskFlags.length > 0 && <small className="mt-1 block text-[11px] text-crit">{t.riskFlags.slice(0, 2).join(", ")}</small>}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Top corridors, 30 days">
          <ul className="space-y-2.5">
            {s.corridors.sort((a, b) => b.cents - a.cents).slice(0, 10).map((x) => <li key={x.currency} className="flex items-center justify-between text-[14px]"><span className="font-semibold">{x.currency}</span><span className="text-muted">{x.count} · {c(x.cents)}</span></li>)}
            {!s.corridors.length && <li className="text-[13.5px] text-muted">No transfers yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
