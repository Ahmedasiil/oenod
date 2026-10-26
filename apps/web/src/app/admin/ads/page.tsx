"use client";
import { useState } from "react";
import { Megaphone, Sparkles } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { ago, num } from "@/lib/format";
import { Badge, Empty, ErrorNote, Loading, PageHeader, Tabs, useToast, humanize } from "@/components/ui";
import { CompanyMark, VerifiedTick } from "@/components/logo";
import { Decide } from "../review";
import { cents } from "../bits";

type Ad = { id: string; name: string; status: string; headline: string; body: string; imageUrl: string | null; imageMime: string | null; ctaLabel: string; destinationUrl: string; placements: string[]; pricing: string; bidCents: number; dailyBudgetCents: number; spentCents: number; impressions: number; clicks: number; reviewNote: string | null; updatedAt: string; org: { id: string; name: string; verificationStatus: string }; ai: { summary: string; kind: string; payload: { issues?: string[] } } | null };

export default function AdsReview() {
  const toast = useToast();
  const [tab, setTab] = useState("REVIEW");
  const { data, error, reload } = useApi<{ data: Ad[] }>(`/api/admin/ads?status=${tab}`);
  const decide = async (id: string, decision: string, note?: string) => {
    try { await api(`/api/admin/ads/${id}`, { body: { decision, note } }); toast("Saved and the advertiser was notified", "ok"); reload(); } catch (e: any) { toast(e.message, "err"); }
  };
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Grow" title="Ads review" sub="Every ad is checked before it runs. Ads show across OENOD labelled Sponsored." />
      <Tabs value={tab} onChange={setTab} tabs={["REVIEW", "ACTIVE", "PAUSED", "REJECTED"].map((k) => ({ key: k, label: k === "REVIEW" ? "Waiting" : humanize(k) }))} />
      {error ? <ErrorNote error={error} onRetry={reload} /> : !data ? <Loading /> : !data.data.length ? <Empty icon={<Megaphone className="h-6 w-6" />} title="No ads here" /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.data.map((a) => (
            <article key={a.id} className="card flex flex-col overflow-hidden">
              <header className="flex items-center gap-2.5 border-b border-line px-4 py-3"><CompanyMark name={a.org.name} size={28} /><b className="flex flex-1 items-center gap-1 text-[13.5px]">{a.org.name}{a.org.verificationStatus === "VERIFIED" && <VerifiedTick className="h-3.5 w-3.5" />}</b><Badge status={a.status} /></header>
              <div className="m-4 overflow-hidden rounded-2xl border border-line">
                {(a.imageUrl || a.imageMime) && <img src={a.imageUrl ?? `/api/ads/${a.id}/image`} alt="" className="aspect-[1.91/1] w-full object-cover" />}
                <div className="p-4"><span className="font-mono text-[10px] uppercase tracking-wider text-muted">Sponsored</span><b className="mt-1 block font-display text-[16px]">{a.headline}</b><p className="mt-1 text-[13.5px] text-[#353C57]">{a.body}</p><div className="mt-3 flex items-center justify-between"><span className="btn-pri btn-sm pointer-events-none">{a.ctaLabel}</span><small className="max-w-[55%] truncate text-muted">{a.destinationUrl}</small></div></div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 text-[12.5px] text-muted"><span>{a.placements.map(humanize).join(", ")}</span><span>{a.pricing} {cents(a.bidCents)}</span><span>{cents(a.dailyBudgetCents)} a day</span>{a.impressions > 0 && <span>{num(a.impressions)} views · {num(a.clicks)} clicks · {cents(a.spentCents)} spent</span>}<span>{ago(a.updatedAt)}</span></div>
              {a.ai && <p className="mx-4 mt-3 flex gap-2 rounded-xl bg-sky/60 p-3 text-[13px]"><Sparkles className="h-4 w-4 shrink-0 text-blue" /><span><b>AI suggests {a.ai.kind === "approve_ad" ? "approving" : "rejecting"}.</b> {a.ai.summary}</span></p>}
              {a.reviewNote && <p className="mx-4 mt-3 text-[13px] text-muted">Note: {a.reviewNote}</p>}
              <div className="mt-auto p-4">
                {a.status === "REVIEW" ? <Decide onDecide={(k, n) => decide(a.id, k, n)} options={[{ key: "reject", label: "Ask for changes", needsNote: true }, { key: "approve", label: "Approve", primary: true }]} />
                  : a.status === "ACTIVE" ? <Decide onDecide={(k, n) => decide(a.id, k, n)} options={[{ key: "pause", label: "Pause this ad", needsNote: true }]} />
                  : <Decide onDecide={(k, n) => decide(a.id, k, n)} options={[{ key: "approve", label: "Approve and run", primary: true }]} />}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
