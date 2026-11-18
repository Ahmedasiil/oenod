// Projects, built into the app: every job with health and budget, my tasks, who is overloaded, and start a new project.
import React, { useState } from 'react';
import { router } from 'expo-router';
import { get, post, put } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date, money } from '../../lib/format';
import { t } from '../../lib/i18n';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Sheet, State, Tag, ToolPage, isYmd, plusDays, useBusy } from '../../ui/T1';

export type Proj = { id: number; name: string; status: string; customer: string | null; due_on: string | null; budget: number | null; spent: number; tasks: number; done: number; overdue: number; health: string; health_label: string; unread: number };
export type Task = { id: number; title: string; status: string; priority: string; due_on: string | null; project_id: number | null; project?: string; employee_id: number | null; first_name?: string; last_name?: string; notes?: string | null };
type L = { projects: Proj[]; my_tasks: Task[]; kpi: { active: number; late: number; due_week: number; overdue: number; done_week: number; budget: number; spent: number }; workload: { id: number; first_name: string; last_name: string; open: number; overdue: number }[] };
export const hTone = (h: string) => (h === 'late' ? 'bad' : h === 'risk' ? 'warn' : h === 'done' ? 'good' : h === 'hold' ? 'plain' : 'info') as 'bad' | 'warn' | 'good' | 'plain' | 'info';
export const late = (t0: Task) => !!t0.due_on && t0.status !== 'done' && t0.due_on < new Date().toISOString().slice(0, 10);

export default function Projects() {
  const d = useLoad(() => get<L>('/api/projects'));
  const [tab, setTab] = useState<'active' | 'mine' | 'people' | 'done'>('active');
  const [nw, setNw] = useState<{ name: string; due_on: string; budget: string } | null>(null);
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const act = (x?.projects || []).filter((p) => p.status !== 'done');
  const save = () => {
    if (!nw) return;
    if (!nw.name.trim()) return setErr(t('Give the project a name.'));
    if (nw.due_on && !isYmd(nw.due_on)) return setErr(t('Type the due date like 2026-12-01.'));
    setErr('');
    run('new', async () => { const r = await post<{ id: number }>('/api/projects', { name: nw.name.trim(), due_on: nw.due_on || null, budget: Number(nw.budget.replace(',', '.')) || null }); setNw(null); d.reload(); router.push(`/projects/${r.id}` as any); });
  };
  const tick = (k: Task) => run('t' + k.id, async () => { await put(`/api/tasks/${k.id}`, { status: 'done' }); d.reload(); });
  return (
    <ToolPage title={t('Projects')} right="plus" rightLabel={t('New project')} onRight={() => { setErr(''); setNw({ name: '', due_on: plusDays(30), budget: '' }); }} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x ? <Hero id="pjh" label={t('Active projects')} value={String(x.kpi.active)} note={x.kpi.late ? t('{n} late or at risk', { n: x.kpi.late }) : t('Everything is on track')} noteGood={!x.kpi.late}
        stats={[[t('Due this week'), String(x.kpi.due_week)], [t('Done, 7 days'), String(x.kpi.done_week)], [t('Spent'), x.kpi.budget ? `${money(x.kpi.spent)} / ${money(x.kpi.budget)}` : money(x.kpi.spent)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Chips value={tab} onChange={setTab} items={[['active', t('Active'), act.length], ['mine', t('My tasks'), x.my_tasks.length], ...(x.workload.length ? [['people', t('Who is busy')] as ['people', string]] : []), ['done', t('Done')]]} />
          {tab === 'active' || tab === 'done' ? (
            <Card>
              {(tab === 'active' ? act : x.projects.filter((p) => p.status === 'done')).map((p) => <Item key={p.id} onPress={() => router.push(`/projects/${p.id}` as any)} left={<Dot icon="briefcase" tone={p.health === 'late' ? 'bad' : p.health === 'risk' ? 'warn' : 'nv'} />}
                title={p.name} sub={[p.customer, t('{d} of {n} tasks', { d: p.done, n: p.tasks }), p.due_on ? t('due {d}', { d: date(p.due_on) }) : null, p.unread ? t('{n} new messages', { n: p.unread }) : null].filter(Boolean).join(' · ')}
                right={p.tasks ? `${Math.round((p.done / p.tasks) * 100)}%` : undefined} rightSub={<Tag text={t(p.health_label)} tone={hTone(p.health)} />} />)}
              {!(tab === 'active' ? act : x.projects.filter((p) => p.status === 'done')).length ? <None icon="briefcase" title={tab === 'active' ? t('No active projects') : t('Nothing finished yet')} sub={tab === 'active' ? t('Tap New project to start one.') : undefined} /> : null}
            </Card>
          ) : tab === 'mine' ? (
            <Card>
              {x.my_tasks.length ? x.my_tasks.map((k) => <Item key={k.id} onPress={() => k.project_id && router.push(`/projects/${k.project_id}` as any)} left={<Dot icon="check" tone={late(k) ? 'bad' : 'dk'} />} title={k.title} sub={[k.project, k.due_on ? t('due {d}', { d: date(k.due_on) }) : null].filter(Boolean).join(' · ')}
                rightSub={<Btn text={busy === 't' + k.id ? '…' : t('Done')} onPress={() => tick(k)} />} />) : <None icon="check" title={t('No tasks for you')} />}
            </Card>
          ) : (
            <Card title={t('Open tasks per person')}>{x.workload.map((w) => <Item key={w.id} left={<Dot icon="user" tone={w.overdue ? 'warn' : 'dk'} />} title={`${w.first_name} ${w.last_name || ''}`.trim()} sub={w.overdue ? t('{n} late', { n: w.overdue }) : undefined} right={String(w.open)} />)}</Card>
          )}
        </>
      ) : null}
      <Sheet open={!!nw} title={t('New project')} onClose={() => setNw(null)}>
        {nw ? (
          <>
            <In label={t('Project name')} value={nw.name} onChangeText={(v) => setNw({ ...nw, name: v })} error={err || undefined} />
            <In label={t('Due')} value={nw.due_on} onChangeText={(v) => setNw({ ...nw, due_on: v })} />
            <In label={t('Budget (optional)')} value={nw.budget} onChangeText={(v) => setNw({ ...nw, budget: v })} keyboardType="decimal-pad" />
            <Btn text={t('Start project')} icon="check" onPress={save} busy={busy === 'new'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
