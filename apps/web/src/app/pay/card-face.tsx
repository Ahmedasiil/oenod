"use client";
import { Snowflake, Wifi } from "lucide-react";
import { cx } from "@/components/ui";

type Card = { last4: string; brand: string; type: string; status: string; expMonth: number; expYear: number };

export function CardFace({ c, name }: { c: Card; name: string }) {
  return (
    <div className={cx("relative aspect-[1.586] w-full max-w-[380px] overflow-hidden rounded-[22px] p-5 text-white shadow-lift", c.status !== "ACTIVE" && "grayscale")} style={{ background: "radial-gradient(120% 140% at 100% 0%, #3A5BFF 0%, #2342E0 35%, #000F55 80%)" }}>
      <img src="/brand/oenodpay-mark-white.svg" alt="" className="absolute -bottom-8 -end-8 h-40 w-40 opacity-10" />
      <div className="flex items-center justify-between"><img src="/brand/oenodpay-logo-white.svg" alt="oenodpay" className="h-5" /><Wifi className="h-5 w-5 rotate-90 opacity-80" /></div>
      <div className="mt-8 h-8 w-11 rounded-md bg-gradient-to-br from-[#F5D58A] to-[#C9A24B]" />
      <div className="mt-4 font-mono text-[18px] tracking-[.18em]">•••• •••• •••• {c.last4}</div>
      <div className="mt-2 flex items-end justify-between text-[12px]"><span className="uppercase tracking-wide opacity-90">{name}</span><span className="opacity-80">{String(c.expMonth).padStart(2, "0")}/{String(c.expYear).slice(-2)} · {c.brand.toUpperCase()}</span></div>
      {c.status !== "ACTIVE" && <span className="absolute inset-0 grid place-items-center bg-navy/40 font-display text-lg font-semibold"><span className="flex items-center gap-2"><Snowflake className="h-5 w-5" />{c.status === "CANCELED" ? "Cancelled" : "Frozen"}</span></span>}
    </div>
  );
}
