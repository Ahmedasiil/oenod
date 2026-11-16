// Invoices, built into the app (wave 1): what you're owed, what's late, every invoice and quote, and a + to make one.
import React, { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { get } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date, money } from '../../lib/format';
import { t } from '../../lib/i18n';
import { invState, type Inv } from '../../lib/inv';
import { Card, Chips, Dot, Hero, Item, None, Search, State, Tag, ToolPage } from '../../ui/T1';

type List = { invoices: Inv[]; open: number; overdue: number; paid_30: number; days_to_pay: number | null };
type F = 'all' | 'unpaid' | 'late' | 'paid' | 'draft' | 'quote';

export default function Invoices() {
  const d = useLoad(() => get<List>('/api/invoices'));
  const [f, setF] = useState<F>('all');
  const [q, setQ] = useState('');
  const all = d.data?.invoices || [];
  const count = (fn: (i: Inv) => boolean) => all.filter(fn).length;
  const isUnpaid = (i: Inv) => i.kind === 'invoice' && i.status === 'sent';
  const tests: Record<F, (i: Inv) => boolean> = {
    all: () => true, unpaid: isUnpaid, late: (i) => !!i.overdue, paid: (i) => i.status === 'paid', draft: (i) => i.status === 'draft', quote: (i) => i.kind === 'quote',
  };
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter(tests[f]).filter((i) => !s || `${i.number} ${i.customer || ''} ${i.customer_email || ''} ${i.total}`.toLowerCase().includes(s));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, f, q]);
  const x = d.data;
  return (
    <ToolPage title={t('Invoices')} right="plus" rightLabel={t('New invoice')} onRight={() => router.push('/invoices/new')} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x ? (
        <Hero id="invh" label={t('Owed to you')} value={money(x.open, 2)}
          note={x.overdue > 0 ? t('{m} is late', { m: money(x.overdue, 2) }) : t('Nothing is late')} noteGood={!(x.overdue > 0)}
          stats={[[t('Paid · 30 days'), money(x.paid_30)], [t('Unpaid'), String(count(isUnpaid))], [t('Days to pay'), x.days_to_pay == null ? '—' : String(x.days_to_pay)]]} />
      ) : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Search value={q} onChange={setQ} placeholder={t('Search number, customer or amount')} />
          <Chips<F> value={f} onChange={setF} items={[['all', t('All'), all.length], ['unpaid', t('Unpaid'), count(isUnpaid)], ['late', t('Late'), count(tests.late)], ['paid', t('Paid'), count(tests.paid)], ['draft', t('Drafts'), count(tests.draft)], ['quote', t('Quotes'), count(tests.quote)]]} />
          <Card>
            {list.length ? list.slice(0, 300).map((i) => {
              const [s, tone] = invState(i);
              return (
                <Item key={i.id} onPress={() => router.push(`/invoices/${i.id}`)}
                  left={<Dot icon={i.kind === 'quote' ? 'send' : 'doc'} tone={tone === 'bad' ? 'bad' : tone === 'good' ? 'good' : 'dk'} />}
                  title={i.customer || t('No customer')} sub={`${i.number} · ${t('Due {d}', { d: date(i.due_date) })}`}
                  right={money(i.status === 'sent' ? i.balance : i.total, 2)} rightSub={<Tag text={s} tone={tone} />} />
              );
            }) : <None icon="doc" title={q || f !== 'all' ? t('Nothing here') : t('No invoices yet')} sub={q || f !== 'all' ? t('Try another search or filter.') : t('Tap + to send your first invoice. It takes a minute.')} />}
          </Card>
        </>
      ) : null}
    </ToolPage>
  );
}
