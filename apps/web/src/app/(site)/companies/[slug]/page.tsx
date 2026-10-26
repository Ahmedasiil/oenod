import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, Mail, Phone, MapPin, Star, Briefcase, GraduationCap, Clock, CalendarDays, Users, ShieldCheck, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { getCtx } from "@/lib/auth";
import { CompanyMark, VerifiedTick } from "@/components/logo";
import { Sponsored } from "@/components/sponsored";
import { FollowButton } from "@/components/site-forms";
import { CompanyMap } from "@/components/company-map";
import { EMPLOYMENT, WORKPLACE, ago, money, salary } from "@/lib/public";

type P = { params: Promise<{ slug: string }> };
const DAYS = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]];
const safeUrl = (u?: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

async function load(slug: string) {
  const o = await db.organization.findUnique({ where: { slug } });
  return o?.publicProfile ? o : null;
}

export async function generateMetadata({ params }: P) {
  const o = await load((await params).slug);
  if (!o) return { title: "Company" };
  return { title: o.name, description: o.tagline ?? o.about?.slice(0, 160) ?? `${o.name} on OENOD`, openGraph: { title: o.name, images: o.coverUrl ? [o.coverUrl] : undefined } };
}

export default async function Company({ params }: P) {
  const o = await load((await params).slug);
  if (!o) notFound();
  const ctx = await getCtx().catch(() => null);
  const [jobs, courses, reviews, rating, followers, locations, following] = await Promise.all([
    db.jobPosting.findMany({ where: { orgId: o.id, status: "OPEN", isPublic: true }, orderBy: { publishedAt: "desc" }, take: 20 }),
    db.course.findMany({ where: { orgId: o.id, isPublic: true, published: true }, select: { slug: true, title: true, summary: true, priceCents: true, currency: true }, take: 12 }),
    db.review.findMany({ where: { orgId: o.id, rating: { gte: 1 } }, select: { id: true, author: true, rating: true, text: true, source: true, postedAt: true, reply: true }, orderBy: { postedAt: "desc" }, take: 8 }),
    db.review.aggregate({ where: { orgId: o.id, rating: { gte: 1 } }, _avg: { rating: true }, _count: true }),
    db.companyFollow.count({ where: { orgId: o.id } }),
    db.location.findMany({ where: { orgId: o.id }, select: { name: true, address: true, lat: true, lng: true } }),
    ctx?.user ? db.companyFollow.findUnique({ where: { orgId_userId: { orgId: o.id, userId: ctx.user.id } } }) : null,
  ]);
  const verified = o.verificationStatus === "VERIFIED";
  const addr = (o.address ?? {}) as Record<string, string>;
  const addrLine = [addr.line1, addr.city, addr.region, addr.postalCode].filter(Boolean).join(", ");
  const hours = (o.hours ?? {}) as Record<string, string>;
  const social = Object.entries((o.social ?? {}) as Record<string, string>).filter(([, u]) => safeUrl(u));
  const places = [...(o.lat && o.lng ? [{ name: o.name, lat: o.lat, lng: o.lng, sub: addrLine }] : []), ...locations.filter((l) => l.lat && l.lng).map((l) => ({ name: l.name, lat: l.lat!, lng: l.lng! }))];
  const avg = rating._avg.rating ? Math.round(rating._avg.rating * 10) / 10 : null;
  const color = o.brandColor ?? "#000F55";
  const website = safeUrl(o.website);
  const ld = { "@context": "https://schema.org", "@type": "LocalBusiness", name: o.name, description: o.tagline ?? undefined, url: website ?? undefined, telephone: o.phone ?? undefined, image: o.logoUrl ?? undefined, address: addr.city ? { "@type": "PostalAddress", streetAddress: addr.line1, addressLocality: addr.city, addressRegion: addr.region, postalCode: addr.postalCode, addressCountry: addr.country } : undefined, aggregateRating: avg ? { "@type": "AggregateRating", ratingValue: avg, reviewCount: rating._count } : undefined };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <div className="h-48 bg-cover bg-center sm:h-64" style={o.coverUrl ? { backgroundImage: `url(${JSON.stringify(o.coverUrl)})` } : { background: `radial-gradient(70% 120% at 80% 0, #2342E0, transparent), ${color}` }} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end">
          <div className="w-fit rounded-[22px] bg-white p-1.5 shadow-lift"><CompanyMark name={o.name} logoUrl={o.logoUrl} color={color} size={104} /></div>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-[30px] font-semibold leading-tight tracking-tight sm:text-[38px]">{o.name}{verified && <VerifiedTick className="h-7 w-7" />}</h1>
            {o.tagline && <p className="mt-1 text-[15px] text-muted">{o.tagline}</p>}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
              {addr.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{addr.city}{addr.region ? `, ${addr.region}` : ""}</span>}
              {avg && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-[#FFB020] text-[#FFB020]" /><b className="text-ink">{avg}</b> ({rating._count} reviews)</span>}
              {o.teamSize && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{o.teamSize} people</span>}
              {o.foundedYear && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Since {o.foundedYear}</span>}
            </div>
          </div>
          <div className="flex gap-2 pb-1">
            <FollowButton slug={o.slug} initial={Boolean(following)} signedIn={Boolean(ctx?.user)} count={followers} />
            {website && <a href={website} target="_blank" rel="noopener nofollow" className="btn"><Globe className="h-4 w-4" />Website</a>}
          </div>
        </div>

        <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-10">
            {o.about && <section><h2 className="font-display text-xl font-semibold">About</h2><p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-[#2B3150]">{o.about}</p></section>}
            {o.services.length > 0 && <section><h2 className="font-display text-xl font-semibold">Services</h2><div className="mt-3 flex flex-wrap gap-2">{o.services.map((s) => <span key={s} className="rounded-xl border border-line bg-white px-3 py-1.5 text-[13.5px]">{s}</span>)}</div></section>}
            {o.gallery.length > 0 && <section><h2 className="font-display text-xl font-semibold">Photos</h2><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{o.gallery.filter((g) => safeUrl(g) || g.startsWith("/")).slice(0, 9).map((g) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={g} src={g} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />)}</div></section>}
            <section id="jobs">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Briefcase className="h-5 w-5 text-blue" />Open jobs <span className="text-base font-normal text-muted">{jobs.length}</span></h2>
              {!jobs.length ? <p className="mt-3 text-[14px] text-muted">No open jobs right now. Follow {o.name} to hear when they're hiring.</p> : (
                <ul className="mt-3 space-y-2">{jobs.map((j) => (
                  <li key={j.id}><Link href={`/jobs/${j.slug}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-[#C9D4FF] hover:shadow-card">
                    <span className="min-w-0 flex-1"><b className="block text-[15px]">{j.title}</b><small className="text-[12.5px] text-muted">{[j.city, WORKPLACE[j.workplace], EMPLOYMENT[j.employmentType]].filter(Boolean).join(" · ")} · {ago(j.publishedAt)}</small></span>
                    {salary(j) && <b className="hidden text-[13.5px] sm:block">{salary(j)}</b>}
                    <ArrowRight className="h-4 w-4 text-muted rtl:rotate-180" />
                  </Link></li>
                ))}</ul>
              )}
            </section>
            {courses.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><GraduationCap className="h-5 w-5 text-blue" />Courses</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">{courses.map((c) => (
                  <Link key={c.slug} href={`/academy/${c.slug}`} className="card overflow-hidden transition hover:shadow-lift">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/academy/cover/${c.slug}`} alt="" loading="lazy" className="aspect-[16/7] w-full object-cover" />
                    <span className="block p-4"><b className="block text-[14.5px]">{c.title}</b><small className="text-xs text-muted">{c.priceCents ? money(c.priceCents, c.currency) : "Free"}</small></span>
                  </Link>
                ))}</div>
              </section>
            )}
            <section>
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Star className="h-5 w-5 text-[#FFB020]" />Reviews {avg && <span className="text-base font-normal text-muted">{avg} average from {rating._count}</span>}</h2>
              {!reviews.length ? <p className="mt-3 text-[14px] text-muted">No reviews yet.</p> : (
                <ul className="mt-3 grid gap-3 md:grid-cols-2">{reviews.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-line p-4">
                    <div className="flex items-center gap-2"><b className="text-[14px]">{r.author}</b><span className="text-[13px] tracking-tight text-[#FFB020]">{"★".repeat(Math.min(5, r.rating))}<span className="text-line">{"★".repeat(Math.max(0, 5 - r.rating))}</span></span><small className="ms-auto text-xs text-muted">{r.source ? `${r.source} · ` : ""}{ago(r.postedAt)}</small></div>
                    {r.text && <p className="mt-2 line-clamp-5 text-[13.5px] leading-6 text-[#2B3150]">{r.text}</p>}
                    {r.reply && <p className="mt-3 rounded-xl bg-bg px-3 py-2 text-[12.5px] text-muted"><b className="text-ink">Reply from {o.name}:</b> {r.reply}</p>}
                  </li>
                ))}</ul>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            {verified && (
              <div className="flex items-start gap-3 rounded-2xl border border-[#C9D4FF] bg-sky/50 p-4">
                <ShieldCheck className="h-5 w-5 shrink-0 text-blue" />
                <p className="text-[12.5px] leading-5"><b className="block text-[13.5px]">Verified by OENOD</b>We confirmed {o.legalName ?? o.name}'s registration and contact details{o.verifiedAt ? ` on ${o.verifiedAt.toLocaleDateString("en-CA", { dateStyle: "medium" })}` : ""}.</p>
              </div>
            )}
            <div className="card space-y-3 p-5 text-[13.5px]">
              <b className="eyebrow">Contact</b>
              {addrLine && <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />{addrLine}</p>}
              {o.phone && <p className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><a href={`tel:${o.phone.replace(/[^\d+]/g, "")}`} className="hover:text-blue">{o.phone}</a></p>}
              {o.email && <p className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><a href={`mailto:${o.email}`} className="break-all hover:text-blue">{o.email}</a></p>}
              {website && <p className="flex gap-2"><Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><a href={website} target="_blank" rel="noopener nofollow" className="break-all hover:text-blue">{website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></p>}
              {social.length > 0 && <div className="flex flex-wrap gap-1.5 pt-1">{social.map(([k, u]) => <a key={k} href={u} target="_blank" rel="noopener nofollow" className="chip capitalize">{k}</a>)}</div>}
            </div>
            {places.length > 0 && <div className="card overflow-hidden"><CompanyMap places={places} /></div>}
            {Object.keys(hours).length > 0 && (
              <div className="card p-5">
                <b className="eyebrow flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Hours</b>
                <ul className="mt-3 space-y-1.5 text-[13px]">{DAYS.map(([k, d]) => <li key={k} className="flex justify-between"><span className="text-muted">{d}</span><span className="font-semibold">{hours[k] || "Closed"}</span></li>)}</ul>
              </div>
            )}
            <Sponsored placement="web_feed" compact />
            <p className="px-1 text-[11.5px] text-muted">On OENOD since {o.createdAt.toLocaleDateString("en-CA", { month: "long", year: "numeric" })}.</p>
          </aside>
        </div>
      </div>
    </>
  );
}
