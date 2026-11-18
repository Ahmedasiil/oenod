// Suppliers, built into the app (managers): what is running low, reorder in one go, send purchase orders, receive deliveries into stock, and suppliers.
import React, { useState } from 'react';
import { View } from 'react-native';
import { get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date, money } from '../lib/format';
import { t } from '../lib/i18n';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Sheet, State, Tag, ToolPage, sure, useBusy } from '../ui/T1';

type Sup = { id: number; name: string; contact: string | null; email: string | null; phone: string | null; terms: string | null; orders: number };
type PO = { id: number; number: string; supplier: string; status: string; total: number; expected_on: string | null; created_at: string };
type Low = { id: number; name: string; stock_qty: number; reorder_level: number; cost: number };
type L = { suppliers: Sup[]; orders: PO[]; low_stock: Low[] };
const tone = (s: string) => (s === 'received' ? 'good' : s === 'sent' ? 'info' : s === 'cancelled' ? 'bad' : 'plain') as 'good' | 'info' | 'bad' | 'plain';

export default function Suppliers() {
  const d = useLoad(() => get<L>('/api/suppliers'));
  const [tab, setTab] = useState<'low' | 'orders' | 'sup'>('low');
  const [ro, setRo] = useState<{ sup: string; qty: Record<number, string> } | null>(null);
  const [ns, setNs] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [po, setPo] = useState<PO | null>(null);
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const open = (x?.orders || []).filter((o) => ['draft', 'sent'].includes(o.status));
  const reorder = () => {
    if (!ro || !x) return;
    if (!ro.sup) return setErr(t('Pick a supplier.'));
    const lines = x.low_stock.map((p) => ({ product_id: p.id, qty: Number(ro.qty[p.id] || 0), unit_cost: p.cost })).filter((l) => l.qty > 0);
    if (!lines.length) return setErr(t('Type how many to order.'));
    setErr('');
    run('ro', async () => { const r = await post<{ id: number }>('/api/purchase-orders', { supplier_id: Number(ro.sup), lines }); setRo(null); d.reload(); setTab('orders'); void r; });
  };
  const addSup = () => {
    if (!ns) return;
    if (!ns.name.trim()) return setErr(t('Type the supplier name.'));
    setErr('');
    run('ns', async () => { await post('/api/suppliers', { name: ns.name.trim(), email: ns.email.trim() || null, phone: ns.phone.trim() || null }); setNs(null); d.reload(); });
  };
  const send = (o: PO) => run('sd', async () => { const r = await post<{ emailed: boolean }>(`/api/purchase-orders/${o.id}/send`, {}); setPo(null); d.reload(); sure(t('Order sent'), r.emailed ? t('{s} got the order by email.', { s: o.supplier }) : t('Marked as sent.'), t('OK'), () => {}); });
  const receive = (o: PO) => sure(t('Got everything?'), t('All items on {n} are added to your stock.', { n: o.number }), t('Add to stock'), () => run('rc', async () => { await post(`/api/purchase-orders/${o.id}/receive`, {}); setPo(null); d.reload(); }));
  const cancel = (o: PO) => sure(t('Cancel this order?'), o.number, t('Cancel order'), () => run('cx', async () => { await post(`/api/purchase-orders/${o.id}/cancel`, {}); setPo(null); d.reload(); }), true);
  const startRo = () => x && (setErr(''), setRo({ sup: x.suppliers[0] ? String(x.suppliers[0].id) : '', qty: Object.fromEntries(x.low_stock.map((p) => [p.id, String(Math.max(1, Math.ceil(Number(p.reorder_level) * 2 - Number(p.stock_qty))))])) }));
  return (
    <ToolPage title={t('Suppliers')} right="plus" rightLabel={t('Add a supplier')} onRight={() => { setErr(''); setNs({ name: '', email: '', phone: '' }); }} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x ? <Hero id="sup" label={t('Running low')} value={String(x.low_stock.length)} note={x.low_stock.length ? t('Tap Reorder to order them all at once') : t('Stock is healthy')} noteGood={!x.low_stock.length}
        stats={[[t('Open orders'), String(open.length)], [t('On order'), money(open.reduce((s, o) => s + Number(o.total), 0))], [t('Suppliers'), String(x.suppliers.length)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Chips value={tab} onChange={setTab} items={[['low', t('Running low'), x.low_stock.length], ['orders', t('Orders'), open.length], ['sup', t('Suppliers'), x.suppliers.length]]} />
          {tab === 'low' ? (
            <>
              <Card>{x.low_stock.length ? x.low_stock.map((p) => <Item key={p.id} left={<Dot icon="box" tone={Number(p.stock_qty) <= 0 ? 'bad' : 'warn'} />} title={p.name} sub={t('Reorder at {n}', { n: p.reorder_level })} right={t('{n} left', { n: p.stock_qty })} />) : <None icon="check" title={t('Nothing is running low')} />}</Card>
              {x.low_stock.length ? <Btn text={t('Reorder')} icon="cart" kind="blue" onPress={startRo} /> : null}
            </>
          ) : tab === 'orders' ? (
            <Card>{x.orders.length ? x.orders.map((o) => <Item key={o.id} onPress={() => setPo(o)} left={<Dot icon="cart" tone={o.status === 'received' ? 'good' : 'nv'} />} title={`${o.number} · ${o.supplier}`} sub={o.expected_on ? t('expected {d}', { d: date(o.expected_on) }) : date(o.created_at.slice(0, 10))} right={money(o.total, 2)} rightSub={<Tag text={t(o.status)} tone={tone(o.status)} />} />)
              : <None icon="cart" title={t('No orders yet')} />}</Card>
          ) : (
            <Card>{x.suppliers.length ? x.suppliers.map((s) => <Item key={s.id} left={<Dot icon="send" />} title={s.name} sub={[s.contact, s.email, s.phone].filter(Boolean).join(' · ') || undefined} right={t('{n} orders', { n: s.orders })} />) : <None icon="send" title={t('No suppliers yet')} sub={t('Tap + to add one.')} />}</Card>
          )}
        </>
      ) : null}
      <Sheet open={!!ro} title={t('Reorder')} onClose={() => setRo(null)}>
        {ro && x ? (
          <>
            {x.suppliers.length ? <Pick<string> label={t('From')} value={ro.sup} onChange={(v) => setRo({ ...ro, sup: v })} items={x.suppliers.map((s) => [String(s.id), s.name] as [string, string])} /> : <None icon="send" title={t('Add a supplier first')} />}
            {x.low_stock.map((p) => <View key={p.id}><In label={`${p.name} (${t('{n} left', { n: p.stock_qty })})`} value={ro.qty[p.id] || ''} onChangeText={(v) => setRo({ ...ro, qty: { ...ro.qty, [p.id]: v } })} keyboardType="decimal-pad" /></View>)}
            {err ? <Tag text={err} tone="bad" /> : null}
            <Btn text={t('Make the order')} icon="check" onPress={reorder} busy={busy === 'ro'} />
          </>
        ) : null}
      </Sheet>
      <Sheet open={!!po} title={po ? `${po.number} · ${po.supplier}` : ''} onClose={() => setPo(null)}>
        {po ? (
          <>
            <Item title={t('Total')} right={money(po.total, 2)} rightSub={<Tag text={t(po.status)} tone={tone(po.status)} />} />
            {po.status === 'draft' ? <Btn text={t('Send to supplier')} icon="send" kind="blue" onPress={() => send(po)} busy={busy === 'sd'} /> : null}
            {['draft', 'sent'].includes(po.status) ? <Btn text={t('Delivery arrived')} icon="box" onPress={() => receive(po)} busy={busy === 'rc'} /> : null}
            {['draft', 'sent'].includes(po.status) ? <Btn text={t('Cancel order')} icon="x" kind="dark" onPress={() => cancel(po)} busy={busy === 'cx'} /> : null}
          </>
        ) : null}
      </Sheet>
      <Sheet open={!!ns} title={t('Add a supplier')} onClose={() => setNs(null)}>
        {ns ? (
          <>
            <In label={t('Name')} value={ns.name} onChangeText={(v) => setNs({ ...ns, name: v })} error={err || undefined} />
            <In label={t('Email (orders go here)')} value={ns.email} onChangeText={(v) => setNs({ ...ns, email: v })} keyboardType="email-address" autoCapitalize="none" />
            <In label={t('Phone')} value={ns.phone} onChangeText={(v) => setNs({ ...ns, phone: v })} keyboardType="phone-pad" />
            <Btn text={t('Save supplier')} icon="check" onPress={addSup} busy={busy === 'ns'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
