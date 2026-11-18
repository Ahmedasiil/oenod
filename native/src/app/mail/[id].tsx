// One email: read it, star, archive, delete, reply or forward, and let Ava draft the reply.
import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { get, put } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { longDay, time } from '../../lib/format';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Actions, Card, Item, State, ToolPage, sure, useBusy } from '../../ui/T1';
import type { Msg } from './index';

type Full = Msg & { body: string; cc: string | null; reply_to: string | null; ai_full?: { summary?: string; actions?: string[] } | null };
type D = { msg: Full; conv: { id: number; from_name: string | null; from_email: string | null; snippet: string | null; at: string }[] };

export default function Email() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(async () => { const r = await get<D>(`/api/mail/msgs/${id}`); if (r.msg.unread) put(`/api/mail/msgs/${id}`, { unread: false }).catch(() => {}); return r; }, [id]);
  const [star, setStar] = useState<boolean | null>(null);
  const { run } = useBusy();
  const e = d.data?.msg;
  const st = star ?? !!e?.starred;
  const act = (b: Record<string, unknown>, back = false) => run('a', async () => { await put(`/api/mail/msgs/${id}`, b); if (back) router.back(); });
  const reply = (all = false) => e && router.push({ pathname: '/mail/new', params: { reply_id: String(e.id), to: e.reply_to || e.from_email || '', cc: all ? e.cc || '' : '', subject: /^re:/i.test(e.subject || '') ? e.subject || '' : `Re: ${e.subject || ''}`, account_id: String(e.account_id) } });
  const fwd = () => e && router.push({ pathname: '/mail/new', params: { fwd_id: String(e.id), subject: `Fwd: ${e.subject || ''}`, account_id: String(e.account_id) } });
  return (
    <ToolPage title={e?.from_name || e?.from_email || t('Email')} right={e ? 'heart' : undefined} rightLabel={st ? t('Unstar') : t('Star')} onRight={() => { setStar(!st); act({ starred: !st }); }} refreshing={d.refreshing} onRefresh={d.refresh}>
      <State loading={d.loading && !e} error={!e ? d.error : null} onRetry={d.reload} />
      {e ? (
        <>
          <View style={{ gap: 4 }}>
            <Text style={{ color: V.ink, fontSize: 21, fontWeight: '700' }}>{e.subject || t('(no subject)')}</Text>
            <Text style={{ color: V.mute, fontSize: 13 }}>{`${e.from_name ? e.from_name + ' · ' : ''}${e.from_email || ''}`}</Text>
            <Text style={{ color: V.faint, fontSize: 12.5 }}>{`${longDay(e.at)} ${time(e.at)} · ${t('to {a}', { a: e.account })}${st ? ' · ★' : ''}`}</Text>
          </View>
          <Actions items={[
            { icon: 'send', label: t('Reply'), go: () => reply() },
            { icon: 'users', label: t('Reply all'), go: () => reply(true), off: !e.cc },
            { icon: 'arrow', label: t('Forward'), go: fwd },
            { icon: 'check', label: t('Done'), go: () => act({ archived: true }, true) },
            { icon: 'x', label: t('Delete'), go: () => sure(t('Delete this email?'), t('It goes to the trash.'), t('Delete'), () => act({ trashed: true }, true), true) },
          ]} />
          {e.ai_full?.summary ? <Card title={t('Ava in short')}><Item title={e.ai_full.summary} sub={(e.ai_full.actions || []).join(' · ') || undefined} /></Card> : null}
          <Card><View style={{ paddingVertical: 14 }}><Text style={{ color: V.ink, fontSize: 15, lineHeight: 22 }} selectable dataDetectorType="all">{e.body || e.snippet || ''}</Text></View></Card>
          {(d.data?.conv || []).length > 1 ? <Card title={t('Earlier in this conversation')}>{d.data!.conv.filter((c) => c.id !== e.id).map((c) => <Item key={c.id} title={c.from_name || c.from_email || ''} sub={c.snippet || undefined} onPress={() => router.push(`/mail/${c.id}`)} />)}</Card> : null}
          {e.from_email ? <Text onPress={() => Linking.openURL(`mailto:${e.from_email}`)} style={{ color: V.link, fontSize: 13, textAlign: 'center' }}>{e.from_email}</Text> : null}
        </>
      ) : null}
    </ToolPage>
  );
}
