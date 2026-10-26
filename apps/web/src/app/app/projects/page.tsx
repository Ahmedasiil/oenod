"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search, AlertTriangle, CalendarClock } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { useSession, useAccess } from "@/components/session";
import { useT } from "@/components/i18n";
import { Avatar, Badge, Button, Empty, Field, Input, Loading, Modal, PageHeader, Select, Stat, Tabs, Textarea, cx, useToast } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function Projects() {
  const t = useT();
  const s = useSession();
  const access = useAccess("projects");
  const [tab, setTab] = useState<"projects" | "mine">("projects");
  const [q, setQ] = useState("");
  const [create, setCreate] = useState(false);
  const { data, loading, reload } = useApi<any>(`/api/projects${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  const cur = s.org?.currency ?? "CAD";
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Operations" title={t("modules.projects")} sub="Tasks, milestones, budgets and job costing for every project." actions={access === "edit" && <Button variant="pri" onClick={() => setCreate(true)}><Plus className="h-4 w-4" />New project</Button>} />
      {data?.summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Active projects" value={data.summary.active} />
          <Stat label="At risk" value={data.summary.atRisk} tone={data.summary.atRisk ? "warn" : undefined} />
          <Stat label="Overdue tasks" value={data.summary.overdueTasks} tone={data.summary.overdueTasks ? "crit" : undefined} />
          <Stat label="Budget used" value={data.summary.budget ? `${Math.round((data.summary.spent / data.summary.budget) * 100)}%` : "–"} hint={`${t.money(data.summary.spent, cur)} of ${t.money(data.summary.budget, cur)}`} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onChange={setTab} tabs={[{ key: "projects", label: "Projects" }, { key: "mine", label: "My tasks" }]} />
        {tab === "projects" && <div className="relative ms-auto w-full max-w-xs"><Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${t("common.search")}…`} className="ps-9" /></div>}
      </div>
      {tab === "mine" ? <MyTasks /> : loading && !data ? <Loading /> : !data?.data.length ? <Empty title="No projects yet" body="Create one, or ask the AI to plan a project from a short brief." action={access === "edit" && <Button variant="pri" onClick={() => setCreate(true)}>New project</Button>} /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.data.map((p: any) => (
            <Link key={p.id} href={`/app/projects/${p.id}`} className="card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start gap-3">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
                <div className="min-w-0 flex-1"><b className="block truncate font-display text-[15px] font-semibold">{p.name}</b><small className="font-mono text-[11px] text-muted">{p.code}{p.client ? ` · ${p.client.company ?? p.client.firstName}` : ""}</small></div>
                <Badge status={p.health} />
              </div>
              <div><div className="mb-1 flex justify-between text-xs text-muted"><span>{p.progress}% done</span><span>{p.openTasks} open{p.overdueTasks ? ` · ${p.overdueTasks} late` : ""}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-bg"><i className="block h-full rounded-full bg-gradient-to-r from-navy to-blue" style={{ width: `${p.progress}%` }} /></div></div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex -space-x-2 rtl:space-x-reverse">{[p.manager, ...p.team].filter(Boolean).filter((e: any, i: number, a: any[]) => a.findIndex((x) => x.id === e.id) === i).slice(0, 5).map((e: any) => <Avatar key={e.id} name={`${e.firstName} ${e.lastName}`} src={e.photoUrl} size={26} className="ring-2 ring-paper" />)}</span>
                <span className="flex items-center gap-1 text-muted">{p.dueDate && <><CalendarClock className="h-3.5 w-3.5" />{t.date(p.dueDate, { month: "short", day: "numeric" })}</>}</span>
              </div>
              {Number(p.budget) > 0 && <div className="text-xs text-muted">Budget {t.money(Number(p.spent), cur)} / {t.money(Number(p.budget), cur)}</div>}
            </Link>
          ))}
        </div>
      )}
      {create && <CreateProject onClose={() => setCreate(false)} onCreated={reload} />}
    </div>
  );
}

function MyTasks() {
  const t = useT();
  const { data, loading } = useApi<any>("/api/projects/my-tasks");
  if (loading) return <Loading />;
  const groups: [string, any[], string][] = [["Overdue", data?.overdue ?? [], "text-crit"], ["Today", data?.today ?? [], "text-navy"], ["Upcoming", data?.upcoming ?? [], ""], ["Later", data?.later ?? [], "text-muted"]];
  if (!groups.some(([, l]) => l.length)) return <Empty title="You're all caught up" body="Tasks assigned to you show up here." />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.filter(([, l]) => l.length).map(([name, list, c]) => (
        <div key={name} className="card p-4">
          <h3 className={cx("h3 mb-3 flex items-center gap-2", c)}>{name === "Overdue" && <AlertTriangle className="h-4 w-4" />}{name} <span className="font-mono text-xs text-muted">{list.length}</span></h3>
          <ul className="divide-y divide-line">{list.map((x: any) => <li key={x.id}><Link href={x.projectId ? `/app/projects/${x.projectId}?task=${x.id}` : `/app/r/tasks/${x.id}`} className="flex items-center gap-3 py-2.5 text-[13px] hover:text-navy"><Badge status={x.priority === "NORMAL" ? x.status : x.priority} /><span className="min-w-0 flex-1 truncate font-semibold">{x.title}</span>{x.dueDate && <small className="font-mono text-[11px] text-muted">{t.date(x.dueDate, { month: "short", day: "numeric" })}</small>}</Link></li>)}</ul>
        </div>
      ))}
    </div>
  );
}

function CreateProject({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const people = useApi<{ id: string; label: string }[]>("/api/refs/employees");
  const clients = useApi<{ id: string; label: string }[]>("/api/refs/contacts");
  const [v, setV] = useState<any>({ name: "", description: "", managerId: "", contactId: "", budget: "", dueDate: "", billingType: "FIXED", aiPlan: true });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const r = await api("/api/projects", { body: { name: v.name, description: v.description || undefined, managerId: v.managerId || undefined, contactId: v.contactId || undefined, budget: v.budget ? Number(v.budget) : undefined, dueDate: v.dueDate || undefined, billingType: v.billingType } });
      if (v.aiPlan && v.description) await api(`/api/projects/${r.data.id}/ai-plan`, { body: { brief: v.description, apply: true } }).catch((e) => toast(e.message, "err"));
      toast("Project created"); onCreated(); router.push(`/app/projects/${r.data.id}`);
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="New project" footer={<Button variant="pri" loading={busy} disabled={v.name.length < 2} onClick={save}>Create</Button>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required className="sm:col-span-2"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Kitchen renovation for Northbridge Law" /></Field>
        <Field label="Brief" help="Describe the goal. The AI can turn it into stages, tasks and milestones." className="sm:col-span-2"><Textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
        <Field label="Project lead"><Select value={v.managerId} onChange={(e) => setV({ ...v, managerId: e.target.value })} options={(people.data ?? []).map((p) => ({ value: p.id, label: p.label }))} placeholder="—" /></Field>
        <Field label="Client"><Select value={v.contactId} onChange={(e) => setV({ ...v, contactId: e.target.value })} options={(clients.data ?? []).map((p) => ({ value: p.id, label: p.label }))} placeholder="Internal" /></Field>
        <Field label="Budget"><Input type="number" value={v.budget} onChange={(e) => setV({ ...v, budget: e.target.value })} /></Field>
        <Field label="Due date"><Input type="date" value={v.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} /></Field>
        <Field label="Billing"><Select value={v.billingType} onChange={(e) => setV({ ...v, billingType: e.target.value })} options={["FIXED", "HOURLY", "MILESTONES", "NON_BILLABLE"]} /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={v.aiPlan} onChange={(e) => setV({ ...v, aiPlan: e.target.checked })} />Plan tasks with AI from the brief</label>
      </div>
    </Modal>
  );
}
