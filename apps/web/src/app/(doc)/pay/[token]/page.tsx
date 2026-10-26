import { notFound } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { CompanyMark, VerifiedTick } from "@/components/logo";
import { PayButton } from "../../doc-bits";

type P = { params: Promise<{ token: string }>; searchParams: Promise<{ paid?: string }> };
type Item = { name: string; qty: number; price: number };

export const metadata = { title: "Invoice" };

export default async function PayInvoice({ params, searchParams }: P) {
  const inv = await db.invoice.findUnique({ where: { publicToken: (await params).token }, include: { org: { select: { name: true, logoUrl: true, brandColor: true, verificationStatus: true, email: true, phone: true, address: true } }, contact: { select: { firstName: true, lastName: true, company: true, email: true } } } });
  if (!inv || inv.status === "DRAFT") notFound();
  const justPaid = (await searchParams).paid === "1";
  const f = (n: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: inv.currency }).format(n);
  const balance = Number(inv.total) - Number(inv.amountPaid);
  const paid = inv.status === "PAID" || balance <= 0;
  const overdue = !paid && inv.dueDate < new Date();
  const items = (inv.items ?? []) as Item[];
  const addr = (inv.org.address ?? {}) as Record<string, string>;
  const d = (x: Date) => x.toLocaleDateString("en-CA", { dateStyle: "medium" });
  return (
    <div className="space-y-5">
      {(justPaid || paid) && <div className="flex items-center gap-3 rounded-2xl bg-[#E7F7EF] px-5 py-4 text-[14px] text-[#0E6B44]"><CheckCircle2 className="h-5 w-5" /><b>{paid ? "Paid in full. Thank you!" : "Payment received. It can take a minute to show here."}</b></div>}
      {inv.status === "VOID" && <div className="flex items-center gap-3 rounded-2xl bg-[#FFF5F7] px-5 py-4 text-[14px] text-crit"><AlertTriangle className="h-5 w-5" /><b>This invoice was cancelled.</b></div>}
      <article className="card overflow-hidden">
        <header className="flex flex-wrap items-start gap-4 border-b border-line p-6 sm:p-8">
          <CompanyMark name={inv.org.name} logoUrl={inv.org.logoUrl} color={inv.org.brandColor} size={56} />
          <div className="min-w-0 flex-1"><b className="flex items-center gap-1.5 font-display text-xl">{inv.org.name}{inv.org.verificationStatus === "VERIFIED" && <VerifiedTick />}</b><small className="block text-[12.5px] text-muted">{[addr.line1, addr.city, addr.region].filter(Boolean).join(", ")}</small><small className="block text-[12.5px] text-muted">{[inv.org.email, inv.org.phone].filter(Boolean).join(" · ")}</small></div>
          <div className="text-end"><p className="eyebrow">Invoice</p><b className="font-mono text-lg">{inv.number}</b></div>
        </header>
        <div className="grid gap-4 p-6 text-[13.5px] sm:grid-cols-3 sm:p-8">
          <div><small className="block text-muted">Billed to</small><b>{inv.contact?.company ?? (inv.contact ? `${inv.contact.firstName} ${inv.contact.lastName ?? ""}`.trim() : "Customer")}</b>{inv.contact?.company && <small className="block text-muted">{inv.contact.firstName} {inv.contact.lastName ?? ""}</small>}</div>
          <div><small className="block text-muted">Issued</small><b>{d(inv.issueDate)}</b></div>
          <div><small className="block text-muted">Due</small><b className={overdue ? "text-crit" : ""}>{d(inv.dueDate)}{overdue && " · overdue"}</b></div>
        </div>
        <div className="overflow-x-auto px-6 sm:px-8">
          <table className="w-full text-[13.5px]">
            <thead><tr className="border-b border-line text-start text-[11px] uppercase tracking-wide text-muted"><th className="py-2 text-start font-bold">Item</th><th className="py-2 text-end font-bold">Qty</th><th className="py-2 text-end font-bold">Price</th><th className="py-2 text-end font-bold">Amount</th></tr></thead>
            <tbody>{items.map((it, i) => <tr key={i} className="border-b border-line"><td className="py-3">{it.name}</td><td className="py-3 text-end tabular-nums">{it.qty}</td><td className="py-3 text-end tabular-nums">{f(it.price)}</td><td className="py-3 text-end tabular-nums">{f(it.qty * it.price)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="ms-auto max-w-xs space-y-1.5 p-6 text-[13.5px] sm:p-8">
          <p className="flex justify-between"><span className="text-muted">Subtotal</span><span className="tabular-nums">{f(Number(inv.subtotal))}</span></p>
          <p className="flex justify-between"><span className="text-muted">Tax</span><span className="tabular-nums">{f(Number(inv.tax))}</span></p>
          <p className="flex justify-between border-t border-line pt-2 font-display text-lg font-semibold"><span>Total</span><span className="tabular-nums">{f(Number(inv.total))}</span></p>
          {Number(inv.amountPaid) > 0 && <p className="flex justify-between"><span className="text-muted">Paid</span><span className="tabular-nums">−{f(Number(inv.amountPaid))}</span></p>}
          {!paid && <p className="flex justify-between font-bold text-navy"><span>Balance due</span><span className="tabular-nums">{f(balance)}</span></p>}
        </div>
        {inv.notes && <p className="whitespace-pre-line border-t border-line px-6 py-5 text-[13px] text-muted sm:px-8">{inv.notes}</p>}
      </article>
      {!paid && inv.status !== "VOID" && <div className="card p-6"><PayButton token={(await params).token} label={`Pay ${f(balance)} by card`} /><p className="mt-3 text-center text-[11.5px] text-muted">Secure payment by Stripe. {inv.org.name} never sees your card number.</p></div>}
    </div>
  );
}
