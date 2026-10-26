import Link from "next/link";
import { Search, Star, BookOpen, Clock, Award, Infinity as Inf } from "lucide-react";
import { db } from "@/lib/db";
import { ACADEMY_PASS } from "@/lib/academy";
import { VerifiedTick } from "@/components/logo";
import { Sponsored } from "@/components/sponsored";
import { PassButton } from "@/components/academy-actions";
import { money } from "@/lib/public";

export const metadata = { title: "Academy", description: "Practical courses on business, marketing, AI, safety and trades. Free and paid, with verifiable certificates." };

type SP = Promise<Record<string, string | undefined>>;

export default async function AcademyCatalog({ searchParams }: { searchParams: SP }) {
  const p = await searchParams;
  const q = p.q?.trim();
  const where = {
    published: true, isPublic: true,
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { summary: { contains: q, mode: "insensitive" as const } }, { tags: { has: q.toLowerCase() } }] } : {}),
    ...(p.category ? { category: p.category } : {}), ...(p.level ? { level: p.level } : {}),
    ...(p.price === "free" ? { priceCents: 0 } : p.price === "paid" ? { priceCents: { gt: 0 } } : {}),
  };
  const [rows, cats] = await Promise.all([
    db.course.findMany({ where, orderBy: [{ featured: "desc" }, { enrollCount: "desc" }, { createdAt: "desc" }], take: 120, include: { org: { select: { name: true, verificationStatus: true } }, _count: { select: { lessons: true } } } }),
    db.course.groupBy({ by: ["category"], where: { published: true, isPublic: true }, _count: true }),
  ]);
  const link = (k: string, v?: string) => {
    const merged: Record<string, string | undefined> = { ...p, [k]: v };
    const u = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => Boolean(e[1])));
    return `/academy${u.size ? `?${u}` : ""}`;
  };
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_80%_0,rgba(35,66,224,.55),transparent),radial-gradient(40%_60%_at_0_100%,rgba(142,162,255,.25),transparent)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_380px]">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[.16em] text-[#9DB0FF]">OENOD Academy</span>
            <h1 className="mt-3 max-w-2xl text-balance font-display text-[38px] font-semibold leading-[1.05] tracking-tight sm:text-[54px]">Learn the skills that grow a business.</h1>
            <p className="mt-4 max-w-xl text-[16px] leading-7 text-[#C9D4FF]">Short, practical courses written for owners, managers and teams. Many are free. Finish one and get a certificate anyone can verify.</p>
            <form className="mt-7 flex max-w-xl gap-2 rounded-2xl bg-white p-2"><label className="flex flex-1 items-center gap-2 px-3 text-ink"><Search className="h-4 w-4 text-muted" /><input name="q" defaultValue={q} placeholder="What do you want to learn?" className="h-11 w-full bg-transparent outline-none" /></label><button className="btn-pri h-11 px-6">Search</button></form>
          </div>
          <div className="rounded-[22px] border border-white/15 bg-white/[.06] p-6 backdrop-blur">
            <span className="flex items-center gap-2 font-display text-lg"><Inf className="h-5 w-5 text-[#9DB0FF]" />Academy Pass</span>
            <p className="mt-2 text-[13.5px] leading-6 text-[#C9D4FF]">Every OENOD course unlocked, new ones every month, with certificates.</p>
            <div className="mt-4 flex items-end gap-2"><b className="font-display text-4xl">{money(ACADEMY_PASS.month.cents)}</b><span className="pb-1 text-sm text-[#C9D4FF]">/ month</span></div>
            <small className="text-xs text-[#9DB0FF]">or {money(ACADEMY_PASS.year.cents)} a year · cancel any time</small>
            <div className="mt-5 grid grid-cols-2 gap-2"><PassButton kind="PASS_MONTH" label="Monthly" /><PassButton kind="PASS_YEAR" label="Yearly" light /></div>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
          <Link href={link("category")} className={!p.category ? "chip border-navy bg-navy text-white" : "chip"}>All</Link>
          {cats.sort((a, b) => b._count - a._count).map((c) => <Link key={c.category} href={link("category", c.category)} className={p.category === c.category ? "chip border-navy bg-navy text-white" : "chip"}>{c.category} <span className="opacity-60">{c._count}</span></Link>)}
          <span className="ms-auto flex gap-2">
            {[["free", "Free"], ["paid", "Paid"]].map(([k, l]) => <Link key={k} href={link("price", p.price === k ? undefined : k)} className={p.price === k ? "chip border-blue bg-sky text-blue" : "chip"}>{l}</Link>)}
            {["Beginner", "Intermediate", "Advanced"].map((l) => <Link key={l} href={link("level", p.level === l ? undefined : l)} className={p.level === l ? "chip border-blue bg-sky text-blue" : "chip"}>{l}</Link>)}
          </span>
        </div>
        <Sponsored placement="academy" n={3} className="mt-6" />
        {!rows.length ? <p className="py-16 text-center text-muted">No courses match. Try another search.</p> : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((c) => (
              <Link key={c.id} href={`/academy/${c.slug}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="relative aspect-[16/9] overflow-hidden bg-navy">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/academy/cover/${c.slug}`} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  {c.priceCents === 0 && <span className="absolute start-3 top-3 rounded-md bg-white px-2 py-0.5 text-[10.5px] font-bold text-navy">FREE</span>}
                  {c.featured && c.priceCents > 0 && <span className="absolute start-3 top-3 rounded-md bg-[#FFB020] px-2 py-0.5 text-[10.5px] font-bold text-white">BESTSELLER</span>}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <small className="text-[11.5px] font-semibold text-blue">{c.category} · {c.level}</small>
                  <b className="mt-1 line-clamp-2 font-display text-[15.5px] leading-snug">{c.title}</b>
                  <small className="mt-1 flex items-center gap-1 text-xs text-muted">{c.org ? c.org.name : "OENOD Academy"}{(!c.org || c.org.verificationStatus === "VERIFIED") && <VerifiedTick className="h-3.5 w-3.5" />}</small>
                  <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-muted">
                    <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-[#FFB020] text-[#FFB020]" />{c.rating.toFixed(1)}</span>
                    <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{c._count.lessons}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{c.durationMin < 60 ? `${c.durationMin} min` : `${Math.round(c.durationMin / 6) / 10} h`}</span>
                    {c.certificate && <Award className="h-3.5 w-3.5" />}
                    <span className="ms-auto text-[14px] font-bold text-ink">{c.priceCents ? <>{c.compareAtCents && <s className="me-1 text-xs font-normal text-muted">{money(c.compareAtCents, c.currency)}</s>}{money(c.priceCents, c.currency)}</> : "Free"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          <div className="card p-7"><b className="font-display text-xl">Train your whole team</b><p className="mt-2 text-[13.5px] text-muted">Assign courses, track progress and issue certificates with your logo. Volume discounts on seats.</p><Link href="/signup?next=/app/academy" className="btn-pri mt-5">Start with OENOD</Link></div>
          <div className="card p-7"><b className="font-display text-xl">Teach on OENOD</b><p className="mt-2 text-[13.5px] text-muted">Turn your know-how into a course. Build it in minutes, sell it to the whole OENOD network, keep most of the revenue.</p><Link href="/signup?next=/app/academy" className="btn mt-5">Create a course</Link></div>
        </div>
      </div>
    </>
  );
}
