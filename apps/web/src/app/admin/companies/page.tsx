"use client";
import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { ago, date, num } from "@/lib/format";
import { Badge, Button, Card, ErrorNote, Field, Input, Loading, Modal, PageHeader, Select, Tabs, Toggle, Avatar, humanize, useToast } from "@/components/ui";
import { CompanyMark, VerifiedTick } from "@/components/logo";
import { Pager, SearchBox, Table, cents, useDebounced } from "../bits";

type Org = { id: string; name: string; slug: string; industry: string; country: string; planKey: string; billingInterval: string; subscriptionStatus: string; trialEndsAt: string | null; verificationStatus: string; adBalanceCents: number; createdAt: string; _count: { memberships: number; employees: number } };
const STATUSES = ["", "TRIALING", "ACTIVE", "PAST_DUE", "PAUSED", "CANCELED"] as const;

export default function Companies() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const { data, error, reload } = useApi<{ data: Org[]; total: number; pages: number }>(`/api/admin/orgs?page=${page}&q=${encodeURIComponent(dq)}${status ? `&status=${status}` : ""}`);
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Customers" title="Companies" sub={data ? `${num(data.total)} companies on OENOD` : undefined} />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Name, link or email" />
        <Tabs value={status} onChange={(s) => { setStatus(s); setPage(1); }} tabs={STATUSES.map((s) => ({ key: s, label: s ? humanize(s) : "All" }))} />
      </div>
      <Card pad={false}>
        {error ? <div className="p-5"><ErrorNote error={error} onRetry={reload} /></div> : !data ? <div className="p-5"><Loading /></div> : (
          <>
            <Table head={["Company", "Plan", "Status", "People", "Ad wallet", "Joined"]} empty={!data.data.length}>
              {data.data.map((o) => (
                <tr key={o.id} onClick={() => setOpenId(o.id)} className="cursor-pointer hover:bg-bg/60">
                  <td className="px-5 py-3"><span className="flex items-center gap-2.5"><CompanyMark name={o.name} size={30} /><span className="min-w-0"><b className="flex items-center gap-1">{o.name}{o.verificationStatus === "VERIFIED" && <VerifiedTick className="h-3.5 w-3.5" />}</b><small className="text-muted">{humanize(o.industry)} · {o.country}</small></span></span></td>
                  <td className="px-5 py-3">{humanize(o.planKey)}<small className="block text-muted">{o.billingInterval === "year" ? "Yearly" : "Monthly"}</small></td>
                  <td className="px-5 py-3"><Badge status={o.subscriptionStatus} />{o.subscriptionStatus === "TRIALING" && o.trialEndsAt && <small className="block text-muted">ends {date(o.trialEndsAt)}</small>}</td>
                  <td className="px-5 py-3 tabular-nums">{o._count.memberships} users · {o._count.employees} staff</td>
                  <td className="px-5 py-3 tabular-nums">{cents(o.adBalanceCents)}</td>
                  <td className="px-5 py-3 text-muted">{ago(o.createdAt)}</td>
                </tr>
              ))}
            </Table>
            <Pager page={page} pages={data.pages} onPage={setPage} />
          </>
        )}
      </Card>
      {openId && <OrgModal id={openId} onClose={() => setOpenId(null)} onSaved={reload} />}
    </div>
  );
}

function OrgModal({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { data: o, reload } = useApi<any>(`/api/admin/orgs/${id}`);
  const { data: plans } = useApi<{ data: { key: string; name: string }[] }>("/api/admin/plans");
  const [credit, setCredit] = useState("");
  const [trial, setTrial] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (patch: Record<string, unknown>, msg = "Saved") => {
    setBusy(true);
    try { await api(`/api/admin/orgs/${id}`, { method: "PATCH", body: patch }); toast(msg, "ok"); reload(); onSaved(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} wide title={o?.name ?? "Company"}>
      {!o ? <Loading /> : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <CompanyMark name={o.name} logoUrl={o.logoUrl} size={48} />
            <div className="min-w-0 flex-1"><b className="flex items-center gap-1 font-display text-lg">{o.name}{o.verificationStatus === "VERIFIED" && <VerifiedTick />}</b><small className="text-muted">{o.email ?? "No billing email"} · joined {date(o.createdAt)}</small></div>
            {o.publicProfile && <Link href={`/companies/${o.slug}`} target="_blank" className="btn btn-sm"><ExternalLink className="h-3.5 w-3.5" />Public profile</Link>}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Employees", o._count.employees], ["Contacts", o._count.contacts], ["Invoices", o._count.invoices], ["Projects", o._count.projects]].map(([l, v]) => <div key={l} className="rounded-xl bg-bg p-3"><small className="text-muted">{l}</small><b className="block font-display text-xl">{num(v)}</b></div>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan"><Select value={o.planKey} disabled={busy} onChange={(e) => save({ planKey: e.target.value }, "Plan changed")} options={(plans?.data ?? []).map((p) => ({ value: p.key, label: p.name }))} /></Field>
            <Field label="Subscription"><Select value={o.subscriptionStatus} disabled={busy} onChange={(e) => save({ subscriptionStatus: e.target.value }, "Status changed")} options={STATUSES.filter(Boolean).map((s) => ({ value: s, label: humanize(s) }))} /></Field>
            <Field label="Verified badge"><Select value={o.verificationStatus} disabled={busy} onChange={(e) => save({ verificationStatus: e.target.value })} options={["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"].map((s) => ({ value: s, label: humanize(s) }))} /></Field>
            <Field label="Public profile"><Toggle checked={o.publicProfile} disabled={busy} onChange={(v) => save({ publicProfile: v })} label={o.publicProfile ? "Listed in the directory" : "Hidden"} /></Field>
            <Field label="Trial ends" help={o.trialEndsAt ? `Currently ${date(o.trialEndsAt)}` : "No trial date set"}>
              <div className="flex gap-2"><Input type="date" value={trial} onChange={(e) => setTrial(e.target.value)} /><Button disabled={!trial || busy} onClick={() => save({ trialEndsAt: new Date(trial + "T23:59:00").toISOString() }, "Trial updated")}>Set</Button></div>
            </Field>
            <Field label="Ad wallet" help={`Balance ${cents(o.adBalanceCents)}. Use a minus sign to remove credit.`}>
              <div className="flex gap-2"><Input type="number" step="0.01" placeholder="25.00" value={credit} onChange={(e) => setCredit(e.target.value)} /><Button disabled={!Number(credit) || busy} onClick={() => { save({ adCreditCents: Math.round(Number(credit) * 100), note: "Credit from OENOD" }, "Wallet adjusted"); setCredit(""); }}>Apply</Button></div>
            </Field>
          </div>
          <section>
            <h3 className="h3 mb-2">People</h3>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {o.memberships.map((m: any) => <li key={m.id} className="flex items-center gap-3 px-3 py-2.5"><Avatar name={m.user.name} size={28} /><span className="min-w-0 flex-1"><b className="block truncate text-[13.5px]">{m.user.name}</b><small className="text-muted">{m.user.email}</small></span><Badge>{humanize(m.role)}</Badge><small className="w-20 text-end text-muted">{ago(m.user.lastSeenAt)}</small></li>)}
            </ul>
          </section>
          {o.usage?.length > 0 && <section><h3 className="h3 mb-2">Usage, last 30 days</h3><div className="flex flex-wrap gap-2">{o.usage.map((u: any) => <span key={u.metric} className="chip">{humanize(u.metric)}: {num(u.quantity)}</span>)}</div></section>}
          {o.audit?.length > 0 && (
            <section><h3 className="h3 mb-2">Recent activity</h3>
              <ul className="max-h-60 space-y-1 overflow-y-auto text-[12.5px]">{o.audit.map((a: any) => <li key={a.id} className="flex gap-3"><span className="w-20 shrink-0 text-muted">{ago(a.createdAt)}</span><span className="font-mono">{a.action}</span><span className="text-muted">{a.actor}</span></li>)}</ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
