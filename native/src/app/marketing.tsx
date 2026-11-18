// Marketing, built into the app (managers): email list health, every campaign with opens and clicks, Ava writes new emails, send a test, send now or schedule.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { get, post, del } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date } from '../lib/format';
import { t } from '../lib/i18n';
import { V } from '../ui/M6';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Sheet, State, Tag, ToolPage, isYmd, plusDays, sure, useBusy } from '../ui/T1';

type Blk = { type: string; text?: string; label?: string; code?: string; title?: string; url?: string; [k: string]: any };
type Camp = { id: number; name: string; subject: string; status: string; audience: string; audience_label: string; sent_count: number; sent_at: string | null; scheduled_at: string | null; created_at: string; open_rate: number | null; click_rate: number | null; opens: number; clicks: number };
type Aud = { id: string; label: string; count: number; group: string };
type L = { campaigns: Camp[]; audiences: Aud[]; templates: { id: string; label: string; subject: string; preheader: string; blocks: Blk[] }[]; kpis: { list: number; new_30: number; sent_30: number; open_rate: number | null; click_rate: number | null }; opted_out: number };
type Full = Camp & { preheader: string | null; blocks: Blk[]; report: { sent: number; opened: number; clicked: number; unsubscribed: number; links: { label: string; url: string; clicks: number }[] } };
type St = 'all' | 'draft' | 'scheduled' | 'sent';
const pct = (n: number | null) => (n == null ? '—' : `${n}%`);
const stTone = (s: string) => (s === 'sent' ? 'good' : s === 'scheduled' ? 'info' : 'plain') as 'good' | 'info' | 'plain';
const stWord = (s: string) => (s === 'sent' ? t('Sent') : s === 'scheduled' ? t('Scheduled') : t('Draft'));

export default function Marketing() {
  const d = useLoad(() => get<L>('/api/campaigns'));
  const [st, setSt] = useState<St>('all');
  const [nw, setNw] = useState<{ goal: string; tone: string; audience: string; name: string; subject: string; preheader: string; blocks: Blk[] } | null>(null);
  const [open, setOpen] = useState<Full | null>(null);
  const [at, setAt] = useState({ day: plusDays(1), time: '10:00' });
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const list = (x?.campaigns || []).filter((c) => st === 'all' || c.status === st);
  const n = (s: St) => (x?.campaigns || []).filter((c) => c.status === s).length;
  const aud = (x?.audiences || []).filter((a) => a.count > 0 || a.id === 'all').slice(0, 10);
  const body = (b: Blk[]) => b.filter((y) => y.type === 'heading' || y.type === 'text').map((y) => y.text).join('\n\n');
  const start = () => { setErr(''); setNw({ goal: '', tone: 'warm', audience: 'all', name: '', subject: '', preheader: '', blocks: [] }); };
  const ava = () => nw && (nw.goal.trim() ? run('ai', async () => { const r = await post<{ subject: string; preheader: string; blocks: Blk[] }>('/api/campaigns/ai', { goal: nw.goal.trim(), tone: nw.tone, audience: nw.audience }); setNw({ ...nw, subject: r.subject, preheader: r.preheader, blocks: r.blocks, name: nw.name || r.subject }); }) : setErr(t('Tell Ava what the email is for.')));
  const useTpl = (id: string) => { const tp = x?.templates.find((y) => y.id === id); if (tp && nw) setNw({ ...nw, subject: tp.subject, preheader: tp.preheader, blocks: tp.blocks, name: nw.name || tp.label }); };
  const save = () => {
    if (!nw) return;
    if (!nw.subject.trim()) return setErr(t('Add a subject line.'));
    if (!nw.blocks.length) return setErr(t('Let Ava write it, or pick a starting point.'));
    setErr('');
    run('save', async () => { const r = await post<{ id: number }>('/api/campaigns', { name: (nw.name || nw.subject).trim(), subject: nw.subject.trim(), preheader: nw.preheader, audience: nw.audience, blocks: nw.blocks }); setNw(null); d.reload(); openIt(r.id); });
  };
  const openIt = (id: number) => run('open' + id, async () => { setOpen(await get<Full>(`/api/campaigns/${id}`)); });
  const test = () => open && run('test', async () => { const r = await post<{ to: string }>(`/api/campaigns/${open.id}/send`, { test: true }); sure(t('Test sent'), t('Check {e} for the test email.', { e: r.to }), t('OK'), () => {}); });
  const sendNow = () => open && sure(t('Send to {n}?', { n: open.audience_label }), t('The email goes out now and cannot be taken back.'), t('Send now'), () => run('send', async () => { await post(`/api/campaigns/${open.id}/send`, {}); setOpen(null); d.reload(); }));
  const sched = () => {
    if (!open) return;
    if (!isYmd(at.day) || !/^\d{1,2}:\d{2}$/.test(at.time)) return setErr(t('Type the day like 2026-12-01 and the time like 10:00.'));
    setErr('');
    run('sched', async () => { await post(`/api/campaigns/${open.id}/schedule`, { at: `${at.day} ${at.time.padStart(5, '0')}` }); setOpen(null); d.reload(); });
  };
  const unsched = () => open && run('un', async () => { await del(`/api/campaigns/${open.id}/schedule`); setOpen(null); d.reload(); });
  const dup = () => open && run('dup', async () => { const r = await post<{ id: number }>(`/api/campaigns/${open.id}/duplicate`, {}); d.reload(); openIt(r.id); });
  return (
    <ToolPage title={t('Marketing')} right="plus" rightLabel={t('New email campaign')} onRight={start} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x ? <Hero id="mkh" label={t('People on your email list')} value={String(x.kpis.list)} note={x.kpis.new_30 ? t('{n} joined in the last 30 days', { n: x.kpis.new_30 }) : t('Add customers with an email to grow your list')} noteGood={x.kpis.new_30 > 0}
        stats={[[t('Sent, 30 days'), String(x.kpis.sent_30)], [t('Opened'), pct(x.kpis.open_rate)], [t('Clicked'), pct(x.kpis.click_rate)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Btn text={t('New email campaign')} icon="spark" kind="blue" onPress={start} />
          <Chips value={st} onChange={setSt} items={[['all', t('All')], ['draft', t('Drafts'), n('draft')], ['scheduled', t('Scheduled'), n('scheduled')], ['sent', t('Sent'), n('sent')]]} />
          <Card>
            {list.length ? list.map((c) => <Item key={c.id} onPress={() => openIt(c.id)} left={<Dot icon="mail" tone={c.status === 'sent' ? 'good' : 'nv'} />} title={c.name} sub={[c.audience_label, c.status === 'sent' && c.sent_at ? t('sent {d}', { d: date(c.sent_at.slice(0, 10)) }) : c.status === 'scheduled' && c.scheduled_at ? t('goes out {d}', { d: date(c.scheduled_at.slice(0, 10)) }) : null].filter(Boolean).join(' · ')}
              right={c.status === 'sent' ? t('{p} opened', { p: pct(c.open_rate) }) : undefined} rightSub={<Tag text={busy === 'open' + c.id ? '…' : stWord(c.status)} tone={stTone(c.status)} />} />)
              : <None icon="mail" title={t('No campaigns yet')} sub={t('Tap New email campaign. Ava writes it for you.')} />}
          </Card>
          {aud.length ? <Card title={t('Who you can reach')}>{aud.map((a) => <Item key={a.id} title={t(a.label)} right={String(a.count)} />)}{x.opted_out ? <Item title={t('Said no to emails')} right={String(x.opted_out)} /> : null}</Card> : null}
        </>
      ) : null}
      <Sheet open={!!nw} title={t('New email campaign')} onClose={() => setNw(null)}>
        {nw ? (
          <>
            <In label={t('What is it for?')} value={nw.goal} onChangeText={(v) => setNw({ ...nw, goal: v })} placeholder={t('e.g. 20% off lattes this weekend')} multiline error={err || undefined} />
            <Chips value={nw.tone} onChange={(v) => setNw({ ...nw, tone: v })} items={[['warm', t('Warm')], ['fun', t('Fun')], ['professional', t('Professional')]]} />
            <Btn text={t('Ava writes it')} icon="spark" kind="blue" onPress={ava} busy={busy === 'ai'} />
            {x?.templates?.length ? <Chips<string> value="" onChange={useTpl} items={x.templates.map((y) => [y.id, t(y.label)] as [string, string])} /> : null}
            {nw.blocks.length ? (
              <>
                <In label={t('Subject')} value={nw.subject} onChangeText={(v) => setNw({ ...nw, subject: v })} />
                <View style={{ backgroundColor: V.surf2, borderRadius: 14, padding: 14, gap: 8 }}>
                  {nw.blocks.map((b, i) => b.type === 'heading' ? <Text key={i} style={{ color: V.ink, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>{b.text}</Text>
                    : b.type === 'text' ? <Text key={i} style={{ color: V.ink, fontSize: 14, lineHeight: 20 }}>{b.text}</Text>
                    : b.type === 'coupon' ? <Text key={i} style={{ color: V.ink, fontSize: 15, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: V.line, padding: 10, borderRadius: 10 }}>{b.title} · {b.code}</Text>
                    : b.type === 'button' ? <Text key={i} style={{ color: '#fff', backgroundColor: '#1A2FCF', alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, fontWeight: '700', overflow: 'hidden' }}>{b.label}</Text> : null)}
                </View>
                <Pick<string> label={t('Send to')} value={nw.audience} onChange={(v) => setNw({ ...nw, audience: v })} items={aud.map((a) => [a.id, `${t(a.label)} (${a.count})`] as [string, string])} />
                <Btn text={t('Save campaign')} icon="check" onPress={save} busy={busy === 'save'} />
              </>
            ) : null}
          </>
        ) : null}
      </Sheet>
      <Sheet open={!!open} title={open?.name || ''} onClose={() => { setOpen(null); setErr(''); }}>
        {open ? (
          <>
            <Item title={open.subject} sub={open.audience_label} rightSub={<Tag text={stWord(open.status)} tone={stTone(open.status)} />} />
            <Text style={{ color: V.mute, fontSize: 13.5, lineHeight: 19 }} numberOfLines={6}>{body(open.blocks)}</Text>
            {open.status === 'sent' ? (
              <Card title={t('How it did')}>
                <Item title={t('Sent')} right={String(open.report.sent)} />
                <Item title={t('Opened')} right={String(open.report.opened)} />
                <Item title={t('Clicked')} right={String(open.report.clicked)} />
                <Item title={t('Said no to emails')} right={String(open.report.unsubscribed)} />
                {open.report.links.slice(0, 5).map((l, i) => <Item key={i} title={l.label || l.url} right={t('{n} clicks', { n: l.clicks })} />)}
              </Card>
            ) : open.status === 'scheduled' ? (
              <>
                <Text style={{ color: V.ink, fontSize: 15, textAlign: 'center' }}>{t('Goes out {d}', { d: open.scheduled_at || '' })}</Text>
                <Btn text={t('Stop the schedule')} icon="x" kind="dark" onPress={unsched} busy={busy === 'un'} />
              </>
            ) : (
              <>
                <Btn text={t('Send me a test')} icon="mail" onPress={test} busy={busy === 'test'} />
                <Btn text={t('Send now')} icon="send" kind="blue" onPress={sendNow} busy={busy === 'send'} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <In style={{ flex: 1 }} label={t('Day')} value={at.day} onChangeText={(v) => setAt({ ...at, day: v })} error={err || undefined} />
                  <In style={{ flex: 1 }} label={t('Time')} value={at.time} onChangeText={(v) => setAt({ ...at, time: v })} />
                </View>
                <Btn text={t('Schedule it')} icon="calendar" kind="dark" onPress={sched} busy={busy === 'sched'} />
              </>
            )}
            <Btn text={t('Make a copy')} icon="doc" kind="dark" onPress={dup} busy={busy === 'dup'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
