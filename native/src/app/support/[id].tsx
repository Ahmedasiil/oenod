// One help question: the whole conversation with the OENOD team, and reply.
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { day, time } from '../../lib/format';
import { t } from '../../lib/i18n';
import { Talk } from '../../ui/Talk';
import { word } from './index';

type D = { id: number; subject: string; status: string; messages: { id: number; body: string; staff: number | boolean; created_at: string; author: string | null }[] };

export default function Ticket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => get<D>(`/api/support/${id}`), [id]);
  const x = d.data;
  return (
    <Talk title={x?.subject || t('Help')} sub={x ? `#${x.id} · ${word(x.status)}` : undefined} loading={d.loading} error={d.error} onRetry={d.reload}
      bubbles={(x?.messages || []).map((m) => ({ id: m.id, mine: !Number(m.staff), by: Number(m.staff) ? m.author || t('OENOD team') : undefined, staff: !!Number(m.staff), body: m.body, at: `${day(m.created_at)} ${time(m.created_at)}` }))}
      onSend={async (body) => { await post(`/api/support/${id}/reply`, { body }); await d.reload(); }} />
  );
}
