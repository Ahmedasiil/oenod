// Inventory, built into the app: stock health, what is out or running low, and quick stock changes
// (receive a delivery, count the shelf, write off damaged items). Scan a barcode with the camera to find an item.
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { money } from '../lib/format';
import { t } from '../lib/i18n';
import { FH, V } from '../ui/M6';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Search, Sheet, State, Tag, ToolPage, oops, useBusy } from '../ui/T1';

type It = { id: number; name: string; sku: string | null; category: string | null; stock: number; status: 'out' | 'low' | 'dead' | 'ok'; reorder_level: number | null; cost: number; price: number; suggest?: number | null };
type H = { items: It[]; totals: { tracked: number; out: number; low: number; cost: number; retail: number; health: number; reorder: number }; why: Record<string, string> };
type F = 'all' | 'out' | 'low' | 'dead';
type Mode = 'receive' | 'count' | 'remove';
type Why = 'damaged' | 'expired' | 'theft' | 'used' | 'returned' | 'sample' | 'other';
const qn = (n: number) => (Math.round(Number(n) * 100) / 100).toString();
const tone = (s: It['status']) => (s === 'out' ? 'bad' : s === 'low' ? 'warn' : s === 'dead' ? 'plain' : 'good') as 'bad' | 'warn' | 'plain' | 'good';
const label = (s: It['status']) => (s === 'out' ? t('Out') : s === 'low' ? t('Low') : s === 'dead' ? t('Not selling') : t('In stock'));

export default function Inventory() {
  const d = useLoad(() => get<H>('/api/inv7'));
  const [f, setF] = useState<F>('all');
  const [q, setQ] = useState('');
  const [it, setIt] = useState<It | null>(null);
  const [mode, setMode] = useState<Mode>('receive');
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [why, setWhy] = useState<Why>('damaged');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [scan, setScan] = useState(false);
  const [perm, askPerm] = useCameraPermissions();
  const seen = useRef(false);
  const { busy, run } = useBusy();
  const x = d.data;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (x?.items || []).filter((i) => (f === 'all' || i.status === f) && (!s || `${i.name} ${i.sku || ''} ${i.category || ''}`.toLowerCase().includes(s)));
  }, [x, f, q]);
  const openItem = (i: It, m: Mode = 'receive') => { setIt(i); setMode(m); setQty(m === 'receive' && i.suggest ? String(i.suggest) : ''); setCost(i.cost ? String(i.cost) : ''); setWhy('damaged'); setNote(''); setErr(''); };
  const startScan = async () => {
    if (!perm?.granted) { const p = await askPerm(); if (!p.granted) return oops(t('Camera is off for OENOD. Turn it on in Settings, or search by name.')); }
    seen.current = false; setScan(true);
  };
  const onCode = ({ data }: { data: string }) => {
    if (seen.current || !data) return; seen.current = true; setScan(false);
    run('look', async () => {
      const local = x?.items.find((i) => i.sku === data);
      if (local) return openItem(local);
      const r = await get<{ found: boolean; item: { id: number } | null }>(`/api/inv7/lookup?code=${encodeURIComponent(data)}`);
      const hit = r.found && r.item ? x?.items.find((i) => i.id === r.item!.id) : null;
      if (hit) openItem(hit); else { setQ(data); oops(t('No item has the code {c} yet. Add the code to the item on the Products screen.', { c: data })); }
    });
  };
  const save = () => {
    if (!it) return;
    const n = Number(qty.replace(',', '.'));
    if (qty.trim() === '' || isNaN(n) || n < 0) return setErr(mode === 'count' ? t('Type how many you counted.') : t('Type a number above zero.'));
    if (mode !== 'count' && n === 0) return setErr(t('Type a number above zero.'));
    let body: any;
    if (mode === 'receive') body = { kind: 'receive', average_cost: true, note: note.trim() || null, lines: [{ product_id: it.id, qty: n, unit_cost: cost.trim() === '' ? null : Number(cost.replace(',', '.')) }] };
    else if (mode === 'count') {
      const diff = Math.round((n - Number(it.stock)) * 100) / 100;
      if (diff === 0) { setIt(null); return; }
      body = { kind: 'adjust', note: note.trim() || t('Shelf count'), lines: [{ product_id: it.id, qty: diff, why: 'correction' }] };
    } else body = { kind: 'adjust', note: note.trim() || null, lines: [{ product_id: it.id, qty: -n, why }] };
    setErr('');
    run('save', async () => { await post('/api/inv7/move', body); setIt(null); d.reload(); });
  };
  const after = it ? (() => { const n = Number(qty.replace(',', '.')) || 0; return mode === 'receive' ? Number(it.stock) + n : mode === 'count' ? n : Number(it.stock) - n; })() : 0;
  return (
    <ToolPage title={t('Inventory')} right="scan" rightLabel={t('Scan a barcode')} onRight={startScan} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x ? <Hero id="inh" label={t('Stock health')} value={`${Math.round(x.totals.health)}%`} note={x.totals.out ? (x.totals.out === 1 ? t('1 item is out') : t('{n} items are out', { n: x.totals.out })) : t('Nothing is out of stock')} noteGood={!x.totals.out}
        stats={[[t('Items'), String(x.totals.tracked)], [t('Stock value'), money(x.totals.cost)], [t('To reorder'), String(x.totals.reorder)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Btn text={t('Scan a barcode')} icon="scan" onPress={startScan} busy={busy === 'look'} />
          <Search value={q} onChange={setQ} placeholder={t('Search item, SKU or category')} />
          <Chips<F> value={f} onChange={setF} items={[['all', t('All'), x.items.length], ['out', t('Out'), x.totals.out], ['low', t('Low'), x.totals.low], ['dead', t('Not selling')]]} />
          <Card>
            {list.length ? list.slice(0, 400).map((i) => (
              <Item key={i.id} onPress={() => openItem(i)} left={<Dot icon="box" tone={i.status === 'out' ? 'bad' : i.status === 'low' ? 'warn' : 'dk'} />}
                title={i.name} sub={[i.sku, i.category, i.reorder_level != null ? t('Reorder at {n}', { n: qn(i.reorder_level) }) : null].filter(Boolean).join(' · ')}
                right={qn(i.stock)} rightSub={<Tag text={label(i.status)} tone={tone(i.status)} />} />
            )) : <None icon="box" title={q || f !== 'all' ? t('Nothing found') : t('No stock tracked yet')} sub={q || f !== 'all' ? t('Try another search or filter.') : t('Turn on stock tracking for an item on the Products screen.')} />}
          </Card>
        </>
      ) : null}

      <Sheet open={scan} title={t('Scan a barcode')} onClose={() => setScan(false)}>
        <View style={{ borderRadius: 24, overflow: 'hidden', aspectRatio: 1, backgroundColor: '#000' }}>
          {scan ? <CameraView style={{ flex: 1 }} facing="back" onBarcodeScanned={onCode}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }} /> : null}
        </View>
        <Text style={{ color: V.mute, fontSize: 13, textAlign: 'center' }}>{t('Point the camera at the barcode. It reads it by itself.')}</Text>
      </Sheet>

      <Sheet open={!!it} title={it?.name || ''} onClose={() => setIt(null)}>
        {it ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}><Text style={{ color: V.mute, fontSize: 12 }}>{t('Now')}</Text><Text style={[FH, { color: V.ink, fontSize: 28 }]}>{qn(it.stock)}</Text></View>
              <View style={{ alignItems: 'center' }}><Text style={{ color: V.mute, fontSize: 12 }}>{t('After')}</Text><Text style={[FH, { color: after < 0 ? '#FF8A96' : '#9CF0C0', fontSize: 28 }]}>{qn(after)}</Text></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([['receive', t('Received')], ['count', t('Count')], ['remove', t('Remove')]] as [Mode, string][]).map(([k, l]) => (
                <Pressable key={k} onPress={() => { setMode(k); setQty(''); setErr(''); }} accessibilityRole="button" accessibilityState={{ selected: mode === k }}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center', backgroundColor: mode === k ? '#FFFFFF' : 'rgba(255,255,255,0.07)' }}>
                  <Text style={{ color: mode === k ? '#0A0B10' : '#FFFFFF', fontWeight: '700', fontSize: 14 }}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <In label={mode === 'receive' ? t('How many came in') : mode === 'count' ? t('How many are on the shelf') : t('How many to take off')} value={qty} onChangeText={setQty} keyboardType="decimal-pad" error={err || undefined} />
            {mode === 'receive' ? <In label={t('Cost each (optional)')} value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="0.00" /> : null}
            {mode === 'remove' ? <Pick<Why> label={t('Why')} value={why} onChange={setWhy} items={[['damaged', t('Damaged')], ['expired', t('Expired')], ['theft', t('Lost or stolen')], ['used', t('Used in the business')], ['returned', t('Returned to supplier')], ['sample', t('Free sample or gift')], ['other', t('Other')]]} /> : null}
            <In label={t('Note (optional)')} value={note} onChangeText={setNote} />
            <Btn text={t('Save')} icon="check" onPress={save} busy={busy === 'save'} />
            <Text style={{ color: V.mute, fontSize: 12.5, textAlign: 'center' }}>{t('Sells for {p} · costs {c}', { p: money(it.price, 2), c: money(it.cost, 2) })}</Text>
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
