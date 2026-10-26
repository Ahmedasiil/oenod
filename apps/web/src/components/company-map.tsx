"use client";
import { LiveMap } from "@/components/map";

/** Small read-only map of a company's locations. */
export function CompanyMap({ places }: { places: { name: string; lat: number; lng: number; sub?: string }[] }) {
  return <LiveMap height={240} pins={places.map((p, i) => ({ id: String(i), lat: p.lat, lng: p.lng, kind: "place", label: p.name, sub: p.sub, tone: "navy" }))} />;
}
