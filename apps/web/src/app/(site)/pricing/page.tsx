import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { db } from "@/lib/db";
import { MODULES } from "@/lib/modules";
import { PriceTable } from "@/components/site-bits";
import { SectionHead } from "@/components/site";

export const metadata = { title: "Pricing", description: "One subscription for your whole business: AI manager, people, customers, money and operations. 14-day free trial." };

const FAQ = [
  ["Is there a free trial?", "Yes. Every plan starts with 14 days free, no credit card needed. You can change plans or cancel any time from Settings."],
  ["What counts as a team member?", "Anyone who signs in: owners, managers and employees using the web, mobile or desktop apps. Job applicants, customers and course learners are always free."],
  ["What are AI actions?", "Each thing the AI Business Manager does for you (drafting a campaign, building a schedule, answering a review) uses one action. Questions and summaries don't count. You can buy more or set a monthly cap."],
  ["Can I bring my data?", "Yes. Import spreadsheets in a few clicks, or ask our team to move your data for you during setup."],
  ["Do you take a cut of my payments?", "No. Card payments go straight to your own Stripe account. OENOD never adds a fee on top."],
  ["Can I resell OENOD?", "Yes. The partner program lets agencies and consultants sell OENOD under their own brand with wholesale pricing."],
];

export default async function Pricing() {
  const plans = await db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { key: true, name: true, tagline: true, priceMonthly: true, priceYearly: true, features: true, modules: true, seats: true } });
  const has = (p: { modules: string[] }, m: string) => p.modules.includes("*") || p.modules.includes(m);
  const groups = Array.from(new Set(MODULES.map((m) => m.group)));
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHead center eyebrow="Pricing" title="One subscription." accent="Every tool you need." sub="Every plan includes the AI assistant, Jobs, Academy and all the apps. Start free for 14 days." />
      <div className="mt-12"><PriceTable plans={plans} /></div>
      <section className="mt-24">
        <h2 className="text-center font-display text-[30px] font-semibold tracking-tight">Compare plans</h2>
        <div className="mt-8 overflow-x-auto rounded-[22px] border border-line">
          <table className="w-full min-w-[720px] text-[13.5px]">
            <thead className="sticky top-16 bg-white"><tr className="border-b border-line"><th className="p-4 text-start font-display text-base">Module</th>{plans.map((p) => <th key={p.key} className="p-4 text-center font-display text-base">{p.name}</th>)}</tr></thead>
            <tbody>
              <tr className="border-b border-line bg-bg/60"><td className="p-4 font-semibold">Team members included</td>{plans.map((p) => <td key={p.key} className="p-4 text-center font-bold">{p.seats >= 1000 ? "Unlimited" : p.seats}</td>)}</tr>
              {groups.map((g) => [
                <tr key={g}><td colSpan={plans.length + 1} className="bg-bg px-4 pb-2 pt-5 font-mono text-[10.5px] font-semibold uppercase tracking-[.14em] text-muted">{g}</td></tr>,
                ...MODULES.filter((m) => m.group === g).map((m) => (
                  <tr key={m.key} className="border-b border-line"><td className="p-4"><b className="block">{m.name}</b><small className="text-xs text-muted">{m.tagline}</small></td>{plans.map((p) => <td key={p.key} className="p-4 text-center">{has(p, m.key) ? <Check className="mx-auto h-4 w-4 text-blue" /> : <Minus className="mx-auto h-4 w-4 text-line" />}</td>)}</tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mx-auto mt-24 max-w-3xl">
        <h2 className="text-center font-display text-[30px] font-semibold tracking-tight">Questions</h2>
        <div className="mt-8 divide-y divide-line rounded-[22px] border border-line">
          {FAQ.map(([q, a]) => <details key={q} className="group p-5"><summary className="flex cursor-pointer list-none items-center justify-between font-semibold">{q}<span className="text-xl text-muted transition group-open:rotate-45">+</span></summary><p className="mt-2 text-[14px] leading-7 text-muted">{a}</p></details>)}
        </div>
        <p className="mt-8 text-center text-[14px] text-muted">Still deciding? <Link href="/contact" className="font-bold text-blue">Talk to us</Link> and we'll walk you through it.</p>
      </section>
    </div>
  );
}
