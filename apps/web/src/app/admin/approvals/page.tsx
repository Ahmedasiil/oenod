"use client";
import { useState } from "react";
import { CheckSquare } from "lucide-react";
import { useApi } from "@/lib/client/api";
import { Empty, ErrorNote, Loading, PageHeader, Tabs } from "@/components/ui";
import { ProposalCard, type Action } from "../proposal";

const TABS = ["PROPOSED", "DONE", "FAILED", "REJECTED", "all"] as const;
type T = (typeof TABS)[number];

export default function Approvals() {
  const [tab, setTab] = useState<T>("PROPOSED");
  const { data, error, reload } = useApi<{ data: Action[]; counts: Record<string, number> }>(`/api/admin/actions?status=${tab}`);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="AI operator" title="Approvals" sub="The AI operator prepares changes but never runs them on its own. Review each one, add a note, then approve or reject." />
      <Tabs value={tab} onChange={setTab} tabs={TABS.map((k) => ({ key: k, label: k === "PROPOSED" ? "Waiting" : k === "all" ? "Everything" : k.charAt(0) + k.slice(1).toLowerCase(), count: k === "all" ? undefined : data?.counts?.[k] ?? 0 }))} />
      {error ? <ErrorNote error={error} onRetry={reload} /> : !data ? <Loading /> : !data.data.length
        ? <Empty icon={<CheckSquare className="h-6 w-6" />} title={tab === "PROPOSED" ? "Nothing waiting" : "Nothing here"} body="When you ask the AI operator to change something, its proposal appears here for you to approve." />
        : <div className="grid gap-3">{data.data.map((a) => <ProposalCard key={a.id} a={a} onDone={() => reload()} />)}</div>}
    </div>
  );
}
