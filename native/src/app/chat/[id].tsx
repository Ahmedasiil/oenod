// One chat room or direct message: read, and send. Checks for new messages every few seconds while open.
import React, { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { time, day, dayKey, todayKey } from '../../lib/format';
import { t } from '../../lib/i18n';
import { Talk } from '../../ui/Talk';

type M = { id: number; user_id: number; by: string; color?: string; body: string; deleted?: number | boolean; edited?: number | boolean; at: string; mine: boolean; kind?: string; reply_count?: number };
type D = { channel: { id: number; name: string; kind: string; topic?: string | null; can_post?: boolean; members?: number }; messages: M[] };

export default function Room() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => get<D>(`/api/chat/channels/${id}/messages`), [id]);
  useEffect(() => { const h = setInterval(() => d.reload(), 5000); return () => clearInterval(h); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = d.data?.channel;
  const msgs = (d.data?.messages || []).filter((m) => !Number(m.deleted) && m.kind !== 'system');
  return (
    <Talk title={c?.name || t('Chat')} sub={c ? c.topic || (c.kind === 'dm' ? t('Direct message') : t('{n} people', { n: c.members ?? 0 })) : undefined}
      loading={d.loading} error={d.error} onRetry={d.reload} canSend={c ? c.can_post !== false : true}
      bubbles={msgs.map((m) => ({ id: m.id, mine: !!m.mine, by: m.by, color: m.color, body: m.body || (t('Sent a file')), at: dayKey(m.at) === todayKey() ? time(m.at) : `${day(m.at)} ${time(m.at)}`, note: [Number(m.edited) ? t('edited') : null, m.reply_count ? t('{n} replies', { n: m.reply_count }) : null].filter(Boolean).join(' · ') || undefined }))}
      onSend={async (body) => { await post(`/api/chat/channels/${id}/messages`, { body }); await d.reload(); }} />
  );
}
