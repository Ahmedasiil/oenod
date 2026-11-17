// Help, built into the app: your questions to the OENOD team, their answers, and ask a new one.
import React, { useState } from 'react';
import { router } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { day, label } from '../../lib/format';
import { t } from '../../lib/i18n';
import { Btn, Card, Dot, In, Item, None, Pick, Sheet, State, Tag, ToolPage, useBusy } from '../../ui/T1';

type Tk = { id: number; subject: string; status: string; priority: string; messages?: number; updated_at: string };
type P = 'low' | 'normal' | 'high' | 'urgent';
export const tone = (s: string) => (s === 'pending' ? 'good' : s === 'open' || s === 'new' ? 'warn' : 'plain') as 'good' | 'warn' | 'plain';
export const word = (s: string) => (s === 'pending' ? t('Answered') : s === 'open' || s === 'new' ? t('Waiting for us') : s === 'closed' || s === 'solved' ? t('Closed') : label(s));

export default function Help() {
  const d = useLoad(() => get<{ tickets: Tk[] }>('/api/support'));
  const [f, setF] = useState<{ subject: string; body: string; priority: P } | null>(null);
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const send = () => {
    if (!f) return;
    if (f.subject.trim().length < 3) return setErr(t('Say what it is about in a few words.'));
    if (f.body.trim().length < 3) return setErr(t('Tell us a bit more.'));
    setErr('');
    run('new', async () => { const r = await post<{ id: number }>('/api/support', { subject: f.subject.trim(), body: f.body.trim(), priority: f.priority }); setF(null); d.reload(); router.push(`/support/${r.id}`); });
  };
  return (
    <ToolPage title={t('Help')} right="plus" rightLabel={t('Ask a question')} onRight={() => { setErr(''); setF({ subject: '', body: '', priority: 'normal' }); }} refreshing={d.refreshing} onRefresh={d.refresh}>
      <Card><Item left={<Dot icon="chat" tone="nv" />} title={t('Ask the OENOD team')} sub={t('A real person answers, usually the same day. You get a notice here.')} onPress={() => { setErr(''); setF({ subject: '', body: '', priority: 'normal' }); }} /></Card>
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <Card title={t('Your questions')}>
          {x.tickets.length ? x.tickets.map((k) => (
            <Item key={k.id} onPress={() => router.push(`/support/${k.id}`)} left={<Dot icon="doc" tone={k.status === 'pending' ? 'good' : 'dk'} />} title={k.subject}
              sub={t('#{id} · updated {d}', { id: k.id, d: day(k.updated_at) })} rightSub={<Tag text={word(k.status)} tone={tone(k.status)} />} />
          )) : <None icon="chat" title={t('No questions yet')} sub={t('Tap + if anything is unclear or not working.')} />}
        </Card>
      ) : null}
      <Sheet open={!!f} title={t('Ask a question')} onClose={() => setF(null)}>
        {f ? (
          <>
            <In label={t('What is it about?')} value={f.subject} onChangeText={(v) => setF({ ...f, subject: v })} placeholder={t('Payroll did not send')} error={err || undefined} />
            <In label={t('Tell us more')} value={f.body} onChangeText={(v) => setF({ ...f, body: v })} multiline style={{ minHeight: 120 }} placeholder={t('What happened, and what you expected')} />
            <Pick<P> label={t('How urgent?')} value={f.priority} onChange={(v) => setF({ ...f, priority: v })} items={[['low', t('No rush')], ['normal', t('Normal')], ['high', t('Soon')], ['urgent', t('Urgent')]]} />
            <Btn text={t('Send')} icon="send" onPress={send} busy={busy === 'new'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
