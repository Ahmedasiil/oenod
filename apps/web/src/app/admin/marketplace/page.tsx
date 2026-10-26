"use client";
import { useState } from "react";
import { Puzzle, ExternalLink } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { ago } from "@/lib/format";
import { Badge, Empty, ErrorNote, Loading, PageHeader, Tabs, Toggle, humanize, useToast } from "@/components/ui";
import { VerifiedTick } from "@/components/logo";
import { Decide } from "../review";
import { cents } from "../bits";

type Plugin = { id: string; slug: string; name: string; tagline: string; description: string; category: string; developer: string; website: string | null; supportEmail: string | null; color: string; manifest: { scopes?: string[]; events?: string[]; webhookUrl?: string; embed?: { url: string; placement: string } }; priceCents: number; status: string; verified: boolean; featured: boolean; installs: number; reviewNote: string | null; updatedAt: string; publisher: { name: string; verificationStatus: string } | null };

export default function Marketplace() {
  const toast = useToast();
  const [tab, setTab] = useState("REVIEW");
  const { data, error, reload } = useApi<{ data: Plugin[] }>(`/api/admin/marketplace?status=${tab}`);
  const decide = async (id: string, body: Record<string, unknown>) => {
    try { await api(`/api/admin/marketplace/${id}`, { body }); toast("Saved", "ok"); reload(); } catch (e: any) { toast(e.message, "err"); }
  };
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Grow" title="Plugin marketplace" sub="Developers submit plugins here. Check what each one asks for before it reaches customers." />
      <Tabs value={tab} onChange={setTab} tabs={["REVIEW", "PUBLISHED", "REJECTED", "DRAFT"].map((k) => ({ key: k, label: k === "REVIEW" ? "Waiting" : humanize(k) }))} />
      {error ? <ErrorNote error={error} onRetry={reload} /> : !data ? <Loading /> : !data.data.length ? <Empty icon={<Puzzle className="h-6 w-6" />} title="No plugins here" body="Submitted plugins appear here for review." /> : (
        <div className="grid gap-4">
          {data.data.map((p) => (
            <article key={p.id} className="card overflow-hidden">
              <header className="flex flex-wrap items-center gap-3 border-b border-line p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl font-display text-lg font-bold text-white" style={{ background: p.color }}>{p.name.charAt(0)}</span>
                <div className="min-w-0 flex-1"><b className="flex items-center gap-1 font-display text-[17px]">{p.name}{p.verified && <VerifiedTick className="h-4 w-4" />}</b><small className="text-muted">{p.tagline} · by {p.developer}{p.publisher ? ` (${p.publisher.name})` : ""} · {ago(p.updatedAt)}</small></div>
                <span className="text-[13px] font-semibold">{p.priceCents ? `${cents(p.priceCents)} / month` : "Free"}</span>
                <Badge status={p.status} />
              </header>
              <div className="grid gap-5 p-5 md:grid-cols-2">
                <p className="whitespace-pre-line text-[13.5px] text-[#353C57]">{p.description}</p>
                <div className="space-y-3 text-[13px]">
                  <div><b className="mb-1 block text-[12px] uppercase tracking-wide text-muted">Asks for</b><div className="flex flex-wrap gap-1.5">{(p.manifest.scopes ?? []).map((s) => <span key={s} className={s.endsWith(":write") ? "chip border-[#FFD98A] bg-[#FFF8E6]" : "chip"}>{s}</span>)}{!p.manifest.scopes?.length && <span className="text-muted">No data access</span>}</div></div>
                  {p.manifest.events?.length ? <div><b className="mb-1 block text-[12px] uppercase tracking-wide text-muted">Events</b><span className="font-mono text-[12px]">{p.manifest.events.join(", ")}</span></div> : null}
                  {p.manifest.webhookUrl && <div className="truncate"><b className="text-muted">Webhook </b><span className="font-mono text-[12px]">{p.manifest.webhookUrl}</span></div>}
                  {p.manifest.embed && <div className="truncate"><b className="text-muted">Embed ({p.manifest.embed.placement}) </b><span className="font-mono text-[12px]">{p.manifest.embed.url}</span></div>}
                  <div className="flex gap-3">{p.website && <a href={p.website} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-semibold text-blue">Website<ExternalLink className="h-3 w-3" /></a>}{p.supportEmail && <span className="text-muted">{p.supportEmail}</span>}</div>
                </div>
              </div>
              <footer className="flex flex-wrap items-end gap-4 border-t border-line bg-bg/50 p-5">
                {p.status === "PUBLISHED" && <div className="flex gap-4"><Toggle checked={p.verified} onChange={(v) => decide(p.id, { decision: "publish", verified: v })} label="Verified" /><Toggle checked={p.featured} onChange={(v) => decide(p.id, { decision: "publish", featured: v })} label="Featured" /></div>}
                <div className="min-w-[280px] flex-1">
                  <Decide onDecide={(k, note) => decide(p.id, { decision: k, note })} options={p.status === "PUBLISHED" ? [{ key: "unpublish", label: "Unpublish", needsNote: true }] : [{ key: "reject", label: "Reject", needsNote: true }, { key: "publish", label: "Publish", primary: true }]} />
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
