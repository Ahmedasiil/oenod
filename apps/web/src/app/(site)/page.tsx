import Link from "next/link";
import { ArrowRight, Bot, Megaphone, Users, Wallet, Store, MessageSquare, Briefcase, GraduationCap, ShieldCheck, Lock, History, OctagonPause, FlaskConical, Headphones, Check, MapPin, Search, Smartphone, Monitor, Globe, Apple, Plug, Code2, BadgeCheck } from "lucide-react";
import { db } from "@/lib/db";
import { AskBox, PriceTable } from "@/components/site-bits";
import { SectionHead } from "@/components/site";
import { VerifiedTick } from "@/components/logo";

export const metadata = { title: { absolute: "OENOD: ask once, it gets done" } };

const INDUSTRIES = ["Restaurants & cafés", "Retail", "Salons & spas", "Clinics", "Agencies", "Gyms", "Trades & contractors", "Security", "Real estate", "Cleaning", "Logistics", "Franchises"];

const MODULES = [
  { icon: Megaphone, t: "Marketing that runs itself", d: "Email, SMS and WhatsApp campaigns, social posts, ads and automated journeys, with results tied to real sales.", ai: true },
  { icon: Users, t: "People & payroll", d: "Hiring, onboarding, shifts, time clock with GPS, leave and payroll with payslips." },
  { icon: MessageSquare, t: "CRM & one inbox", d: "Leads, pipelines, quotes with e-signature, and every message and review in one place." },
  { icon: Wallet, t: "Finance", d: "Invoices, online payments, expenses, purchasing and a cash forecast.", ai: true },
  { icon: Store, t: "POS & operations", d: "Point of sale, stock, bookings, projects, field service and fleet GPS." },
  { icon: Plug, t: "Connects to everything", d: "Google, Microsoft, Stripe, QuickBooks and any app with an API, plus a plugin marketplace." },
];

export default async function Home() {
  const [jobs, courses, companies, plans, sampleJobs, sampleCourses] = await Promise.all([
    db.jobPosting.count({ where: { status: "OPEN", isPublic: true } }),
    db.course.count({ where: { published: true, isPublic: true } }),
    db.organization.count({ where: { publicProfile: true } }),
    db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { key: true, name: true, tagline: true, priceMonthly: true, priceYearly: true, features: true } }),
    db.jobPosting.findMany({ where: { status: "OPEN", isPublic: true }, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: 3, include: { org: { select: { name: true, brandColor: true, verificationStatus: true } } } }),
    db.course.findMany({ where: { published: true, isPublic: true }, orderBy: [{ featured: "desc" }, { enrollCount: "desc" }], take: 3, select: { slug: true, title: true, priceCents: true, level: true, durationMin: true } }),
  ]).catch(() => [0, 0, 0, [], [], []] as const);

  return (
    <>
      {/* Hero */}
      <section className="relative -mt-16 overflow-hidden pt-16">
        <div className="blueprint pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />
        <div className="pointer-events-none absolute -top-40 start-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(35,66,224,.18),transparent)] rtl:translate-x-1/2" />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex animate-rise items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold shadow-card">AI that runs your business with you<span className="rounded-full bg-navy px-2 py-0.5 text-[10.5px] text-white">New · Jobs &amp; Academy</span></span>
          <h1 className="mx-auto mt-6 max-w-4xl animate-rise text-balance font-display text-[48px] font-semibold leading-[1.02] tracking-[-0.035em] [animation-delay:.05s] sm:text-[80px]">Ask once. <span className="bg-gradient-to-r from-blue via-[#4C66FF] to-[#8EA2FF] bg-clip-text text-transparent">It gets done.</span></h1>
          <p className="mx-auto mt-6 max-w-2xl animate-rise text-[17px] leading-8 text-muted [animation-delay:.1s]">OENOD is your business platform and AI manager in one. Marketing, customers, hiring, training, team and money, all connected, on every device.</p>
          <div className="mt-8 animate-rise [animation-delay:.15s]"><AskBox /></div>
          <div className="mt-6 flex animate-rise flex-wrap justify-center gap-3 [animation-delay:.2s]">
            <Link href="/signup" className="btn-pri h-12 px-6 text-[14.5px]">Start free for 14 days<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>
            <Link href="/#platform" className="btn h-12 px-6 text-[14.5px]">See how it works</Link>
          </div>
          <ul className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-muted">{["No credit card", "Set up in 10 minutes", "Cancel any time", "Free data migration"].map((x) => <li key={x} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue" />{x}</li>)}</ul>
          <HeroProduct />
        </div>
        <div className="relative border-y border-line bg-white/70 py-5 backdrop-blur">
          <p className="eyebrow mb-3 text-center">Made for every kind of business</p>
          <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
            <div className="flex w-max animate-marquee gap-12 whitespace-nowrap font-display text-[19px] font-semibold text-[#8E95AE]">{[...INDUSTRIES, ...INDUSTRIES].map((x, i) => <span key={i}>{x}</span>)}</div>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid overflow-hidden rounded-[22px] border border-line bg-white sm:grid-cols-2 lg:grid-cols-4">
          {[["12", "AI specialists working for you around the clock"], ["1", "place for marketing, customers, team and money"], ["4", "apps: web, iPhone, Android and desktop"], ["10 min", "to set up. We move your data for free."]].map(([n, l]) => (
            <div key={l} className="border-line p-7 [&:not(:last-child)]:border-b sm:[&:nth-child(odd)]:border-e lg:border-b-0 lg:[&:not(:last-child)]:border-e"><b className="font-display text-[44px] font-semibold leading-none tracking-tight text-navy">{n}</b><p className="mt-3 text-[13.5px] leading-6 text-muted">{l}</p></div>
          ))}
        </div>
      </section>

      {/* Platform */}
      <section id="platform" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-24 sm:px-6">
        <SectionHead eyebrow="One platform" title="Everything your business runs on," accent="already connected." sub="Turn on only what you need. Every customer, sale, shift and invoice flows to the next tool without typing it twice." />
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <div id="ai" className="navy-panel scroll-mt-24 p-7 lg:row-span-2">
            <div className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(142,162,255,.5),transparent)]" />
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><Bot className="h-5 w-5" /></span>
            <b className="mt-5 block font-display text-2xl">AI Business Manager</b>
            <p className="mt-2 leading-7 text-[#C9D4FF]">Tell it the outcome. It plans the steps, does the work you allowed, and brings you only the decisions that need you.</p>
            <ul className="mt-6 space-y-2.5 text-[13.5px]">
              {["Shortlisted 6 barista applicants", "Built next week's schedule within budget", "Sent 14 payment reminders, $3,820 collected", "Answered 9 reviews in your brand voice"].map((x) => <li key={x} className="flex items-center gap-2.5 rounded-xl bg-white/[.07] px-3 py-2.5"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#2BD48A]/20"><Check className="h-3 w-3 text-[#6FF0B5]" /></span>{x}</li>)}
              <li className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white px-3 py-2.5 text-navy"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#FFB020] text-[11px] font-bold text-white">!</span><span className="flex-1">Approve $612 supplier order?</span><span className="rounded-lg bg-navy px-2.5 py-1 text-[11px] font-bold text-white">Approve</span></li>
            </ul>
          </div>
          {MODULES.map((m) => (
            <div key={m.t} className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky text-blue"><m.icon className="h-5 w-5" /></span>{m.ai && <span className="rounded-md bg-sky px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue">AI</span>}</div>
              <b className="mt-4 block font-display text-[17px]">{m.t}</b>
              <p className="mt-1.5 text-[13.5px] leading-6 text-muted">{m.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Marketplaces */}
      <section className="bg-bg py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead center eyebrow="Marketplaces · open to everyone" title="Find work. Find talent." accent="Learn anything." sub="Two public marketplaces built into OENOD. Anyone can search jobs and take courses, with or without an account. Companies post jobs and sell courses right from their dashboard." />
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <div className="card flex flex-col p-7">
              <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-white"><Briefcase className="h-5 w-5" /></span><span><b className="block font-display text-xl">OENOD Jobs</b><small className="flex items-center gap-1.5 text-xs text-muted"><span className="h-1.5 w-1.5 rounded-full bg-[#1FAF6B]" />{jobs.toLocaleString()} open roles</small></span></div>
              <p className="mt-4 text-[14px] leading-6 text-muted">Companies post a job in one click and the AI writes the ad. Job seekers apply in a minute, no account needed.</p>
              <form action="/jobs" className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-line bg-bg p-2">
                <span className="flex min-w-[160px] flex-1 items-center gap-2 rounded-xl bg-white px-3"><Search className="h-4 w-4 text-muted" /><input name="q" placeholder="Job title or skill" className="h-10 w-full bg-transparent text-sm outline-none" /></span>
                <span className="flex min-w-[120px] flex-1 items-center gap-2 rounded-xl bg-white px-3"><MapPin className="h-4 w-4 text-muted" /><input name="city" placeholder="City" className="h-10 w-full bg-transparent text-sm outline-none" /></span>
                <button className="btn-pri">Search</button>
              </form>
              <ul className="mt-4 space-y-2">{sampleJobs.map((j) => (
                <li key={j.id}><Link href={`/jobs/${j.slug}`} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 transition hover:border-[#C9D4FF]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-xs font-bold text-white" style={{ background: j.org.brandColor ?? "#000F55" }}>{j.org.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}</span>
                  <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px]">{j.title}</b><small className="flex items-center gap-1 truncate text-xs text-muted">{j.org.name}{j.org.verificationStatus === "VERIFIED" && <VerifiedTick className="h-3.5 w-3.5" />} · {j.city ?? j.workplace}</small></span>
                  <ArrowRight className="h-4 w-4 text-muted rtl:rotate-180" />
                </Link></li>
              ))}</ul>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-5 text-xs"><span className="chip">Free for job seekers</span><span className="chip">No account needed</span><span className="chip"><BadgeCheck className="h-3.5 w-3.5 text-blue" />Verified companies</span><Link href="/jobs" className="ms-auto font-bold text-blue">Browse all jobs →</Link></div>
            </div>
            <div className="card flex flex-col p-7">
              <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-white"><GraduationCap className="h-5 w-5" /></span><span><b className="block font-display text-xl">OENOD Academy</b><small className="flex items-center gap-1.5 text-xs text-muted"><span className="h-1.5 w-1.5 rounded-full bg-[#1FAF6B]" />{courses.toLocaleString()} courses</small></span></div>
              <p className="mt-4 text-[14px] leading-6 text-muted">Courses on marketing, sales, AI, management and trade skills. Businesses train their teams and sell their own courses. Certificates carry a QR code anyone can verify.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">{sampleCourses.map((c) => (
                <Link key={c.slug} href={`/academy/${c.slug}`} className="overflow-hidden rounded-xl border border-line bg-white transition hover:border-[#C9D4FF]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/academy/cover/${c.slug}`} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
                  <span className="block p-3"><b className="line-clamp-2 text-[13px] leading-snug">{c.title}</b><small className="mt-1 block text-xs text-muted">{c.priceCents ? `$${(c.priceCents / 100).toFixed(0)}` : "Free"} · {Math.max(1, Math.round(c.durationMin / 60))} h</small></span>
                </Link>
              ))}</div>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-5 text-xs"><span className="chip">Learn at your pace</span><span className="chip">Certificates</span><span className="chip">Sell your own course</span><Link href="/academy" className="ms-auto font-bold text-blue">Explore courses →</Link></div>
            </div>
          </div>
          <p className="mt-6 text-center text-[13.5px] text-muted">Plus a public business directory{companies >= 50 ? ` of ${companies.toLocaleString()} companies` : ""}, with the blue <VerifiedTick className="inline h-4 w-4 align-[-3px]" /> badge for verified companies. <Link href="/companies" className="font-bold text-blue">Browse companies →</Link></p>
        </div>
      </section>

      {/* Control */}
      <section id="security" className="mx-auto grid max-w-7xl scroll-mt-20 gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2">
        <div>
          <SectionHead eyebrow="You stay in control" title="Powerful AI," accent="on your terms." sub="Choose how much the AI can do for each kind of work. Money, hiring and contracts always wait for your approval unless you say otherwise." />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[[Lock, "Your data stays yours", "Encrypted, kept separate for every company, never used to train public AI."], [ShieldCheck, "Two-step sign-in", "Authenticator apps, recovery codes, roles and per-module access."], [History, "Every action recorded", "See what the AI did, why, who approved it, and undo it."], [OctagonPause, "One-tap emergency stop", "Pause every automation across the business at once."], [FlaskConical, "Practice mode", "Preview what an automation would do before it runs."], [Headphones, "Real people, real support", "Chat and email help, plus free setup calls."]].map(([I, t, d]) => {
              const Icon = I as typeof Lock;
              return <div key={t as string} className="rounded-2xl border border-line p-4"><Icon className="h-5 w-5 text-blue" /><b className="mt-2 block text-[14px]">{t as string}</b><p className="mt-1 text-[13px] leading-5 text-muted">{d as string}</p></div>;
            })}
          </div>
        </div>
        <div className="space-y-3 lg:pt-16">
          {[["Assist", "It explains, suggests and drafts. Nothing goes out without you.", "Draft three versions of our Black Friday email."], ["Approve, then go", "It prepares everything and waits for one tap.", "Prepare payroll for release on Thursday."], ["Automatic within your rules", "Routine work runs on its own inside limits you set. Pause it any time.", "Reorder approved supplies under $300."]].map(([t, d, ex], i) => (
            <div key={t} className={i === 1 ? "rounded-[22px] border-2 border-blue bg-white p-6 shadow-lift" : "rounded-[22px] border border-line bg-white p-6"}>
              <div className="flex items-center gap-2"><span className="font-mono text-xs text-muted">0{i + 1}</span><b className="font-display text-lg">{t}</b>{i === 1 && <span className="ms-auto rounded-full bg-sky px-2 py-0.5 text-[10.5px] font-bold text-blue">Default</span>}</div>
              <p className="mt-1 text-[13.5px] text-muted">{d}</p>
              <p className="mt-3 rounded-xl bg-bg px-3 py-2 text-[13px] italic text-[#2B3150]">“{ex}”</p>
            </div>
          ))}
        </div>
      </section>

      {/* Devices */}
      <section className="bg-bg py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead center eyebrow="Every device" title="Same business." accent="Every screen." sub="Owners, managers and employees each get the app that fits their job, with access set per person." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[[Globe, "Web", "Any modern browser, nothing to install."], [Apple, "iPhone & iPad", "Approvals, the time clock and your team on the go."], [Smartphone, "Android", "Phones and tablets, with location for field teams."], [Monitor, "Desktop", "Native apps for Mac, Windows and Linux."]].map(([I, t, d]) => {
              const Icon = I as typeof Globe;
              return <Link key={t as string} href="/download" className="card p-6 transition hover:-translate-y-0.5 hover:shadow-lift"><Icon className="h-6 w-6 text-navy" /><b className="mt-4 block font-display text-lg">{t as string}</b><p className="mt-1 text-[13.5px] text-muted">{d as string}</p></Link>;
            })}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Link href="/developers" className="card flex items-center gap-4 p-6 transition hover:shadow-lift"><Code2 className="h-6 w-6 shrink-0 text-blue" /><span><b className="block font-display text-lg">Open API and webhooks</b><small className="text-[13px] text-muted">Build on OENOD with API keys, docs and signed webhooks.</small></span><ArrowRight className="ms-auto h-5 w-5 text-muted rtl:rotate-180" /></Link>
            <Link href="/plugins" className="card flex items-center gap-4 p-6 transition hover:shadow-lift"><Plug className="h-6 w-6 shrink-0 text-blue" /><span><b className="block font-display text-lg">Plugins and integrations</b><small className="text-[13px] text-muted">Google, Microsoft, Stripe, QuickBooks and more.</small></span><ArrowRight className="ms-auto h-5 w-5 text-muted rtl:rotate-180" /></Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      {plans.length > 0 && (
        <section id="pricing" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
          <SectionHead center eyebrow="Simple pricing" title="One subscription." accent="Every tool you need." sub="Every plan includes the AI assistant, Jobs, Academy and all the apps. Start free, upgrade when you grow." />
          <div className="mt-12"><PriceTable plans={[...plans]} /></div>
        </section>
      )}

      {/* Final */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="navy-panel mx-auto max-w-7xl px-6 py-16 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_0,rgba(142,162,255,.35),transparent)]" />
          <h2 className="mx-auto max-w-2xl text-balance font-display text-[36px] font-semibold leading-tight tracking-tight sm:text-[48px]">Your business, finally in one place.</h2>
          <p className="mx-auto mt-4 max-w-lg text-[16px] text-[#C9D4FF]">Start free today. Our team will move your data and set things up with you.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/signup" className="btn h-12 border-transparent bg-white px-6 text-navy">Start free for 14 days<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link><Link href="/contact" className="btn h-12 border-white/25 bg-transparent px-6 text-white hover:bg-white/10">Book a demo</Link></div>
        </div>
      </section>
    </>
  );
}

/** The product shot under the hero, built in HTML so it stays crisp on every screen. */
function HeroProduct() {
  return (
    <div className="relative mx-auto mt-16 max-w-5xl text-start" aria-hidden>
      <div className="absolute -start-6 top-16 xl:-start-20 z-10 hidden animate-float items-center gap-2.5 rounded-2xl border border-line bg-white px-3.5 py-2.5 shadow-lift md:flex"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1FAF6B] text-white"><Check className="h-4 w-4" /></span><span><b className="block text-[12.5px]">Campaign launched</b><small className="text-[11px] text-muted">2,140 customers reached</small></span></div>
      <div className="absolute -end-6 top-6 xl:-end-20 z-10 hidden animate-float items-center gap-2.5 rounded-2xl border border-line bg-white px-3.5 py-2.5 shadow-lift [animation-delay:1.5s] md:flex"><span className="grid h-8 w-8 place-items-center rounded-lg bg-navy text-white">★</span><span><b className="block text-[12.5px]">9 reviews answered</b><small className="text-[11px] text-muted">in your brand voice</small></span></div>
      <div className="absolute -start-4 bottom-10 xl:-start-24 z-10 hidden animate-float items-center gap-2.5 rounded-2xl border border-line bg-white px-3.5 py-2.5 shadow-lift [animation-delay:3s] md:flex"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue text-white"><Briefcase className="h-4 w-4" /></span><span><b className="block text-[12.5px]">27 applicants</b><small className="text-[11px] text-muted">Barista job on OENOD Jobs</small></span></div>
      <div className="absolute -end-4 -bottom-6 xl:-end-16 z-10 hidden animate-float items-center gap-2.5 rounded-2xl border border-line bg-white px-3.5 py-2.5 shadow-lift [animation-delay:2.2s] md:flex"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#FFB020] font-bold text-white">!</span><span><b className="block text-[12.5px]">Approve $612 order?</b><small className="text-[11px] text-muted">Inventory AI</small></span></div>
      <div className="overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_40px_90px_-40px_rgba(0,15,85,.45)]">
        <div className="flex items-center gap-1.5 border-b border-line bg-bg px-4 py-3"><span className="h-2.5 w-2.5 rounded-full bg-[#E4E8F2]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E4E8F2]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E4E8F2]" /><span className="mx-auto rounded-md bg-white px-3 py-0.5 font-mono text-[10.5px] text-muted">app.oenod.com</span></div>
        <div className="grid gap-4 p-4 md:grid-cols-[160px_1fr_240px]">
          <ul className="hidden space-y-1 text-[12.5px] md:block">{["Overview", "AI manager", "Marketing", "Customers", "Jobs", "Academy", "Payroll", "Finance"].map((x, i) => <li key={x} className={i === 0 ? "rounded-lg bg-navy px-3 py-2 font-bold text-white" : "rounded-lg px-3 py-2 text-muted"}>{x}</li>)}</ul>
          <div className="space-y-3">
            <div className="navy-panel p-4"><small className="font-mono text-[10px] uppercase tracking-[.14em] text-[#9DB0FF]">AI briefing · 08:12</small><b className="mt-1 block font-display text-[17px] leading-snug">4 decisions need you today. Everything else is handled.</b></div>
            <div className="grid grid-cols-3 gap-3">{[["Revenue", "$184,320", "▲ 12.4%"], ["New leads", "38", "▲ 11 hot"], ["Ad return", "4.7×", "▲ 0.9×"]].map(([l, v, d]) => <div key={l} className="rounded-xl border border-line p-3"><small className="text-[11px] text-muted">{l}</small><b className="block font-display text-[18px]">{v}</b><small className="font-mono text-[10.5px] text-[#1FAF6B]">{d}</small></div>)}</div>
            <svg viewBox="0 0 400 90" className="h-24 w-full"><defs><linearGradient id="hg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2342E0" stopOpacity=".18" /><stop offset="1" stopColor="#2342E0" stopOpacity="0" /></linearGradient></defs><path d="M0 70 C40 60 60 30 100 42 S160 70 200 50 260 18 300 30 360 52 400 20 L400 90 L0 90Z" fill="url(#hg)" /><path d="M0 70 C40 60 60 30 100 42 S160 70 200 50 260 18 300 30 360 52 400 20" fill="none" stroke="#2342E0" strokeWidth="2.2" /><path d="M0 78 C50 72 90 60 140 66 S220 74 260 58 330 48 400 44" fill="none" stroke="#000F55" strokeOpacity=".35" strokeWidth="1.6" strokeDasharray="4 4" /></svg>
          </div>
          <div className="hidden space-y-2 md:block">
            <div className="ms-6 rounded-2xl rounded-ee-sm bg-navy px-3 py-2 text-[12.5px] text-white">Get us ready for Saturday&apos;s pumpkin promo.</div>
            <div className="rounded-2xl rounded-es-sm border border-line bg-bg p-3 text-[12.5px]"><b>Here&apos;s the plan:</b><ul className="mt-1.5 space-y-1">{["Expect 34% more orders", "2 extra baristas, within budget", "Order 18 L of pumpkin purée", "Post on Instagram Thu 7:30"].map((x, i) => <li key={x} className="flex gap-1.5"><span className={i < 3 ? "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1FAF6B]" : "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-line"} />{x}</li>)}</ul></div>
            <div className="flex gap-2"><span className="flex-1 rounded-lg bg-navy py-1.5 text-center text-[11.5px] font-bold text-white">Approve all</span><span className="flex-1 rounded-lg border border-line py-1.5 text-center text-[11.5px] font-bold">Review</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
