import Link from "next/link";
import { Search, MapPin, Briefcase, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { CompanyMark, VerifiedTick } from "@/components/logo";
import { Sponsored } from "@/components/sponsored";

export const metadata = { title: "Business directory", description: "Find local businesses on OENOD. Verified companies carry the blue badge." };

type SP = Promise<Record<string, string | undefined>>;

export default async function Companies({ searchParams }: { searchParams: SP }) {
  const p = await searchParams;
  const q = p.q?.trim(), city = p.city?.trim(), page = Math.max(1, Number(p.page) || 1);
  const where = {
    publicProfile: true, subscriptionStatus: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] as ("TRIALING" | "ACTIVE" | "PAST_DUE")[] },
    ...(p.verified === "1" ? { verificationStatus: "VERIFIED" as const } : {}),
    ...(p.industry ? { industry: p.industry } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { tagline: { contains: q, mode: "insensitive" as const } }, { services: { has: q } }] } : {}),
    ...(city ? { address: { path: ["city"], string_contains: city } } : {}),
  };
  const [rows, total, industries] = await Promise.all([
    db.organization.findMany({ where, orderBy: [{ verificationStatus: "desc" }, { createdAt: "desc" }], take: 24, skip: (page - 1) * 24, select: { name: true, slug: true, tagline: true, industry: true, logoUrl: true, coverUrl: true, brandColor: true, address: true, verificationStatus: true, services: true, _count: { select: { jobs: { where: { status: "OPEN", isPublic: true } }, followers: true } } } }),
    db.organization.count({ where }),
    db.organization.groupBy({ by: ["industry"], where: { publicProfile: true }, _count: true }),
  ]);
  const link = (patch: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = { ...p, page: undefined, ...patch };
    const u = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => Boolean(e[1])));
    return `/companies${u.size ? `?${u}` : ""}`;
  };
  const pages = Math.ceil(total / 24);
  const nice = (s: string) => s.replace(/[_-]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-sky/60 to-white">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6">
          <span className="eyebrow">Business directory</span>
          <h1 className="mt-2 font-display text-[36px] font-semibold tracking-tight sm:text-[48px]">Discover businesses near you</h1>
          <p className="mt-2 max-w-xl text-[15px] text-muted">Companies on OENOD, with their jobs, courses and reviews. The blue badge means we verified who they are.</p>
          <form className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-line bg-white p-2 shadow-card">
            <label className="flex min-w-[200px] flex-[2] items-center gap-2 px-3"><Search className="h-4 w-4 shrink-0 text-muted" /><input name="q" defaultValue={q} placeholder="Company or service" className="h-11 w-full bg-transparent outline-none" /></label>
            <label className="flex min-w-[160px] flex-1 items-center gap-2 border-line px-3 sm:border-s"><MapPin className="h-4 w-4 shrink-0 text-muted" /><input name="city" defaultValue={city} placeholder="City" className="h-11 w-full bg-transparent outline-none" /></label>
            <button className="btn-pri h-11 px-6">Search</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2 text-[12.5px]">
            <Link href={link({ verified: p.verified ? undefined : "1" })} className={p.verified ? "chip border-blue bg-sky text-blue" : "chip bg-white"}><VerifiedTick className="h-3.5 w-3.5" />Verified only</Link>
            {industries.sort((a, b) => b._count - a._count).slice(0, 10).map((i) => <Link key={i.industry} href={link({ industry: p.industry === i.industry ? undefined : i.industry })} className={p.industry === i.industry ? "chip border-navy bg-navy text-white" : "chip bg-white"}>{nice(i.industry)}</Link>)}
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Sponsored placement="directory" n={3} className="mb-6" />
        <p className="mb-4 text-[13px] text-muted">{total.toLocaleString()} compan{total === 1 ? "y" : "ies"}</p>
        {!rows.length ? <p className="rounded-2xl border border-dashed border-line p-12 text-center text-muted">No companies match yet.</p> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((o) => {
              const cityName = (o.address as Record<string, string> | null)?.city;
              return (
                <Link key={o.slug} href={`/companies/${o.slug}`} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="h-24 bg-cover bg-center" style={o.coverUrl ? { backgroundImage: `url(${JSON.stringify(o.coverUrl)})` } : { background: `linear-gradient(135deg, ${o.brandColor ?? "#000F55"}, #2342E0)` }} />
                  <div className="-mt-7 px-5 pb-5">
                    <div className="inline-block rounded-[14px] bg-white p-1 shadow-card"><CompanyMark name={o.name} logoUrl={o.logoUrl} color={o.brandColor ?? undefined} size={52} /></div>
                    <b className="mt-2 flex items-center gap-1.5 font-display text-[17px] group-hover:text-blue">{o.name}{o.verificationStatus === "VERIFIED" && <VerifiedTick />}</b>
                    <p className="mt-1 line-clamp-2 min-h-[40px] text-[13px] text-muted">{o.tagline ?? nice(o.industry)}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      {cityName && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{cityName}</span>}
                      {o._count.jobs > 0 && <span className="flex items-center gap-1 font-semibold text-blue"><Briefcase className="h-3.5 w-3.5" />{o._count.jobs} open job{o._count.jobs === 1 ? "" : "s"}</span>}
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{o._count.followers} followers</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {pages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
            {page > 1 && <Link href={link({ page: String(page - 1) })} className="btn"><ChevronLeft className="h-4 w-4 rtl:rotate-180" />Previous</Link>}
            <span className="px-3 text-muted">Page {page} of {pages}</span>
            {page < pages && <Link href={link({ page: String(page + 1) })} className="btn">Next<ChevronRight className="h-4 w-4 rtl:rotate-180" /></Link>}
          </nav>
        )}
        <div className="navy-panel mt-14 flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center">
          <span className="flex-1"><b className="font-display text-2xl">List your business</b><p className="mt-1 text-[14px] text-[#C9D4FF]">Every OENOD company gets a free public profile with jobs, courses, reviews and a booking link. Get verified for the blue badge.</p></span>
          <Link href="/signup" className="btn border-transparent bg-white text-navy">Get started free</Link>
        </div>
      </div>
    </>
  );
}
