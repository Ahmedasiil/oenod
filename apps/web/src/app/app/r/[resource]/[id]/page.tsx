"use client";
import { use, useState } from "react";
import { notFound } from "next/navigation";
import { Send, CreditCard, Sparkles, Play, PackageCheck, Link2 } from "lucide-react";
import { resourceByKey } from "@/lib/fields";
import { api, useApi } from "@/lib/client/api";
import { ResourceDetail } from "@/components/resource";
import { Button, Callout, Card, Field, Input, Modal, Select, Textarea, copyText, useToast } from "@/components/ui";
import { useSession, isManagerRole } from "@/components/session";
import { useT } from "@/components/i18n";

export default function ResourcePage({ params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = use(params);
  if (!resourceByKey(resource)) notFound();
  return <ResourceDetail resource={resource} id={id} extra={(row, reload) => <Extras resource={resource} row={row} reload={reload} />} />;
}

function Extras({ resource, row, reload }: { resource: string; row: any; reload: () => void }) {
  switch (resource) {
    case "invoices": return <InvoiceActions row={row} reload={reload} />;
    case "quotes": return <QuoteActions row={row} reload={reload} />;
    case "campaigns": return <CampaignActions row={row} reload={reload} />;
    case "reviews": return <ReviewReply row={row} reload={reload} />;
    case "monitors": return <RunMonitor row={row} />;
    case "purchaseorders": return <ReceivePo row={row} reload={reload} />;
    case "leave": return <LeaveDecision row={row} reload={reload} />;
    default: return null;
  }
}

function QuoteActions({ row, reload }: { row: any; reload: () => void }) {
  const toast = useToast();
  const t = useT();
  const link = `${location.origin}/quote/${row.publicToken}`;
  return (
    <Card title="Customer approval" eyebrow="Quote">
      <p className="mb-3 text-[13px] text-muted">{row.status === "DRAFT" ? "Mark the quote as Sent, then share the link. Your customer can accept it with an e-signature, which creates the invoice automatically." : row.status === "SENT" ? "Waiting for your customer. When they accept, the invoice is created and they can pay online." : `This quote was ${row.status.toLowerCase()}.`}</p>
      <div className="flex flex-wrap gap-2">
        {row.status === "DRAFT" && <Button variant="pri" onClick={async () => { try { await api(`/api/v1/quotes/${row.id}`, { method: "PATCH", body: { status: "SENT" } }); reload(); } catch (e: any) { toast(e.message, "err"); } }}><Send className="h-4 w-4" />Mark as sent</Button>}
        <Button variant="ghost" disabled={row.status === "DRAFT"} onClick={async () => { if (await copyText(link)) toast(t("common.copied")); }}><Link2 className="h-4 w-4" />Copy customer link</Button>
        {row.status !== "DRAFT" && <a href={link} target="_blank" rel="noopener" className="btn-ghost btn">Preview</a>}
      </div>
    </Card>
  );
}

function InvoiceActions({ row, reload }: { row: any; reload: () => void }) {
  const toast = useToast();
  const s = useSession();
  const t = useT();
  const [pay, setPay] = useState(false);
  const [amount, setAmount] = useState(String(Math.max(0, Number(row.total) - Number(row.amountPaid))));
  const [method, setMethod] = useState("CARD");
  const [busy, setBusy] = useState(false);
  const link = `${location.origin}/pay/${row.publicToken}`;
  return (
    <Card title="Get paid" eyebrow="Invoice">
      <div className="flex flex-wrap gap-2">
        <Button variant="pri" loading={busy} onClick={async () => { setBusy(true); try { await api(`/api/invoices/${row.id}/send`, { body: {} }); toast("Invoice emailed with a pay-online link"); reload(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } }}><Send className="h-4 w-4" />Email invoice</Button>
        <Button onClick={() => setPay(true)}><CreditCard className="h-4 w-4" />Record payment</Button>
        <Button variant="ghost" onClick={async () => { if (await copyText(link)) toast(t("common.copied")); }}><Link2 className="h-4 w-4" />Copy pay link</Button>
      </div>
      <Modal open={pay} onClose={() => setPay(false)} title="Record a payment" footer={<Button variant="pri" loading={busy} onClick={async () => { setBusy(true); try { await api(`/api/invoices/${row.id}/payment`, { body: { amount: Number(amount), method } }); toast("Payment recorded"); setPay(false); reload(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } }}>{t("common.save")}</Button>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Amount (${s.org?.currency})`}><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value)} options={["CARD", "CASH", "BANK_TRANSFER", "E_TRANSFER", "CHEQUE"]} /></Field>
        </div>
      </Modal>
    </Card>
  );
}

function CampaignActions({ row, reload }: { row: any; reload: () => void }) {
  const toast = useToast();
  const s = useSession();
  const [busy, setBusy] = useState(false);
  if (row.status === "SENT") return null;
  return (
    <Card title="Send campaign" eyebrow="Marketing">
      <Callout>Only contacts who agreed to hear from you get this, and every message includes an unsubscribe link.</Callout>
      {isManagerRole(s.role) && <Button className="mt-4" variant="pri" loading={busy} onClick={async () => { setBusy(true); try { const r = await api(`/api/campaigns/${row.id}/send`, { body: {} }); toast(`Sent to ${r.sent} of ${r.eligible} eligible contacts`); reload(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } }}><Send className="h-4 w-4" />Send now</Button>}
    </Card>
  );
}

function ReviewReply({ row, reload }: { row: any; reload: () => void }) {
  const toast = useToast();
  const [text, setText] = useState(row.reply ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <Card title={row.reply ? "Your reply" : "Reply to this review"} eyebrow={row.source === "GOOGLE" ? "Posts to Google when connected" : "Reviews"}>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Thank the customer and address what they said…" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button loading={busy === "draft"} onClick={async () => { setBusy("draft"); try { const r = await api(`/api/reviews/${row.id}/draft`, { body: {} }); setText(r.text); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(null); } }}><Sparkles className="h-4 w-4" />Draft with AI</Button>
        <Button variant="pri" disabled={text.trim().length < 2} loading={busy === "post"} onClick={async () => { setBusy("post"); try { await api(`/api/reviews/${row.id}/reply`, { body: { reply: text } }); toast("Reply posted"); reload(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(null); } }}><Send className="h-4 w-4" />Post reply</Button>
      </div>
    </Card>
  );
}

function RunMonitor({ row }: { row: any }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  return (
    <Card title="Check now" eyebrow="Monitor">
      <Button loading={busy} onClick={async () => { setBusy(true); try { setRes(await api(`/api/monitors/${row.id}/run`, { body: {} })); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } }}><Play className="h-4 w-4" />Run check</Button>
      {res && <pre className="mt-3 overflow-x-auto rounded-xl bg-bg p-3 font-mono text-xs">{JSON.stringify(res, null, 2)}</pre>}
    </Card>
  );
}

function ReceivePo({ row, reload }: { row: any; reload: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (row.status === "RECEIVED") return null;
  return (
    <Card title="Receive delivery" eyebrow="Purchasing">
      <p className="mb-3 text-sm text-muted">Marks the order received and adds the items to stock.</p>
      <Button variant="pri" loading={busy} onClick={async () => { setBusy(true); try { await api(`/api/purchasing/${row.id}/receive`, { body: {} }); toast("Received and stock updated"); reload(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } }}><PackageCheck className="h-4 w-4" />Mark received</Button>
    </Card>
  );
}

function LeaveDecision({ row, reload }: { row: any; reload: () => void }) {
  const s = useSession();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const ctx = useApi<any>(row.status === "PENDING" && isManagerRole(s.role) ? `/api/time/leave/${row.id}` : null);
  if (row.status !== "PENDING" || !isManagerRole(s.role)) return null;
  const c = ctx.data;
  const decide = async (decision: "APPROVED" | "REJECTED") => {
    setBusy(decision);
    try { const r = await api(`/api/time/leave/${row.id}`, { body: { decision, note: note || undefined } }); toast(decision === "APPROVED" ? `Approved${r.shiftsOpened ? `, ${r.shiftsOpened} shift(s) opened for cover` : ""}` : "Not approved"); reload(); }
    catch (e: any) { toast(e.message, "err"); } finally { setBusy(null); }
  };
  return (
    <Card title="Decide" eyebrow="Leave request">
      {c && (
        <ul className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
          <li className="rounded-xl bg-bg p-3"><small className="block text-muted">Hours requested</small><b>{c.hours} h</b></li>
          <li className="rounded-xl bg-bg p-3"><small className="block text-muted">Balance after</small><b className={c.balanceAfter < 0 ? "text-crit" : ""}>{c.balanceAfter ?? "–"} h</b></li>
          <li className="rounded-xl bg-bg p-3"><small className="block text-muted">Shifts affected</small><b>{c.shiftsAffected.length}</b>{c.shiftsAffected.length > 0 && <small className="block text-muted">They become open shifts for cover.</small>}</li>
          <li className="rounded-xl bg-bg p-3"><small className="block text-muted">Also off then</small><b>{c.othersOff.length ? c.othersOff.join(", ") : "Nobody"}</b></li>
        </ul>
      )}
      <Field label="Note to the employee (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="mt-3 flex gap-2"><Button variant="pri" loading={busy === "APPROVED"} onClick={() => decide("APPROVED")}>Approve</Button><Button loading={busy === "REJECTED"} onClick={() => decide("REJECTED")}>Not approved</Button></div>
    </Card>
  );
}
