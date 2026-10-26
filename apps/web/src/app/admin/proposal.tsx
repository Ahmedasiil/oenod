"use client";
import { useState } from "react";
import { Check, X, Sparkles, ChevronDown } from "lucide-react";
import { api } from "@/lib/client/api";
import { ago } from "@/lib/format";
import { Badge, Button, Textarea, cx, humanize, useToast } from "@/components/ui";

export type Action = { id: string; kind: string; title: string; summary: string; payload: Record<string, unknown>; status: string; proposedBy: string; decidedBy?: string | null; error?: string | null; createdAt: string; decidedAt?: string | null };

const show = (v: unknown) => (v == null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** One AI proposal. Nothing runs until a super admin approves it here. */
export function ProposalCard({ a, onDone }: { a: Action; onDone?: (a: Action | null) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(a.status === "PROPOSED");
  const decide = async (decision: "approve" | "reject") => {
    setBusy(decision);
    try {
      const r = await api(`/api/admin/actions/${a.id}`, { body: { decision, note: note || undefined } });
      toast(decision === "approve" ? "Approved and done" : "Rejected", decision === "approve" ? "ok" : "info");
      onDone?.(decision === "approve" ? r : { ...a, status: "REJECTED" });
    } catch (e: any) { toast(e.message, "err"); onDone?.(null); } finally { setBusy(null); }
  };
  const entries = Object.entries(a.payload ?? {}).filter(([k]) => k !== "note");
  return (
    <div className={cx("card overflow-hidden", a.status === "PROPOSED" && "border-blue/30")}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 p-4 text-start">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky text-blue"><Sparkles className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><b className="block text-[14px]">{a.title}</b><small className="text-[12px] text-muted">{humanize(a.kind)} · {a.proposedBy === "AI" ? "proposed by AI" : a.proposedBy} · {ago(a.createdAt)}</small></span>
        <Badge status={a.status} />
        <ChevronDown className={cx("h-4 w-4 shrink-0 text-muted transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
          <p className="text-[13.5px] leading-6 text-[#353C57]">{a.summary}</p>
          {entries.length > 0 && (
            <dl className="grid gap-x-4 gap-y-1.5 rounded-xl bg-bg p-3 text-[12.5px] sm:grid-cols-[140px_minmax(0,1fr)]">
              {entries.map(([k, v]) => <div key={k} className="contents"><dt className="font-semibold text-muted">{humanize(k)}</dt><dd className="min-w-0 break-words font-mono">{show(v)}</dd></div>)}
            </dl>
          )}
          {a.error && <p className="rounded-xl bg-[#FFF5F7] px-3 py-2 text-[13px] text-crit">{a.error}</p>}
          {a.decidedBy && <p className="text-[12px] text-muted">{a.status === "REJECTED" ? "Rejected" : "Approved"} by {a.decidedBy} {ago(a.decidedAt)}</p>}
          {(a.status === "PROPOSED" || a.status === "FAILED") && (
            <>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note (sent with a rejection, or added to the action)" />
              <div className="flex flex-wrap justify-end gap-2">
                {a.status === "PROPOSED" && <Button size="sm" variant="ghost" loading={busy === "reject"} disabled={!!busy} onClick={() => decide("reject")}><X className="h-4 w-4" />Reject</Button>}
                <Button size="sm" variant="pri" loading={busy === "approve"} disabled={!!busy} onClick={() => decide("approve")}><Check className="h-4 w-4" />{a.status === "FAILED" ? "Try again" : "Approve and run"}</Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
