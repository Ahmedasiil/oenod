import Link from "next/link";
import { LifeBuoy, Briefcase, Handshake, ShieldAlert } from "lucide-react";
import { ContactForm } from "@/components/site-forms";

export const metadata = { title: "Contact", description: "Talk to the OENOD team about sales, support, partnerships or security." };

const TOPICS: Record<string, { title: string; sub: string }> = {
  sales: { title: "Talk to sales", sub: "Tell us about your business and we'll show you how OENOD fits, including custom and enterprise plans." },
  partners: { title: "Become a partner", sub: "Tell us about your business and the clients you work with." },
  security: { title: "Report a security issue", sub: "Describe what you found and the steps to reproduce it. Please don't include other people's personal data." },
  support: { title: "Get help", sub: "Tell us what's going on and which account it's about. Never send your password." },
};

export default async function Contact({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const t = topic && TOPICS[topic] ? topic : undefined;
  const head = t ? TOPICS[t] : { title: "Get in touch", sub: "Questions about OENOD? Send us a message and we'll reply by email." };
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <span className="eyebrow">Contact</span>
        <h1 className="mt-2 font-display text-[40px] font-semibold tracking-tight">{head.title}</h1>
        <p className="mt-2 text-[15px] text-muted">{head.sub}</p>
        <div className="mt-8 grid gap-2">
          {([["sales", Briefcase, "Sales"], ["support", LifeBuoy, "Support"], ["partners", Handshake, "Partners"], ["security", ShieldAlert, "Security"]] as const).map(([k, I, l]) => (
            <Link key={k} href={`/contact?topic=${k}`} className={t === k ? "flex items-center gap-3 rounded-xl border border-navy bg-navy px-4 py-3 text-[14px] font-semibold text-white" : "flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-[14px] font-semibold hover:border-[#C9D4FF]"}><I className="h-4 w-4" />{l}</Link>
          ))}
        </div>
      </div>
      <ContactForm key={t ?? "general"} topic={t} />
    </div>
  );
}
