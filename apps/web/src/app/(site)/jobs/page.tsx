import Link from "next/link";
import { Search, MapPin, Briefcase, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { CompanyMark, VerifiedTick } from "@/components/logo";
import { Sponsored } from "@/components/sponsored";
import { JobAlert } from "@/components/site-forms";
import { EMPLOYMENT, WORKPLACE, ago, salary } from "@/lib/public";

export const metadata = { title: "Jobs", description: "Search jobs at verified local businesses. Apply in a minute, no account needed." };

type SP = Promise<Record<string, string | undefined>>;

export default async function Jobs({ searchParams }: { searchParams: SP }) {
  const p = await searchParams;
  const q = p.q?.trim(), city = p.city?.trim(), page = Math.max(1, Number(p.page) || 1);
  const company = p.company ? await db.organization.findUnique({ where: { slug: p.company }, select: { id: true, name: true } }) : null;
  const where = {
    status: "OPEN", isPublic: true,
    ...(company ? { orgId: company.id } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }, { skills: { has: q.toLowerCase() } }, { org: { name: { contains: q, mode: "insensitive" as const } } }] } : {}),
    ...(city ? { city: { contains: city, mode: "insensitive" as const } } : {}),
    ...(p.category ? { category: p.category } : {}), ...(p.workplace ? { workplace: p.workplace } : {}), ...(p.type ? { employmentType: p.type } : {}),
  };
  const [rows, total, cats] = await Promise.all([
    db.jobPosting.findMany({ where, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: 20, skip: (page - 1) * 20, include: { org: { select: { name: true, slug: true, logoUrl: true, brandColor: true, verificationStatus: true } } } }),
    db.jobPosting.count({ where }),
    db.jobPosting.groupBy({ by: ["category"], where: { status: "OPEN", isPublic: true }, _count: true }),
  ]);
  const link = (patch: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = { ...p, page: undefined, ...patch };
    const u = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => Boolean(e[1])));
    return `/jobs${u.size ? `?${u}` : ""}`;
  };
  const pages = Math.ceil(total / 20);
  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-sky/60 to-white">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6">
          <span className="eyebrow">OENOD Jobs</span>
          <h1 className="mt-2 font-display text-[36px] font-semibold tracking-tight sm:text-[48px]">{company ? `Jobs at ${company.name}` : "Find work you'll love"}</h1>
          <p className="mt-2 max-w-xl text-[15px] text-muted">Real jobs at local businesses. Apply in a minute, no account needed.</p>
          <form className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-line bg-white p-2 shadow-card">
            <label className="flex min-w-[200px] flex-[2] items-center gap-2 px-3"><Search className="h-4 w-4 shrink-0 text-muted" /><input name="q" defaultValue={q} placeholder="Job title, skill or company" className="h-11 w-full bg-transparent outline-none" /></label>
            <label className="flex min-w-[160px] flex-1 items-center gap-2 border-line px-3 sm:border-s"><MapPin className="h-4 w-4 shrink-0 text-muted" /><input name="city" defaultValue={city} placeholder="City" className="h-11 w-full bg-transparent outline-none" /></label>
            {p.company && <input type="hidden" name="company" value={p.company} />}
            <button className="btn-pri h-11 px-6">Search</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2 text-[12.5px]">
            {Object.entries(WORKPLACE).map(([k, v]) => <Link key={k} href={link({ workplace: p.workplace === k ? undefined : k })} className={p.workplace === k ? "chip border-navy bg-navy text-white" : "chip bg-white"}>{v}</Link>)}
            {Object.entries(EMPLOYMENT).slice(0, 4).map(([k, v]) => <Link key={k} href={link({ type: p.type === k ? undefined : k })} className={p.type === k ? "chip border-navy bg-navy text-white" : "chip bg-white"}>{v}</Link>)}
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="hidden lg:block">
          <b className="eyebrow">Categories</b>
          <ul className="mt-3 space-y-0.5 text-[13.5px]">
            <li><Link href={link({ category: undefined })} className={!p.category ? "block rounded-lg bg-sky px-3 py-1.5 font-bold text-blue" : "block rounded-lg px-3 py-1.5 hover:bg-bg"}>All jobs</Link></li>
            {cats.sort((a, b) => b._count - a._count).map((c) => <li key={c.category}><Link href={link({ category: c.category })} className={p.category === c.category ? "flex justify-between rounded-lg bg-sky px-3 py-1.5 font-bold text-blue" : "flex justify-between rounded-lg px-3 py-1.5 hover:bg-bg"}><span>{c.category}</span><small className="text-muted">{c._count}</small></Link></li>)}
          </ul>
        </aside>
        <div className="min-w-0">
          <p className="mb-3 text-[13px] text-muted">{total.toLocaleString()} job{total === 1 ? "" : "s"}{q ? ` for “${q}”` : ""}{city ? ` in ${city}` : ""}</p>
          {!rows.length ? (
            <div className="rounded-2xl border border-dashed border-line p-10 text-center"><Briefcase className="mx-auto h-6 w-6 text-muted" /><b className="mt-3 block">No jobs match yet</b><p className="mt-1 text-[13.5px] text-muted">Try a broader search, or get an email when one is posted.</p></div>
          ) : (
            <ul className="space-y-3">
              {rows.map((j, i) => (
                <li key={j.id}>
                  {i === 4 && <Sponsored placement="jobs" className="mb-3" />}
                  <Link href={`/jobs/${j.slug}`} className="card group flex gap-4 p-4 transition hover:border-[#C9D4FF] hover:shadow-lift sm:p-5">
                    <CompanyMark name={j.org.name} logoUrl={j.org.logoUrl} color={j.org.brandColor ?? undefined} size={48} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2"><b className="font-display text-[16.5px] group-hover:text-blue">{j.title}</b>{j.featured && <span className="rounded-md bg-sky px-1.5 py-0.5 text-[10.5px] font-bold text-blue">Featured</span>}</span>
                      <small className="mt-0.5 flex items-center gap-1 text-[13px] text-muted">{j.org.name}{j.org.verificationStatus === "VERIFIED" && <VerifiedTick className="h-3.5 w-3.5" />}</small>
                      <span className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
                        {j.city && <span className="chip"><MapPin className="h-3 w-3" />{j.city}</span>}
                        <span className="chip">{WORKPLACE[j.workplace] ?? j.workplace}</span>
                        <span className="chip">{EMPLOYMENT[j.employmentType] ?? j.employmentType}</span>
                      </span>
                    </span>
                    <span className="hidden shrink-0 flex-col items-end justify-between text-end sm:flex">
                      {salary(j) ? <b className="text-[14px]">{salary(j)}</b> : <span />}
                      <small className="text-xs text-muted">{ago(j.publishedAt)}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
              {page > 1 && <Link href={link({ page: String(page - 1) })} className="btn"><ChevronLeft className="h-4 w-4 rtl:rotate-180" />Previous</Link>}
              <span className="px-3 text-muted">Page {page} of {pages}</span>
              {page < pages && <Link href={link({ page: String(page + 1) })} className="btn">Next<ChevronRight className="h-4 w-4 rtl:rotate-180" /></Link>}
            </nav>
          )}
        </div>
        <aside className="space-y-4">
          <JobAlert q={q} city={city} />
          <div className="navy-panel p-5">
            <b className="font-display text-lg">Hiring?</b>
            <p className="mt-1 text-[13px] text-[#C9D4FF]">Post a job in one click. The AI writes the ad and shortlists applicants for you.</p>
            <Link href="/signup?next=/app/recruiting" className="btn mt-4 w-full border-transparent bg-white text-navy">Post a job<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>
          </div>
          <Sponsored placement="jobs" compact />
        </aside>
      </div>
    </>
  );
}
