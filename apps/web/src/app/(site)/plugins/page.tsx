import Link from "next/link";
import { Plug, Search, Star, Code2 } from "lucide-react";
import { db } from "@/lib/db";
import { CONNECTORS } from "@/lib/integrations/catalog";
import { SectionHead } from "@/components/site";
import { VerifiedTick } from "@/components/logo";

export const metadata = { title: "Plugins & integrations", description: "Connect OENOD to Google, Microsoft, Stripe, QuickBooks and more, or install plugins built by developers." };

type SP = Promise<{ q?: string }>;

export default async function Plugins({ searchParams }: { searchParams: SP }) {
  const q = (await searchParams).q?.trim().toLowerCase();
  const plugins = await db.plugin.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ featured: "desc" }, { installs: "desc" }], take: 100, select: { slug: true, name: true, tagline: true, category: true, developer: true, color: true, iconUrl: true, priceCents: true, verified: true, rating: true } });
  const apps = CONNECTORS.filter((a) => !q || `${a.name} ${a.category} ${a.description}`.toLowerCase().includes(q));
  const plug = plugins.filter((p) => !q || `${p.name} ${p.tagline} ${p.developer}`.toLowerCase().includes(q));
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHead center eyebrow="Integrations" title="Works with the tools" accent="you already use." sub="Connect in a click, or connect any app that has an API. Plugins from developers add new features right inside OENOD." />
      <form className="mx-auto mt-8 flex max-w-lg gap-2 rounded-2xl border border-line bg-white p-2 shadow-card"><label className="flex flex-1 items-center gap-2 px-3"><Search className="h-4 w-4 text-muted" /><input name="q" defaultValue={q} placeholder="Search apps" className="h-11 w-full bg-transparent outline-none" /></label><button className="btn-pri h-11">Search</button></form>
      <h2 className="mt-14 font-display text-xl font-semibold">Built-in connections <span className="text-base font-normal text-muted">{apps.length}</span></h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {apps.map((a) => (
          <div key={a.key} className="card flex items-start gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white" style={{ background: a.color }}>{a.name.slice(0, 1)}</span>
            <span className="min-w-0"><b className="block text-[14px]">{a.name}</b><small className="line-clamp-2 text-[12px] text-muted">{a.description}</small></span>
          </div>
        ))}
      </div>
      <h2 className="mt-14 font-display text-xl font-semibold">Plugin marketplace <span className="text-base font-normal text-muted">{plug.length}</span></h2>
      {!plug.length ? (
        <div className="mt-4 rounded-[22px] border border-dashed border-line p-10 text-center"><Plug className="mx-auto h-6 w-6 text-muted" /><b className="mt-2 block">The marketplace is opening</b><p className="mt-1 text-[13.5px] text-muted">Developers are building the first plugins now. Want yours to be one of them?</p><Link href="/developers#plugins" className="btn-pri mt-4">Build a plugin</Link></div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plug.map((p) => (
            <Link key={p.slug} href={`/signin?next=${encodeURIComponent(`/app/integrations?tab=plugins&plugin=${p.slug}`)}`} className="card flex items-start gap-3 p-4 transition hover:shadow-lift">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.iconUrl ? <img src={p.iconUrl} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: p.color ?? "#2342E0" }}><Plug className="h-5 w-5" /></span>}
              <span className="min-w-0 flex-1"><b className="flex items-center gap-1 text-[14px]">{p.name}{p.verified && <VerifiedTick className="h-3.5 w-3.5" />}</b><small className="line-clamp-2 text-[12.5px] text-muted">{p.tagline}</small><small className="mt-1 flex items-center gap-2 text-[11.5px] text-muted">{p.developer}{p.rating ? <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-[#FFB020] text-[#FFB020]" />{p.rating.toFixed(1)}</span> : null}<span className="ms-auto font-bold text-ink">{p.priceCents ? `$${(p.priceCents / 100).toFixed(0)}/mo` : "Free"}</span></small></span>
            </Link>
          ))}
        </div>
      )}
      <div className="navy-panel mt-14 flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center"><Code2 className="h-8 w-8 shrink-0" /><span className="flex-1"><b className="font-display text-2xl">Build on OENOD</b><p className="mt-1 text-[14px] text-[#C9D4FF]">Open REST API, signed webhooks and a plugin system with scoped permissions. Publish to every OENOD company.</p></span><Link href="/developers" className="btn border-transparent bg-white text-navy">Developer docs</Link></div>
    </div>
  );
}
