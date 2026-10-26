import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Flag, CalendarDays } from "lucide-react";
import { db } from "@/lib/db";
import { CompanyMark, VerifiedTick } from "@/components/logo";

type P = { params: Promise<{ token: string }> };
export const metadata = { title: "Project" };

const HEALTH: Record<string, [string, string]> = { ON_TRACK: ["On track", "bg-[#E7F7EF] text-[#0E6B44]"], AT_RISK: ["Needs attention", "bg-[#FFF4DF] text-[#8A5A00]"], OFF_TRACK: ["Delayed", "bg-[#FFF5F7] text-crit"] };

// The client's view of a project: progress, milestones and shared tasks. Internal costs and notes never appear here.
export default async function ClientPortal({ params }: P) {
  const p = await db.project.findUnique({ where: { portalToken: (await params).token }, include: { org: { select: { name: true, logoUrl: true, brandColor: true, verificationStatus: true } } } });
  if (!p || !p.clientPortal || p.archivedAt) notFound();
  const [milestones, tasks] = await Promise.all([
    db.milestone.findMany({ where: { projectId: p.id }, orderBy: [{ order: "asc" }], select: { id: true, name: true, dueDate: true, status: true, completedAt: true } }),
    db.task.findMany({ where: { projectId: p.id, parentId: null }, select: { id: true, title: true, status: true, dueDate: true, completedAt: true }, orderBy: [{ status: "asc" }, { order: "asc" }], take: 100 }),
  ]);
  const d = (x?: Date | null) => (x ? x.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "");
  const [hl, hc] = HEALTH[p.health ?? ""] ?? ["In progress", "bg-sky text-blue"];
  const doneTasks = tasks.filter((t) => t.status === "DONE").length;
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3"><CompanyMark name={p.org.name} logoUrl={p.org.logoUrl} color={p.org.brandColor} size={44} /><b className="flex items-center gap-1.5 font-display text-lg">{p.org.name}{p.org.verificationStatus === "VERIFIED" && <VerifiedTick />}</b><span className="ms-auto font-mono text-xs text-muted">{p.code}</span></header>
      <section className="navy-panel p-7">
        <p className="font-mono text-[11px] uppercase tracking-[.16em] text-[#9DB0FF]">Project update</p>
        <h1 className="mt-2 font-display text-[30px] font-semibold leading-tight tracking-tight">{p.name}</h1>
        {p.description && <p className="mt-2 max-w-xl text-[14px] text-[#C9D4FF]">{p.description}</p>}
        <div className="mt-6 flex flex-wrap items-end gap-6">
          <div className="min-w-[200px] flex-1"><div className="flex justify-between text-[13px]"><span>Progress</span><b>{p.progress}%</b></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-white" style={{ width: `${p.progress}%` }} /></div></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${hc}`}>{hl}</span>
          {p.dueDate && <span className="flex items-center gap-1.5 text-[13px] text-[#C9D4FF]"><CalendarDays className="h-4 w-4" />Due {d(p.dueDate)}</span>}
        </div>
      </section>
      {milestones.length > 0 && (
        <section className="card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Flag className="h-4 w-4 text-blue" />Milestones</h2>
          <ol className="relative mt-4 space-y-4 border-s-2 border-line ps-6">{milestones.map((m) => {
            const done = m.status === "DONE" || !!m.completedAt;
            return <li key={m.id} className="relative"><span className={`absolute -start-[33px] top-0.5 grid h-5 w-5 place-items-center rounded-full ${done ? "bg-[#1FAF6B] text-white" : "border-2 border-line bg-white"}`}>{done && <CheckCircle2 className="h-3.5 w-3.5" />}</span><b className="text-[14px]">{m.name}</b><small className="block text-xs text-muted">{done ? `Completed ${d(m.completedAt)}` : m.dueDate ? `Target ${d(m.dueDate)}` : "Planned"}</small></li>;
          })}</ol>
        </section>
      )}
      {tasks.length > 0 && (
        <section className="card p-6">
          <h2 className="font-display text-lg font-semibold">Work items <span className="text-sm font-normal text-muted">{doneTasks} of {tasks.length} done</span></h2>
          <ul className="mt-3 divide-y divide-line">{tasks.map((t) => <li key={t.id} className="flex items-center gap-3 py-2.5 text-[13.5px]">{t.status === "DONE" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1FAF6B]" /> : <Circle className="h-4 w-4 shrink-0 text-line" />}<span className={t.status === "DONE" ? "flex-1 text-muted line-through" : "flex-1"}>{t.title}</span>{t.dueDate && t.status !== "DONE" && <small className="text-xs text-muted">{d(t.dueDate)}</small>}</li>)}</ul>
        </section>
      )}
      <p className="text-center text-[12px] text-muted">Updated live by {p.org.name}. Bookmark this page to check in any time.</p>
    </div>
  );
}
