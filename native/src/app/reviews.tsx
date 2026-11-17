// Reviews, built into the app (managers): star average, every review, and reply right here, with Ava writing a first draft.
import React, { useMemo, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { day } from '../lib/format';
import { t } from '../lib/i18n';
import { V } from '../ui/M6';
import { Btn, Card, Chips, Hero, In, Item, None, Sheet, State, Tag, ToolPage, oops, useBusy } from '../ui/T1';

type Rv = { id: number; name: string | null; rating: number; comment: string | null; source: string | null; sentiment: string | null; reply: string | null; replied_at: string | null; reply_draft: string | null; resolved_at?: string | null; created_at: string };
type D = { reviews: Rv[]; average: number | null; count: number; stars: Record<string, number>; kpis: { avg_30: number | null; response_rate: number | null; unanswered: number; needs_attention: number; positive_pct: number | null }; review_url?: string | null };
type F = 'all' | 'open' | 'low' | 'done';
const starLine = (n: number) => '★★★★★'.slice(0, Math.max(0, Math.round(n))) + '☆☆☆☆☆'.slice(0, 5 - Math.max(0, Math.round(n)));

export default function Reviews() {
  const d = useLoad(() => get<D>('/api/reviews'));
  const [f, setF] = useState<F>('open');
  const [open, setOpen] = useState<Rv | null>(null);
  const [text, setText] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const list = useMemo(() => (x?.reviews || []).filter((r) => f === 'all' || (f === 'open' ? !r.reply && !r.resolved_at : f === 'low' ? r.rating <= 3 : !!r.reply || !!r.resolved_at)), [x, f]);
  const show = (r: Rv) => { setOpen(r); setText(r.reply_draft || ''); };
  const draft = () => open && run('draft', async () => { const r = await post<{ text: string }>(`/api/reviews/${open.id}/draft`); setText(r.text || ''); });
  const reply = () => open && text.trim().length > 1 && run('reply', async () => { await post(`/api/reviews/${open.id}/reply`, { reply: text.trim() }); setOpen(null); d.reload(); });
  const done = () => open && run('res', async () => { await post(`/api/reviews/${open.id}/resolve`, open.resolved_at ? { undo: 1 } : {}); setOpen(null); d.reload(); });
  const ask = async () => {
    if (!x?.review_url) return;
    const msg = t('Thanks for coming in! Would you leave us a quick review? {u}', { u: x.review_url });
    try { await Share.share({ message: msg }); } catch { (globalThis as any).navigator?.clipboard?.writeText?.(x.review_url)?.catch?.(() => {}); oops(t('Review link: {u}', { u: x.review_url })); }
  };
  return (
    <ToolPage title={t('Reviews')} refreshing={d.refreshing} onRefresh={d.refresh} right={x?.review_url ? 'send' : undefined} rightLabel={t('Ask for a review')} onRight={ask}>
      {x ? <Hero id="rvh" label={t('Your stars')} value={x.average != null ? `${Number(x.average).toFixed(1)} ★` : '—'} note={x.kpis.unanswered ? t('{n} waiting for your reply', { n: x.kpis.unanswered }) : t('Every review has a reply')} noteGood={!x.kpis.unanswered}
        stats={[[t('Reviews'), String(x.count)], [t('Replied'), x.kpis.response_rate != null ? `${x.kpis.response_rate}%` : '—'], [t('Happy'), x.kpis.positive_pct != null ? `${x.kpis.positive_pct}%` : '—']]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Chips value={f} onChange={setF} items={[['open', t('Need a reply'), x.kpis.unanswered], ['low', t('3 stars or less')], ['done', t('Done')], ['all', t('All'), x.count]]} />
          <Card>
            {list.length ? list.map((r) => (
              <Item key={r.id} onPress={() => show(r)} left={<View style={{ width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: r.rating >= 4 ? 'rgba(40,209,124,0.18)' : r.rating === 3 ? 'rgba(255,184,77,0.18)' : 'rgba(255,90,106,0.18)' }}><Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>{r.rating}</Text></View>}
                title={r.name || t('A customer')} sub={r.comment || t('No comment, just stars')} right={starLine(r.rating)}
                rightSub={r.reply ? <Tag text={t('Replied')} tone="good" /> : r.resolved_at ? <Tag text={t('Done')} /> : <Tag text={t('Reply')} tone={r.rating <= 3 ? 'bad' : 'warn'} />} />
            )) : <None icon="heart" title={f === 'open' ? t('All caught up') : t('No reviews here')} sub={f === 'open' ? t('Every review has an answer.') : undefined} />}
          </Card>
        </>
      ) : null}
      <Sheet open={!!open} title={open ? `${open.name || t('A customer')} · ${starLine(open.rating)}` : ''} onClose={() => setOpen(null)}>
        {open ? (
          <>
            <Card><View style={{ paddingVertical: 12, gap: 6 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 15, lineHeight: 22 }}>{open.comment || t('No comment, just stars')}</Text>
              <Text style={{ color: V.mute, fontSize: 12 }}>{[day(open.created_at), open.source].filter(Boolean).join(' · ')}</Text>
            </View></Card>
            {open.reply ? (
              <Card title={t('Your reply')}><View style={{ paddingVertical: 10 }}><Text style={{ color: '#FFFFFF', fontSize: 14.5, lineHeight: 21 }}>{open.reply}</Text></View></Card>
            ) : (
              <>
                <In label={t('Your reply')} value={text} onChangeText={setText} multiline style={{ minHeight: 120 }} placeholder={t('Thank them, and fix what went wrong.')} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}><Btn text={t('Ava writes it')} icon="spark" kind="dark" onPress={draft} busy={busy === 'draft'} /></View>
                  <View style={{ flex: 1 }}><Btn text={t('Send reply')} icon="send" onPress={reply} busy={busy === 'reply'} disabled={text.trim().length < 2} /></View>
                </View>
              </>
            )}
            <Btn text={open.resolved_at ? t('Open it again') : t('Mark as done')} icon="check" kind="dark" onPress={done} busy={busy === 'res'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
