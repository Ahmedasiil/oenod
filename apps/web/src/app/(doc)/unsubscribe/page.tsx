"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MailX, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";

function Unsub() {
  const t = useSearchParams().get("t") ?? "";
  const [state, setState] = useState<"ask" | "busy" | "done" | "error">("ask");
  const [msg, setMsg] = useState("");
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      {state === "done" ? <>
        <CheckCircle2 className="mx-auto h-10 w-10 text-[#1FAF6B]" />
        <h1 className="mt-3 font-display text-2xl font-semibold">You're unsubscribed</h1>
        <p className="mt-2 text-[14px] text-muted">You won't get these marketing emails any more. Account and security messages still arrive when needed.</p>
      </> : <>
        <MailX className="mx-auto h-10 w-10 text-muted" />
        <h1 className="mt-3 font-display text-2xl font-semibold">Unsubscribe</h1>
        <p className="mt-2 text-[14px] text-muted">Stop receiving marketing emails and texts from this list?</p>
        {state === "error" && <p className="mt-3 rounded-xl bg-[#FFF5F7] px-3 py-2 text-[13px] text-crit">{msg}</p>}
        <Button variant="pri" className="mt-5 w-full" loading={state === "busy"} disabled={!t} onClick={async () => {
          setState("busy");
          const r = await fetch(`/api/unsubscribe?t=${encodeURIComponent(t)}`, { method: "POST" }).catch(() => null);
          if (r?.ok) setState("done"); else { setMsg((await r?.json().catch(() => null))?.error ?? "That didn't work. Try the link again."); setState("error"); }
        }}>Yes, unsubscribe me</Button>
      </>}
    </div>
  );
}

export default function Page() { return <Suspense><Unsub /></Suspense>; }
