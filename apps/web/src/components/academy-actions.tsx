"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, ShoppingBag } from "lucide-react";
import { api } from "@/lib/client/api";
import { Button, cx, useToast } from "@/components/ui";

const toSignIn = () => { location.href = `/signin?next=${encodeURIComponent(location.pathname)}`; };

/** Buy the Academy Pass (sign-in first if needed). */
export function PassButton({ kind, label, light }: { kind: "PASS_MONTH" | "PASS_YEAR"; label: string; light?: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button disabled={busy} className={cx("btn h-11", light ? "border-white/25 bg-transparent text-white hover:bg-white/10" : "border-transparent bg-white text-navy")} onClick={async () => {
      setBusy(true);
      try { const r = await api("/api/academy/checkout", { body: { kind } }); location.href = r.url; }
      catch (e: any) { if (e.status === 401) return toSignIn(); toast(e.message, "err"); setBusy(false); }
    }}>{label}</button>
  );
}

/** Start (free / pass / already owned) or buy a course. */
export function EnrollButton({ courseId, slug, priced, owned, label }: { courseId: string; slug: string; priced: boolean; owned: boolean; label: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button variant="pri" loading={busy} className="h-12 w-full text-[14.5px]" onClick={async () => {
      if (owned) return router.push(`/academy/learn/${slug}`);
      setBusy(true);
      try {
        const r = await api("/api/academy/enroll", { body: { courseId } });
        if (r.checkoutUrl) { location.href = r.checkoutUrl; return; }
        router.push(`/academy/learn/${slug}`);
      } catch (e: any) {
        if (e.status === 401) return toSignIn();
        if (e.status === 402 && e.data?.checkoutUrl) { location.href = e.data.checkoutUrl; return; }
        toast(e.message, "err"); setBusy(false);
      }
    }}>{owned ? <Play className="h-4 w-4" /> : priced ? <ShoppingBag className="h-4 w-4" /> : <Play className="h-4 w-4" />}{label}</Button>
  );
}
