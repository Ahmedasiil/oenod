"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Truck, Users, MapPin, Wrench, Radio } from "lucide-react";
import { useApi } from "@/lib/client/api";
import { useT } from "@/components/i18n";
import { LiveMap, type Pin } from "@/components/map";
import { Avatar, Badge, Card, ErrorNote, Loading, PageHeader, Tabs, cx } from "@/components/ui";

type Live = { asOf: string; team: any[]; vehicles: any[]; jobs: any[]; locations: any[]; events: any[] };

export default function LivePage() {
  const t = useT();
  const { data, error, loading, reload } = useApi<Live>("/api/live", { refreshMs: 15_000 });
  const [show, setShow] = useState<"all" | "team" | "vehicles" | "jobs">("all");
  const [focus, setFocus] = useState<string | null>(null);
  const pins = useMemo<Pin[]>(() => {
    if (!data) return [];
    const out: Pin[] = data.locations.filter((l) => l.lat != null).map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, kind: "place", label: l.name, radiusM: l.radiusM }));
    if (show === "all" || show === "team") out.push(...data.team.filter((p) => p.lat != null).map((p): Pin => ({ id: p.id, lat: p.lat, lng: p.lng, kind: "person", label: p.name, sub: `${p.jobTitle ?? ""} · on since ${t.time(p.since)}${p.live ? " · live GPS" : ""}`, tone: p.onSite === false ? "warn" : "navy" })));
    if (show === "all" || show === "vehicles") out.push(...data.vehicles.filter((v) => v.lat != null).map((v): Pin => ({ id: v.id, lat: v.lat, lng: v.lng, kind: "vehicle", label: v.name, sub: `${v.plate ?? ""} · ${v.speed ?? 0} km/h`, heading: v.heading, tone: v.limit && v.speed > v.limit ? "crit" : v.status === "MOVING" ? "blue" : "navy" })));
    if (show === "all" || show === "jobs") out.push(...data.jobs.filter((j) => j.lat != null).map((j): Pin => ({ id: j.id, lat: j.lat, lng: j.lng, kind: "job", label: j.title, sub: j.address, tone: j.status === "COMPLETED" ? "ok" : "warn" })));
    return out;
  }, [data, show, t]);

  if (loading && !data) return <Loading rows={6} />;
  if (error || !data) return <ErrorNote error={error} onRetry={reload} />;
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Workspace" title="Live map" sub="Who's working, where your vehicles are and today's jobs, updated every 15 seconds. People only share live location when they opt in, and only while clocked in." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini icon={<Users className="h-4 w-4" />} label="On the clock" value={data.team.length} />
        <Mini icon={<Truck className="h-4 w-4" />} label="Vehicles moving" value={data.vehicles.filter((v) => v.status === "MOVING").length} of={data.vehicles.length} />
        <Mini icon={<Wrench className="h-4 w-4" />} label="Jobs today" value={data.jobs.length} />
        <Mini icon={<MapPin className="h-4 w-4" />} label="Locations" value={data.locations.length} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs value={show} onChange={setShow} tabs={[{ key: "all", label: "Everything" }, { key: "team", label: "Team", count: data.team.length }, { key: "vehicles", label: "Vehicles", count: data.vehicles.length }, { key: "jobs", label: "Jobs", count: data.jobs.length }]} />
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted"><Radio className="h-3.5 w-3.5 animate-pulse text-ok" />Updated {t.time(data.asOf)}</span>
          </div>
          <LiveMap pins={pins} focus={focus} height="min(64vh, 620px)" />
        </div>
        <div className="space-y-4">
          <Card title="Team" pad={false}>
            <ul className="max-h-[300px] divide-y divide-line overflow-y-auto">
              {!data.team.length && <li className="p-4 text-sm text-muted">Nobody is clocked in right now.</li>}
              {data.team.map((p) => (
                <li key={p.id}><button onClick={() => setFocus(p.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-start hover:bg-bg">
                  <Avatar name={p.name} size={32} />
                  <span className="min-w-0 flex-1"><b className="block truncate text-[13px]">{p.name}</b><small className="block truncate text-xs text-muted">{p.location ?? p.jobTitle} · since {t.time(p.since)}</small></span>
                  {p.onSite === false ? <Badge status="OFF_SITE" tone="warn" /> : p.live ? <i className="h-2 w-2 rounded-full bg-ok" title="Live GPS" /> : null}
                </button></li>
              ))}
            </ul>
          </Card>
          <Card title="Vehicles" pad={false} action={<Link href="/app/fleet" className="text-xs font-bold text-blue">Fleet GPS →</Link>}>
            <ul className="divide-y divide-line">
              {data.vehicles.map((v) => (
                <li key={v.id}><button onClick={() => setFocus(v.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-start hover:bg-bg">
                  <span className={cx("grid h-8 w-8 place-items-center rounded-[10px]", v.status === "MOVING" ? "bg-sky text-blue" : "bg-bg text-muted")}><Truck className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><b className="block truncate text-[13px]">{v.name}</b><small className="text-xs text-muted">{v.plate} · {v.lastSeenAt ? t.ago(v.lastSeenAt) : "no signal yet"}</small></span>
                  <b className={cx("font-mono text-xs tabular-nums", v.limit && v.speed > v.limit ? "text-crit" : "text-navy")}>{v.speed ?? 0} km/h</b>
                </button></li>
              ))}
            </ul>
          </Card>
          {data.events.length > 0 && (
            <Card title="Alerts">
              <ul className="space-y-2.5">{data.events.slice(0, 6).map((e) => <li key={e.id} className="text-[13px]"><Badge status={e.kind} /> <b>{e.vehicle}</b> <span className="text-muted">{e.message}</span><small className="block font-mono text-[11px] text-muted">{t.ago(e.at)}</small></li>)}</ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Mini({ icon, label, value, of }: { icon: React.ReactNode; label: string; value: number; of?: number }) {
  return <div className="card flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky text-navy">{icon}</span><span><small className="block text-xs font-semibold text-muted">{label}</small><b className="font-display text-xl tabular-nums">{value}{of != null && <span className="text-sm text-muted"> / {of}</span>}</b></span></div>;
}
