import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Verify a certificate" };

export default async function VerifyLookup({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const code = (await searchParams).code?.trim();
  if (code) redirect(`/verify/${encodeURIComponent(code.toUpperCase())}`);
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky text-blue"><ShieldCheck className="h-7 w-7" /></span>
      <h1 className="mt-5 font-display text-[36px] font-semibold tracking-tight">Verify a certificate</h1>
      <p className="mt-2 text-[15px] text-muted">Every certificate issued on OENOD has a unique ID like OEN-AB12CD. Enter it to confirm it's genuine and still valid.</p>
      <form className="mx-auto mt-8 flex max-w-md gap-2 rounded-2xl border border-line bg-white p-2 shadow-card"><input name="code" required placeholder="OEN-XXXXXX" className="h-12 min-w-0 flex-1 bg-transparent px-3 font-mono text-lg uppercase outline-none" /><button className="btn-pri h-12 px-6">Check</button></form>
    </div>
  );
}
