// Docs, built into the app: what I need to sign, every company document with who signed (managers), reminders, and Ava writes a new one.
import React, { useState } from 'react';
import { router } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date } from '../../lib/format';
import { t } from '../../lib/i18n';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Search, Sheet, State, Tag, ToolPage, useBusy } from '../../ui/T1';

export type Doc = { id: number; title: string; category: string | null; requires_signature: number; status: string; due_on: string | null; created_at: string; completed_at: string | null; my_signed_at: string | null; mine: boolean; my_turn: boolean;
  counts?: { total: number; signed: number; read: number; pct: number }; signed?: number };
type L = { documents: Doc[]; team: number | null; my_tasks: { id: number; body: string; document_id: number; title: string }[] };

export default function Docs() {
  const d = useLoad(() => get<L>('/api/documents'));
  const mgr = d.data?.team != null;
  const [tab, setTab] = useState<'sign' | 'all' | 'mine'>('sign');
  const [q, setQ] = useState('');
  const [nw, setNw] = useState<{ prompt: string; title: string; body: string; sign: 'yes' | 'no' } | null>(null);
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const all = (x?.documents || []).filter((y) => !q.trim() || y.title.toLowerCase().includes(q.trim().toLowerCase()));
  const toSign = all.filter((y) => y.my_turn || (y.mine && y.requires_signature && !y.my_signed_at));
  const waiting = all.filter((y) => y.counts && y.requires_signature && !y.completed_at && y.status !== 'draft');
  const list = tab === 'sign' ? toSign : tab === 'mine' ? all.filter((y) => y.mine) : all;
  const ava = () => nw && (nw.prompt.trim() ? run('ai', async () => { const r = await post<{ title: string; body: string }>('/api/doc-ai', { task: 'write', prompt: nw.prompt.trim() }); setNw({ ...nw, title: r.title, body: r.body }); }) : setErr(t('Tell Ava what the document is.')));
  const send = (draft: boolean) => {
    if (!nw) return;
    if (!nw.title.trim() || !nw.body.trim()) return setErr(t('Add a title and the text, or let Ava write it.'));
    setErr('');
    run(draft ? 'dr' : 'se', async () => { const r = await post<{ id: number }>('/api/documents', { title: nw.title.trim(), body: nw.body, requires_signature: nw.sign === 'yes', audience: 'all', ...(draft ? { status: 'draft' } : {}) }); setNw(null); d.reload(); router.push(`/docs/${r.id}` as any); });
  };
  return (
    <ToolPage title={t('Docs')} right={mgr ? 'plus' : undefined} rightLabel={t('New document')} onRight={mgr ? () => { setErr(''); setNw({ prompt: '', title: '', body: '', sign: 'yes' }); } : undefined} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x ? <Hero id="dch" label={t('Waiting for your signature')} value={String(toSign.length)} note={mgr ? t('{n} documents still collecting signatures', { n: waiting.length }) : toSign.length ? t('Tap one to read and sign') : t('You are all caught up')} noteGood={!toSign.length}
        stats={[[t('Documents'), String(x.documents.length)], [t('Completed'), String(x.documents.filter((y) => y.completed_at).length)], [t('My tasks'), String(x.my_tasks.length)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Chips value={tab} onChange={setTab} items={[['sign', t('To sign'), toSign.length], ['mine', t('Mine')], ['all', t('All')]]} />
          <Search value={q} onChange={setQ} placeholder={t('Search documents')} />
          <Card>
            {list.length ? list.map((y) => <Item key={y.id} onPress={() => router.push(`/docs/${y.id}` as any)} left={<Dot icon="doc" tone={y.completed_at ? 'good' : y.my_turn ? 'warn' : 'nv'} />} title={y.title}
              sub={[y.category, y.due_on ? t('due {d}', { d: date(y.due_on) }) : null, y.counts && y.requires_signature ? t('{s} of {n} signed', { s: y.counts.signed, n: y.counts.total }) : null].filter(Boolean).join(' · ')}
              rightSub={y.status === 'draft' ? <Tag text={t('Draft')} /> : y.completed_at ? <Tag text={t('Done')} tone="good" /> : y.my_turn ? <Tag text={t('Sign')} tone="warn" /> : y.my_signed_at ? <Tag text={t('Signed')} tone="good" /> : undefined} />)
              : <None icon="check" title={tab === 'sign' ? t('Nothing to sign') : t('No documents')} />}
          </Card>
        </>
      ) : null}
      <Sheet open={!!nw} title={t('New document')} onClose={() => setNw(null)}>
        {nw ? (
          <>
            <In label={t('What is it?')} value={nw.prompt} onChangeText={(v) => setNw({ ...nw, prompt: v })} placeholder={t('e.g. Uniform policy for kitchen staff')} error={err || undefined} />
            <Btn text={t('Ava writes it')} icon="spark" kind="blue" onPress={ava} busy={busy === 'ai'} />
            <In label={t('Title')} value={nw.title} onChangeText={(v) => setNw({ ...nw, title: v })} />
            <In label={t('Text')} value={nw.body} onChangeText={(v) => setNw({ ...nw, body: v })} multiline style={{ minHeight: 140 }} />
            <Pick label={t('Does the team sign it?')} value={nw.sign} onChange={(v) => setNw({ ...nw, sign: v })} items={[['yes', t('Yes, everyone signs')], ['no', t('No, just read it')]]} />
            <Btn text={t('Send to the team')} icon="send" kind="blue" onPress={() => send(false)} busy={busy === 'se'} />
            <Btn text={t('Save as draft')} icon="doc" kind="dark" onPress={() => send(true)} busy={busy === 'dr'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
