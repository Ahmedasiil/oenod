"use client";
import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { cx } from "@/components/ui";

type Ad = { id: string; company: string; companyLogo: string | null; verified: boolean; headline: string; body: string; imageUrl: string | null; ctaLabel: string; clickUrl: string; profileUrl: string };

/** Paid placement from a company on OENOD. Always labelled "Sponsored". Renders nothing when there's no ad to show. */
export function Sponsored({ placement, n = 1, className, compact }: { placement: string; n?: number; className?: string; compact?: boolean }) {
  const [ads, setAds] = useState<Ad[]>([]);
  useEffect(() => {
    let dead = false;
    fetch(`/api/ads/serve?placement=${placement}&n=${n}`, { credentials: "same-origin" }).then((r) => r.ok ? r.json() : { data: [] }).then((j) => { if (!dead) setAds(j.data ?? []); }).catch(() => {});
    return () => { dead = true; };
  }, [placement, n]);
  if (!ads.length) return null;
  return (
    <div className={cx("grid gap-3", n > 1 && "sm:grid-cols-2 lg:grid-cols-3", className)}>
      {ads.map((a) => (
        <a key={a.id} href={a.clickUrl} target="_blank" rel="noopener sponsored" className="card group flex gap-3 overflow-hidden p-3 transition hover:shadow-lift">
          {a.imageUrl && !compact && <img src={a.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24" loading="lazy" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              {a.companyLogo ? <img src={a.companyLogo} alt="" className="h-4 w-4 rounded object-contain" /> : null}
              <span className="truncate font-semibold text-ink">{a.company}</span>{a.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue" />}
              <span className="ms-auto shrink-0 rounded-full bg-bg px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider">Sponsored</span>
            </div>
            <b className="mt-1 line-clamp-1 block text-[14px]">{a.headline}</b>
            <p className="line-clamp-2 text-[12.5px] leading-[1.45] text-muted">{a.body}</p>
            <span className="mt-1.5 inline-block text-xs font-bold text-blue group-hover:underline">{a.ctaLabel} →</span>
          </div>
        </a>
      ))}
    </div>
  );
}
