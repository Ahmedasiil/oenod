"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, useApi } from "@/lib/client/api";
import { CompanyMark } from "@/components/logo";
import { Button, Field, Input, Loading } from "@/components/ui";

const ROLE: Record<string, string> = { OWNER: "an owner", ADMIN: "an admin", MANAGER: "a manager", FINANCE: "finance", ACCOUNTANT: "the accountant", EMPLOYEE: "a team member" };

export default function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { data, error } = useApi<any>(`/api/invites/${token}`);
  // Plain fetch: a 401 here just means "not signed in", so don't bounce to the sign-in page.
  const [me, setMe] = useState<{ loading: boolean; data?: any }>({ loading: true });
  useEffect(() => { fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then((d) => setMe({ loading: false, data: d })).catch(() => setMe({ loading: false })); }, []);
  const [v, setV] = useState({ name: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (error) return <div className="space-y-3"><h1 className="font-display text-[28px] font-semibold">This invitation can't be used</h1><p className="text-muted">{error.message} Ask the person who invited you to send a new one.</p><Link href="/signin" className="btn">Sign in</Link></div>;
  if (!data || me.loading) return <Loading />;
  const signedIn = me.data?.user;
  const accept = async (e?: React.FormEvent) => {
    e?.preventDefault(); setBusy(true); setErr(null);
    try { const r = await api(`/api/invites/${token}`, { body: signedIn ? {} : v }); location.href = r.redirect; }
    catch (er: any) { setErr(er.message); setBusy(false); }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><CompanyMark name={data.org.name} logoUrl={data.org.logoUrl} size={52} /><div><p className="text-[13px] text-muted">You're invited to join</p><b className="font-display text-2xl">{data.org.name}</b></div></div>
      <p className="text-[14px] text-muted">Join as {ROLE[data.role] ?? "a member"} with <b className="text-ink">{data.email}</b>.</p>
      {signedIn ? (
        signedIn.email === data.email
          ? <Button variant="pri" loading={busy} onClick={() => accept()} className="h-12 w-full">Accept and join</Button>
          : <p className="rounded-xl bg-[#FFF4DF] px-3 py-2 text-[13px] text-[#8A5A00]">You're signed in as {signedIn.email}. Sign out, then open this link again.</p>
      ) : data.hasAccount ? (
        <Link href={`/signin?next=${encodeURIComponent(`/invite/${token}`)}`} className="btn-pri h-12 w-full">Sign in to accept</Link>
      ) : (
        <form onSubmit={accept} className="space-y-4">
          <Field label="Your name"><Input required minLength={2} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoComplete="name" className="h-11" /></Field>
          <Field label="Choose a password" help="At least 10 characters."><Input type="password" required minLength={10} value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} autoComplete="new-password" className="h-11" /></Field>
          <Button variant="pri" type="submit" loading={busy} className="h-12 w-full">Create account and join</Button>
        </form>
      )}
      {err && <p className="rounded-xl bg-[#FFF5F7] px-3 py-2 text-[13px] text-crit">{err}</p>}
    </div>
  );
}
