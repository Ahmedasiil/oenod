"use client";
import { useState } from "react";
import { BadgeCheck, CheckCircle2, XCircle, FileText, Globe, Mail, ExternalLink } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { ago, date } from "@/lib/format";
import { Badge, Empty, ErrorNote, Loading, PageHeader, Tabs, cx, useToast } from "@/components/ui";
import { CompanyMark } from "@/components/logo";
import { Decide } from "../review";

type Check = { name: string; passed: boolean; note?: string };
type V = { id: string; legalName: string; businessNumber: string; registry: string | null; country: string; address: Record<string, string> | null; website: string | null; phone: string; contactName: string; contactTitle: string | null; domainEmail: string | null; emailVerifiedAt: string | null; aiScore: number | null; aiRecommendation: string | null; aiReport: { checks?: Check[]; summary?: string; risks?: string[] } | null; status: string; reviewNote: string | null; submittedAt: string; org: { id: string; name: string; slug: string; logoUrl: string | null; website: string | null; createdAt: string }; documents: { id: string; name: string; kind: string }[] };

export default function Verifications() {
  const toast = useToast();
  const [tab, setTab] = useState("");
  const { data, error, reload } = useApi<{ data: V[] }>(`/api/admin/verifications${tab ? `?status=${tab}` : ""}`);
  const decide = async (id: string, decision: string, note?: string) => {
    try { await api(`/api/admin/verifications/${id}`, { body: { decision, note } }); toast("Decision saved and the company was notified", "ok"); reload(); } catch (e: any) { toast(e.message, "err"); }
  };
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Customers" title="Verified badge requests" sub="The AI checks each request first. You make the final call; the blue badge only appears after you approve." />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "", label: "Waiting" }, { key: "VERIFIED", label: "Approved" }, { key: "REJECTED", label: "Rejected" }]} />
      {error ? <ErrorNote error={error} onRetry={reload} /> : !data ? <Loading /> : !data.data.length ? <Empty icon={<BadgeCheck className="h-6 w-6" />} title="No requests here" /> : (
        <div className="grid gap-4">
          {data.data.map((v) => (
            <article key={v.id} className="card overflow-hidden">
              <header className="flex flex-wrap items-center gap-3 border-b border-line p-5">
                <CompanyMark name={v.org.name} logoUrl={v.org.logoUrl} size={44} />
                <div className="min-w-0 flex-1"><b className="block font-display text-[17px]">{v.org.name}</b><small className="text-muted">Submitted {ago(v.submittedAt)} · on OENOD since {date(v.org.createdAt)}</small></div>
                {v.aiScore != null && <div className="text-end"><div className={cx("font-display text-2xl font-semibold", v.aiScore >= 75 ? "text-[#1FAF6B]" : v.aiScore >= 50 ? "text-warn" : "text-crit")}>{v.aiScore}</div><small className="text-[11px] text-muted">AI score</small></div>}
                <Badge status={v.status} />
              </header>
              <div className="grid gap-6 p-5 lg:grid-cols-2">
                <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13.5px]">
                  {[["Legal name", v.legalName], ["Business number", v.businessNumber], ["Registry", v.registry ?? "—"], ["Country", v.country], ["Address", v.address ? Object.values(v.address).filter(Boolean).join(", ") : "—"], ["Contact", `${v.contactName}${v.contactTitle ? `, ${v.contactTitle}` : ""}`], ["Phone", v.phone]].map(([k, val]) => <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="min-w-0 break-words font-semibold">{val}</dd></div>)}
                  <dt className="text-muted">Website</dt><dd>{v.website ? <a href={v.website} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-semibold text-blue"><Globe className="h-3.5 w-3.5" />{v.website.replace(/^https?:\/\//, "")}<ExternalLink className="h-3 w-3" /></a> : "—"}</dd>
                  <dt className="text-muted">Domain email</dt><dd className="flex items-center gap-1.5 font-semibold"><Mail className="h-3.5 w-3.5" />{v.domainEmail ?? "—"}{v.emailVerifiedAt && <Badge tone="green">Confirmed</Badge>}</dd>
                </dl>
                <div className="space-y-3">
                  {v.aiReport?.summary && <p className="rounded-xl bg-sky/60 p-3 text-[13.5px]"><b>AI review: </b>{v.aiReport.summary}{v.aiRecommendation && <> Recommends <b>{v.aiRecommendation.toLowerCase()}</b>.</>}</p>}
                  {v.aiReport?.checks?.length ? <ul className="space-y-1.5 text-[13px]">{v.aiReport.checks.map((c) => <li key={c.name} className="flex gap-2">{c.passed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1FAF6B]" /> : <XCircle className="h-4 w-4 shrink-0 text-crit" />}<span><b>{c.name}</b>{c.note && <span className="text-muted"> · {c.note}</span>}</span></li>)}</ul> : null}
                  {v.aiReport?.risks?.length ? <p className="text-[13px] text-crit">Risks: {v.aiReport.risks.join("; ")}</p> : null}
                  <div className="flex flex-wrap gap-2">{v.documents.map((d) => <a key={d.id} href={`/api/admin/verifications/${v.id}/documents/${d.id}`} target="_blank" rel="noreferrer" className="chip bg-paper px-3 py-1.5"><FileText className="h-3.5 w-3.5" />{d.name}</a>)}{!v.documents.length && <small className="text-muted">No documents uploaded.</small>}</div>
                </div>
              </div>
              {["SUBMITTED", "AI_CHECKED", "NEEDS_INFO"].includes(v.status) && (
                <footer className="border-t border-line bg-bg/50 p-5">
                  <Decide onDecide={(k, n) => decide(v.id, k, n)} options={[{ key: "needs_info", label: "Ask for more information", needsNote: true }, { key: "reject", label: "Reject", needsNote: true }, { key: "approve", label: "Approve badge", primary: true }]} />
                </footer>
              )}
              {v.reviewNote && <p className="border-t border-line px-5 py-3 text-[13px] text-muted">Note: {v.reviewNote}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
