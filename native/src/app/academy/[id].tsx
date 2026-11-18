// One course: lessons in order. Read a lesson, answer its quiz, mark it done, and earn the certificate.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Btn, Card, Dot, Hero, Item, None, Pick, Sheet, State, Tag, ToolPage, useBusy } from '../../ui/T1';

type Lesson = { id: number; title: string; body: string | null; minutes: number; quiz: { q: string; options: string[] }[]; done_at: string | null; result: { score: number; passed: number } | null };
type C = { id: number; title: string; summary: string | null; by: string; pass_pct: number; cert_on: boolean; lessons: Lesson[]; progress: number; certificate: { code: string } | null };
export const plain = (h: string | null) => (h || '').replace(/<\/(p|h\d|li|div)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<li>/gi, '• ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\n{3,}/g, '\n\n').trim();

export default function Course() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => get<C>(`/api/learn/${id}`), [id]);
  const [ls, setLs] = useState<Lesson | null>(null);
  const [ans, setAns] = useState<Record<number, string>>({});
  const [res, setRes] = useState<{ score: number; passed: boolean } | null>(null);
  const { busy, run } = useBusy();
  const c = d.data;
  const openL = (l: Lesson) => { setAns({}); setRes(null); setLs(l); };
  const quiz = () => ls && run('q', async () => { const r = await post<{ score: number; passed: boolean }>(`/api/learn/lessons/${ls.id}/quiz`, { answers: ls.quiz.map((_, i) => Number(ans[i] ?? -1)) }); setRes(r); if (r.passed) d.reload(); });
  const done = () => ls && run('d', async () => { await post(`/api/learn/lessons/${ls.id}/done`, {}); setLs(null); d.reload(); });
  const next = c?.lessons.find((l) => !l.done_at);
  return (
    <ToolPage title={c?.title || t('Course')} refreshing={d.refreshing} onRefresh={d.refresh}>
      {c ? <Hero id="acc" label={c.by} value={`${c.progress}%`} note={c.certificate ? t('Certificate {c}', { c: c.certificate.code }) : c.cert_on ? t('Finish every lesson to get your certificate') : t('{n} lessons', { n: c.lessons.length })} noteGood={!!c.certificate}
        stats={[[t('Lessons'), String(c.lessons.length)], [t('Done'), String(c.lessons.filter((l) => l.done_at).length)], [t('Minutes'), String(c.lessons.reduce((s, l) => s + Number(l.minutes || 0), 0))]]} /> : null}
      <State loading={d.loading && !c} error={!c ? d.error : null} onRetry={d.reload} />
      {c ? (
        <>
          {c.summary ? <Text style={{ color: V.mute, fontSize: 14, lineHeight: 20 }}>{plain(c.summary)}</Text> : null}
          {next ? <Btn text={t('Continue: {l}', { l: next.title })} icon="arrow" kind="blue" onPress={() => openL(next)} /> : null}
          <Card title={t('Lessons')}>
            {c.lessons.length ? c.lessons.map((l, i) => <Item key={l.id} onPress={() => openL(l)} left={<Dot icon={l.done_at ? 'check' : 'doc'} tone={l.done_at ? 'good' : 'dk'} />} title={`${i + 1}. ${l.title}`}
              sub={[t('{m} min', { m: l.minutes }), l.quiz.length ? t('Quiz') : null].filter(Boolean).join(' · ')} rightSub={l.done_at ? <Tag text={t('Done')} tone="good" /> : undefined} />) : <None icon="doc" title={t('No lessons yet')} />}
          </Card>
        </>
      ) : null}
      <Sheet open={!!ls} title={ls?.title || ''} onClose={() => setLs(null)}>
        {ls ? (
          <>
            <Text style={{ color: V.ink, fontSize: 15, lineHeight: 22 }}>{plain(ls.body) || t('This lesson has a video. Watch it, then mark it done.')}</Text>
            {ls.quiz.length && !ls.done_at ? (
              <View style={{ gap: 10 }}>
                {ls.quiz.map((q, i) => <Pick<string> key={i} label={`${i + 1}. ${q.q}`} value={ans[i] ?? ''} onChange={(v) => setAns({ ...ans, [i]: v })} items={q.options.map((o, k) => [String(k), o] as [string, string])} />)}
                {res ? <Tag text={res.passed ? t('Passed with {s}%', { s: res.score }) : t('{s}%. You need {p}%. Try again.', { s: res.score, p: c?.pass_pct || 0 })} tone={res.passed ? 'good' : 'bad'} /> : null}
                {!res?.passed ? <Btn text={t('Check my answers')} icon="check" kind="blue" onPress={quiz} busy={busy === 'q'} disabled={Object.keys(ans).length < ls.quiz.length} /> : null}
              </View>
            ) : null}
            {!ls.done_at && (!ls.quiz.length || res?.passed || ls.result?.passed) ? <Btn text={t('Mark lesson done')} icon="check" onPress={done} busy={busy === 'd'} /> : null}
            {ls.done_at ? <Tag text={t('You finished this lesson')} tone="good" /> : null}
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
