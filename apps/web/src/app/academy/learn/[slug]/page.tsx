"use client";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Award, Check, CheckCircle2, Lock, Menu, PlayCircle, X } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { Logo } from "@/components/logo";
import { Markdown } from "@/components/markdown";
import { Button, Loading, cx, useToast } from "@/components/ui";

type Lesson = { id: string; title: string; order: number; durationMin: number; isPreview: boolean; locked: boolean; content: string | null; videoUrl: string | null; quiz: { q: string; options: string[] }[] | null };

/** YouTube / Vimeo links become embeds; anything else plays as a video file. */
function embed(url: string) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export default function Learn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const sp = useSearchParams();
  const toast = useToast();
  const { data, reload } = useApi<any>(`/api/academy/catalog/${slug}`);
  const [cur, setCur] = useState<string | null>(sp.get("lesson"));
  const [nav, setNav] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ passed: boolean; correct?: number; total?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [cert, setCert] = useState<string | null>(null);
  const lessons: Lesson[] = data?.lessons ?? [];
  const done = new Set<string>(data?.enrollment?.completedLessons ?? []);
  const lesson = useMemo(() => lessons.find((l) => l.id === cur) ?? lessons.find((l) => l.id === data?.enrollment?.lastLessonId && !done.has(l.id)) ?? lessons.find((l) => !done.has(l.id) && !l.locked) ?? lessons[0], [lessons, cur, data]); // eslint-disable-line react-hooks/exhaustive-deps
  const idx = lesson ? lessons.indexOf(lesson) : 0;

  // Free courses: opening the player enrolls you so progress can be saved.
  useEffect(() => {
    if (data && !data.enrollment && data.access && data.course.priceCents === 0) api("/api/academy/enroll", { body: { courseId: data.course.id } }).then(() => reload()).catch(() => {});
  }, [data?.course?.id, data?.enrollment, data?.access]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setAnswers([]); setResult(null); window.scrollTo({ top: 0 }); }, [lesson?.id]);

  if (!data) return <div className="grid min-h-dvh place-items-center"><Loading /></div>;
  const go = (l?: Lesson) => { if (l) { setCur(l.id); setNav(false); } };
  const complete = async () => {
    if (!lesson) return;
    if (!data.enrollment) { location.href = `/academy/${slug}`; return; }
    setBusy(true);
    try {
      const r = await api("/api/academy/progress", { body: { courseId: data.course.id, lessonId: lesson.id, answers: lesson.quiz?.length ? answers : undefined } });
      setResult(r);
      if (!r.passed) return;
      if (r.certificateCode && !data.enrollment.certificateCode) setCert(r.certificateCode);
      await reload();
      if (!r.certificateCode || data.enrollment.certificateCode) { toast("Lesson complete"); go(lessons[idx + 1]); }
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  const quizReady = !lesson?.quiz?.length || answers.filter((a) => a !== undefined).length === lesson.quiz.length;
  const progress = data.enrollment?.progress ?? 0;

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur">
        <button className="grid h-9 w-9 place-items-center rounded-lg border border-line lg:hidden" onClick={() => setNav(!nav)} aria-label="Lessons">{nav ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
        <Logo className="h-5 w-auto" href="/academy" />
        <span className="hidden h-5 w-px bg-line sm:block" />
        <b className="hidden min-w-0 truncate text-[13.5px] sm:block">{data.course.title}</b>
        <span className="ms-auto flex items-center gap-2 text-xs text-muted"><span className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-bg sm:block"><span className="block h-full rounded-full bg-blue transition-all" style={{ width: `${progress}%` }} /></span>{progress}%</span>
        <Link href={`/academy/${slug}`} className="btn-sm btn">Exit</Link>
      </header>
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={cx("border-e border-line bg-white lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-56px)] lg:overflow-y-auto", nav ? "fixed inset-x-0 bottom-0 top-14 z-20 overflow-y-auto" : "hidden")}>
          <ol className="p-3">{lessons.map((l, i) => (
            <li key={l.id}><button disabled={l.locked} onClick={() => go(l)} className={cx("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-start text-[13px] disabled:opacity-50", l.id === lesson?.id ? "bg-sky" : "hover:bg-bg")}>
              <span className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold", done.has(l.id) ? "bg-[#1FAF6B] text-white" : l.id === lesson?.id ? "bg-blue text-white" : "bg-bg text-muted")}>{done.has(l.id) ? <Check className="h-3 w-3" /> : i + 1}</span>
              <span className="min-w-0 flex-1"><b className={cx("block leading-snug", l.id === lesson?.id ? "text-navy" : "font-semibold")}>{l.title}</b><small className="text-[11px] text-muted">{l.durationMin} min{l.quiz?.length ? " · quiz" : ""}</small></span>
              {l.locked && <Lock className="mt-0.5 h-3.5 w-3.5 text-muted" />}
            </button></li>
          ))}</ol>
        </aside>
        <main className="min-w-0 px-4 py-8 sm:px-10">
          {cert ? (
            <div className="mx-auto max-w-2xl py-10 text-center">
              <Award className="mx-auto h-12 w-12 text-blue" />
              <h1 className="mt-4 font-display text-3xl font-semibold">You did it!</h1>
              <p className="mt-2 text-muted">You completed {data.course.title}. Your certificate is ready and we emailed you a copy.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/certificates/${cert}/image`} alt="Your certificate" className="mt-8 w-full rounded-2xl border border-line shadow-lift" />
              <div className="mt-6 flex flex-wrap justify-center gap-2"><a href={`/api/certificates/${cert}/image?download=1`} className="btn-pri">Download</a><Link href={`/verify/${cert}`} className="btn">Share link</Link><Link href="/academy" className="btn">More courses</Link></div>
            </div>
          ) : !lesson ? <p className="text-muted">This course has no lessons yet.</p> : lesson.locked ? (
            <div className="mx-auto max-w-lg py-16 text-center"><Lock className="mx-auto h-8 w-8 text-muted" /><h1 className="mt-4 font-display text-2xl font-semibold">This lesson is locked</h1><p className="mt-2 text-muted">Get the course to unlock every lesson and the certificate.</p><Link href={`/academy/${slug}`} className="btn-pri mt-6">See options</Link></div>
          ) : (
            <article className="mx-auto max-w-3xl">
              <p className="eyebrow">Lesson {idx + 1} of {lessons.length}</p>
              <h1 className="mt-2 text-balance font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">{lesson.title}</h1>
              {lesson.videoUrl && (
                <div className="mt-6 aspect-video overflow-hidden rounded-2xl bg-navy">
                  {embed(lesson.videoUrl) ? <iframe src={embed(lesson.videoUrl)!} title={lesson.title} className="h-full w-full" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /> : <video src={lesson.videoUrl} controls className="h-full w-full" />}
                </div>
              )}
              <div className="mt-6 text-[15.5px] [&_p]:leading-8"><Markdown text={lesson.content ?? ""} /></div>
              {lesson.quiz?.length ? (
                <section className="mt-10 rounded-[22px] border border-line p-6">
                  <b className="font-display text-lg">Quick check</b>
                  <p className="text-[13px] text-muted">Get {Math.ceil(lesson.quiz.length * 0.7)} of {lesson.quiz.length} right to complete the lesson.</p>
                  <ol className="mt-5 space-y-6">{lesson.quiz.map((q, qi) => (
                    <li key={qi}><b className="text-[14.5px]">{qi + 1}. {q.q}</b>
                      <div className="mt-2 grid gap-2">{q.options.map((o, oi) => (
                        <label key={oi} className={cx("flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[14px] transition", answers[qi] === oi ? "border-blue bg-sky/60" : "border-line hover:border-[#C9D4FF]")}>
                          <input type="radio" name={`q${qi}`} className="accent-[#2342E0]" checked={answers[qi] === oi} onChange={() => setAnswers((a) => { const n = [...a]; n[qi] = oi; return n; })} />{o}
                        </label>
                      ))}</div>
                    </li>
                  ))}</ol>
                  {result && !result.passed && <p className="mt-5 rounded-xl bg-[#FFF4DF] px-4 py-3 text-[13.5px] text-[#8A5A00]">You got {result.correct} of {result.total}. Read the lesson again and give it another go.</p>}
                </section>
              ) : null}
              <div className="mt-10 flex items-center gap-3 border-t border-line pt-6">
                {idx > 0 && <Button variant="ghost" onClick={() => go(lessons[idx - 1])}><ArrowLeft className="h-4 w-4 rtl:rotate-180" />Previous</Button>}
                <span className="ms-auto" />
                {done.has(lesson.id) ? (idx < lessons.length - 1 ? <Button variant="pri" onClick={() => go(lessons[idx + 1])}>Next lesson<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Button> : <span className="flex items-center gap-1.5 text-sm font-bold text-[#1FAF6B]"><CheckCircle2 className="h-4 w-4" />Course complete</span>)
                  : data.enrollment ? <Button variant="pri" loading={busy} disabled={!quizReady} onClick={complete}>{lesson.quiz?.length ? "Check answers" : "Mark complete"}<Check className="h-4 w-4" /></Button>
                  : <Link href={`/academy/${slug}`} className="btn-pri"><PlayCircle className="h-4 w-4" />Enroll to save progress</Link>}
              </div>
            </article>
          )}
        </main>
      </div>
    </div>
  );
}
