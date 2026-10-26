import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Clock, Briefcase, Building2, ChevronLeft, CalendarDays, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getCtx } from "@/lib/auth";
import { APP_URL } from "@/lib/env";
import { CompanyMark, VerifiedTick } from "@/components/logo";
import { Markdown } from "@/components/markdown";
import { ApplyForm } from "@/components/site-forms";
import { Sponsored } from "@/components/sponsored";
import { EMPLOYMENT, WORKPLACE, ago, salary } from "@/lib/public";

type P = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return db.jobPosting.findFirst({ where: { slug, isPublic: true, status: { in: ["OPEN", "CLOSED"] } }, include: { org: { select: { name: true, slug: true, logoUrl: true, brandColor: true, verificationStatus: true, tagline: true, industry: true, website: true, teamSize: true, publicProfile: true } } } });
}

export async function generateMetadata({ params }: P) {
  const j = await load((await params).slug);
  if (!j) return { title: "Job not found" };
  return { title: `${j.title} at ${j.org.name}`, description: j.description.slice(0, 160), openGraph: { title: `${j.title} · ${j.org.name}`, description: j.description.slice(0, 160) } };
}

export default async function Job({ params }: P) {
  const j = await load((await params).slug);
  if (!j) notFound();
  db.jobPosting.update({ where: { id: j.id }, data: { views: { increment: 1 } } }).catch(() => {});
  const ctx = await getCtx().catch(() => null);
  const more = await db.jobPosting.findMany({ where: { orgId: j.orgId, status: "OPEN", isPublic: true, id: { not: j.id } }, take: 4, select: { slug: true, title: true, city: true } });
  const pay = salary(j);
  const verified = j.org.verificationStatus === "VERIFIED";
  // Structured data so the job shows up in Google's job search.
  const ld = {
    "@context": "https://schema.org", "@type": "JobPosting", title: j.title, description: j.description, datePosted: j.publishedAt?.toISOString(), validThrough: j.closesAt?.toISOString(),
    employmentType: j.employmentType, hiringOrganization: { "@type": "Organization", name: j.org.name, sameAs: j.org.website ?? undefined, logo: j.org.logoUrl ?? undefined },
    jobLocationType: j.workplace === "REMOTE" ? "TELECOMMUTE" : undefined,
    jobLocation: j.city ? { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: j.city, addressCountry: j.country ?? "CA" } } : undefined,
    baseSalary: j.salaryMin ? { "@type": "MonetaryAmount", currency: j.currency, value: { "@type": "QuantitativeValue", minValue: j.salaryMin, maxValue: j.salaryMax ?? j.salaryMin, unitText: j.salaryPeriod } } : undefined,
    url: `${APP_URL}/jobs/${j.slug}`,
  };
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Link href="/jobs" className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink"><ChevronLeft className="h-4 w-4 rtl:rotate-180" />All jobs</Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0">
          <div className="flex items-start gap-4">
            <CompanyMark name={j.org.name} logoUrl={j.org.logoUrl} color={j.org.brandColor ?? undefined} size={64} />
            <div className="min-w-0">
              <h1 className="text-balance font-display text-[30px] font-semibold leading-tight tracking-tight sm:text-[36px]">{j.title}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-[15px] text-muted">{j.org.publicProfile ? <Link href={`/companies/${j.org.slug}`} className="font-semibold text-ink hover:text-blue">{j.org.name}</Link> : <b className="text-ink">{j.org.name}</b>}{verified && <VerifiedTick />}</p>
            </div>
          </div>
          {j.status === "CLOSED" && <p className="mt-5 rounded-xl bg-[#FFF4DF] px-4 py-3 text-[13.5px] font-semibold text-[#8A5A00]">This job is no longer accepting applications.</p>}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[[MapPin, "Location", j.city ?? "Anywhere"], [Building2, "Workplace", WORKPLACE[j.workplace] ?? j.workplace], [Briefcase, "Type", EMPLOYMENT[j.employmentType] ?? j.employmentType], [Clock, "Pay", pay ?? "Discussed at interview"]].map(([I, l, v]) => {
              const Icon = I as typeof MapPin;
              return <div key={l as string} className="rounded-2xl border border-line p-3"><Icon className="h-4 w-4 text-blue" /><small className="mt-2 block text-[11.5px] text-muted">{l as string}</small><b className="text-[13.5px]">{v as string}</b></div>;
            })}
          </div>
          <div className="prose-oenod mt-8 max-w-none text-[15px]"><Markdown text={j.description} /></div>
          {j.requirements && <><h2 className="mt-8 font-display text-xl font-semibold">What you'll need</h2><div className="prose-oenod mt-2"><Markdown text={j.requirements} /></div></>}
          {j.benefits && <><h2 className="mt-8 font-display text-xl font-semibold">What you get</h2><div className="prose-oenod mt-2"><Markdown text={j.benefits} /></div></>}
          {j.skills.length > 0 && <div className="mt-8 flex flex-wrap gap-2">{j.skills.map((s) => <Link key={s} href={`/jobs?q=${encodeURIComponent(s)}`} className="chip">{s}</Link>)}</div>}
          <p className="mt-8 flex items-center gap-4 text-xs text-muted"><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Posted {ago(j.publishedAt)}</span>{j.closesAt && <span>Closes {j.closesAt.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>}</p>
        </article>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {j.status === "OPEN" && <ApplyForm jobId={j.id} title={j.title} company={j.org.name} signedIn={ctx?.user ? { name: ctx.user.name, email: ctx.user.email } : undefined} />}
          <div className="card p-5">
            <div className="flex items-center gap-3"><CompanyMark name={j.org.name} logoUrl={j.org.logoUrl} color={j.org.brandColor ?? undefined} size={40} /><span className="min-w-0"><b className="flex items-center gap-1 text-[14px]">{j.org.name}{verified && <VerifiedTick className="h-3.5 w-3.5" />}</b><small className="text-xs text-muted">{j.org.industry}</small></span></div>
            {j.org.tagline && <p className="mt-3 text-[13px] text-muted">{j.org.tagline}</p>}
            {j.org.teamSize && <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Users className="h-3.5 w-3.5" />{j.org.teamSize} people</p>}
            {more.length > 0 && <><b className="eyebrow mt-4 block">More jobs here</b><ul className="mt-2 space-y-1 text-[13px]">{more.map((m) => <li key={m.slug}><Link href={`/jobs/${m.slug}`} className="font-semibold text-blue">{m.title}</Link>{m.city && <span className="text-muted"> · {m.city}</span>}</li>)}</ul></>}
            {j.org.publicProfile && <Link href={`/companies/${j.org.slug}`} className="btn mt-4 w-full">View company</Link>}
          </div>
          <Sponsored placement="jobs" compact />
        </aside>
      </div>
    </div>
  );
}
