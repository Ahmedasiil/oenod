// Accounting, built into the app (owners and admins): profit, cash, runway, what needs attention, money in and out next 30 days, and bills to pay.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date, money } from '../lib/format';
import { t } from '../lib/i18n';
import { V } from '../ui/M6';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Sheet, State, Tag, ToolPage, isYmd, plusDays, ymd, useBusy } from '../ui/T1';

type Tot = { income: number; cogs: number; gross: number; opex: number; expense: number; net: number };
type Att = { key: string; tone: string; count: number; title: string; amount?: number; sub?: string; names?: string; tax_name?: string };
type O = { cur: Tot; prev: Tot; cash: number; cash_prev: number; runway: number | null; months: { ym: string; income: number; expense: number; net: number }[]; ar: { open: number; overdue: number; overdue_count: number }; ap: { open: number; week: number };
  tax_owing: number; accounts: { name: string; kind: string; balance: number | null; to_review: number }[]; attention: Att[]; next30: { in: number; out: number; tax: number; forecast: number } };
type Bill = { id: number; vendor_name: string | null; number: string | null; bill_date: string; due_date: string; total: number; amount_paid: number; status: string; account_name: string | null };
type B = { bills: Bill[]; open: number; overdue: number; week: number; vendors: { id: number; name: string }[]; accounts: { code: string; name: string }[]; today: string };
type P = 'month' | 'quarter' | 'year';
const GO: Record<string, string> = { bank: '/banking', overdue: '/invoices', approve: '/expenses', receipts: '/expenses', drafts: '/invoices' };
const pct = (a: number, b: number) => (b ? Math.round(((a - b) / Math.abs(b)) * 100) : null);

export default function Accounting() {
  const [p, setP] = useState<P>('month');
  const [tab, setTab] = useState<'overview' | 'bills'>('overview');
  const from = (() => { const d = new Date(); if (p === 'month') d.setDate(1); else if (p === 'quarter') { d.setMonth(Math.floor(d.getMonth() / 3) * 3); d.setDate(1); } else { d.setMonth(0); d.setDate(1); } return ymd(d); })();
  const d = useLoad(() => get<O>(`/api/acct4/overview?from=${from}&to=${ymd()}`), [p]);
  const b = useLoad(() => get<B>('/api/acct4/bills?status=open'));
  const [nb, setNb] = useState<{ vendor_name: string; subtotal: string; tax: string; due_date: string; account_code: string; number: string } | null>(null);
  const [pay, setPay] = useState<Bill | null>(null);
  const [payOn, setPayOn] = useState(ymd());
  const [meth, setMeth] = useState<'bank' | 'card' | 'cash'>('bank');
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const maxM = x ? Math.max(1, ...x.months.slice(-6).map((m) => Math.max(m.income, m.expense))) : 1;
  const ch = x ? pct(x.cur.net, x.prev.net) : null;
  const saveBill = () => {
    if (!nb) return;
    if (!nb.vendor_name.trim()) return setErr(t('Who is the bill from?'));
    const s = Number(nb.subtotal.replace(',', '.'));
    if (!(s > 0)) return setErr(t('Type the amount before tax.'));
    if (!isYmd(nb.due_date)) return setErr(t('Type the due date like 2026-12-01.'));
    if (!nb.account_code) return setErr(t('Pick what it was for.'));
    setErr('');
    run('bill', async () => { await post('/api/acct4/bills', { vendor_name: nb.vendor_name.trim(), number: nb.number.trim() || null, bill_date: ymd(), due_date: nb.due_date, account_code: nb.account_code, subtotal: s, tax: Number(nb.tax.replace(',', '.')) || 0 }); setNb(null); b.reload(); d.reload(); });
  };
  const payIt = () => pay && run('pay', async () => { await post(`/api/acct4/bills/${pay.id}/pay`, { paid_on: payOn, method: meth }); setPay(null); b.reload(); d.reload(); });
  return (
    <ToolPage title={t('Accounting')} right="plus" rightLabel={t('Add a bill')} onRight={() => { setErr(''); setNb({ vendor_name: '', subtotal: '', tax: '', due_date: plusDays(30), account_code: b.data?.accounts?.[0]?.code || '', number: '' }); }} refreshing={d.refreshing} onRefresh={() => { d.refresh(); b.reload(); }}>
      <Chips value={p} onChange={setP} items={[['month', t('This month')], ['quarter', t('This quarter')], ['year', t('This year')]]} />
      {x ? <Hero id="ach" label={t('Profit')} value={money(x.cur.net)} note={ch == null ? t('Money in {i}, out {o}', { i: money(x.cur.income), o: money(x.cur.expense) }) : ch >= 0 ? t('Up {n}% from last period', { n: ch }) : t('Down {n}% from last period', { n: -ch })} noteGood={x.cur.net >= 0}
        stats={[[t('Cash'), money(x.cash)], [t('Runway'), x.runway != null ? t('{n} mo', { n: x.runway }) : '—'], [t('Tax owing'), money(Math.max(0, x.tax_owing))]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Chips value={tab} onChange={setTab} items={[['overview', t('Overview')], ['bills', t('Bills to pay'), b.data?.bills.length]]} />
          {tab === 'overview' ? (
            <>
              {x.attention.length ? (
                <Card title={t('Needs you')}>
                  {x.attention.map((a) => <Item key={a.key} onPress={GO[a.key] ? () => router.push(GO[a.key] as any) : a.key === 'bills' ? () => setTab('bills') : undefined} left={<Dot icon={a.key === 'bank' ? 'wallet' : a.key === 'tax' ? 'calendar' : 'doc'} tone={a.tone === 'bad' ? 'bad' : a.tone === 'warn' ? 'warn' : 'nv'} />}
                    title={a.key === 'tax' ? `${a.tax_name || t('Sales tax')} ${t(a.title)}` : t(a.title)} sub={a.names || (a.sub ? t(a.sub) : undefined)} right={a.amount != null ? money(a.amount) : String(a.count)} />)}
                </Card>
              ) : <Card><None icon="check" title={t('Your books are up to date')} /></Card>}
              <Card title={t('Next 30 days')}>
                <Item title={t('Coming in')} sub={t('Invoices due and repeat invoices')} right={money(x.next30.in)} />
                <Item title={t('Going out')} sub={t('Bills due')} right={'−' + money(x.next30.out)} />
                {x.next30.tax ? <Item title={t('Tax to set aside')} right={'−' + money(x.next30.tax)} /> : null}
                <Item title={t('Cash in 30 days')} right={money(x.next30.forecast)} rightSub={<Tag text={x.next30.forecast >= 0 ? t('OK') : t('Short')} tone={x.next30.forecast >= 0 ? 'good' : 'bad'} />} />
              </Card>
              <Card title={t('Last 6 months')}>
                {x.months.slice(-6).map((m) => (
                  <View key={m.ym} style={{ paddingVertical: 8, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: V.ink, fontSize: 13.5, fontWeight: '600' }}>{m.ym}</Text><Text style={{ color: m.net >= 0 ? '#1C9C6B' : '#E5484D', fontSize: 13.5, fontWeight: '700' }}>{money(m.net)}</Text></View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: V.surf2 }}><View style={{ width: `${Math.max(2, (m.income / maxM) * 100)}%`, height: 6, borderRadius: 3, backgroundColor: '#1A2FCF' }} /></View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: V.surf2 }}><View style={{ width: `${Math.max(2, (m.expense / maxM) * 100)}%`, height: 6, borderRadius: 3, backgroundColor: '#D98A1C' }} /></View>
                  </View>
                ))}
                <Text style={{ color: V.mute, fontSize: 12, paddingVertical: 8 }}>{t('Blue: money in · Orange: money out')}</Text>
              </Card>
              <Card title={t('Profit and loss')}>
                <Item title={t('Sales')} right={money(x.cur.income, 2)} />
                <Item title={t('Cost of goods')} right={'−' + money(x.cur.cogs, 2)} />
                <Item title={t('Running costs')} right={'−' + money(x.cur.opex, 2)} />
                <Item title={t('Profit')} right={money(x.cur.net, 2)} />
              </Card>
              <Card title={t('Money owed')}>
                <Item title={t('Customers owe you')} sub={x.ar.overdue_count ? t('{n} late, {m}', { n: x.ar.overdue_count, m: money(x.ar.overdue) }) : t('Nothing late')} right={money(x.ar.open)} onPress={() => router.push('/invoices')} />
                <Item title={t('You owe suppliers')} sub={t('{m} due this week', { m: money(x.ap.week) })} right={money(x.ap.open)} onPress={() => setTab('bills')} />
              </Card>
              {x.accounts.length ? <Card title={t('Bank and cash')} right={t('Open banking')} onRight={() => router.push('/banking')}>{x.accounts.map((a, i) => <Item key={i} left={<Dot icon="wallet" />} title={a.name} sub={a.to_review ? t('{n} lines to review', { n: a.to_review }) : undefined} right={a.balance != null ? money(a.balance, 2) : '—'} />)}</Card> : null}
            </>
          ) : (
            <>
              <Btn text={t('Add a bill')} icon="plus" onPress={() => { setErr(''); setNb({ vendor_name: '', subtotal: '', tax: '', due_date: plusDays(30), account_code: b.data?.accounts?.[0]?.code || '', number: '' }); }} />
              <Card>
                {(b.data?.bills || []).length ? b.data!.bills.map((y) => {
                  const late = y.due_date < (b.data?.today || ymd());
                  return <Item key={y.id} onPress={() => { setPayOn(ymd()); setPay(y); }} left={<Dot icon="doc" tone={late ? 'bad' : 'dk'} />} title={y.vendor_name || t('Bill')} sub={[y.number, t('due {d}', { d: date(y.due_date) }), y.account_name].filter(Boolean).join(' · ')}
                    right={money(Number(y.total) - Number(y.amount_paid), 2)} rightSub={<Tag text={late ? t('Late') : t('Pay')} tone={late ? 'bad' : 'info'} />} />;
                }) : <None icon="check" title={t('No bills to pay')} sub={t('Tap Add a bill when one comes in.')} />}
              </Card>
            </>
          )}
        </>
      ) : null}
      <Sheet open={!!nb} title={t('Add a bill')} onClose={() => setNb(null)}>
        {nb ? (
          <>
            <In label={t('From (supplier)')} value={nb.vendor_name} onChangeText={(v) => setNb({ ...nb, vendor_name: v })} error={err || undefined} />
            {b.data?.vendors?.length ? <Chips<string> value={nb.vendor_name} onChange={(v) => setNb({ ...nb, vendor_name: v })} items={b.data.vendors.slice(0, 10).map((v) => [v.name, v.name] as [string, string])} /> : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <In style={{ flex: 1 }} label={t('Amount before tax')} value={nb.subtotal} onChangeText={(v) => setNb({ ...nb, subtotal: v })} keyboardType="decimal-pad" />
              <In style={{ flex: 1 }} label={t('Tax')} value={nb.tax} onChangeText={(v) => setNb({ ...nb, tax: v })} keyboardType="decimal-pad" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <In style={{ flex: 1 }} label={t('Due')} value={nb.due_date} onChangeText={(v) => setNb({ ...nb, due_date: v })} />
              <In style={{ flex: 1 }} label={t('Bill number')} value={nb.number} onChangeText={(v) => setNb({ ...nb, number: v })} />
            </View>
            {b.data?.accounts?.length ? <Pick<string> label={t('What was it for?')} value={nb.account_code} onChange={(v) => setNb({ ...nb, account_code: v })} items={b.data.accounts.slice(0, 16).map((a) => [a.code, a.name] as [string, string])} /> : null}
            <Btn text={t('Save bill')} icon="check" onPress={saveBill} busy={busy === 'bill'} />
          </>
        ) : null}
      </Sheet>
      <Sheet open={!!pay} title={pay ? t('Pay {n}', { n: pay.vendor_name || t('bill') }) : ''} onClose={() => setPay(null)}>
        {pay ? (
          <>
            <Text style={{ color: V.ink, fontSize: 28, fontWeight: '700', textAlign: 'center' }}>{money(Number(pay.total) - Number(pay.amount_paid), 2)}</Text>
            <Text style={{ color: V.mute, fontSize: 13, textAlign: 'center' }}>{t('Records that you paid it. It does not move money.')}</Text>
            <Pick label={t('Paid with')} value={meth} onChange={setMeth} items={[['bank', t('Bank')], ['card', t('Card')], ['cash', t('Cash')]]} />
            <In label={t('Paid on')} value={payOn} onChangeText={setPayOn} />
            <Btn text={t('Mark as paid')} icon="check" onPress={payIt} busy={busy === 'pay'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
