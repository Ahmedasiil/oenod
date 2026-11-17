// Team chat, built into the app: every room and direct message, unread counts, and start a new message with anyone on the team.
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { time, day, dayKey, todayKey, initials } from '../../lib/format';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Card, Chips, Item, None, Search, Sheet, State, Tag, ToolPage, useBusy } from '../../ui/T1';

type Ch = { id: number; kind: string; name: string; topic?: string | null; unread: number; muted?: boolean; can_post?: boolean; members?: number; peers?: { id: number; name: string }[]; last?: { by?: string; body?: string; at?: string } | null };
type Person = { id: number; name: string; role?: string; color?: string; job?: string | null; online?: boolean };
type D = { channels: Ch[]; people: Person[]; me: number; is_mgr: boolean; unread: number };

export function Face({ name, color, online }: { name: string; color?: string; online?: boolean }) {
  return (
    <View style={{ width: 42, height: 42 }}>
      <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: color || '#2238D8' }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>{initials(name)}</Text>
      </View>
      {online ? <View style={{ position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#28D17C', borderWidth: 2, borderColor: V.surf }} /> : null}
    </View>
  );
}
const when = (at?: string) => (!at ? '' : dayKey(at) === todayKey() ? time(at) : day(at));

export default function Chat() {
  const d = useLoad(() => get<D>('/api/chat'));
  const [tab, setTab] = useState<'all' | 'unread' | 'rooms' | 'dm'>('all');
  const [q, setQ] = useState('');
  const [pick, setPick] = useState(false);
  const [pq, setPq] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (x?.channels || []).filter((c) => (tab === 'all' || (tab === 'unread' ? c.unread > 0 : tab === 'dm' ? c.kind === 'dm' : c.kind !== 'dm')) && (!s || `${c.name} ${c.topic || ''}`.toLowerCase().includes(s)))
      .sort((a, b) => String(b.last?.at || '').localeCompare(String(a.last?.at || '')));
  }, [x, tab, q]);
  const people = (x?.people || []).filter((p) => p.id !== x?.me && (!pq.trim() || `${p.name} ${p.job || ''}`.toLowerCase().includes(pq.trim().toLowerCase())));
  const dm = (p: Person) => run('dm' + p.id, async () => { const r = await post<{ id: number }>('/api/chat/dm', { user_ids: [p.id] }); setPick(false); setPq(''); router.push(`/chat/${r.id}`); });
  const online = (x?.people || []).filter((p) => p.online && p.id !== x?.me).length;
  return (
    <ToolPage title={t('Team chat')} right="plus" rightLabel={t('New message')} onRight={() => setPick(true)} refreshing={d.refreshing} onRefresh={d.refresh}>
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Text style={{ color: V.mute, fontSize: 13, textAlign: 'center', marginTop: -8 }}>{x.unread ? t('{n} unread · {o} online now', { n: x.unread, o: online }) : t('All read · {o} online now', { o: online })}</Text>
          <Search value={q} onChange={setQ} placeholder={t('Search rooms and people')} />
          <Chips value={tab} onChange={setTab} items={[['all', t('All')], ['unread', t('Unread'), x.channels.filter((c) => c.unread > 0).length], ['rooms', t('Rooms')], ['dm', t('Direct')]]} />
          <Card>
            {list.length ? list.map((c) => (
              <Item key={c.id} onPress={() => router.push(`/chat/${c.id}`)}
                left={c.kind === 'dm' ? <Face name={c.name} online={(x.people.find((p) => p.id === c.peers?.[0]?.id) || {}).online} /> : <View style={{ width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: c.kind === 'announce' ? '#2238D8' : V.surf2 }}><Text style={{ color: c.kind === 'announce' ? '#FFFFFF' : V.ink, fontSize: 18, fontWeight: '700' }}>{c.kind === 'announce' ? '!' : '#'}</Text></View>}
                title={c.name} sub={c.last?.body ? `${c.last.by ? c.last.by + ': ' : ''}${c.last.body}` : c.topic || t('No messages yet')}
                right={when(c.last?.at) || undefined} rightSub={c.unread ? <Tag text={String(c.unread)} tone="info" /> : c.muted ? t('Muted') : undefined} />
            )) : <None icon="chat" title={q || tab !== 'all' ? t('Nothing here') : t('No chats yet')} sub={t('Tap + to message someone on your team.')} />}
          </Card>
        </>
      ) : null}
      <Sheet open={pick} title={t('New message')} onClose={() => setPick(false)}>
        <Search value={pq} onChange={setPq} placeholder={t('Search your team')} />
        <Card>
          {people.length ? people.map((p) => <Item key={p.id} onPress={() => dm(p)} left={<Face name={p.name} color={p.color} online={p.online} />} title={p.name} sub={[p.job, p.online ? t('Online') : null].filter(Boolean).join(' · ') || undefined} right={busy === 'dm' + p.id ? '…' : undefined} />)
            : <None icon="users" title={t('Nobody found')} />}
        </Card>
      </Sheet>
    </ToolPage>
  );
}
