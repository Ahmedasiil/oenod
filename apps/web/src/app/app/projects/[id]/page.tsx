"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Sparkles, MessageSquare, Clock, Flag, CheckCircle2, Play, Square, Copy, Link2 } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "@/components/session";
import { useT } from "@/components/i18n";
import { Avatar, Badge, Button, Card, ConfirmButton, ErrorNote, Field, Input, Loading, Modal, Select, Stat, Tabs, Textarea, copyText, cx, useToast } from "@/components/ui";

type Data = { project: any; canManage: boolean; stages: any[]; tasks: any[]; members: any[]; milestones: any[]; activity: any[]; files: any[]; timeLogs: any[]; people: any[]; client: any; budget: any; portalUrl: string | null };

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sp = useSearchParams();
  const t = useT();
  const s = useSession();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi<Data>(`/api/projects/${id}`);
  const [tab, setTab] = useState<"board" | "list" | "milestones" | "time" | "activity">("board");
  const [openTask, setOpenTask] = useState<string | null>(sp.get("task"));
  const [ai, setAi] = useState(false);
  const cur = s.org?.currency ?? "CAD";
  if (loading && !data) return <Loading rows={6} />;
  if (error || !data) return <ErrorNote error={error} onRetry={reload} />;
  const p = data.project;
  const person = (eid?: string | null) => data.people.find((x) => x.id === eid);

  const move = async (taskId: string, stageId: string) => {
    const col = data.tasks.filter((x) => x.stageId === stageId && x.id !== taskId);
    const order = (col.at(-1)?.order ?? 0) + 1;
    const stage = data.stages.find((x) => x.id === stageId);
    setData({ ...data, tasks: data.tasks.map((x) => x.id === taskId ? { ...x, stageId, order, status: stage?.isDone ? "DONE" : x.status === "DONE" ? "DOING" : x.status } : x) });
    try { await api(`/api/projects/${id}/tasks`, { method: "PATCH", body: { moves: [{ id: taskId, stageId, order }] } }); reload(); } catch (e: any) { toast(e.message, "err"); reload(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link href="/app/projects" className="eyebrow hover:text-ink">← {t("modules.projects")} · {p.code}</Link>
          <h1 className="h1 mt-1 flex flex-wrap items-center gap-3"><span className="h-3.5 w-3.5 rounded-full" style={{ background: p.color }} />{p.name}<Badge status={p.health} /><Badge status={p.status} /></h1>
          {data.client && <p className="mt-1 text-muted">Client: {data.client.company ?? `${data.client.firstName} ${data.client.lastName ?? ""}`}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {data.portalUrl && <Button variant="ghost" onClick={async () => { if (await copyText(location.origin + data.portalUrl)) toast("Client portal link copied"); }}><Link2 className="h-4 w-4" />Client portal</Button>}
          {data.canManage && <Button onClick={() => setAi(true)}><Sparkles className="h-4 w-4 text-blue" />AI plan</Button>}
          {data.canManage && <Button onClick={async () => { const r = await api(`/api/projects/${id}/duplicate`, { body: { name: `${p.name} (copy)` } }); location.href = `/app/projects/${r.data.id}`; }}><Copy className="h-4 w-4" />Duplicate</Button>}
          <Timer projectId={id} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Progress" value={`${p.progress}%`} hint={`${data.tasks.filter((x) => x.status !== "DONE").length} open tasks`} />
        <Stat label="Due" value={p.dueDate ? t.date(p.dueDate, { month: "short", day: "numeric" }) : "–"} hint={p.dueDate ? t.ago(p.dueDate) : undefined} />
        <Stat label="Budget used" value={data.budget.budget ? `${Math.round((data.budget.spent / data.budget.budget) * 100)}%` : "–"} hint={`${t.money(data.budget.spent, cur)} of ${t.money(data.budget.budget, cur)}`} tone={data.budget.budget && data.budget.spent > data.budget.budget ? "crit" : undefined} />
        <Stat label="Hours logged" value={t.num(data.budget.hours, { maximumFractionDigits: 1 })} hint={data.budget.unbilledHours ? `${data.budget.unbilledHours} h not invoiced` : data.budget.estimateHours ? `of ${data.budget.estimateHours} h planned` : undefined} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "board", label: "Board" }, { key: "list", label: "List" }, { key: "milestones", label: "Milestones", count: data.milestones.length }, { key: "time", label: "Time" }, { key: "activity", label: "Activity" }]} />

      {tab === "board" && (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
          {data.stages.map((st) => {
            const col = data.tasks.filter((x) => x.stageId === st.id && !x.parentId).sort((a, b) => a.order - b.order);
            return (
              <div key={st.id} className="flex w-[290px] shrink-0 flex-col rounded-2xl bg-[#EEF1F8] p-2" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const tid = e.dataTransfer.getData("text/task"); if (tid) move(tid, st.id); }}>
                <div className="flex items-center gap-2 px-2 py-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: st.color }} /><b className="text-[13px]">{st.name}</b><span className="font-mono text-[11px] text-muted">{col.length}{st.wipLimit ? `/${st.wipLimit}` : ""}</span></div>
                <div className="flex min-h-[60px] flex-col gap-2">
                  {col.map((x) => {
                    const a = person(x.assigneeId);
                    const late = x.dueDate && x.status !== "DONE" && new Date(x.dueDate) < new Date();
                    return (
                      <button key={x.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/task", x.id)} onClick={() => setOpenTask(x.id)} className="card cursor-grab p-3 text-start transition hover:shadow-lift active:cursor-grabbing">
                        <div className="flex items-start gap-2"><b className={cx("min-w-0 flex-1 text-[13px] font-semibold leading-snug", x.status === "DONE" && "text-muted line-through")}>{x.title}</b>{x.priority !== "NORMAL" && <Badge status={x.priority} />}</div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
                          <span className="font-mono">#{x.number}</span>
                          {x.status === "BLOCKED" && <Badge status="BLOCKED" />}
                          {x.dueDate && <span className={cx(late && "font-bold text-crit")}>{t.date(x.dueDate, { month: "short", day: "numeric" })}</span>}
                          {x._count?.comments > 0 && <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{x._count.comments}</span>}
                          {a && <Avatar name={`${a.firstName} ${a.lastName}`} src={a.photoUrl} size={20} className="ms-auto" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <QuickAdd projectId={id} stageId={st.id} onAdded={reload} />
              </div>
            );
          })}
        </div>
      )}

      {tab === "list" && (
        <div className="card overflow-x-auto">
          <table className="table"><thead><tr><th>#</th><th>Task</th><th>Status</th><th>Assignee</th><th>Due</th><th className="text-end">Hours</th></tr></thead>
            <tbody>{data.tasks.filter((x) => !x.parentId).map((x) => { const a = person(x.assigneeId); return (
              <tr key={x.id} onClick={() => setOpenTask(x.id)} className="cursor-pointer"><td className="font-mono text-xs text-muted">{x.number}</td><td className="font-semibold">{x.title}</td><td><Badge status={x.status} /></td><td>{a ? `${a.firstName} ${a.lastName}` : "–"}</td><td>{x.dueDate ? t.date(x.dueDate) : "–"}</td><td className="text-end tabular-nums">{x.loggedHours ?? 0}{x.estimateHours ? ` / ${x.estimateHours}` : ""}</td></tr>
            ); })}</tbody>
          </table>
        </div>
      )}

      {tab === "milestones" && <Milestones data={data} reload={reload} />}
      {tab === "time" && <TimeTab data={data} reload={reload} />}
      {tab === "activity" && (
        <Card title="Activity">
          <ul className="space-y-3">{data.activity.map((a) => <li key={a.id} className="flex gap-3 text-[13px]"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue" /><span className="min-w-0"><b>{a.actor}</b> {a.action} {a.detail && <span className="text-muted">{a.detail}</span>}<small className="block font-mono text-[11px] text-muted">{t.ago(a.createdAt)}</small></span></li>)}</ul>
        </Card>
      )}

      {openTask && <TaskDrawer id={openTask} data={data} onClose={() => { setOpenTask(null); reload(); }} />}
      {ai && <AiPlan projectId={id} onClose={() => { setAi(false); reload(); }} />}
    </div>
  );
}

function QuickAdd({ projectId, stageId, onAdded }: { projectId: string; stageId: string; onAdded: () => void }) {
  const [v, setV] = useState("");
  const [open, setOpen] = useState(false);
  const toast = useToast();
  if (!open) return <button onClick={() => setOpen(true)} className="mt-2 flex items-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold text-muted hover:bg-white hover:text-navy"><Plus className="h-3.5 w-3.5" />Add task</button>;
  return (
    <form className="mt-2" onSubmit={async (e) => { e.preventDefault(); if (!v.trim()) return; const titles = v.split("\n").map((x) => x.trim()).filter(Boolean); try { await api(`/api/projects/${projectId}/tasks`, { body: titles.map((title) => ({ title, stageId })) }); setV(""); onAdded(); } catch (er: any) { toast(er.message, "err"); } }}>
      <Textarea autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder="Task title (paste a list for several)" className="min-h-[64px] text-[13px]" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } if (e.key === "Escape") setOpen(false); }} />
      <div className="mt-1.5 flex gap-1.5"><Button size="sm" variant="pri" type="submit">Add</Button><Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button></div>
    </form>
  );
}

function TaskDrawer({ id, data, onClose }: { id: string; data: Data; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const { data: d, reload } = useApi<any>(`/api/tasks/${id}`);
  const [comment, setComment] = useState("");
  const [v, setV] = useState<any>(null);
  useEffect(() => { if (d?.data) setV(d.data); }, [d]);
  const save = async (patch: any) => { setV({ ...v, ...patch }); try { await api(`/api/tasks/${id}`, { method: "PATCH", body: patch }); } catch (e: any) { toast(e.message, "err"); } };
  return (
    <Modal open onClose={onClose} title={v ? `#${v.number} ${v.title}` : "Task"} wide footer={v && <ConfirmButton onConfirm={async () => { await api(`/api/tasks/${id}`, { method: "DELETE" }); onClose(); }}>{t("common.delete")}</ConfirmButton>}>
      {!v ? <Loading /> : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-4">
            <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} onBlur={() => save({ title: v.title })} className="font-display text-base font-semibold" />
            <Textarea value={v.description ?? ""} onChange={(e) => setV({ ...v, description: e.target.value })} onBlur={() => save({ description: v.description || null })} placeholder="Add details…" />
            <div>
              <h4 className="h3 mb-2">Checklist</h4>
              {(v.checklist ?? []).map((c: any, i: number) => <label key={c.id} className="flex items-center gap-2 py-1 text-[13px]"><input type="checkbox" checked={c.done} onChange={() => save({ checklist: v.checklist.map((x: any, j: number) => j === i ? { ...x, done: !x.done } : x) })} /><span className={cx(c.done && "text-muted line-through")}>{c.text}</span></label>)}
              <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const text = String(f.get("c") ?? "").trim(); if (text) { save({ checklist: [...(v.checklist ?? []), { id: Math.random().toString(36).slice(2), text, done: false }] }); e.currentTarget.reset(); } }}><Input name="c" placeholder="+ Add item" className="mt-1 h-9" /></form>
            </div>
            <div>
              <h4 className="h3 mb-2">Comments</h4>
              <ul className="space-y-3">{d.comments?.map((c: any) => <li key={c.id} className="rounded-xl bg-bg p-3 text-[13px]"><b>{c.authorName ?? "Someone"}</b> <small className="font-mono text-[11px] text-muted">{t.ago(c.createdAt)}</small><p className="mt-1 whitespace-pre-wrap">{c.body}</p></li>)}</ul>
              <form className="mt-2 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!comment.trim()) return; await api(`/api/tasks/${id}/comments`, { body: { body: comment } }); setComment(""); reload(); }}><Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment…" /><Button type="submit">Send</Button></form>
            </div>
          </div>
          <div className="space-y-3">
            <Field label="Status"><Select value={v.status} onChange={(e) => save({ status: e.target.value })} options={["TODO", "DOING", "REVIEW", "BLOCKED", "DONE"]} /></Field>
            <Field label="Priority"><Select value={v.priority} onChange={(e) => save({ priority: e.target.value })} options={["LOW", "NORMAL", "HIGH", "URGENT"]} /></Field>
            <Field label="Assignee"><Select value={v.assigneeId ?? ""} onChange={(e) => save({ assigneeId: e.target.value || null })} options={data.people.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` }))} placeholder="Unassigned" /></Field>
            <Field label="Due date"><Input type="date" value={v.dueDate ? String(v.dueDate).slice(0, 10) : ""} onChange={(e) => save({ dueDate: e.target.value || null })} /></Field>
            <Field label="Estimate (hours)"><Input type="number" min={0} step="0.25" value={v.estimateHours ?? ""} onChange={(e) => setV({ ...v, estimateHours: e.target.value })} onBlur={() => save({ estimateHours: v.estimateHours === "" ? null : Number(v.estimateHours) })} /></Field>
            <Field label="Milestone"><Select value={v.milestoneId ?? ""} onChange={(e) => save({ milestoneId: e.target.value || null })} options={data.milestones.map((m) => ({ value: m.id, label: m.name }))} placeholder="—" /></Field>
            <p className="font-mono text-[11px] text-muted">Logged {v.loggedHours ?? 0} h</p>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Milestones({ data, reload }: { data: Data; reload: () => void }) {
  const t = useT();
  const toast = useToast();
  const [v, setV] = useState({ name: "", dueDate: "" });
  return (
    <Card title="Milestones">
      <ul className="divide-y divide-line">
        {data.milestones.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-3">
            <button onClick={async () => { await api(`/api/projects/${data.project.id}/milestones`, { body: { ...m, dueDate: m.dueDate, amount: Number(m.amount), status: m.status === "DONE" ? "OPEN" : "DONE" } }).catch((e) => toast(e.message, "err")); reload(); }} aria-label="Toggle done">{m.status === "DONE" ? <CheckCircle2 className="h-5 w-5 text-ok" /> : <Flag className="h-5 w-5 text-navy" />}</button>
            <span className="min-w-0 flex-1"><b className={cx("block text-[14px]", m.status === "DONE" && "text-muted line-through")}>{m.name}</b>{m.dueDate && <small className="text-xs text-muted">{t.date(m.dueDate)} · {t.ago(m.dueDate)}</small>}</span>
            <Badge status={m.status} />
          </li>
        ))}
      </ul>
      {data.canManage && (
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); try { await api(`/api/projects/${data.project.id}/milestones`, { body: { name: v.name, dueDate: v.dueDate || null } }); setV({ name: "", dueDate: "" }); reload(); } catch (er: any) { toast(er.message, "err"); } }}>
          <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="New milestone" className="flex-1" required /><Input type="date" value={v.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} className="w-44" /><Button type="submit">Add</Button>
        </form>
      )}
    </Card>
  );
}

function TimeTab({ data, reload }: { data: Data; reload: () => void }) {
  const t = useT();
  const toast = useToast();
  const [v, setV] = useState({ hours: "", note: "" });
  const name = (id: string) => { const p = data.people.find((x) => x.id === id); return p ? `${p.firstName} ${p.lastName}` : "—"; };
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="card overflow-x-auto">
        <table className="table"><thead><tr><th>Date</th><th>Person</th><th>Note</th><th className="text-end">Hours</th><th>Status</th></tr></thead>
          <tbody>{data.timeLogs.map((l) => <tr key={l.id}><td>{t.date(l.date)}</td><td>{name(l.employeeId)}</td><td className="max-w-[280px] truncate text-muted">{l.note ?? ""}</td><td className="text-end tabular-nums">{l.hours}</td><td><Badge status={l.status ?? (l.billable ? "OPEN" : "DRAFT")} /></td></tr>)}</tbody>
        </table>
      </div>
      <Card title="Log time">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); try { await api(`/api/projects/${data.project.id}/time`, { body: { hours: Number(v.hours), note: v.note || undefined } }); setV({ hours: "", note: "" }); toast("Time logged"); reload(); } catch (er: any) { toast(er.message, "err"); } }}>
          <Field label="Hours"><Input type="number" step="0.25" min="0.25" max="24" value={v.hours} onChange={(e) => setV({ ...v, hours: e.target.value })} required /></Field>
          <Field label="What did you do?"><Input value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></Field>
          <Button type="submit" variant="pri" className="w-full"><Clock className="h-4 w-4" />Log time</Button>
        </form>
        {data.canManage && data.budget.unbilledHours > 0 && <Button className="mt-3 w-full" onClick={async () => { try { const r = await api(`/api/projects/${data.project.id}/invoice`, { body: {} }); toast("Invoice drafted"); location.href = `/app/r/invoices/${r.data?.id ?? r.invoice?.id ?? ""}`; } catch (er: any) { toast(er.message, "err"); } }}>Invoice {data.budget.unbilledHours} h</Button>}
      </Card>
    </div>
  );
}

function Timer({ projectId }: { projectId: string }) {
  const { data, reload } = useApi<any>("/api/projects/timer", { refreshMs: 60_000 });
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const x = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(x); }, []);
  const toast = useToast();
  const r = data?.running;
  const on = r && r.projectId === projectId;
  const secs = on ? Math.floor((now - new Date(r.timerStartedAt).getTime()) / 1000) : 0;
  return (
    <Button variant={on ? "pri" : "default"} onClick={async () => { try { await api("/api/projects/timer", { body: on ? { action: "stop" } : { action: "start", projectId } }); reload(); } catch (e: any) { toast(e.message, "err"); } }}>
      {on ? <><Square className="h-4 w-4" />{String(Math.floor(secs / 3600)).padStart(2, "0")}:{String(Math.floor((secs % 3600) / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}</> : <><Play className="h-4 w-4" />Start timer</>}
    </Button>
  );
}

function AiPlan({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const toast = useToast();
  const [brief, setBrief] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title="Plan this project with AI" wide footer={plan ? <Button variant="pri" loading={busy} onClick={async () => { setBusy(true); try { const r = await api(`/api/projects/${projectId}/ai-plan`, { body: { apply: true, plan } }); toast(`Added ${r.created.length} tasks`); onClose(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } }}>Add to project</Button> : <Button variant="pri" loading={busy} onClick={async () => { setBusy(true); try { setPlan((await api(`/api/projects/${projectId}/ai-plan`, { body: { brief: brief || undefined } })).plan); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } }}><Sparkles className="h-4 w-4" />Draft plan</Button>}>
      {!plan ? <Field label="What should this project achieve?" help="Leave empty to use the project description."><Textarea value={brief} onChange={(e) => setBrief(e.target.value)} /></Field> : (
        <div className="space-y-4">
          {(plan.milestones ?? []).length > 0 && <div><h4 className="h3 mb-2">Milestones</h4><ul className="list-disc ps-5 text-[13px]">{plan.milestones.map((m: any, i: number) => <li key={i}>{m.name}{m.dueInDays ? ` · in ${m.dueInDays} days` : ""}</li>)}</ul></div>}
          <div><h4 className="h3 mb-2">Tasks</h4><ul className="space-y-1.5 text-[13px]">{(plan.tasks ?? []).map((x: any, i: number) => <li key={i} className="flex gap-2 rounded-lg bg-bg px-3 py-2"><b className="min-w-0 flex-1">{x.title}</b>{x.estimateHours && <span className="font-mono text-[11px] text-muted">{x.estimateHours} h</span>}</li>)}</ul></div>
        </div>
      )}
    </Modal>
  );
}
