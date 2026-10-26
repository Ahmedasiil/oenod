import { Handshake, Palette, LineChart, Headphones } from "lucide-react";
import { SectionHead } from "@/components/site";
import { ContactForm } from "@/components/site-forms";

export const metadata = { title: "Partners", description: "Resell OENOD, refer businesses or offer it under your own brand." };

const WAYS = [
  [Handshake, "Refer", "Share your partner link. Every company that signs up through it is tied to you, and you earn a share of what they pay, as set in your partner agreement."],
  [Palette, "Resell under your brand", "Approved agencies and consultants can offer OENOD to clients with their own name, logo and colours. Ask us about it in the form."],
  [LineChart, "Clear records", "Every company that signs up with your link is recorded to your partner account, with its plan and status."],
  [Headphones, "Partner support", "Help from our team getting you and your clients set up."],
] as const;

export default function Partners() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHead eyebrow="Partner program" title="Grow with OENOD." accent="Earn with every client." sub="For agencies, accountants, IT providers and consultants who help businesses run better." />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WAYS.map(([I, t, d]) => <div key={t} className="card p-6"><I className="h-6 w-6 text-blue" /><b className="mt-4 block font-display text-[17px]">{t}</b><p className="mt-1.5 text-[13.5px] leading-6 text-muted">{d}</p></div>)}
      </div>
      <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div className="navy-panel p-8">
          <h2 className="font-display text-[26px] font-semibold">How it works</h2>
          <ol className="mt-5 space-y-4 text-[14.5px] text-[#C9D4FF]">
            {["Apply with the form. Tell us about your business and clients.", "We set up your partner account, link and terms, including your revenue share.", "Bring clients in with your link, or set them up yourself under your brand.", "Get paid your share for active subscriptions, on the schedule in your agreement."].map((s, i) => <li key={s} className="flex gap-3"><b className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 text-[13px] text-white">{i + 1}</b>{s}</li>)}
          </ol>
        </div>
        <ContactForm topic="partners" />
      </div>
    </div>
  );
}
