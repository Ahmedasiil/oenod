"use client";
import Link from "next/link";
import { Award, GraduationCap, Infinity as Inf } from "lucide-react";
import { useApi } from "@/lib/client/api";
import { useT } from "@/components/i18n";
import { Loading } from "@/components/ui";

// "My learning" for everyone, including learners who don't belong to a company.
export default function MyLearning() {
  const t = useT();
  const { data } = useApi<any>("/api/academy/my");
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <span className="eyebrow">OENOD Academy</span>
      <h1 className="mt-2 font-display text-[36px] font-semibold tracking-tight">My learning</h1>
      {data?.passUntil && new Date(data.passUntil) > new Date() && <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-sky px-3 py-1 text-[13px] font-semibold text-blue"><Inf className="h-4 w-4" />Academy Pass active until {t.date(data.passUntil)}</p>}
      {!data ? <div className="mt-8"><Loading rows={3} /></div> : <>
        {data.assigned.filter((a: any) => !a.done).length > 0 && (
          <section className="mt-8 rounded-[22px] border border-[#C9D4FF] bg-sky/40 p-5">
            <b className="font-display text-lg">Assigned by your company</b>
            <ul className="mt-2 space-y-1.5 text-[14px]">{data.assigned.filter((a: any) => !a.done).map((a: any) => <li key={a.slug}><Link href={`/academy/learn/${a.slug}`} className="font-bold text-blue">{a.title}</Link>{a.dueDate && <span className="text-muted"> · due {t.date(a.dueDate)}</span>}</li>)}</ul>
          </section>
        )}
        {!data.data.length ? (
          <div className="mt-10 rounded-[22px] border border-dashed border-line p-12 text-center"><GraduationCap className="mx-auto h-8 w-8 text-muted" /><b className="mt-3 block text-lg">You haven't started a course yet</b><p className="mt-1 text-muted">Plenty of them are free.</p><Link href="/academy" className="btn-pri mt-5">Browse courses</Link></div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">{data.data.map((e: any) => (
            <div key={e.slug} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.coverUrl} alt="" className="aspect-[16/7] w-full object-cover" />
              <div className="p-4">
                <b className="font-display text-[16px]">{e.title}</b>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-blue" style={{ width: `${e.progress}%` }} /></div>
                <small className="mt-1 block text-xs text-muted">{e.completedAt ? `Completed ${t.date(e.completedAt)}` : `${e.progress}% of ${e.lessons} lessons`}</small>
                <div className="mt-4 flex gap-2"><Link href={`/academy/learn/${e.slug}`} className="btn-pri btn-sm">{e.completedAt ? "Review" : e.progress ? "Continue" : "Start"}</Link>{e.certificateCode && <Link href={`/verify/${e.certificateCode}`} className="btn btn-sm"><Award className="h-3.5 w-3.5" />Certificate</Link>}</div>
              </div>
            </div>
          ))}</div>
        )}
      </>}
    </div>
  );
}
