// Inventory, built into the app (4.4: full access): every item with stock health, add and edit items,
// receive / count / remove stock, scan barcodes, reorder from suppliers (makes purchase orders),
// receive incoming orders, the stock history and the reports. Rare tools (lots, serials, recipes,
// price lists, food safety) open the full Inventory page inside the app.
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { get, post, put } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date, money } from '../lib/format';
import { t } from '../lib/i18n';
import { FH, V } from '../ui/M6';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Search, Sheet, State, Tag, ToolPage, oops, useBusy } from '../ui/T1';
import { openTool } from './web';

type St = 'out' | 'low' | 'dead' | 'ok';
type It = { id: number; name: string; sku: string | null; category: string | null; unit: string | null; bin: string | null; supplier_id: number | null; supplier: string | null; supplier_sku: string | null;
  lead_days: number | null; max_qty: number | null; stock: number; on_order: number; status: St; reorder_level: number | null; reorder_point?: number; cost: number; price: number; suggest?: number | null;
  sold_30?: number; per_day?: number; days_cover?: number | null; last_sold?: string | null; margin_pct?: number | null; value_cost?: number };
type Move = { id: number; product_id?: number; product?: string; qty_change: number; reason: string; ref: string | null; why: string | null; note: string | null; created_at: string; user: string | null };
type PO = { id: number; number: string; status: string; expected_on: string | null; total: number; supplier: string; items: number; late: boolean };
type H = { items: It[]; totals: { tracked: number; out: number; low: number; cost: number; retail: number; health: number; reorder: number }; why: Record<string, string>;
  incoming: PO[]; moves: Move[]; suppliers: { id: number; name: string }[]; suppliers_on: boolean; all_categories?: string[] };
type Full = It & { description: string | null; moves: Move[]; levels: number[]; orders: { id: number; number: string; status: string; qty: number; received_qty: number | null; supplier: string }[] };
type Rep = { totals: H['totals']; abc: Record<'A' | 'B' | 'C', { items: number; revenue: number; value: number }>; shrink: { why: string; label: string; units: number; value: number; times: number }[];
  top: It[]; slow: It[]; received_30: number; cogs_30: number; categories: { name?: string; category?: string; items?: number; value: number }[] };
type POFull = { id: number; number: string; status: string; supplier: { name: string } | null; lines: { id: number; name: string; qty: number; received_qty: number | null; unit_cost: number; sku: string | null }[] };
type Tab = 'items' | 'reorder' | 'incoming' | 'history' | 'reports';
type F = 'all' | 'out' | 'low' | 'dead';
type Mode = 'receive' | 'count' | 'remove';
type Why = 'damaged' | 'expired' | 'theft' | 'used' | 'returned' | 'sample' | 'other';
type Form = { name: string; sku: string; category: string; unit: string; bin: string; cost: string; price: string; reorder_level: string; max_qty: string; lead_days: string; supplier_id: string; stock_set: string };

const qn = (n: number | null | undefined) => (Math.round(Number(n || 0) * 100) / 100).toString();
const num = (s: string) => Number(s.replace(',', '.'));
const tone = (s: St) => (s === 'out' ? 'bad' : s === 'low' ? 'warn' : s === 'dead' ? 'plain' : 'good') as 'bad' | 'warn' | 'plain' | 'good';
const label = (s: St) => (s === 'out' ? t('Out') : s === 'low' ? t('Low') : s === 'dead' ? t('Not selling') : t('In stock'));
const REASON: Record<string, string> = { receive: 'Received', sale: 'Sold', adjust: 'Adjusted', count: 'Counted', refund: 'Returned by customer', transfer: 'Moved', recipe: 'Used in a recipe' };
const blank: Form = { name: '', sku: '', category: '', unit: '', bin: '', cost: '', price: '', reorder_level: '', max_qty: '', lead_days: '', supplier_id: '', stock_set: '' };

export default function Inventory() {
  const d = useLoad(() => get<H>('/api/inv7'));
  const [tab, setTab] = useState<Tab>('items');
  const [f, setF] = useState<F>('all');
  const [q, setQ] = useState('');
  // stock change sheet
  const [it, setIt] = useState<It | null>(null);
  const [full, setFull] = useState<Full | null>(null);
  const [mode, setMode] = useState<Mode>('receive');
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [why, setWhy] = useState<Why>('damaged');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  // add / edit sheet
  const [edit, setEdit] = useState<{ id: number | null } | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [ferr, setFerr] = useState<Record<string, string>>({});
  // scanner: 'find' opens the item, 'sku' fills the barcode in the edit form
  const [scan, setScan] = useState<'' | 'find' | 'sku'>('');
  const [perm, askPerm] = useCameraPermissions();
  const seen = useRef(false);
  // reorder + incoming
  const [pick, setPick] = useState<Record<number, string>>({});
  const [po, setPo] = useState<POFull | null>(null);
  const [got, setGot] = useState<Record<number, string>>({});
  const rep = useLoad(() => (tab === 'reports' ? get<Rep>('/api/inv7/reports') : Promise.resolve(null as Rep | null)), [tab]);
  const { busy, run } = useBusy();
  const x = d.data;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (x?.items || []).filter((i) => (f === 'all' || i.status === f) && (!s || `${i.name} ${i.sku || ''} ${i.category || ''} ${i.supplier || ''}`.toLowerCase().includes(s)));
  }, [x, f, q]);
  const toOrder = useMemo(() => (x?.items || []).filter((i) => (i.suggest || 0) > 0), [x]);
  const groups = useMemo(() => {
    const g: Record<string, It[]> = {};
    for (const i of toOrder) (g[i.supplier_id ? String(i.supplier_id) : '0'] ||= []).push(i);
    return Object.entries(g).sort(([a], [b]) => (a === '0' ? 1 : b === '0' ? -1 : 0));
  }, [toOrder]);

  const openItem = (i: It, m: Mode = 'receive') => {
    setIt(i); setFull(null); setMode(m); setQty(m === 'receive' && i.suggest ? String(i.suggest) : ''); setCost(i.cost ? String(i.cost) : ''); setWhy('damaged'); setNote(''); setErr('');
    get<Full>(`/api/inv7/item/${i.id}`).then(setFull).catch(() => {});
  };
  const startScan = async (kind: 'find' | 'sku') => {
    if (!perm?.granted) { const p = await askPerm(); if (!p.granted) return oops(t('Camera is off for OENOD. Turn it on in Settings, or search by name.')); }
    seen.current = false; setScan(kind);
  };
  const onCode = ({ data }: { data: string }) => {
    if (seen.current || !data) return; seen.current = true;
    const kind = scan; setScan('');
    if (kind === 'sku') { setForm((v) => ({ ...v, sku: data })); return; }
    run('look', async () => {
      const local = x?.items.find((i) => i.sku === data);
      if (local) return openItem(local);
      const r = await get<{ found: boolean; item: { id: number } | null }>(`/api/inv7/lookup?code=${encodeURIComponent(data)}`);
      const hit = r.found && r.item ? x?.items.find((i) => i.id === r.item!.id) : null;
      if (hit) openItem(hit);
      else { setForm({ ...blank, sku: data }); setFerr({}); setEdit({ id: null }); }
    });
  };
  const save = () => {
    if (!it) return;
    const n = num(qty);
    if (qty.trim() === '' || isNaN(n) || n < 0) return setErr(mode === 'count' ? t('Type how many you counted.') : t('Type a number above zero.'));
    if (mode !== 'count' && n === 0) return setErr(t('Type a number above zero.'));
    let body: any;
    if (mode === 'receive') body = { kind: 'receive', average_cost: true, note: note.trim() || null, lines: [{ product_id: it.id, qty: n, unit_cost: cost.trim() === '' ? null : num(cost) }] };
    else if (mode === 'count') {
      const diff = Math.round((n - Number(it.stock)) * 100) / 100;
      if (diff === 0) { setIt(null); return; }
      body = { kind: 'adjust', note: note.trim() || t('Shelf count'), lines: [{ product_id: it.id, qty: diff, why: 'correction' }] };
    } else body = { kind: 'adjust', note: note.trim() || null, lines: [{ product_id: it.id, qty: -n, why }] };
    setErr('');
    run('save', async () => { await post('/api/inv7/move', body); setIt(null); d.reload(); });
  };
  const after = it ? (() => { const n = num(qty) || 0; return mode === 'receive' ? Number(it.stock) + n : mode === 'count' ? n : Number(it.stock) - n; })() : 0;

  const startEdit = (i: It | null) => {
    setFerr({});
    setForm(i ? { name: i.name, sku: i.sku || '', category: i.category || '', unit: i.unit || '', bin: i.bin || '', cost: i.cost ? String(i.cost) : '', price: i.price ? String(i.price) : '',
      reorder_level: i.reorder_level ? String(i.reorder_level) : '', max_qty: i.max_qty ? String(i.max_qty) : '', lead_days: i.lead_days != null ? String(i.lead_days) : '',
      supplier_id: i.supplier_id ? String(i.supplier_id) : '', stock_set: '' } : blank);
    setIt(null); setEdit({ id: i ? i.id : null });
  };
  const saveItem = () => {
    if (!edit) return;
    if (!form.name.trim()) return setFerr({ name: t('Give the item a name.') });
    const body: Record<string, unknown> = { name: form.name.trim(), sku: form.sku.trim(), category: form.category.trim(), unit: form.unit.trim(), bin: form.bin.trim(),
      cost: form.cost.trim(), price: form.price.trim(), reorder_level: form.reorder_level.trim(), max_qty: form.max_qty.trim(), lead_days: form.lead_days.trim() === '' ? null : form.lead_days.trim(),
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null };
    if (form.stock_set.trim() !== '') body.stock_set = form.stock_set.trim();
    setFerr({});
    run('item', async () => {
      try {
        if (edit.id) await put(`/api/inv7/item/${edit.id}`, body); else await post('/api/inv7/item', body);
        setEdit(null); d.reload();
      } catch (e: any) { if (e?.fields) setFerr(e.fields); else throw e; }
    });
  };

  const makeOrders = () => {
    const bySup: Record<string, { product_id: number; qty: number }[]> = {};
    for (const i of toOrder) {
      if (!i.supplier_id) continue;
      const n = num(pick[i.id] ?? String(i.suggest || 0));
      if (n > 0) (bySup[String(i.supplier_id)] ||= []).push({ product_id: i.id, qty: n });
    }
    const g = Object.entries(bySup).map(([sid, lines]) => ({ supplier_id: Number(sid), lines }));
    if (!g.length) return oops(t('Pick at least one item that has a supplier.'));
    run('po', async () => {
      const r = await post<{ orders: { number: string }[] }>('/api/inv7/reorder', { groups: g });
      setPick({}); d.reload(); setTab('incoming');
      Alert.alert(t('Done'), t('{n} purchase orders made: {list}. Send them to your suppliers from Incoming.', { n: r.orders.length, list: r.orders.map((o) => o.number).join(', ') }));
    });
  };
  const openPO = (p: PO) => run('pol', async () => { const r = await get<POFull>(`/api/purchase-orders/${p.id}`); setGot({}); setPo(r); });
  const receivePO = () => po && run('rcv', async () => {
    const received: Record<number, number> = {};
    for (const l of po.lines) received[l.id] = got[l.id] !== undefined && got[l.id].trim() !== '' ? Math.max(0, num(got[l.id]) || 0) : Number(l.qty);
    await post(`/api/purchase-orders/${po.id}/receive`, { received }); setPo(null); d.reload();
  });
  const sendPO = () => po && run('snd', async () => { await post(`/api/purchase-orders/${po.id}/send`, {}); setPo(null); d.reload(); });

  const F2 = (k: keyof Form, l: string, p: Partial<React.ComponentProps<typeof In>> = {}) => (
    <In label={l} value={form[k]} onChangeText={(v) => setForm((s) => ({ ...s, [k]: v }))} error={ferr[k]} {...p} />
  );
  const row2 = (a: React.ReactNode, b: React.ReactNode) => <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}>{a}</View><View style={{ flex: 1 }}>{b}</View></View>;
  const stat = (k: string, v: string, c?: string) => (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: V.surf2 }}>
      <Text style={{ color: V.mute, fontSize: 11.5 }}>{k}</Text><Text style={[FH, { color: c || V.ink, fontSize: 20 }]}>{v}</Text>
    </View>
  );
  const moveRow = (m: Move, withName: boolean) => (
    <Item key={m.id} left={<Dot icon={m.qty_change >= 0 ? 'recv' : 'send'} tone={m.qty_change >= 0 ? 'good' : 'nv'} />}
      title={withName && m.product ? m.product : t(REASON[m.reason] || m.reason)}
      sub={[withName ? t(REASON[m.reason] || m.reason) : null, m.why && x?.why[m.why] ? t(x.why[m.why]) : null, m.ref, m.note, m.user].filter(Boolean).join(' · ')}
      right={(m.qty_change > 0 ? '+' : '') + qn(m.qty_change)} rightSub={<Text style={{ color: V.faint, fontSize: 11.5 }}>{date(m.created_at.slice(0, 10))}</Text>} />
  );

  return (
    <ToolPage title={t('Inventory')} right="scan" rightLabel={t('Scan a barcode')} onRight={() => startScan('find')} refreshing={d.refreshing} onRefresh={() => { d.refresh(); if (tab === 'reports') rep.reload(); }}>
      {x ? <Hero id="inh" label={t('Stock health')} value={`${Math.round(x.totals.health)}%`} note={x.totals.out ? (x.totals.out === 1 ? t('1 item is out') : t('{n} items are out', { n: x.totals.out })) : t('Nothing is out of stock')} noteGood={!x.totals.out}
        stats={[[t('Items'), String(x.totals.tracked)], [t('Stock value'), money(x.totals.cost)], [t('To reorder'), String(x.totals.reorder)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn text={t('Add item')} icon="plus" kind="blue" onPress={() => startEdit(null)} style={{ flex: 1 }} />
            <Btn text={t('Scan')} icon="scan" onPress={() => startScan('find')} busy={busy === 'look'} style={{ flex: 1 }} />
          </View>
          <Chips<Tab> value={tab} onChange={setTab} items={[['items', t('Items'), x.items.length], ['reorder', t('Reorder'), toOrder.length], ['incoming', t('Incoming'), x.incoming.length], ['history', t('History')], ['reports', t('Reports')]]} />

          {tab === 'items' ? (
            <>
              <Search value={q} onChange={setQ} placeholder={t('Search item, SKU or category')} />
              <Pick<F> label={t('Show')} value={f} onChange={setF} items={[['all', t('All')], ['out', `${t('Out')} · ${x.totals.out}`], ['low', `${t('Low')} · ${x.totals.low}`], ['dead', t('Not selling')]]} />
              <Card>
                {list.length ? list.slice(0, 400).map((i) => (
                  <Item key={i.id} onPress={() => openItem(i)} left={<Dot icon="box" tone={i.status === 'out' ? 'bad' : i.status === 'low' ? 'warn' : 'dk'} />}
                    title={i.name} sub={[i.sku, i.category, i.bin ? t('Shelf {b}', { b: i.bin }) : null, i.on_order ? t('{n} on order', { n: qn(i.on_order) }) : null].filter(Boolean).join(' · ')}
                    right={qn(i.stock) + (i.unit ? ` ${i.unit}` : '')} rightSub={<Tag text={label(i.status)} tone={tone(i.status)} />} />
                )) : <None icon="box" title={q || f !== 'all' ? t('Nothing found') : t('No stock tracked yet')} sub={q || f !== 'all' ? t('Try another search or filter.') : t('Tap Add item to start.')} />}
              </Card>
            </>
          ) : null}

          {tab === 'reorder' ? (
            toOrder.length ? (
              <>
                {groups.map(([sid, items]) => (
                  <Card key={sid} title={sid === '0' ? t('No supplier yet') : (x.suppliers.find((s) => String(s.id) === sid)?.name || t('Supplier'))}>
                    {items.map((i) => (
                      <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                        <Pressable style={{ flex: 1 }} onPress={() => openItem(i)} accessibilityRole="button">
                          <Text style={{ color: V.ink, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>{i.name}</Text>
                          <Text style={{ color: V.mute, fontSize: 12.5 }}>{t('Have {a} · on order {b}', { a: qn(i.stock), b: qn(i.on_order) })}</Text>
                        </Pressable>
                        {sid === '0' ? <Btn text={t('Set supplier')} onPress={() => startEdit(i)} /> : (
                          <In label={t('Order')} value={pick[i.id] ?? String(i.suggest || '')} onChangeText={(v) => setPick((p) => ({ ...p, [i.id]: v }))} keyboardType="decimal-pad" style={{ width: 92 }} />
                        )}
                      </View>
                    ))}
                  </Card>
                ))}
                {x.suppliers_on ? <Btn text={t('Make purchase orders')} icon="send" kind="blue" onPress={makeOrders} busy={busy === 'po'} />
                  : <Text style={{ color: V.mute, fontSize: 13, textAlign: 'center' }}>{t('Turn on Suppliers on oenod.com to make purchase orders.')}</Text>}
              </>
            ) : <Card><None icon="check" title={t('Nothing to reorder')} sub={t('Items show here when they run low, based on what you sell.')} /></Card>
          ) : null}

          {tab === 'incoming' ? (
            <Card>
              {x.incoming.length ? x.incoming.map((p) => (
                <Item key={p.id} onPress={() => openPO(p)} left={<Dot icon="cart" tone={p.late ? 'bad' : 'nv'} />} title={`${p.number} · ${p.supplier}`}
                  sub={[t('{n} items', { n: p.items }), p.expected_on ? t('expected {d}', { d: date(p.expected_on) }) : null].filter(Boolean).join(' · ')}
                  right={money(p.total, 2)} rightSub={<Tag text={p.late ? t('Late') : p.status === 'sent' ? t('Sent') : t('Draft')} tone={p.late ? 'bad' : p.status === 'sent' ? 'info' : 'plain'} />} />
              )) : <None icon="cart" title={t('No orders on the way')} sub={t('Purchase orders you make show here until you receive them.')} />}
            </Card>
          ) : null}

          {tab === 'history' ? (
            <Card>{x.moves.length ? x.moves.map((m) => moveRow(m, true)) : <None icon="clock" title={t('No stock changes yet')} />}</Card>
          ) : null}

          {tab === 'reports' ? (
            <>
              <State loading={rep.loading && !rep.data} error={!rep.data ? rep.error : null} onRetry={rep.reload} />
              {rep.data ? (
                <>
                  <View style={{ flexDirection: 'row', gap: 10 }}>{stat(t('Stock at cost'), money(rep.data.totals.cost))}{stat(t('At selling price'), money(rep.data.totals.retail))}</View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>{stat(t('Received, 30 days'), money(rep.data.received_30))}{stat(t('Cost of sales, 30 days'), money(rep.data.cogs_30))}</View>
                  <Card title={t('Best sellers, 90 days')}>
                    {rep.data.top.length ? rep.data.top.map((i) => <Item key={i.id} onPress={() => openItem(i)} left={<Dot icon="chart" tone="good" />} title={i.name} sub={t('{n} sold in 30 days', { n: qn(i.sold_30) })} right={money((i as any).revenue_90)} />)
                      : <None icon="chart" title={t('No sales yet')} />}
                  </Card>
                  <Card title={t('Not selling, money sitting on the shelf')}>
                    {rep.data.slow.length ? rep.data.slow.map((i) => <Item key={i.id} onPress={() => openItem(i)} left={<Dot icon="box" />} title={i.name} sub={t('Have {n}', { n: qn(i.stock) })} right={money(i.value_cost)} />)
                      : <None icon="check" title={t('Everything is selling')} />}
                  </Card>
                  <Card title={t('Lost stock, 90 days')}>
                    {rep.data.shrink.length ? rep.data.shrink.map((s) => <Item key={s.why} left={<Dot icon="shield" tone="bad" />} title={t(s.label)} sub={t('{n} units · {k} times', { n: qn(s.units), k: s.times })} right={money(s.value)} />)
                      : <None icon="check" title={t('Nothing lost')} />}
                  </Card>
                </>
              ) : null}
            </>
          ) : null}

          <Btn text={t('All inventory tools')} icon="grid" onPress={() => openTool('/inventory', t('Inventory'))} />
          <Text style={{ color: V.mute, fontSize: 12.5, textAlign: 'center' }}>{t('Lots, serial numbers, recipes, price lists and food safety open the full Inventory page.')}</Text>
        </>
      ) : null}

      <Sheet open={!!scan} title={t('Scan a barcode')} onClose={() => setScan('')}>
        <View style={{ borderRadius: 24, overflow: 'hidden', aspectRatio: 1, backgroundColor: '#000' }}>
          {scan ? <CameraView style={{ flex: 1 }} facing="back" onBarcodeScanned={onCode}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }} /> : null}
        </View>
        <Text style={{ color: V.mute, fontSize: 13, textAlign: 'center' }}>{scan === 'sku' ? t('Scan the item’s barcode to save it on the item.') : t('Point the camera at the barcode. It reads it by itself. A new code starts a new item.')}</Text>
      </Sheet>

      <Sheet open={!!it} title={it?.name || ''} onClose={() => setIt(null)}>
        {it ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {stat(t('Now'), qn(it.stock))}
              {stat(t('After'), qn(after), after < 0 ? '#D93A3A' : V.good)}
              {stat(t('On order'), qn(it.on_order))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([['receive', t('Received')], ['count', t('Count')], ['remove', t('Remove')]] as [Mode, string][]).map(([k, l]) => (
                <Pressable key={k} onPress={() => { setMode(k); setQty(''); setErr(''); }} accessibilityRole="button" accessibilityState={{ selected: mode === k }}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center', backgroundColor: mode === k ? V.pill : V.surf2, borderWidth: 1, borderColor: mode === k ? V.pill : V.line }}>
                  <Text style={{ color: mode === k ? V.pillInk : V.ink, fontWeight: '700', fontSize: 14 }}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <In label={mode === 'receive' ? t('How many came in') : mode === 'count' ? t('How many are on the shelf') : t('How many to take off')} value={qty} onChangeText={setQty} keyboardType="decimal-pad" error={err || undefined} />
            {mode === 'receive' ? <In label={t('Cost each (optional)')} value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="0.00" /> : null}
            {mode === 'remove' ? <Pick<Why> label={t('Why')} value={why} onChange={setWhy} items={[['damaged', t('Damaged')], ['expired', t('Expired')], ['theft', t('Lost or stolen')], ['used', t('Used in the business')], ['returned', t('Returned to supplier')], ['sample', t('Free sample or gift')], ['other', t('Other')]]} /> : null}
            <In label={t('Note (optional)')} value={note} onChangeText={setNote} />
            <Btn text={t('Save')} icon="check" kind="blue" onPress={save} busy={busy === 'save'} />
            <Btn text={t('Edit item')} icon="doc" onPress={() => startEdit(full || it)} />
            <View style={{ gap: 4 }}>
              {[[t('Sells for'), money(it.price, 2)], [t('Costs'), money(it.cost, 2)], it.margin_pct != null ? [t('Margin'), `${it.margin_pct}%`] : null,
                it.per_day ? [t('Sells per day'), qn(it.per_day)] : null, it.days_cover != null ? [t('Lasts about'), t('{n} days', { n: Math.round(it.days_cover) })] : null,
                [t('Reorder at'), qn(it.reorder_point ?? it.reorder_level)], it.supplier ? [t('Supplier'), it.supplier] : null, it.bin ? [t('Shelf'), it.bin] : null]
                .filter(Boolean).map((r) => (
                  <View key={(r as string[])[0]} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Text style={{ color: V.mute, fontSize: 13.5 }}>{(r as string[])[0]}</Text><Text style={{ color: V.ink, fontSize: 13.5, fontWeight: '600' }}>{(r as string[])[1]}</Text>
                  </View>
                ))}
            </View>
            {full?.levels?.length ? <Levels v={full.levels} /> : null}
            {full?.moves?.length ? <Card title={t('History')}>{full.moves.slice(0, 15).map((m) => moveRow(m, false))}</Card> : null}
          </>
        ) : null}
      </Sheet>

      <Sheet open={!!edit} title={edit?.id ? t('Edit item') : t('New item')} onClose={() => setEdit(null)}>
        {edit ? (
          <>
            {F2('name', t('Name'), { placeholder: t('e.g. Coffee beans 1 kg') })}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>{F2('sku', t('Barcode or SKU'), { autoCapitalize: 'none' })}</View>
              <Btn text={t('Scan')} icon="scan" onPress={() => startScan('sku')} />
            </View>
            {row2(F2('category', t('Category')), F2('unit', t('Unit'), { placeholder: t('each, kg, box') }))}
            {row2(F2('cost', t('Cost each'), { keyboardType: 'decimal-pad', placeholder: '0.00' }), F2('price', t('Sells for'), { keyboardType: 'decimal-pad', placeholder: '0.00' }))}
            {row2(F2('reorder_level', t('Reorder at'), { keyboardType: 'decimal-pad' }), F2('max_qty', t('Fill up to'), { keyboardType: 'decimal-pad' }))}
            {row2(F2('bin', t('Shelf or bin')), F2('lead_days', t('Delivery days'), { keyboardType: 'number-pad' }))}
            {x?.suppliers.length ? <Pick label={t('Supplier')} value={form.supplier_id} onChange={(v) => setForm((s) => ({ ...s, supplier_id: v }))}
              items={[['', t('None')] as [string, string], ...x.suppliers.map((s) => [String(s.id), s.name] as [string, string])]} /> : null}
            {F2('stock_set', edit.id ? t('Set stock to (optional)') : t('How many you have now'), { keyboardType: 'decimal-pad' })}
            <Btn text={edit.id ? t('Save changes') : t('Add item')} icon="check" kind="blue" onPress={saveItem} busy={busy === 'item'} />
          </>
        ) : null}
      </Sheet>

      <Sheet open={!!po} title={po ? `${po.number}${po.supplier ? ` · ${po.supplier.name}` : ''}` : ''} onClose={() => setPo(null)}>
        {po ? (
          <>
            <Text style={{ color: V.mute, fontSize: 13 }}>{t('Type what actually arrived. Leave a line empty if it all came.')}</Text>
            {po.lines.map((l) => (
              <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: V.ink, fontSize: 15, fontWeight: '600' }} numberOfLines={2}>{l.name}</Text>
                  <Text style={{ color: V.mute, fontSize: 12.5 }}>{t('Ordered {n} · {c} each', { n: qn(l.qty), c: money(l.unit_cost, 2) })}</Text>
                </View>
                <In label={t('Arrived')} value={got[l.id] ?? ''} placeholder={qn(l.qty)} onChangeText={(v) => setGot((g) => ({ ...g, [l.id]: v }))} keyboardType="decimal-pad" style={{ width: 92 }} />
              </View>
            ))}
            <Btn text={t('Receive into stock')} icon="check" kind="blue" onPress={receivePO} busy={busy === 'rcv'} />
            {po.status === 'draft' ? <Btn text={t('Send to supplier')} icon="send" onPress={sendPO} busy={busy === 'snd'} /> : null}
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}

/** Stock at the end of each of the last 8 weeks, as small bars. */
function Levels({ v }: { v: number[] }) {
  const top = Math.max(1, ...v.map((n) => Math.max(0, n)));
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: V.mute, fontSize: 12.5, fontWeight: '600' }}>{t('Stock, last 8 weeks')}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 64 }}>
        {v.map((n, i) => <View key={i} style={{ flex: 1, height: Math.max(3, (Math.max(0, n) / top) * 60), borderRadius: 4, backgroundColor: i === v.length - 1 ? V.blue : V.ice }} />)}
      </View>
    </View>
  );
}
