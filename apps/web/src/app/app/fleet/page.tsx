"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Truck, Gauge, Route, Plus, Copy, Smartphone } from "lucide-react";
import { useApi } from "@/lib/client/api";
import { useT } from "@/components/i18n";
import { LiveMap, type Pin } from "@/components/map";
import { ResourceTable } from "@/components/resource";
import { Badge, Button, Card, Empty, Loading, PageHeader, Select, Stat, Tabs, copyText, cx, useToast } from "@/components/ui";

export default function Fleet() {
  const t = useT();
  const live = useApi<any>("/api/live", { refreshMs: 15_000 });
  const [sel, setSel] = useState<string | null>(null);
  const [hours, setHours] = useState("24");
  const [tab, setTab] = useState<"map" | "vehicles" | "events">("map");
  const v = useApi<any>(sel ? `/api/fleet/vehicles/${sel}?hours=${hours}` : null);
  const vehicles: any[] = live.data?.vehicles ?? [];
  const pins = useMemo<Pin[]>(() => vehicles.filter((x) => x.lat != null).map((x) => ({ id: x.id, lat: x.lat, lng: x.lng, kind: "vehicle", label: x.name, sub: `${x.plate ?? ""} · ${x.speed ?? 0} km/h`, heading: x.heading, tone: x.limit && x.speed > x.limit ? "crit" : x.status === "MOVING" ? "blue" : "navy" })), [vehicles]);
  const track = useMemo<[number, number][]>(() => (v.data?.positions ?? []).map((p: any) => [p.lat, p.lng]), [v.data]);
  const speeding = (live.data?.events ?? []).filter((e: any) => e.kind === "SPEEDING").length;

  if (live.loading && !live.data) return <Loading rows={6} />;
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Operations" title="Fleet GPS" sub="Live position, trips, speeding and long-stop alerts for every vehicle. Use the OENOD Driver app on a phone, or any OsmAnd-compatible tracker (Traccar, Teltonika and most GPS units)."
        actions={<Link href="/app/r/vehicles/new" className="btn btn-pri"><Plus className="h-4 w-4" />Add vehicle</Link>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Vehicles" value={vehicles.length} hint={`${vehicles.filter((x) => x.status === "MOVING").length} moving now`} />
        <Stat label="Stopped" value={vehicles.filter((x) => x.status === "STOPPED").length} />
        <Stat label="Speeding alerts" value={speeding} tone={speeding ? "crit" : undefined} hint="recent" />
        <Stat label="No signal" value={vehicles.filter((x) => !x.lastSeenAt || Date.now() - new Date(x.lastSeenAt).getTime() > 36e5).length} hint="over 1 hour" />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "map", label: "Map" }, { key: "vehicles", label: "Vehicles" }, { key: "events", label: "Alerts & events" }]} />
      {tab === "map" && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <LiveMap pins={pins} track={sel ? track : undefined} focus={sel} onSelect={setSel} height="min(66vh, 640px)" />
          <div className="space-y-3">
            {!vehicles.length && <Empty icon={<Truck className="h-5 w-5" />} title="No vehicles yet" body="Add a vehicle, then install the Driver app or point your tracker at OENOD." />}
            {vehicles.map((x) => (
              <button key={x.id} onClick={() => setSel(x.id === sel ? null : x.id)} className={cx("card flex w-full items-center gap-3 p-3.5 text-start transition hover:shadow-lift", sel === x.id && "ring-2 ring-blue")}>
                <span className={cx("grid h-10 w-10 place-items-center rounded-xl", x.status === "MOVING" ? "bg-sky text-blue" : "bg-bg text-muted")}><Truck className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><b className="block truncate text-[14px]">{x.name}</b><small className="text-xs text-muted">{x.plate} · {x.lastSeenAt ? t.ago(x.lastSeenAt) : "waiting for first position"}</small></span>
                <span className="text-end"><b className={cx("block font-display tabular-nums", x.limit && x.speed > x.limit && "text-crit")}>{x.speed ?? 0}</b><small className="font-mono text-[10px] text-muted">km/h</small></span>
              </button>
            ))}
            {sel && v.data && <VehiclePanel d={v.data} hours={hours} setHours={setHours} />}
          </div>
        </div>
      )}
      {tab === "vehicles" && <ResourceTable resource="vehicles" />}
      {tab === "events" && <ResourceTable resource="fleetevents" />}
    </div>
  );
}

function VehiclePanel({ d, hours, setHours }: { d: any; hours: string; setHours: (h: string) => void }) {
  const t = useT();
  const toast = useToast();
  const km = d.trips.reduce((a: number, x: any) => a + Number(x.distanceKm ?? 0), 0);
  const top = d.positions.reduce((a: number, p: any) => Math.max(a, Number(p.speedKmh ?? 0)), 0);
  return (
    <Card title={d.vehicle.name} action={<Select value={hours} onChange={(e) => setHours(e.target.value)} options={[{ value: "24", label: "Last 24 h" }, { value: "168", label: "Last 7 days" }, { value: "720", label: "Last 30 days" }]} className="h-8 w-auto py-0 text-xs" />}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-bg p-2"><Route className="mx-auto h-4 w-4 text-navy" /><b className="block font-display tabular-nums">{t.num(km, { maximumFractionDigits: 1 })}</b><small className="text-[11px] text-muted">km</small></div>
        <div className="rounded-xl bg-bg p-2"><Truck className="mx-auto h-4 w-4 text-navy" /><b className="block font-display tabular-nums">{d.trips.length}</b><small className="text-[11px] text-muted">trips</small></div>
        <div className="rounded-xl bg-bg p-2"><Gauge className="mx-auto h-4 w-4 text-navy" /><b className="block font-display tabular-nums">{Math.round(top)}</b><small className="text-[11px] text-muted">top km/h</small></div>
      </div>
      {d.events.length > 0 && <ul className="mt-3 space-y-1.5 text-[12.5px]">{d.events.slice(0, 5).map((e: any) => <li key={e.id}><Badge status={e.kind} /> {e.message} <small className="font-mono text-[10.5px] text-muted">{t.ago(e.at)}</small></li>)}</ul>}
      <details className="mt-3 rounded-xl border border-line p-3 text-[12.5px]">
        <summary className="flex cursor-pointer items-center gap-2 font-bold"><Smartphone className="h-4 w-4" />Connect a phone or tracker</summary>
        <div className="mt-2 space-y-2 text-muted">
          <p>Server URL (OsmAnd protocol):</p>
          <code className="block break-all rounded-lg bg-bg p-2 font-mono text-[11px] text-ink">{d.setup.ingestUrl}</code>
          <p>Device ID: <b className="font-mono text-ink">{d.setup.deviceId ?? "set one on the vehicle"}</b></p>
          {d.setup.driverAppToken && <Button size="sm" onClick={async () => { if (await copyText(d.setup.driverAppToken)) toast("Driver app code copied"); }}><Copy className="h-3.5 w-3.5" />Copy Driver app code</Button>}
          <p className="text-[11px]">The Driver app shares location only while the driver is on shift. Speed and stop alerts use the limits set on the vehicle.</p>
        </div>
      </details>
    </Card>
  );
}
