import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, BookOpen, Clock, Award, Check, Lock, PlayCircle, Users, ChevronLeft, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { getCtx } from "@/lib/auth";
import { hasAccess, ACADEMY_PASS } from "@/lib/academy";
import { VerifiedTick } from "@/components/logo";
import { EnrollButton, PassButton } from "@/components/academy-actions";
import { Markdown } from "@/components/markdown";
import { money } from "@/lib/public";

type P = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return db.course.findUnique({ where: { slug }, include: { lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, durationMin: true, isPreview: true, order: true } }, org: { select: { name: true, slug: true, verificationStatus: true, publicProfile: true } } } });
}

export async function generateMetadata({ params }: P) {
  const c = await load((await params).slug);
  if (!c || !c.published || !c.isPublic) return { title: "Course" };
  return { title: c.title, description: c.summary, openGraph: { title: c.title, description: c.summary, images: [`/api/academy/cover/${c.slug}`] } };
}

export default async function CoursePage({ params }: P) {
  const c = await load((await params).slug);
  const ctx = await getCtx().catch(() => null);
  if (!c || !c.published || (!c.isPublic && ctx?.org?.id !== c.orgId)) notFound();
  const access = await hasAccess(ctx?.user?.id, c.id);
  const enrolled = ctx?.user ? await db.enrollment.findUnique({ where: { courseId_userId: { courseId: c.id, userId: ctx.user.id } } }) : null;
  const owned = Boolean(enrolled) && access;
  const by = c.org ? { name: c.org.name, verified: c.org.verificationStatus === "VERIFIED", href: c.org.publicProfile ? `/companies/${c.org.slug}` : null } : { name: "OENOD Academy", verified: true, href: null };
  const label = enrolled ? (enrolled.completedAt ? "Review course" : enrolled.progress ? "Continue learning" : "Start learning") : c.priceCents && !access ? `Buy for ${money(c.priceCents, c.currency)}` : "Start free";
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_90%_0,rgba(35,66,224,.6),transparent)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <Link href="/academy" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#C9D4FF] hover:text-white"><ChevronLeft className="h-4 w-4 rtl:rotate-180" />Academy</Link>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[.16em] text-[#9DB0FF]">{c.category} · {c.level}</p>
            <h1 className="mt-2 text-balance font-display text-[34px] font-semibold leading-[1.08] tracking-tight sm:text-[46px]">{c.title}</h1>
            <p className="mt-4 max-w-2xl text-[16px] leading-7 text-[#C9D4FF]">{c.summary}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[#C9D4FF]">
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-[#FFB020] text-[#FFB020]" /><b className="text-white">{c.rating.toFixed(1)}</b></span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4" />{c.enrollCount.toLocaleString()} learners</span>
              <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" />{c.lessons.length} lessons</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{c.durationMin < 60 ? `${c.durationMin} min` : `${Math.round(c.durationMin / 6) / 10} hours`}</span>
              {c.certificate && <span className="flex items-center gap-1"><Award className="h-4 w-4" />Certificate</span>}
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-[13.5px]">By {by.href ? <Link href={by.href} className="font-bold underline-offset-4 hover:underline">{by.name}</Link> : <b>{by.name}</b>}{by.verified && <VerifiedTick />}</p>
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-10">
          {c.outcomes.length > 0 && (
            <section className="rounded-[22px] border border-line p-6">
              <h2 className="font-display text-xl font-semibold">What you'll learn</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">{c.outcomes.map((o) => <li key={o} className="flex gap-2 text-[14px]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue" />{o}</li>)}</ul>
            </section>
          )}
          <section>
            <h2 className="font-display text-xl font-semibold">Course content</h2>
            <ol className="mt-4 divide-y divide-line overflow-hidden rounded-[18px] border border-line">
              {c.lessons.map((l, i) => {
                const open = access || l.isPreview;
                return (
                  <li key={l.id} className="flex items-center gap-3 px-4 py-3.5 text-[14px]">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bg font-mono text-xs text-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{l.title}</span>
                    {l.isPreview && !access && <Link href={`/academy/learn/${c.slug}?lesson=${l.id}`} className="text-xs font-bold text-blue">Preview</Link>}
                    <small className="text-xs text-muted">{l.durationMin} min</small>
                    {open ? <PlayCircle className="h-4 w-4 text-blue" /> : <Lock className="h-4 w-4 text-muted" />}
                  </li>
                );
              })}
            </ol>
          </section>
          {c.description && <section><h2 className="font-display text-xl font-semibold">About this course</h2><div className="mt-3"><Markdown text={c.description} /></div></section>}
          {c.audience && <section><h2 className="font-display text-xl font-semibold">Who it's for</h2><p className="mt-2 text-[14.5px] leading-7 text-[#2B3150]">{c.audience}</p></section>}
        </div>
        <aside className="lg:-mt-48">
          <div className="card sticky top-20 overflow-hidden shadow-lift">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/academy/cover/${c.slug}`} alt="" className="aspect-[16/9] w-full object-cover" />
            <div className="space-y-4 p-6">
              {!owned && <div className="flex items-end gap-2"><b className="font-display text-[34px] leading-none">{c.priceCents ? money(c.priceCents, c.currency) : "Free"}</b>{c.compareAtCents && c.priceCents > 0 && <s className="pb-1 text-muted">{money(c.compareAtCents, c.currency)}</s>}</div>}
              {enrolled && <div><div className="h-2 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-blue" style={{ width: `${enrolled.progress}%` }} /></div><small className="mt-1 block text-xs text-muted">{enrolled.completedAt ? "Completed" : `${enrolled.progress}% complete`}</small></div>}
              <EnrollButton courseId={c.id} slug={c.slug} priced={c.priceCents > 0} owned={owned} label={label} />
              {enrolled?.certificateCode && <Link href={`/verify/${enrolled.certificateCode}`} className="btn w-full"><Award className="h-4 w-4" />View my certificate</Link>}
              {c.priceCents > 0 && !c.orgId && !access && (
                <div className="rounded-2xl bg-sky/60 p-4 text-[13px]">
                  <b>Or get every OENOD course</b>
                  <p className="mt-1 text-muted">Academy Pass from {money(ACADEMY_PASS.month.cents)}/month.</p>
                  <div className="mt-3 [&_button]:h-9 [&_button]:w-full [&_button]:border-line [&_button]:bg-navy [&_button]:text-white"><PassButton kind="PASS_MONTH" label="Get the Pass" /></div>
                </div>
              )}
              <ul className="space-y-2 text-[13px] text-muted">
                <li className="flex items-center gap-2"><Clock className="h-4 w-4" />Learn at your own pace</li>
                {c.certificate && <li className="flex items-center gap-2"><Award className="h-4 w-4" />Certificate with a QR code to verify</li>}
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />{c.priceCents ? "Lifetime access once purchased" : "Free, no card needed"}</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
