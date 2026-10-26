import { CheckCircle2, AlertTriangle, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { publicStatus, SURFACES } from "@/lib/platform";

export const metadata = { title: "System status" };
export const revalidate = 0;

export default async function Status() {
  const [surfaces, incidents, history] = await Promise.all([
    publicStatus(),
    db.statusIncident.findMany({ where: { resolvedAt: null }, orderBy: { createdAt: "desc" } }).catch(() => []),
    db.statusIncident.findMany({ where: { resolvedAt: { not: null } }, orderBy: { createdAt: "desc" }, take: 10 }).catch(() => []),
  ]);
  const down = SURFACES.filter((s) => s.key !== "all").filter((s) => surfaces[s.key]?.mode !== "LIVE" || surfaces.all?.mode !== "LIVE");
  const ok = !down.length && !incidents.length;
  const d = (x: Date) => x.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-[36px] font-semibold tracking-tight">System status</h1>
      <div className={`mt-6 flex items-center gap-3 rounded-2xl px-5 py-4 ${ok ? "bg-[#E7F7EF] text-[#0E6B44]" : "bg-[#FFF4DF] text-[#8A5A00]"}`}>{ok ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}<b className="text-[16px]">{ok ? "All systems working normally" : "Some services are affected"}</b></div>
      {incidents.map((i) => <div key={i.id} className="mt-4 rounded-2xl border border-[#F5DDAE] bg-white p-5"><b>{i.title}</b><p className="mt-1 text-[14px] text-muted">{i.message}</p><small className="mt-2 block text-xs text-muted">{i.status} · since {d(i.createdAt)}</small></div>)}
      <ul className="mt-8 divide-y divide-line rounded-[22px] border border-line">
        {SURFACES.filter((s) => s.key !== "all").map((s) => {
          const st = surfaces.all?.mode !== "LIVE" ? surfaces.all : surfaces[s.key];
          const live = st?.mode === "LIVE";
          return <li key={s.key} className="flex items-center gap-3 p-5"><span className="min-w-0 flex-1"><b className="block text-[14.5px]">{s.name}</b><small className="text-[12.5px] text-muted">{s.help}</small></span>{live ? <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#0E6B44]"><CheckCircle2 className="h-4 w-4" />Operational</span> : <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#8A5A00]"><Wrench className="h-4 w-4" />{st?.mode === "READ_ONLY" ? "Read-only" : "Maintenance"}</span>}</li>;
        })}
      </ul>
      {history.length > 0 && <section className="mt-10"><h2 className="font-display text-lg font-semibold">Past incidents</h2><ul className="mt-3 space-y-3">{history.map((i) => <li key={i.id} className="rounded-2xl border border-line p-4 text-[13.5px]"><b>{i.title}</b><small className="block text-xs text-muted">{d(i.createdAt)} · resolved {i.resolvedAt ? d(i.resolvedAt) : ""}</small></li>)}</ul></section>}
    </div>
  );
}
