// One person's performance: score and what it is made of, tips, goals, past reviews, and write a review with Ava's draft.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date } from '../../lib/format';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Btn, Card, Dot, Hero, In, Item, None, Pick, Sheet, State, ToolPage, useBusy } from '../../ui/T1';
import { GoalSheet, LV, goalItem, recTone, toGF, type GF, type Goal, type PCard } from './index';

type Rv = { id: number; period: string; rating: number; strengths: string | null; improve: string | null; created_at: string; reviewer: string | null; acknowledged_at?: string | null };
const PART: Record<string, string> = { attendance: 'Shows up on time', sales: 'Sales', goals: 'Goals', review: 'Last review', training: 'Training' };
const period = () => { const d = new Date(); return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`; };

export default function Person() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => get<PCard & { weeks?: unknown[] }>(`/api/performance/person/${id}`), [id]);
  const g = useLoad(() => get<{ goals: Goal[]; reviews: Rv[] }>(`/api/goals?employee_id=${id}`).catch(() => ({ goals: [] as Goal[], reviews: [] as Rv[] })), [id]);
  const [w, setW] = useState<{ rating: string; strengths: string; improve: string; period: string } | null>(null);
  const [gf, setGf] = useState<GF | null>(null);
  const { busy, run } = useBusy();
  const c = d.data;
  const draft = () => run('dr', async () => { const r = await post<{ rating: number; strengths: string; improve: string }>(`/api/performance/person/${id}/draft`); setW((p) => ({ period: p?.period || period(), rating: String(r.rating || 3), strengths: r.strengths || '', improve: r.improve || '' })); });
  const save = () => w && run('sv', async () => { await post('/api/reviews/performance', { employee_id: Number(id), period: w.period.trim() || period(), rating: Number(w.rating), strengths: w.strengths.trim() || null, improve: w.improve.trim() || null }); setW(null); d.reload(); g.reload(); });
  return (
    <ToolPage title={c?.name || t('Performance')} right="plus" rightLabel={t('New goal')} onRight={() => setGf({ title: '', employee_id: Number(id), target: '', progress: '', unit: '', due_on: '', status: 'on_track' })} refreshing={d.refreshing} onRefresh={() => { d.refresh(); g.reload(); }}>
      <State loading={d.loading && !c} error={!c ? d.error : null} onRetry={d.reload} />
      {c ? (
        <>
          <Hero id="pph" label={t(LV[c.level][0])} value={c.score != null ? `${c.score} / 100` : '—'} note={c.trend == null ? (c.job || '') : c.trend >= 0 ? t('Up {n} from last period', { n: c.trend }) : t('Down {n} from last period', { n: -c.trend })} noteGood={(c.trend ?? 0) >= 0}
            stats={[[t('Shifts'), String(c.shifts)], [t('Late'), String(c.late + c.no_show)], [t('Hours'), String(Math.round(c.hours))]]} />
          <Btn text={t('Write a review')} icon="doc" onPress={() => setW({ rating: '3', strengths: '', improve: '', period: period() })} />
          <Card title={t('What the score is made of')}>
            {Object.entries(c.parts).map(([k, v]) => (
              <View key={k} style={{ paddingVertical: 10, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: V.ink, fontSize: 14.5, fontWeight: '600' }}>{t(PART[k] || k)}</Text><Text style={{ color: V.ink, fontSize: 14.5, fontWeight: '700' }}>{v == null ? '—' : v}</Text></View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: V.surf2 }}>{v != null ? <View style={{ width: `${Math.max(3, v)}%`, height: 8, borderRadius: 4, backgroundColor: v >= 70 ? '#1C9C6B' : v >= 55 ? '#D98A1C' : '#E5484D' }} /> : null}</View>
              </View>
            ))}
          </Card>
          {c.recs?.length ? <Card title={t('Tips')}>{c.recs.map((r, i) => <Item key={i} left={<Dot icon={r.sev === 'good' ? 'heart' : 'spark'} tone={recTone(r.sev)} />} title={r.title} sub={r.why || (r.steps || [])[0]} />)}</Card> : null}
          <Card title={t('Goals')} right={t('Add')} onRight={() => setGf({ title: '', employee_id: Number(id), target: '', progress: '', unit: '', due_on: '', status: 'on_track' })}>
            {(g.data?.goals || []).length ? g.data!.goals.map((y) => goalItem(y, () => setGf(toGF(y)))) : <None icon="spark" title={t('No goals yet')} />}
          </Card>
          <Card title={t('Reviews')}>
            {(g.data?.reviews || []).length ? g.data!.reviews.map((r) => <Item key={r.id} left={<Dot icon="doc" />} title={`${r.period} · ${'★'.repeat(Math.max(0, Math.min(5, r.rating)))}`} sub={[r.strengths, r.improve].filter(Boolean).join(' · ') || undefined} rightSub={date(String(r.created_at).slice(0, 10))} />)
              : <None icon="doc" title={t('No reviews yet')} sub={t('Tap Write a review. Ava drafts it from their shifts, goals and training.')} />}
          </Card>
        </>
      ) : null}
      <Sheet open={!!w} title={t('Review for {n}', { n: c?.name || '' })} onClose={() => setW(null)}>
        {w ? (
          <>
            <Btn text={t('Ava writes a draft')} icon="spark" kind="dark" onPress={draft} busy={busy === 'dr'} />
            <In label={t('Period')} value={w.period} onChangeText={(v) => setW({ ...w, period: v })} />
            <Pick<string> label={t('Rating')} value={w.rating} onChange={(v) => setW({ ...w, rating: v })} items={['1', '2', '3', '4', '5'].map((n) => [n, '★'.repeat(Number(n))] as [string, string])} />
            <In label={t('What they do well')} value={w.strengths} onChangeText={(v) => setW({ ...w, strengths: v })} multiline style={{ minHeight: 100 }} />
            <In label={t('What to work on')} value={w.improve} onChangeText={(v) => setW({ ...w, improve: v })} multiline style={{ minHeight: 100 }} />
            <Btn text={t('Save review')} icon="check" onPress={save} busy={busy === 'sv'} />
          </>
        ) : null}
      </Sheet>
      <GoalSheet f={gf} setF={setGf} people={c ? [{ id: c.id, name: c.name }] : []} onSaved={() => { g.reload(); d.reload(); }} />
    </ToolPage>
  );
}
