import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { CompanyMark, VerifiedTick } from "@/components/logo";
import { QuoteDecision } from "../../doc-bits";

type P = { params: Promise<{ token: string }> };
type Item = { name: string; qty: number; price: number };

export const metadata = { title: "Quote" };

export default async function QuotePage({ params }: P) {
  const token = (await params).token;
  const q = await db.quote.findUnique({ where: { publicToken: token }, include: { org: { select: { name: true, logoUrl: true, brandColor: true, verificationStatus: true, currency: true } }, contact: { select: { firstName: true, lastName: true, company: true } } } });
  if (!q || q.status === "DRAFT") notFound();
  const f = (n: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: q.org.currency ?? "CAD" }).format(n);
  const items = (q.items ?? []) as Item[];
  const expired = q.status === "SENT" && q.validUntil && q.validUntil < new Date();
  return (
    <div className="space-y-5">
      {q.status === "ACCEPTED" && <div className="flex items-center gap-3 rounded-2xl bg-[#E7F7EF] px-5 py-4 text-[14px] text-[#0E6B44]"><CheckCircle2 className="h-5 w-5" /><b>Accepted{q.acceptedAt ? ` on ${q.acceptedAt.toLocaleDateString("en-CA", { dateStyle: "medium" })}` : ""}. Thank you!</b></div>}
      {q.status === "DECLINED" && <div className="flex items-center gap-3 rounded-2xl bg-bg px-5 py-4 text-[14px] text-muted"><XCircle className="h-5 w-5" /><b>This quote was declined.</b></div>}
      <article className="card overflow-hidden">
        <header className="flex flex-wrap items-start gap-4 border-b border-line p-6 sm:p-8">
          <CompanyMark name={q.org.name} logoUrl={q.org.logoUrl} color={q.org.brandColor} size={56} />
          <div className="min-w-0 flex-1"><b className="flex items-center gap-1.5 font-display text-xl">{q.org.name}{q.org.verificationStatus === "VERIFIED" && <VerifiedTick />}</b><small className="text-[13px] text-muted">Quote for {q.contact?.company ?? q.contact?.firstName ?? "you"}</small></div>
          <div className="text-end"><p className="eyebrow">Quote</p><b className="font-mono text-lg">{q.number}</b>{q.validUntil && <small className="block text-xs text-muted">Valid until {q.validUntil.toLocaleDateString("en-CA", { dateStyle: "medium" })}</small>}</div>
        </header>
        <div className="overflow-x-auto px-6 pt-4 sm:px-8">
          <table className="w-full text-[13.5px]">
            <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted"><th className="py-2 text-start font-bold">Item</th><th className="py-2 text-end font-bold">Qty</th><th className="py-2 text-end font-bold">Price</th><th className="py-2 text-end font-bold">Amount</th></tr></thead>
            <tbody>{items.map((it, i) => <tr key={i} className="border-b border-line"><td className="py-3">{it.name}</td><td className="py-3 text-end tabular-nums">{it.qty}</td><td className="py-3 text-end tabular-nums">{f(it.price)}</td><td className="py-3 text-end tabular-nums">{f(it.qty * it.price)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="ms-auto max-w-xs space-y-1.5 p-6 text-[13.5px] sm:p-8">
          <p className="flex justify-between"><span className="text-muted">Subtotal</span><span className="tabular-nums">{f(Number(q.subtotal))}</span></p>
          <p className="flex justify-between"><span className="text-muted">Tax</span><span className="tabular-nums">{f(Number(q.tax))}</span></p>
          <p className="flex justify-between border-t border-line pt-2 font-display text-lg font-semibold"><span>Total</span><span className="tabular-nums">{f(Number(q.total))}</span></p>
        </div>
      </article>
      {q.status === "SENT" && !expired && <div className="card p-6"><QuoteDecision token={token} /></div>}
      {expired && <p className="text-center text-[13.5px] text-muted">This quote has expired. Contact {q.org.name} for an updated one.</p>}
    </div>
  );
}
