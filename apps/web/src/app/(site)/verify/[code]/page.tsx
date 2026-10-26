import Link from "next/link";
import { headers } from "next/headers";
import { ShieldCheck, ShieldAlert, ShieldX, Download, CalendarDays, Clock } from "lucide-react";
import { findCertificate, CERT_KINDS } from "@/lib/certificate";
import { clientIp } from "@/lib/http";
import { limit } from "@/lib/ratelimit";
import { VerifiedTick } from "@/components/logo";
import { CopyLink } from "@/components/copy-link";

type P = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: P) {
  const c = await findCertificate(decodeURIComponent((await params).code));
  return c ? { title: `${c.recipient}: ${c.title}`, description: `Certificate ${c.code} issued on OENOD`, openGraph: { images: [`/api/certificates/${c.code}/image`] } } : { title: "Certificate not found" };
}

// Public certificate check: anyone (an employer, an inspector) can confirm a certificate is genuine.
export default async function VerifyCertificate({ params }: P) {
  const code = decodeURIComponent((await params).code).trim().toUpperCase();
  const ip = clientIp(new Request("http://x", { headers: await headers() }));
  const allowed = limit(`certpage:${ip}`, 60);
  const c = allowed ? await findCertificate(code) : null;
  if (!c) return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <ShieldX className="mx-auto h-12 w-12 text-crit" />
      <h1 className="mt-4 font-display text-3xl font-semibold">{allowed ? "No certificate found" : "Too many checks"}</h1>
      <p className="mt-2 text-muted">{allowed ? <>We couldn't find a certificate with the ID <b className="font-mono text-ink">{code}</b>. Check the ID and try again. A certificate that isn't listed here wasn't issued on OENOD.</> : "Please wait a minute and try again."}</p>
      <Link href="/verify" className="btn mt-6">Check another ID</Link>
    </div>
  );
  const expired = Boolean(c.expiresAt && c.expiresAt < new Date());
  const status = c.revoked ? { label: "Revoked", note: "The issuer has withdrawn this certificate. It is no longer valid.", Icon: ShieldX, cls: "border-[#F3C5CD] bg-[#FFF5F7] text-crit" }
    : expired ? { label: "Expired", note: `This certificate was valid until ${c.expiresAt!.toLocaleDateString("en-CA", { dateStyle: "long" })}.`, Icon: ShieldAlert, cls: "border-[#F5DDAE] bg-[#FFF8EA] text-[#8A5A00]" }
    : { label: "Valid certificate", note: "This certificate is genuine and was issued on OENOD.", Icon: ShieldCheck, cls: "border-[#BFE8D3] bg-[#E7F7EF] text-[#0E6B44]" };
  const d = (x: Date) => x.toLocaleDateString("en-CA", { dateStyle: "long" });
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${status.cls}`}><status.Icon className="h-6 w-6 shrink-0" /><span><b className="block text-[15px]">{status.label}</b><small className="text-[13px] opacity-90">{status.note}</small></span><span className="ms-auto font-mono text-sm font-bold">{c.code}</span></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/certificates/${c.code}/image`} alt={`Certificate for ${c.recipient}`} className={`w-full rounded-2xl border border-line shadow-lift ${c.revoked ? "opacity-50 grayscale" : ""}`} />
        <aside className="space-y-4">
          <div className="card space-y-3 p-5 text-[13.5px]">
            <div><small className="block text-muted">Awarded to</small><b className="font-display text-xl">{c.recipient}</b></div>
            <div><small className="block text-muted">{(CERT_KINDS[c.kind] ?? CERT_KINDS.COMPLETION).heading}</small><b>{c.title}</b>{c.description && <p className="mt-1 text-muted">{c.description}</p>}</div>
            <div><small className="block text-muted">Issued by</small><b className="flex items-center gap-1">{c.source === "academy" ? "OENOD Academy" : c.company?.name}{(c.source === "academy" || c.company?.verified) && <VerifiedTick className="h-4 w-4" />}</b>{c.source === "academy" && c.company && <small className="text-muted">Training provided by {c.company.name}</small>}</div>
            <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted" />{d(c.issuedAt)}{c.expiresAt && ` · until ${d(c.expiresAt)}`}</p>
            {c.hours ? <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted" />{c.hours} hours</p> : null}
            {c.signer && <p className="text-muted">Signed by <b className="text-ink">{c.signer.name}</b>{c.signer.title ? `, ${c.signer.title}` : ""}</p>}
          </div>
          <div className="grid gap-2">
            <a href={`/api/certificates/${c.code}/image?download=1`} className="btn-pri"><Download className="h-4 w-4" />Download</a>
            <CopyLink />
          </div>
          <p className="text-[11.5px] leading-5 text-muted">OENOD keeps the official record of every certificate issued on the platform. If anything here doesn't match a printed copy, trust this page.</p>
        </aside>
      </div>
    </div>
  );
}
