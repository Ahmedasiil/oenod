import Link from "next/link";
import { Lock, KeyRound, ShieldCheck, Users, ScrollText, Network, Server, Bug } from "lucide-react";
import { SectionHead } from "@/components/site";

export const metadata = { title: "Security", description: "How OENOD protects your business: encryption, two-step sign-in, role-based access, audit logs and more." };

const ITEMS = [
  [Lock, "Encrypted everywhere", "All traffic uses HTTPS with HSTS. Connected-app tokens and secrets are encrypted at rest with AES-256-GCM. Passwords are stored only as bcrypt hashes."],
  [KeyRound, "Two-step sign-in", "Authenticator-app codes with one-time recovery codes. Companies can require it for everyone on their team."],
  [Users, "Access by role", "Owners, admins, managers and employees each see only what they need. Managers can grant an employee view or edit access module by module."],
  [Network, "Trusted networks", "Companies can limit sign-in to their office or VPN addresses. New-device alerts tell people when their account is used somewhere new."],
  [ScrollText, "Audit log", "Sign-ins, permission changes, exports, payments and AI actions are recorded with who, what and when, so admins can review any change."],
  [ShieldCheck, "AI you control", "The AI Business Manager follows your company's autonomy settings. Payroll, payments, campaigns, access changes and contracts always wait for a person's approval."],
  [Server, "Hardened by default", "Strict content security policy, clickjacking protection, rate limits on sign-in and API keys, and account lockout after repeated failed sign-ins."],
  [Bug, "Least-privilege keys", "API keys and plugins get only the modules they're given, are stored as hashes, and can be revoked in one click. Webhooks are signed with HMAC-SHA256."],
] as const;

export default function Security() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionHead eyebrow="Security" title="Your business data," accent="locked down." sub="OENOD holds payroll, customers and payments, so security is built into every layer, not added later." />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(([I, t, d]) => (
          <div key={t} className="card p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky text-blue"><I className="h-5 w-5" /></span><b className="mt-4 block font-display text-[17px]">{t}</b><p className="mt-1.5 text-[13.5px] leading-6 text-muted">{d}</p></div>
        ))}
      </div>
      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <section className="card p-7">
          <h2 className="font-display text-[22px] font-semibold">Privacy and your data</h2>
          <p className="mt-2 text-[14px] leading-7 text-muted">You own your data. Export it any time, and delete your workspace when you leave. Marketing emails and texts go only to people who agreed to them, and every message has an unsubscribe link. Read the <Link href="/legal/privacy" className="font-semibold text-blue">Privacy Policy</Link>.</p>
        </section>
        <section className="card p-7">
          <h2 className="font-display text-[22px] font-semibold">Report a vulnerability</h2>
          <p className="mt-2 text-[14px] leading-7 text-muted">Found a security issue? Please tell us privately through the <Link href="/contact?topic=security" className="font-semibold text-blue">security contact form</Link> with steps to reproduce. Don't access other people's data or disrupt the service while testing. We'll confirm we received it and keep you updated while we fix it.</p>
        </section>
      </div>
      <p className="mt-10 text-center text-[13px] text-muted">Live system health is on the <Link href="/status" className="font-semibold text-blue">status page</Link>.</p>
    </div>
  );
}
