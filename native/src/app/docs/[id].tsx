// One document: read it, fill your fields and sign by typing your name. Managers see who signed, send reminders, and send a draft.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { useAuth } from '../../lib/auth';
import { date } from '../../lib/format';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Btn, Card, Dot, Hero, In, Item, Pick, Sheet, State, Tag, ToolPage, sure, useBusy } from '../../ui/T1';
import { plain } from '../academy/[id]';

type Field = { k: string; type: string; label: string | null; req: boolean };
type D = { id: number; title: string; category: string | null; requires_signature: number; status: string; due_on: string | null; completed_at: string | null; body: string; fields: Field[]; my_turn?: boolean; for_me?: boolean;
  my_signature: { signed_at: string; signed_name: string } | null; signatures?: { name?: string; signed_name: string; signed_at: string }[]; pending?: { id: number; first_name: string; status: string }[]; counts?: { total: number; signed: number; pct: number }; waiting_for?: string | null };

export default function DocView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth() as any;
  const d = useLoad(() => get<D>(`/api/documents/${id}`), [id]);
  const [sg, setSg] = useState<{ name: string; vals: Record<string, string> } | null>(null);
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const myName = session?.user?.name || '';
  const fields = (x?.fields || []).filter((f) => ['initials', 'text', 'check', 'number'].includes(f.type));
  const canSign = !!x && !!x.requires_signature && !x.my_signature && (x.my_turn ?? x.for_me ?? false);
  const sign = () => {
    if (!sg || !x) return;
    if (sg.name.trim().toLowerCase().replace(/\s+/g, ' ') !== myName.trim().toLowerCase().replace(/\s+/g, ' ')) return setErr(t('Type your full name exactly: {n}', { n: myName }));
    const miss = fields.find((f) => f.req && (f.type === 'check' ? sg.vals[f.k] !== '1' : !String(sg.vals[f.k] || '').trim()));
    if (miss) return setErr(t('Fill in: {f}', { f: miss.label || t('required field') }));
    setErr('');
    run('sg', async () => { await post(`/api/documents/${id}/sign`, { signed_name: sg.name.trim(), fields: Object.fromEntries(fields.map((f) => [f.k, f.type === 'check' ? sg.vals[f.k] === '1' : sg.vals[f.k] || ''])) }); setSg(null); d.reload(); });
  };
  const remind = () => run('rm', async () => { const r = await post<{ reminded: number }>(`/api/documents/${id}/remind`, {}); sure(t('Reminder sent'), t('{n} people got a reminder.', { n: r.reminded }), t('OK'), () => {}); });
  const sendDraft = () => sure(t('Send to the team?'), t('Everyone it is for gets it now.'), t('Send'), () => run('sd', async () => { await post(`/api/documents/${id}/send`, {}); d.reload(); }));
  const decline = () => sure(t('Decline to sign?'), t('Your manager is told you declined.'), t('Decline'), () => run('dc', async () => { await post(`/api/documents/${id}/decline`, {}); d.reload(); }), true);
  return (
    <ToolPage title={x?.title || t('Document')} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x && x.counts ? <Hero id="dcd" label={x.requires_signature ? t('Signed') : t('Read')} value={`${x.counts.signed} / ${x.counts.total}`} note={x.completed_at ? t('Completed {d}', { d: date(x.completed_at.slice(0, 10)) }) : x.status === 'draft' ? t('Draft, not sent yet') : t('{p}% done', { p: x.counts.pct })} noteGood={!!x.completed_at}
        stats={[[t('Due'), x.due_on ? date(x.due_on) : '—'], [t('Waiting'), String(x.pending?.length || 0)], [t('Kind'), x.category || t('Document')]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          {x.my_signature ? <Card><Item left={<Dot icon="check" tone="good" />} title={t('You signed this')} sub={`${x.my_signature.signed_name} · ${date(x.my_signature.signed_at.slice(0, 10))}`} /></Card> : null}
          {canSign ? <Btn text={t('Sign this document')} icon="check" kind="blue" onPress={() => { setErr(''); setSg({ name: '', vals: {} }); }} /> : null}
          {x.status === 'draft' && x.counts ? <Btn text={t('Send to the team')} icon="send" kind="blue" onPress={sendDraft} busy={busy === 'sd'} /> : null}
          <Card><Text style={{ color: V.ink, fontSize: 14.5, lineHeight: 22, paddingVertical: 10 }}>{plain(x.body)}</Text></Card>
          {x.pending?.length ? (
            <Card title={t('Still waiting on')} right={t('Remind them')} onRight={remind}>
              {x.pending.map((p) => <Item key={p.id} left={<Dot icon="user" tone="warn" />} title={p.first_name} rightSub={<Tag text={t(p.status)} />} />)}
            </Card>
          ) : null}
          {x.signatures?.length ? <Card title={t('Signed by')}>{x.signatures.slice(0, 40).map((s, i) => <Item key={i} left={<Dot icon="check" tone="good" />} title={s.signed_name} sub={date(s.signed_at.slice(0, 10))} />)}</Card> : null}
          {canSign ? <Btn text={t('Decline')} icon="x" kind="dark" onPress={decline} busy={busy === 'dc'} /> : null}
        </>
      ) : null}
      <Sheet open={!!sg} title={t('Sign')} onClose={() => setSg(null)}>
        {sg ? (
          <>
            {fields.map((f) => f.type === 'check'
              ? <Pick<string> key={f.k} label={f.label || t('Checkbox')} value={sg.vals[f.k] || ''} onChange={(v) => setSg({ ...sg, vals: { ...sg.vals, [f.k]: v } })} items={[['1', t('Yes')], ['', t('No')]]} />
              : <In key={f.k} label={(f.label || (f.type === 'initials' ? t('Initials') : t('Text'))) + (f.req ? '' : ` (${t('optional')})`)} value={sg.vals[f.k] || ''} onChangeText={(v) => setSg({ ...sg, vals: { ...sg.vals, [f.k]: v } })} keyboardType={f.type === 'number' ? 'decimal-pad' : 'default'} />)}
            <In label={t('Type your full name to sign')} value={sg.name} onChangeText={(v) => setSg({ ...sg, name: v })} placeholder={myName} error={err || undefined} />
            <View><Text style={{ color: V.mute, fontSize: 12.5, lineHeight: 18 }}>{t('Typing your name is your signature. OENOD keeps the date, time and a fingerprint of this exact text.')}</Text></View>
            <Btn text={t('Sign')} icon="check" kind="blue" onPress={sign} busy={busy === 'sg'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
