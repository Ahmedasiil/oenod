"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, OctagonX, FlaskConical, MessageSquare, Plus } from "lucide-react";
import { AI_WORKERS } from "@/lib/modules";
import { api, useApi } from "@/lib/client/api";
import { AiChat } from "@/components/ai-chat";
import { ResourceTable } from "@/components/resource";
import { useSession, isManagerRole } from "@/components/session";
import { useT } from "@/components/i18n";
import { Badge, Button, Card, Empty, Loading, PageHeader, Tabs, Toggle, cx, useToast } from "@/components/ui";

type Tab = "chat" | "approvals" | "activity" | "rules" | "team";

export default function AiCentre() {
  const sp = useSearchParams();
  const s = useSession();
  const t = useT();
  const [tab, setTab] = useState<Tab>((sp.get("tab") as Tab) || "chat");
  const actions = useApi<any>("/api/ai/actions", { refreshMs: 30_000 });
  const waiting = actions.data?.counts?.NEEDS_APPROVAL ?? 0;
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Workspace" title={t("modules.ai")} sub="Ask once. It plans the work, does what your rules allow and brings you only the decisions that need you." />
      {actions.data && <Controls data={actions.data} reload={actions.reload} />}
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { key: "chat", label: "Ask" }, { key: "approvals", label: "Approvals", count: waiting }, { key: "activity", label: "Activity" },
        ...(isManagerRole(s.role) ? [{ key: "rules" as Tab, label: "Rules" }] : []), { key: "team", label: "AI team" },
      ]} />
      {tab === "chat" && <Chat />}
      {tab === "approvals" && <ActionList status="NEEDS_APPROVAL" onChange={actions.reload} />}
      {tab === "activity" && <ActionList onChange={actions.reload} />}
      {tab === "rules" && <div className="space-y-3"><p className="text-sm text-muted">Each rule says what the AI may do on its own (Auto), prepare for your approval (Approve) or only suggest (Assist). Payroll, payments, campaigns and access changes always need a person.</p><ResourceTable resource="automations" /></div>}
      {tab === "team" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AI_WORKERS.map((w, i) => (
            <div key={w.key} className="card p-4">
              <div className="flex items-center gap-2 text-[13px] font-bold"><i className={cx("h-2 w-2 rounded-full", i % 3 === 0 ? "animate-pulse bg-ok" : "bg-blue")} />{w.name}</div>
              <p className="mt-1.5 text-xs leading-5 text-muted">{w.does}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Controls({ data, reload }: { data: any; reload: () => void }) {
  const s = useSession();
  const toast = useToast();
  const can = isManagerRole(s.role);
  const set = async (body: any) => { try { await api("/api/ai/control", { body }); reload(); toast("Saved"); } catch (e: any) { toast(e.message, "err"); } };
  return (
    <div className={cx("card flex flex-wrap items-center gap-x-6 gap-y-3 p-4", data.paused && "border-[#F3C5CD] bg-[#FFF5F7]")}>
      <div className="flex items-center gap-2 text-sm font-bold">{data.paused ? <><OctagonX className="h-5 w-5 text-crit" />Emergency stop is on: nothing runs automatically</> : <><Sparkles className="h-5 w-5 text-blue" />AI is working</>}</div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
        Default:
        {(["ASSIST", "APPROVE", "AUTO"] as const).map((a) => (
          <button key={a} disabled={!can} onClick={() => set({ autonomy: a })} className={cx("rounded-full border px-3 py-1 font-bold", data.autonomy === a ? "border-navy bg-navy text-white" : "border-line bg-paper text-muted")}>{a === "ASSIST" ? "Suggest only" : a === "APPROVE" ? "Ask me first" : "Do it automatically"}</button>
        ))}
      </div>
      <div className="ms-auto flex flex-wrap items-center gap-4">
        <Toggle checked={data.simulation} disabled={!can} onChange={(v) => set({ simulation: v })} label={<span className="inline-flex items-center gap-1.5"><FlaskConical className="h-4 w-4" />Simulation</span>} />
        {can && <Button variant={data.paused ? "pri" : "danger"} size="sm" onClick={() => set({ paused: !data.paused })}>{data.paused ? "Resume automations" : "Emergency stop"}</Button>}
      </div>
    </div>
  );
}

function Chat() {
  const ask = useSearchParams().get("ask")?.slice(0, 500) ?? undefined;
  const convos = useApi<any[]>("/api/ai/conversations");
  const [active, setActive] = useState<string | undefined>();
  const [n, setN] = useState(0);
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="card hidden h-[68vh] flex-col p-2 lg:flex">
        <Button variant="ghost" className="justify-start" onClick={() => { setActive(undefined); setN((x) => x + 1); }}><Plus className="h-4 w-4" />New conversation</Button>
        <div className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {convos.data?.map((c) => <button key={c.id} onClick={() => { setActive(c.id); setN((x) => x + 1); }} className={cx("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-[13px]", active === c.id ? "bg-sky text-navy" : "hover:bg-bg")}><MessageSquare className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{c.title}</span></button>)}
        </div>
      </div>
      <div className="card h-[68vh] p-4">
        <AiChat key={n} initialConversationId={active} initialPrompt={n === 0 ? ask : undefined} suggestions={[
          "What needs my attention today?", "Build next week's schedule and flag gaps", "Send reminders for overdue invoices", "Which products should I reorder?",
          "Summarize this month's sales by location", "Draft a job post for a barista", "Which projects are at risk and why?", "Reply to our latest reviews",
        ]} />
      </div>
    </div>
  );
}

function ActionList({ status, onChange }: { status?: string; onChange: () => void }) {
  const t = useT();
  const toast = useToast();
  const s = useSession();
  const { data, loading, reload } = useApi<any>(`/api/ai/actions${status ? `?status=${status}` : ""}`);
  const [busy, setBusy] = useState<string | null>(null);
  const decide = async (id: string, decision: string) => {
    setBusy(id + decision);
    try { const r = await api(`/api/ai/actions/${id}`, { body: { decision } }); toast(decision === "reject" ? "Rejected" : r.status === "COMPLETED" ? "Done" : r.error ?? r.status, r.status === "FAILED" ? "err" : "ok"); reload(); onChange(); }
    catch (e: any) { toast(e.message, "err"); } finally { setBusy(null); }
  };
  if (loading && !data) return <Loading />;
  if (!data?.data.length) return <Empty icon={<Sparkles className="h-5 w-5" />} title={status ? "Nothing waiting for approval" : "No AI activity yet"} body="Ask the AI to do something and it shows up here." />;
  return (
    <div className="space-y-2">
      {data.data.map((a: any) => (
        <Card key={a.id} pad={false} className="p-4">
          <div className="flex flex-wrap items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky text-navy"><Sparkles className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><b className="text-[14px]">{a.title}</b><Badge status={a.status} /><span className="font-mono text-[10.5px] text-muted">{a.worker} · {t.ago(a.createdAt)}</span></div>
              {a.reason && <p className="mt-1 text-[13px] text-muted">{a.reason}</p>}
              {a.error && <p className="mt-1 text-[13px] text-crit">{a.error}</p>}
              <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-blue">Details</summary><pre className="mt-2 max-h-60 overflow-auto rounded-xl bg-bg p-3 font-mono text-[11px]">{JSON.stringify(a.input, null, 2)}{a.result ? `\n\nResult:\n${JSON.stringify(a.result, null, 2)}` : ""}</pre></details>
              <p className="mt-1 text-[11px] text-muted">Requested by {a.requestedBy ?? "AI"}{a.decidedBy ? ` · decided by ${a.decidedBy}` : ""}</p>
            </div>
            {isManagerRole(s.role) && ["NEEDS_APPROVAL", "FAILED", "SIMULATED"].includes(a.status) && (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" loading={busy === a.id + "reject"} onClick={() => decide(a.id, "reject")}>Reject</Button>
                <Button size="sm" variant="pri" loading={busy === a.id + "approve"} onClick={() => decide(a.id, a.status === "FAILED" ? "retry" : "approve")}>{a.status === "FAILED" ? "Retry" : "Approve"}</Button>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
