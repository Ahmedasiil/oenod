"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Clock, GraduationCap, Plus, Trash2, UserPlus, Award, Search } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "@/components/session";
import { useT } from "@/components/i18n";
import { Badge, Button, Callout, Empty, Field, Input, Loading, Modal, PageHeader, Select, Tabs, Textarea, Toggle, cx, useToast } from "@/components/ui";

type Course = { id: string; slug: string; title: string; summary: string; category: string; level: string; priceCents: number; currency: string; durationMin: number; coverColor: string; mine: boolean; isPublic: boolean; _count: { lessons: number; enrollments: number; assignments: number } };

export default function Academy() {
  const s = useSession();
  const manager = ["OWNER", "ADMIN", "MANAGER", "HR"].includes(s.role ?? "");
  const [tab, setTab] = useState<"library" | "mine" | "learning">(manager ? "library" : "learning");
  const { data, loading, reload } = useApi<{ data: Course[] }>("/api/academy/courses");
  const [q, setQ] = useState("");
  const [build, setBuild] = useState(false);
  const [assign, setAssign] = useState<Course | null>(null);
  const list = useMemo(() => (data?.data ?? []).filter((c) => (tab === "mine" ? c.mine : !c.mine) && (!q || `${c.title} ${c.summary} ${c.category}`.toLowerCase().includes(q.toLowerCase()))), [data, tab, q]);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Grow" title="Academy" sub="Train your team with OENOD's course library or build your own. People who finish get a certificate with the OENOD seal and your logo."
        actions={manager && <><Link href="/app/certificates" className="btn"><Award className="h-4 w-4" />Certificates</Link><Button variant="pri" onClick={() => setBuild(true)}><Plus className="h-4 w-4" />Build a course</Button></>} />
      <Tabs value={tab} onChange={setTab} tabs={[...(manager ? [{ key: "library" as const, label: "OENOD library" }, { key: "mine" as const, label: "Our courses", count: data?.data.filter((c) => c.mine).length }] : []), { key: "learning" as const, label: "My learning" }]} />
      {tab === "learning" ? <MyLearning /> : <>
        <div className="relative max-w-sm"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses" className="ps-9" /></div>
        {loading && !data ? <Loading rows={4} /> : !list.length ? (
          <Empty icon={<GraduationCap className="h-5 w-5" />} title={tab === "mine" ? "No courses of your own yet" : "No courses match"} body={tab === "mine" ? "Turn your know-how into training: onboarding, safety, how you serve customers. Add lessons, a short quiz, and assign it." : "Try another search."} action={tab === "mine" && <Button variant="pri" onClick={() => setBuild(true)}>Build a course</Button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{list.map((c) => <CourseCard key={c.id} c={c} onAssign={() => setAssign(c)} />)}</div>
        )}
      </>}
      {build && <Builder onClose={() => { setBuild(false); reload(); setTab("mine"); }} />}
      {assign && <Assign c={assign} onClose={() => { setAssign(null); reload(); }} />}
    </div>
  );
}

function CourseCard({ c, onAssign }: { c: Course; onAssign: () => void }) {
  const t = useT();
  return (
    <div className="card flex flex-col overflow-hidden">
      <Link href={`/academy/${c.slug}`} className="block aspect-[16/8] overflow-hidden bg-navy"><img src={`/api/academy/cover/${c.slug}`} alt="" loading="lazy" className="h-full w-full object-cover" /></Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]"><Badge>{c.category}</Badge><Badge tone="info">{c.level}</Badge>{c.mine && <Badge tone={c.isPublic ? "ok" : undefined}>{c.isPublic ? "On marketplace" : "Internal"}</Badge>}</div>
        <b className="mt-1 text-[14.5px] leading-snug">{c.title}</b>
        <p className="line-clamp-2 text-[12.5px] text-muted">{c.summary}</p>
        <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-muted">
          <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{c._count.lessons} lessons</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{Math.round(c.durationMin / 6) / 10} h</span>
          <span className="ms-auto font-bold text-ink">{c.priceCents ? t.money(c.priceCents / 100, c.currency) : "Free"}</span>
        </div>
        <div className="mt-3 flex gap-2"><Button size="sm" variant="pri" onClick={onAssign}><UserPlus className="h-3.5 w-3.5" />Assign</Button><Link href={`/academy/learn/${c.slug}`} className="btn btn-sm">Preview</Link>{c._count.assignments > 0 && <small className="ms-auto self-center text-xs text-muted">{c._count.assignments} assigned</small>}</div>
      </div>
    </div>
  );
}

function MyLearning() {
  const t = useT();
  const { data } = useApi<any>("/api/academy/my");
  if (!data) return <Loading rows={3} />;
  const todo = data.assigned.filter((a: any) => !a.done);
  return (
    <div className="space-y-4">
      {todo.length > 0 && <Callout title={`${todo.length} training${todo.length === 1 ? "" : "s"} assigned to you`}>{todo.map((a: any) => <span key={a.slug} className="me-3 inline-block"><Link href={`/academy/learn/${a.slug}`} className="font-bold text-blue">{a.title}</Link>{a.dueDate && <small className="text-muted"> · due {t.date(a.dueDate)}</small>}</span>)}</Callout>}
      {!data.data.length ? <Empty icon={<GraduationCap className="h-5 w-5" />} title="Nothing in progress" body="Browse the Academy to start a course. Many are free." action={<Link href="/academy" className="btn btn-pri">Browse the Academy</Link>} /> : (
        <div className="grid gap-3 sm:grid-cols-2">{data.data.map((e: any) => (
          <Link key={e.slug} href={`/academy/learn/${e.slug}`} className="card flex items-center gap-3 p-3 transition hover:shadow-lift">
            <img src={e.coverUrl} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
            <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px]">{e.title}</b>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-bg"><span className="block h-full rounded-full bg-blue" style={{ width: `${e.progress}%` }} /></span>
              <small className="text-xs text-muted">{e.completedAt ? "Completed" : `${e.progress}% · ${e.lessons} lessons`}</small></span>
            {e.certificateCode && <Award className="h-5 w-5 text-blue" />}
          </Link>
        ))}</div>
      )}
    </div>
  );
}

type Q = { q: string; options: string[]; answer: number };
type L = { title: string; content: string; videoUrl: string; durationMin: number; quiz: Q[] };
const blank = (): L => ({ title: "", content: "", videoUrl: "", durationMin: 10, quiz: [] });

function Builder({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [v, setV] = useState({ title: "", summary: "", category: "Operations", level: "Beginner", isPublic: false, price: 0, coverColor: "#000F55" });
  const [lessons, setLessons] = useState<L[]>([blank()]);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const L = lessons[i];
  const upd = (patch: Partial<L>) => setLessons((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const save = async () => {
    setBusy(true);
    try {
      await api("/api/academy/courses", { body: { ...v, priceCents: v.isPublic ? Math.round(v.price * 100) : 0, lessons: lessons.map((l) => ({ ...l, quiz: l.quiz.length ? l.quiz.filter((x) => x.q && x.options.filter(Boolean).length >= 2).map((x) => ({ ...x, options: x.options.filter(Boolean) })) : undefined })) } });
      toast("Course created");
      onClose();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} wide title="Build a course" footer={<Button variant="pri" loading={busy} disabled={v.title.length < 3 || v.summary.length < 10 || lessons.some((l) => l.title.length < 2 || !l.content)} onClick={save}>Create course</Button>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Course title" required className="sm:col-span-2"><Input value={v.title} maxLength={140} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Opening and closing the store" /></Field>
          <Field label="Summary" required help="One or two sentences on what people will learn." className="sm:col-span-2"><Textarea value={v.summary} maxLength={400} onChange={(e) => setV({ ...v, summary: e.target.value })} /></Field>
          <Field label="Category"><Select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} options={["Operations", "Safety", "Customer service", "Sales", "Leadership", "Compliance", "Technology", "Business"].map((x) => ({ value: x, label: x }))} /></Field>
          <Field label="Level"><Select value={v.level} onChange={(e) => setV({ ...v, level: e.target.value })} options={["Beginner", "Intermediate", "Advanced"].map((x) => ({ value: x, label: x }))} /></Field>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-[13px]"><span><b className="block">Publish on the OENOD Academy marketplace</b><small className="text-muted">Anyone can find it. Your content must be your own original work.</small></span><Toggle checked={v.isPublic} onChange={(x) => setV({ ...v, isPublic: x })} /></label>
        {v.isPublic && <Field label="Price (0 = free)"><Input type="number" min={0} step="1" value={v.price} onChange={(e) => setV({ ...v, price: Number(e.target.value) })} /></Field>}
        <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
          <div className="space-y-1">
            {lessons.map((l, k) => <button key={k} onClick={() => setI(k)} className={cx("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-[13px]", k === i ? "bg-navy text-white" : "hover:bg-bg")}><span className="font-mono text-[11px] opacity-70">{k + 1}</span><span className="truncate">{l.title || "Untitled lesson"}</span></button>)}
            <Button size="sm" variant="ghost" onClick={() => { setLessons((ls) => [...ls, blank()]); setI(lessons.length); }}><Plus className="h-3.5 w-3.5" />Add lesson</Button>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2"><Input value={L.title} onChange={(e) => upd({ title: e.target.value })} placeholder="Lesson title" />{lessons.length > 1 && <Button variant="ghost" onClick={() => { setLessons((ls) => ls.filter((_, k) => k !== i)); setI(Math.max(0, i - 1)); }}><Trash2 className="h-4 w-4" /></Button>}</div>
            <Textarea rows={7} value={L.content} onChange={(e) => upd({ content: e.target.value })} placeholder="The lesson. Short paragraphs and steps work best. Markdown is supported." />
            <div className="grid grid-cols-[1fr_120px] gap-2"><Input value={L.videoUrl} onChange={(e) => upd({ videoUrl: e.target.value })} placeholder="Video link (YouTube, Vimeo…) optional" /><Input type="number" min={1} value={L.durationMin} onChange={(e) => upd({ durationMin: Math.max(1, Number(e.target.value)) })} /></div>
            <div className="rounded-xl border border-line p-3">
              <div className="mb-2 flex items-center justify-between"><b className="text-[13px]">Quiz (pass mark 70%)</b><Button size="sm" variant="ghost" onClick={() => upd({ quiz: [...L.quiz, { q: "", options: ["", "", ""], answer: 0 }] })}><Plus className="h-3.5 w-3.5" />Question</Button></div>
              {!L.quiz.length && <p className="text-xs text-muted">Optional. Add a few questions to check understanding.</p>}
              {L.quiz.map((x, qi) => (
                <div key={qi} className="mb-3 space-y-1.5 border-t border-line pt-3 first:border-0 first:pt-0">
                  <div className="flex gap-2"><Input value={x.q} placeholder={`Question ${qi + 1}`} onChange={(e) => upd({ quiz: L.quiz.map((y, k) => (k === qi ? { ...y, q: e.target.value } : y)) })} /><Button variant="ghost" onClick={() => upd({ quiz: L.quiz.filter((_, k) => k !== qi) })}><Trash2 className="h-4 w-4" /></Button></div>
                  {x.options.map((o, oi) => <label key={oi} className="flex items-center gap-2 text-[13px]"><input type="radio" name={`a${i}-${qi}`} checked={x.answer === oi} onChange={() => upd({ quiz: L.quiz.map((y, k) => (k === qi ? { ...y, answer: oi } : y)) })} /><Input value={o} placeholder={`Answer ${oi + 1}${x.answer === oi ? " (correct)" : ""}`} onChange={(e) => upd({ quiz: L.quiz.map((y, k) => (k === qi ? { ...y, options: y.options.map((z, j) => (j === oi ? e.target.value : z)) } : y)) })} /></label>)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Assign({ c, onClose }: { c: Course; onClose: () => void }) {
  const toast = useToast();
  const people = useApi<{ data: any[] }>("/api/v1/employees?status=ACTIVE&limit=500");
  const [picked, setPicked] = useState<string[]>([]);
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title={`Assign “${c.title}”`} footer={<Button variant="pri" loading={busy} disabled={!picked.length} onClick={async () => { setBusy(true); try { const r = await api(`/api/academy/courses/${c.id}`, { body: { employeeIds: picked, dueDate: due || undefined } }); toast(`Assigned to ${r.assigned} ${r.assigned === 1 ? "person" : "people"}. They've been notified.`); onClose(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } }}>Assign to {picked.length || ""}</Button>}>
      <div className="space-y-3">
        {c.priceCents > 0 && !c.mine && <Callout tone="warn">This is a paid course. Each person uses one seat your company has bought.</Callout>}
        <Field label="Due date (optional)"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <div className="max-h-72 overflow-y-auto rounded-xl border border-line">
          {!people.data ? <Loading /> : <>
            <label className="flex items-center gap-2 border-b border-line bg-bg px-3 py-2 text-xs font-bold"><input type="checkbox" checked={picked.length === people.data.data.length && picked.length > 0} onChange={(e) => setPicked(e.target.checked ? people.data!.data.map((p) => p.id) : [])} />Everyone</label>
            {people.data.data.map((p) => <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-bg"><input type="checkbox" checked={picked.includes(p.id)} onChange={() => setPicked((s) => s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id])} /><span className="flex-1">{p.firstName} {p.lastName}</span><small className="text-muted">{p.department ?? p.jobTitle ?? ""}</small></label>)}
          </>}
        </div>
      </div>
    </Modal>
  );
}
