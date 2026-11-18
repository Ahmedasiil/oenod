// Performance, built into the app (managers): team score, who is a star and who needs support, what to do next, and goals.
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { get, post, put } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date } from '../../lib/format';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Sheet, State, Tag, ToolPage, isYmd, useBusy } from '../../ui/T1';

export type Rec = { sev: 'good' | 'info' | 'warn' | 'bad'; title: string; why?: string; steps?: string[] };
export type PCard = { id: number; name: string; job: string | null; score: number | null; prev: number | null; trend: number | null; level: Lvl; shifts: number; late: number; no_show: number; hours: number; sales: number;
  goals: number; goals_done: number; review: { rating: number; period: string; days: number } | null; recs: Rec[]; parts: Record<string, number | null> };
type Lvl = 'star' | 'solid' | 'watch' | 'support' | 'none';
type R = { avg: number | null; prev_avg: number | null; levels: Record<Lvl, number>; totals: { shifts: number; late: number; no_show: number; hours: number }; people: PCard[]; team_recs: Rec[] };
export type Goal = { id: number; title: string; employee_id: number | null; first_name: string | null; last_name: string | null; target: number | null; progress: number | null; unit: string | null; due_on: string | null; status: GS };
export type GS = 'on_track' | 'at_risk' | 'done' | 'dropped';
export const LV: Record<Lvl, [string, 'good' | 'info' | 'warn' | 'bad' | 'plain']> = { star: ['Star', 'good'], solid: ['Solid', 'info'], watch: ['Watch', 'warn'], support: ['Needs support', 'bad'], none: ['Not enough data', 'plain'] };
export const GW: Record<GS, string> = { on_track: 'On track', at_risk: 'At risk', done: 'Done', dropped: 'Dropped' };
export const recTone = (s: string) => (s === 'good' ? 'good' : s === 'bad' ? 'bad' : s === 'warn' ? 'warn' : 'nv') as 'good' | 'bad' | 'warn' | 'nv';
export type GF = { id?: number; title: string; employee_id: number | null; target: string; progress: string; unit: string; due_on: string; status: GS };

export function GoalSheet({ f, setF, people, onSaved }: { f: GF | null; setF: (f: GF | null) => void; people: { id: number; name: string }[]; onSaved: () => void }) {
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const save = () => {
    if (!f) return;
    if (f.title.trim().length < 2) return setErr(t('Type the goal.'));
    if (f.due_on.trim() && !isYmd(f.due_on.trim())) return setErr(t('Type the date like 2026-12-31.'));
    setErr('');
    const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));
    const body = { title: f.title.trim(), employee_id: f.employee_id, target: num(f.target), progress: num(f.progress), unit: f.unit.trim() || null, due_on: f.due_on.trim() || null, status: f.status };
    run('g', async () => { if (f.id) await put(`/api/goals/${f.id}`, body); else await post('/api/goals', body); setF(null); onSaved(); });
  };
  return (
    <Sheet open={!!f} title={f?.id ? t('Update goal') : t('New goal')} onClose={() => setF(null)}>
      {f ? (
        <>
          <In label={t('Goal')} value={f.title} onChangeText={(v) => setF({ ...f, title: v })} placeholder={t('Average ticket over $14')} error={err || undefined} />
          {!f.id ? <Pick<string> label={t('For')} value={String(f.employee_id || 0)} onChange={(v) => setF({ ...f, employee_id: Number(v) || null })} items={[['0', t('Whole team')], ...people.slice(0, 15).map((p) => [String(p.id), p.name] as [string, string])]} /> : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <In style={{ flex: 1 }} label={t('Now at')} value={f.progress} onChangeText={(v) => setF({ ...f, progress: v })} keyboardType="decimal-pad" />
            <In style={{ flex: 1 }} label={t('Target')} value={f.target} onChangeText={(v) => setF({ ...f, target: v })} keyboardType="decimal-pad" />
            <In style={{ flex: 1 }} label={t('Unit')} value={f.unit} onChangeText={(v) => setF({ ...f, unit: v })} placeholder="$" />
          </View>
          <In label={t('Due (optional)')} value={f.due_on} onChangeText={(v) => setF({ ...f, due_on: v })} placeholder="2026-12-31" />
          <Pick<GS> label={t('How is it going?')} value={f.status} onChange={(v) => setF({ ...f, status: v })} items={(Object.keys(GW) as GS[]).map((k) => [k, t(GW[k])] as [GS, string])} />
          <Btn text={t('Save goal')} icon="check" onPress={save} busy={busy === 'g'} />
        </>
      ) : null}
    </Sheet>
  );
}
export const goalItem = (g: Goal, onPress: () => void) => (
  <Item key={g.id} onPress={onPress} left={<Dot icon="spark" tone={g.status === 'done' ? 'good' : g.status === 'at_risk' ? 'warn' : 'dk'} />} title={g.title}
    sub={[g.first_name ? `${g.first_name} ${g.last_name || ''}`.trim() : t('Whole team'), g.due_on ? t('due {d}', { d: date(g.due_on) }) : null].filter(Boolean).join(' · ')}
    right={g.target != null ? `${g.progress ?? 0} / ${g.target}${g.unit ? ' ' + g.unit : ''}` : undefined} rightSub={<Tag text={t(GW[g.status])} tone={g.status === 'done' ? 'good' : g.status === 'at_risk' ? 'warn' : g.status === 'dropped' ? 'plain' : 'info'} />} />
);
export const toGF = (g: Goal): GF => ({ id: g.id, title: g.title, employee_id: g.employee_id, target: g.target != null ? String(g.target) : '', progress: g.progress != null ? String(g.progress) : '', unit: g.unit || '', due_on: g.due_on || '', status: g.status });

export default function Performance() {
  const d = useLoad(() => get<R>('/api/performance/report'));
  const g = useLoad(() => get<{ goals: Goal[] }>('/api/goals').catch(() => ({ goals: [] as Goal[] })));
  const [tab, setTab] = useState<'people' | 'goals' | 'todo'>('people');
  const [lv, setLv] = useState<Lvl | ''>('');
  const [gf, setGf] = useState<GF | null>(null);
  const x = d.data;
  const people = useMemo(() => (x?.people || []).filter((p) => !lv || p.level === lv), [x, lv]);
  const goals = (g.data?.goals || []).filter((y) => y.status !== 'dropped');
  const trend = x && x.avg != null && x.prev_avg != null ? x.avg - x.prev_avg : null;
  return (
    <ToolPage title={t('Performance')} right="plus" rightLabel={t('New goal')} onRight={() => setGf({ title: '', employee_id: null, target: '', progress: '', unit: '', due_on: '', status: 'on_track' })} refreshing={d.refreshing} onRefresh={() => { d.refresh(); g.reload(); }}>
      {x ? <Hero id="pfh" label={t('Team score')} value={x.avg != null ? `${x.avg} / 100` : '—'} note={trend == null ? t('Scores come from attendance, goals, reviews and training') : trend >= 0 ? t('Up {n} from last period', { n: trend }) : t('Down {n} from last period', { n: -trend })} noteGood={(trend ?? 0) >= 0}
        stats={[[t('Stars'), String(x.levels.star)], [t('Need support'), String(x.levels.support + x.levels.watch)], [t('Late shifts'), String(x.totals.late + x.totals.no_show)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Chips value={tab} onChange={setTab} items={[['people', t('People'), x.people.length], ['goals', t('Goals'), goals.length], ['todo', t('What to do'), x.team_recs.length]]} />
          {tab === 'people' ? (
            <>
              <Chips<string> value={lv} onChange={(v) => setLv(v as any)} items={[['', t('Everyone')], ...(['star', 'solid', 'watch', 'support'] as Lvl[]).map((k) => [k, t(LV[k][0]), x.levels[k]] as [string, string, number])]} />
              <Card>
                {people.length ? people.map((p) => (
                  <Item key={p.id} onPress={() => router.push(`/performance/${p.id}`)} left={<Dot icon="user" tone={p.level === 'star' ? 'good' : p.level === 'support' ? 'bad' : p.level === 'watch' ? 'warn' : 'dk'} />} title={p.name}
                    sub={[p.job, t('{s} shifts', { s: p.shifts }), p.late ? t('{n} late', { n: p.late }) : null, !p.review || p.review.days > 180 ? t('review due') : null].filter(Boolean).join(' · ')}
                    right={p.score != null ? String(p.score) : '—'} rightSub={<Tag text={t(LV[p.level][0])} tone={LV[p.level][1]} />} />
                )) : <None icon="users" title={t('Nobody here')} />}
              </Card>
            </>
          ) : tab === 'goals' ? (
            <Card>{goals.length ? goals.map((y) => goalItem(y, () => setGf(toGF(y)))) : <None icon="spark" title={t('No goals yet')} sub={t('Tap + to add a team or personal goal.')} />}</Card>
          ) : (
            x.team_recs.length ? x.team_recs.map((r, i) => (
              <Card key={i}><View style={{ paddingVertical: 12, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Dot icon={r.sev === 'good' ? 'heart' : 'spark'} tone={recTone(r.sev)} /><Text style={{ color: V.ink, fontSize: 15.5, fontWeight: '700', flex: 1 }}>{r.title}</Text></View>
                {r.why ? <Text style={{ color: V.mute, fontSize: 13.5 }}>{r.why}</Text> : null}
                {(r.steps || []).map((s, j) => <Text key={j} style={{ color: V.ink, fontSize: 14 }}>{`${j + 1}. ${s}`}</Text>)}
              </View></Card>
            )) : <Card><None icon="check" title={t('Nothing to fix')} sub={t('Your team is in good shape.')} /></Card>
          )}
        </>
      ) : null}
      <GoalSheet f={gf} setF={setGf} people={(x?.people || []).map((p) => ({ id: p.id, name: p.name }))} onSaved={() => { g.reload(); d.reload(); }} />
    </ToolPage>
  );
}
