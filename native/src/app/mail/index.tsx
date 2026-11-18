// Mail, built into the app: every connected inbox, what needs you first, search, and write a new email.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { time, day, dayKey, todayKey } from '../../lib/format';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Btn, Card, Chips, Hero, Item, None, Search, State, Tag, ToolPage, useBusy } from '../../ui/T1';
import { Face } from '../chat/index';

export type Msg = { id: number; account_id: number; account: string; color: string; from_email: string | null; from_name: string | null; to: string | null; subject: string | null; snippet: string | null; at: string;
  unread: boolean; starred: boolean; archived: boolean; cat: string | null; flags: unknown[]; customer_id: number | null; attach: boolean; ai: string | null; waiting_h?: number };
export type Acc = { id: number; email: string; name?: string; color?: string; unread: number };
type Home = { accounts: Acc[]; counts: Record<string, number>; ai: boolean };
type Box = 'priority' | 'unread' | 'starred' | 'waiting' | 'customers' | 'money' | 'other' | 'sent' | 'archived';
export const when = (at?: string) => (!at ? '' : dayKey(at) === todayKey() ? time(at) : day(at));

export default function Mail() {
  const h = useLoad(() => get<Home>('/api/mail/home'));
  const [box, setBox] = useState<Box>('priority');
  const [q, setQ] = useState('');
  const [sq, setSq] = useState('');
  const m = useLoad(() => get<{ msgs: Msg[]; more: boolean }>(`/api/mail/msgs?box=${sq ? 'search' : box}${sq ? '&q=' + encodeURIComponent(sq) : ''}`), [box, sq]);
  const { busy, run } = useBusy();
  const x = h.data;
  const c = x?.counts || {};
  const sync = () => run('sync', async () => { await post('/api/mail/sync'); h.reload(); m.reload(); });
  const none = x && !x.accounts.length;
  return (
    <ToolPage title={t('Mail')} right="plus" rightLabel={t('Write an email')} onRight={() => router.push('/mail/new')} refreshing={m.refreshing} onRefresh={() => { h.reload(); m.refresh(); }}>
      {x && !none ? <Hero id="mlh" label={t('Unread')} value={String(c.unread || 0)} note={c.waiting ? c.waiting === 1 ? t('1 person is waiting on your answer') : t('{n} people waiting on your answer', { n: c.waiting }) : t('Nobody is waiting on you')} noteGood={!c.waiting}
        stats={[[t('Customers'), String(c.customers || 0)], [t('Money'), String(c.money || 0)], [t('Starred'), String(c.starred || 0)]]} /> : null}
      <State loading={h.loading && !x} error={!x ? h.error : null} onRetry={h.reload} />
      {none ? (
        <Card><None icon="mail" title={t('Connect your email')} sub={t('Bring your Gmail, Outlook or company inbox into OENOD. You sign in once with your email provider.')} />
          <View style={{ paddingBottom: 14 }}><Btn text={t('Connect email')} icon="link" onPress={() => router.push({ pathname: '/web', params: { path: '/mail', title: t('Connect email') } })} /></View></Card>
      ) : x ? (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Btn text={t('Write')} icon="send" onPress={() => router.push('/mail/new')} /></View>
            <View style={{ flex: 1 }}><Btn text={t('Check now')} icon="cloud" kind="dark" onPress={sync} busy={busy === 'sync'} /></View>
          </View>
          <Search value={q} onChange={(v) => { setQ(v); if (!v.trim()) setSq(''); }} placeholder={t('Search mail, then press enter')} />
          {q.trim() && q.trim() !== sq ? <Btn text={t('Search for "{q}"', { q: q.trim() })} icon="search" kind="dark" onPress={() => setSq(q.trim())} /> : null}
          {!sq ? <Chips<Box> value={box} onChange={setBox} items={[['priority', t('Important')], ['unread', t('Unread'), c.unread], ['waiting', t('Waiting on you'), c.waiting], ['customers', t('Customers')], ['money', t('Money')], ['starred', t('Starred')], ['other', t('Newsletters'), c.other], ['sent', t('Sent')], ['archived', t('Done')]]} /> : null}
          <State loading={m.loading && !m.data} error={!m.data ? m.error : null} onRetry={m.reload} />
          {m.data ? (
            <Card>
              {m.data.msgs.length ? m.data.msgs.map((e) => {
                const who = box === 'sent' ? (e.to || '').split(',')[0] : e.from_name || e.from_email || t('Unknown');
                return (
                  <Item key={e.id} onPress={() => router.push(`/mail/${e.id}`)} left={<Face name={who} color={e.color} />} title={(e.unread ? '● ' : '') + who}
                    sub={[e.subject || t('(no subject)'), e.ai || e.snippet].filter(Boolean).join(' · ')} right={when(e.at)}
                    rightSub={e.waiting_h ? <Tag text={t('{h} h', { h: Math.round(e.waiting_h) })} tone="warn" /> : e.customer_id ? <Tag text={t('Customer')} tone="info" /> : e.starred ? '★' : e.attach ? '📎' : undefined} />
                );
              }) : <None icon="mail" title={sq ? t('Nothing found') : t('All clear')} sub={sq ? undefined : t('Nothing here right now.')} />}
            </Card>
          ) : null}
          {x.accounts.length > 1 ? <Text style={{ color: V.mute, fontSize: 12.5, textAlign: 'center' }}>{x.accounts.map((a) => `${a.email}${a.unread ? ` (${a.unread})` : ''}`).join(' · ')}</Text> : null}
        </>
      ) : null}
    </ToolPage>
  );
}
