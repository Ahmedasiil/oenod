"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type Pin = { id: string; lat: number; lng: number; kind: "person" | "vehicle" | "job" | "place"; label: string; sub?: string; tone?: "ok" | "warn" | "crit" | "blue" | "navy"; radiusM?: number; heading?: number | null };

// Tiles: set NEXT_PUBLIC_MAP_TILES to your provider (MapTiler, Stadia, Mapbox…) for production traffic.
const TILES = process.env.NEXT_PUBLIC_MAP_TILES || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || "&copy; OpenStreetMap contributors";
const TONES = { ok: "#12A26B", warn: "#D98A00", crit: "#D7263D", blue: "#2342E0", navy: "#000F55" };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function html(p: Pin) {
  const c = TONES[p.tone ?? (p.kind === "vehicle" ? "blue" : "navy")];
  const initials = p.label.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  if (p.kind === "vehicle") {
    return `<div style="position:relative;width:34px;height:34px"><span style="position:absolute;inset:-6px;border-radius:999px;background:${c};opacity:.18;animation:pulseRing 2s infinite"></span><span style="position:absolute;inset:0;display:grid;place-items:center;border-radius:12px;background:${c};color:#fff;box-shadow:0 6px 16px -6px ${c};transform:rotate(${p.heading ?? 0}deg)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 2 19 21 12 17 5 21z"/></svg></span></div>`;
  }
  if (p.kind === "place") return `<div style="width:14px;height:14px;border-radius:4px;background:#fff;border:3px solid ${c};box-shadow:0 2px 6px rgba(0,15,85,.25)"></div>`;
  if (p.kind === "job") return `<div style="width:26px;height:26px;border-radius:999px 999px 999px 2px;transform:rotate(-45deg);background:${c};display:grid;place-items:center;box-shadow:0 4px 10px -4px ${c}"><span style="transform:rotate(45deg);color:#fff;font:700 11px/1 system-ui">★</span></div>`;
  return `<div style="width:34px;height:34px;border-radius:999px;background:${c};color:#fff;display:grid;place-items:center;font:700 12px/1 'Plus Jakarta Sans',system-ui;border:3px solid #fff;box-shadow:0 6px 14px -6px rgba(0,15,85,.6)">${esc(initials)}</div>`;
}

export function LiveMap({ pins, track, height = 460, focus, onSelect }: { pins: Pin[]; track?: [number, number][]; height?: number | string; focus?: string | null; onSelect?: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const layer = useRef<any>(null);
  const L = useRef<any>(null);
  const fitted = useRef(false);

  useEffect(() => {
    let dead = false;
    import("leaflet").then((mod) => {
      if (dead || !el.current || map.current) return;
      L.current = mod.default ?? mod;
      map.current = L.current.map(el.current, { zoomControl: false, attributionControl: true }).setView([43.65, -79.38], 12);
      L.current.control.zoom({ position: "bottomright" }).addTo(map.current);
      L.current.tileLayer(TILES, { maxZoom: 19, attribution: ATTR, className: "oenod-tiles" }).addTo(map.current);
      layer.current = L.current.layerGroup().addTo(map.current);
      draw();
    });
    return () => { dead = true; map.current?.remove(); map.current = null; fitted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = () => {
    if (!map.current || !L.current) return;
    const Lf = L.current;
    layer.current.clearLayers();
    const pts: [number, number][] = [...(track ?? [])];
    if (track && track.length > 1) Lf.polyline(track, { color: "#2342E0", weight: 4, opacity: 0.8 }).addTo(layer.current);
    for (const p of pins) {
      if (p.lat == null || p.lng == null) continue;
      pts.push([p.lat, p.lng]);
      if (p.kind === "place" && p.radiusM) Lf.circle([p.lat, p.lng], { radius: p.radiusM, color: "#2342E0", weight: 1, fillOpacity: 0.06, dashArray: "4 4" }).addTo(layer.current);
      const m = Lf.marker([p.lat, p.lng], { icon: Lf.divIcon({ html: html(p), className: "", iconSize: [34, 34], iconAnchor: [17, 17] }) }).addTo(layer.current);
      m.bindTooltip(`<b>${esc(p.label)}</b>${p.sub ? `<br><span style="color:#5E6785">${esc(p.sub)}</span>` : ""}`, { direction: "top", offset: [0, -14] });
      if (onSelect) m.on("click", () => onSelect(p.id));
    }
    if (!fitted.current && pts.length) { map.current.fitBounds(pts, { padding: [60, 60], maxZoom: 15 }); fitted.current = true; }
  };

  useEffect(draw, [pins, track]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const p = pins.find((x) => x.id === focus);
    if (p && map.current) map.current.flyTo([p.lat, p.lng], 16, { duration: 0.6 });
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} style={{ height }} className="z-0 w-full overflow-hidden rounded-2xl border border-line bg-[#EEF1F8]" />;
}
