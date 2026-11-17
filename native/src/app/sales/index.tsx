// Sales, built into the app: what sold, how people paid, each sale's receipt, refunds, and a + to ring up a new sale.
import React, { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { get } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { money, time, day } from '../../lib/format';
import { t } from '../../lib/i18n';
import { Btn, Card, Chips, Dot, Hero, Item, None, Search, State, Tag, ToolPage, plusDays, ymd } from '../../ui/T1';

export type Sale = { id: number; number: number; total: number; subtotal: number; tax: number; tip: number; discount: number; payment_method: string; status: string; created_at: string;
  customer: string | null; cashier: string | null; location: string | null; items: number; refund_reason?: string | null };
type L = { sales: Sale[]; total: number; tax: number; tips: number; count: number; by_method: Record<string, number> };
type R = 'today' | 'week' | 'month';
export const payWord = (m: string) => ({ cash: t('Cash'), card: t('Card'), oenod_pay: t('OENOD Pay'), gift_card: t('Gift card'), other: t('Other') } as Record<string, string>)[m] || m;

export default function Sales() {
  const [r, setR] = useState<R>('week');
  const from = r === 'today' ? ymd() : r === 'week' ? plusDays(-6) : plusDays(-29);
  const d = useLoad(() => get<L>(`/api/sales?from=${from}&to=${ymd()}`), [r]);
  const [q, setQ] = useState('');
  const x = d.data;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (x?.sales || []).filter((v) => !s || `#${v.number} ${v.customer || ''} ${v.cashier || ''} ${v.total}`.toLowerCase().includes(s));
  }, [x, q]);
  const top = x ? Object.entries(x.by_method).sort((a, b) => b[1] - a[1])[0] : null;
  return (
    <ToolPage title={t('Sales')} right="plus" rightLabel={t('New sale')} onRight={() => router.push('/register')} refreshing={d.refreshing} onRefresh={d.refresh}>
      <Chips<R> value={r} onChange={setR} items={[['today', t('Today')], ['week', t('7 days')], ['month', t('30 days')]]} />
      {x ? <Hero id="slh" label={r === 'today' ? t('Sales today') : r === 'week' ? t('Sales, last 7 days') : t('Sales, last 30 days')} value={money(x.total, 2)}
        note={top ? t('Most paid by {m}', { m: payWord(top[0]) }) : t('No sales yet')} noteGood
        stats={[[t('Sales'), String(x.count)], [t('Average'), money(x.count ? x.total / x.count : 0, 2)], [t('Tips'), money(x.tips, 2)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Btn text={t('Ring up a sale')} icon="cart" onPress={() => router.push('/register')} />
          <Search value={q} onChange={setQ} placeholder={t('Search sale number, customer or amount')} />
          <Card>
            {list.length ? list.slice(0, 400).map((v) => (
              <Item key={v.id} onPress={() => router.push(`/sales/${v.id}`)} left={<Dot icon={v.payment_method === 'cash' ? 'cash' : 'wallet'} tone={v.status === 'refunded' ? 'bad' : 'dk'} />}
                title={`#${v.number}${v.customer ? ' · ' + v.customer : ''}`} sub={[`${day(v.created_at)} ${time(v.created_at)}`, payWord(v.payment_method), t('{n} items', { n: v.items })].join(' · ')}
                right={money(v.total, 2)} rightSub={v.status === 'refunded' ? <Tag text={t('Refunded')} tone="bad" /> : undefined} />
            )) : <None icon="cart" title={q ? t('Nothing found') : t('No sales in this time')} sub={q ? t('Try another search.') : t('Tap Ring up a sale to make the first one.')} />}
          </Card>
        </>
      ) : null}
    </ToolPage>
  );
}
