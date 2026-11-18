// One person's onboarding (or leaving) checklist: tick steps done or undo them, see what is late, call or text them.
import React from 'react';
import { Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date, todayKey } from '../../lib/format';
import { t } from '../../lib/i18n';
import { Actions, Card, Dot, Hero, Item, None, State, Tag, ToolPage, useBusy } from '../../ui/T1';

type Task = { id: number; title: string; type: string; assignee: string | null; due_on: string | null; done_at: string | null; done_by_name: string | null };
type F = { id: number; kind: string; status: string; employee: { id: number; first_name: string; last_name: string; job_title: string | null; phone: string | null }; tasks: Task[]; can_manage?: boolean };
const who = (a: string | null) => (a === 'manager' ? t('You') : a === 'hire' || a === 'employee' ? t('Them') : a ? t(a) : '');

export default function Flow() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => get<F>(`/api/flows/${id}`), [id]);
  const { busy, run } = useBusy();
  const f = d.data;
  const today = todayKey();
  const done = (f?.tasks || []).filter((x) => x.done_at).length;
  const tick = (k: Task) => run('t' + k.id, async () => { await post(`/api/flow-tasks/${k.id}/${k.done_at ? 'undo' : 'done'}`); d.reload(); });
  const open = (f?.tasks || []).filter((k) => !k.done_at);
  const closed = (f?.tasks || []).filter((k) => k.done_at);
  const row = (k: Task) => {
    const late = !k.done_at && k.due_on && k.due_on < today;
    return <Item key={k.id} onPress={() => tick(k)} left={<Dot icon={k.done_at ? 'check' : late ? 'clock' : 'doc'} tone={k.done_at ? 'good' : late ? 'bad' : 'dk'} />} title={k.title}
      sub={[who(k.assignee), k.due_on ? t('due {d}', { d: date(k.due_on) }) : null, k.done_at && k.done_by_name ? t('done by {n}', { n: k.done_by_name }) : null].filter(Boolean).join(' · ') || undefined}
      right={busy === 't' + k.id ? '…' : undefined} rightSub={<Tag text={k.done_at ? t('Undo') : t('Mark done')} tone={k.done_at ? 'plain' : late ? 'bad' : 'info'} />} />;
  };
  const name = f ? `${f.employee.first_name} ${f.employee.last_name}` : '';
  return (
    <ToolPage title={name || t('Onboarding')} refreshing={d.refreshing} onRefresh={d.refresh}>
      <State loading={d.loading && !f} error={!f ? d.error : null} onRetry={d.reload} />
      {f ? (
        <>
          <Hero id="flh" label={f.kind === 'offboarding' ? t('Leaving checklist') : t('Joining checklist')} value={f.tasks.length ? `${Math.round((100 * done) / f.tasks.length)}%` : '—'}
            note={t('{d} of {n} steps done', { d: done, n: f.tasks.length })} noteGood={done === f.tasks.length}
            stats={[[t('Job'), f.employee.job_title || '—'], [t('Left'), String(open.length)], [t('Late'), String(open.filter((k) => k.due_on && k.due_on < today).length)]]} />
          <Actions items={[
            { icon: 'phone', label: t('Call'), go: () => f.employee.phone && Linking.openURL(`tel:${f.employee.phone}`), off: !f.employee.phone },
            { icon: 'chat', label: t('Text'), go: () => f.employee.phone && Linking.openURL(`sms:${f.employee.phone}`), off: !f.employee.phone },
            { icon: 'user', label: t('Profile'), go: () => router.push(`/employee/${f.employee.id}`) },
          ]} />
          <Card title={t('To do')}>{open.length ? open.map(row) : <None icon="check" title={t('All done')} sub={t('Every step is finished.')} />}</Card>
          {closed.length ? <Card title={t('Done')}>{closed.map(row)}</Card> : null}
        </>
      ) : null}
    </ToolPage>
  );
}
