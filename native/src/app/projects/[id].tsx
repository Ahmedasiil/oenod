// One project: progress, tasks by stage (tap to move along), add tasks, costs against budget, and the project chat.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { get, post, put } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date, money } from '../../lib/format';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Talk } from '../../ui/Talk';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Sheet, State, Tag, ToolPage, isYmd, plusDays, ymd, useBusy } from '../../ui/T1';
import { Task, hTone, late } from './index';

type Mem = { id: number; first_name: string; last_name: string | null };
type P = { id: number; name: string; status: string; description: string | null; due_on: string | null; budget: number | null; spent: number; progress: number; overdue: number; health: string; health_label: string; customer: { name: string } | null;
  tasks: Task[]; members: Mem[]; costs: { id: number; spent_on: string; description: string; amount: number; kind: string }[]; can_edit: boolean };
type Msg = { id: number; body: string; kind: string; created_at: string; user_id: number; name: string; task: string | null };
const ST: [string, string][] = [['todo', 'To do'], ['doing', 'Doing'], ['review', 'Review'], ['done', 'Done']];
const next = (s: string) => (s === 'todo' ? 'doing' : s === 'doing' ? 'review' : s === 'review' ? 'done' : 'todo');

export default function Project() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => get<P>(`/api/projects/${id}`), [id]);
  const [tab, setTab] = useState<'tasks' | 'money' | 'chat'>('tasks');
  const c = useLoad(() => (tab === 'chat' ? get<{ messages: Msg[]; me: number }>(`/api/projects/${id}/chat`) : Promise.resolve(null)), [tab, id]);
  const [nt, setNt] = useState<{ title: string; due_on: string; who: string; priority: string } | null>(null);
  const [nc, setNc] = useState<{ description: string; amount: string; kind: string } | null>(null);
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const p = d.data;
  const who = (k: Task) => (k.first_name ? `${k.first_name} ${k.last_name || ''}`.trim() : null);
  const move = (k: Task) => run('m' + k.id, async () => { await put(`/api/tasks/${k.id}`, { status: next(k.status) }); d.reload(); });
  const addTask = () => {
    if (!nt) return;
    if (!nt.title.trim()) return setErr(t('Name the task.'));
    if (nt.due_on && !isYmd(nt.due_on)) return setErr(t('Type the due date like 2026-12-01.'));
    setErr('');
    run('nt', async () => { await post('/api/tasks', { title: nt.title.trim(), project_id: Number(id), due_on: nt.due_on || null, employee_id: nt.who ? Number(nt.who) : null, priority: nt.priority, status: 'todo' }); setNt(null); d.reload(); });
  };
  const addCost = () => {
    if (!nc) return;
    const a = Number(nc.amount.replace(',', '.'));
    if (!nc.description.trim()) return setErr(t('What was it for?'));
    if (!(a > 0)) return setErr(t('Type the amount.'));
    setErr('');
    run('nc', async () => { await post(`/api/projects/${id}/costs`, { spent_on: ymd(), description: nc.description.trim(), amount: a, kind: nc.kind }); setNc(null); d.reload(); });
  };
  const finish = () => p && run('fin', async () => { await put(`/api/projects/${id}`, { status: p.status === 'done' ? 'active' : 'done' }); d.reload(); });
  if (tab === 'chat' && p) {
    return (
      <View style={{ flex: 1 }}>
        <Talk title={p.name} sub={t('Project chat')} loading={c.loading} error={c.error} onRetry={c.reload} right="briefcase" rightLabel={t('Back to tasks')} onRight={() => setTab('tasks')}
          bubbles={(c.data?.messages || []).map((m) => ({ id: m.id, mine: m.user_id === c.data?.me, by: m.name, body: m.body, at: m.created_at.slice(5, 16).replace('T', ' '), note: m.kind === 'system' ? t('update') : m.task || undefined }))}
          onSend={async (body) => { await post(`/api/projects/${id}/chat`, { body }); await c.reload(); }} empty={t('No messages yet. Say hi to the team.')} />
      </View>
    );
  }
  return (
    <ToolPage title={p?.name || t('Project')} right="plus" rightLabel={t('Add a task')} onRight={() => { setErr(''); setNt({ title: '', due_on: plusDays(7), who: '', priority: 'normal' }); }} refreshing={d.refreshing} onRefresh={d.refresh}>
      {p ? <Hero id="pjd" label={t('Progress')} value={`${p.progress}%`} note={p.overdue ? t('{n} tasks are late', { n: p.overdue }) : t(p.health_label)} noteGood={!p.overdue && p.health !== 'late'}
        stats={[[t('Due'), p.due_on ? date(p.due_on) : '—'], [t('Spent'), money(p.spent)], [t('Budget'), p.budget ? money(p.budget) : '—']]} /> : null}
      <State loading={d.loading && !p} error={!p ? d.error : null} onRetry={d.reload} />
      {p ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Tag text={t(p.health_label)} tone={hTone(p.health)} />{p.customer ? <Text style={{ color: V.mute, fontSize: 13 }}>{p.customer.name}</Text> : null}</View>
          <Chips value={tab} onChange={setTab} items={[['tasks', t('Tasks'), p.tasks.filter((k) => k.status !== 'done').length], ['money', t('Costs')], ['chat', t('Chat')]]} />
          {tab === 'tasks' ? (
            <>
              {ST.map(([k, w]) => { const ts = p.tasks.filter((y) => y.status === k); return ts.length ? (
                <Card key={k} title={`${t(w)} · ${ts.length}`}>
                  {ts.map((y) => <Item key={y.id} onPress={() => move(y)} left={<Dot icon={y.status === 'done' ? 'check' : 'doc'} tone={y.status === 'done' ? 'good' : late(y) ? 'bad' : y.priority === 'high' ? 'warn' : 'dk'} />} title={y.title}
                    sub={[who(y), y.due_on ? t('due {d}', { d: date(y.due_on) }) : null].filter(Boolean).join(' · ')} rightSub={<Tag text={busy === 'm' + y.id ? '…' : y.status === 'done' ? t('Reopen') : t('Move to {s}', { s: t(ST.find((s) => s[0] === next(y.status))![1]) })} tone={y.status === 'done' ? 'plain' : 'info'} />} />)}
                </Card>) : null; })}
              {!p.tasks.length ? <Card><None icon="check" title={t('No tasks yet')} sub={t('Tap Add a task.')} /></Card> : null}
              <Btn text={t('Add a task')} icon="plus" onPress={() => { setErr(''); setNt({ title: '', due_on: plusDays(7), who: '', priority: 'normal' }); }} />
              {p.can_edit ? <Btn text={p.status === 'done' ? t('Open the project again') : t('Mark project done')} icon="check" kind="dark" onPress={finish} busy={busy === 'fin'} /> : null}
            </>
          ) : (
            <>
              <Card title={p.budget ? t('{s} of {b} used', { s: money(p.spent), b: money(p.budget) }) : t('Costs')}>
                {p.budget ? <View style={{ height: 8, borderRadius: 4, backgroundColor: V.surf2, marginVertical: 8 }}><View style={{ width: `${Math.min(100, (p.spent / p.budget) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: p.spent > p.budget ? '#E5484D' : '#1A2FCF' }} /></View> : null}
                {p.costs.length ? p.costs.map((k) => <Item key={k.id} left={<Dot icon="cash" />} title={k.description} sub={`${date(k.spent_on)} · ${t(k.kind)}`} right={money(k.amount, 2)} />) : <None icon="cash" title={t('No costs yet')} />}
              </Card>
              {p.can_edit ? <Btn text={t('Add a cost')} icon="plus" onPress={() => { setErr(''); setNc({ description: '', amount: '', kind: 'material' }); }} /> : null}
            </>
          )}
        </>
      ) : null}
      <Sheet open={!!nt} title={t('Add a task')} onClose={() => setNt(null)}>
        {nt ? (
          <>
            <In label={t('Task')} value={nt.title} onChangeText={(v) => setNt({ ...nt, title: v })} error={err || undefined} />
            <In label={t('Due')} value={nt.due_on} onChangeText={(v) => setNt({ ...nt, due_on: v })} />
            <Chips value={nt.priority} onChange={(v) => setNt({ ...nt, priority: v })} items={[['low', t('Low')], ['normal', t('Normal')], ['high', t('Urgent')]]} />
            {p?.members?.length ? <Pick<string> label={t('Who does it?')} value={nt.who} onChange={(v) => setNt({ ...nt, who: v })} items={[['', t('Nobody yet')], ...p.members.map((m) => [String(m.id), `${m.first_name} ${m.last_name || ''}`.trim()] as [string, string])]} /> : null}
            <Btn text={t('Add task')} icon="check" onPress={addTask} busy={busy === 'nt'} />
          </>
        ) : null}
      </Sheet>
      <Sheet open={!!nc} title={t('Add a cost')} onClose={() => setNc(null)}>
        {nc ? (
          <>
            <In label={t('What was it for?')} value={nc.description} onChangeText={(v) => setNc({ ...nc, description: v })} error={err || undefined} />
            <In label={t('Amount')} value={nc.amount} onChangeText={(v) => setNc({ ...nc, amount: v })} keyboardType="decimal-pad" />
            <Pick label={t('Kind')} value={nc.kind} onChange={(v) => setNc({ ...nc, kind: v })} items={[['material', t('Materials')], ['labor', t('Labour')], ['vendor', t('Supplier')], ['other', t('Other')]]} />
            <Btn text={t('Save cost')} icon="check" onPress={addCost} busy={busy === 'nc'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
