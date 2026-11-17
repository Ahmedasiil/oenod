// Products, built into the app: every item you sell, with price, cost, margin and stock; add or edit one; hide one you stopped selling.
import React, { useMemo, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { get, post, put, del } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { money } from '../lib/format';
import { t } from '../lib/i18n';
import { V } from '../ui/M6';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Search, Sheet, State, Tag, ToolPage, sure, useBusy } from '../ui/T1';

type P = { id: number; name: string; sku: string | null; category: string | null; description: string | null; price: number; cost: number | null; taxable: number | boolean;
  track_stock: number | boolean; reorder_level: number | null; active: number | boolean; stock_qty: number };
type F = { id?: number; name: string; sku: string; category: string; description: string; price: string; cost: string; taxable: boolean; track_stock: boolean; reorder_level: string; stock_qty: string; active: boolean };
const blank: F = { name: '', sku: '', category: '', description: '', price: '', cost: '', taxable: true, track_stock: false, reorder_level: '', stock_qty: '', active: true };
const n = (s: string) => Number(String(s).replace(',', '.'));

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: V.ink, fontSize: 15 }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: '#4A63FF', false: '#3A3D4A' }} thumbColor="#FFFFFF" />
    </View>
  );
}

export default function Products() {
  const d = useLoad(() => get<{ products: P[]; categories: string[]; stock_value: number | null }>('/api/products'));
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [f, setF] = useState<F | null>(null);
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const live = (x?.products || []).filter((p) => Number(p.active));
  const hidden = (x?.products || []).filter((p) => !Number(p.active));
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const src = cat === '__hidden' ? hidden : live;
    return src.filter((p) => (!cat || cat === '__hidden' || p.category === cat) && (!s || `${p.name} ${p.sku || ''} ${p.category || ''}`.toLowerCase().includes(s)));
  }, [x, cat, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const avgMargin = (() => { const m = live.filter((p) => Number(p.price) > 0 && p.cost != null).map((p) => (Number(p.price) - Number(p.cost)) / Number(p.price)); return m.length ? Math.round((m.reduce((a, b) => a + b, 0) / m.length) * 100) : null; })();
  const edit = (p: P) => { setErr(''); setF({ id: p.id, name: p.name, sku: p.sku || '', category: p.category || '', description: p.description || '', price: String(p.price), cost: p.cost != null ? String(p.cost) : '',
    taxable: !!Number(p.taxable), track_stock: !!Number(p.track_stock), reorder_level: p.reorder_level ? String(p.reorder_level) : '', stock_qty: '', active: !!Number(p.active) }); };
  const save = () => {
    if (!f) return;
    if (!f.name.trim()) return setErr(t('Type a name.'));
    if (f.price.trim() === '' || isNaN(n(f.price)) || n(f.price) < 0) return setErr(t('Type the price, like 4.50.'));
    if (f.cost.trim() !== '' && (isNaN(n(f.cost)) || n(f.cost) < 0)) return setErr(t('Cost must be a number.'));
    setErr('');
    // The server replaces every field on save, so always send the whole product.
    const body: any = { name: f.name.trim(), sku: f.sku.trim() || null, category: f.category.trim() || null, description: f.description.trim() || null, price: n(f.price), cost: f.cost.trim() === '' ? 0 : n(f.cost),
      taxable: f.taxable, track_stock: f.track_stock, reorder_level: f.reorder_level.trim() === '' ? 0 : n(f.reorder_level), active: f.active };
    if (!f.id && f.track_stock && f.stock_qty.trim() !== '') body.stock_qty = n(f.stock_qty);
    run('save', async () => { if (f.id) await put(`/api/products/${f.id}`, body); else await post('/api/products', body); setF(null); d.reload(); });
  };
  const hide = () => f?.id && sure(t('Stop selling {n}?', { n: f.name }), t('It leaves the register. Past sales stay. You can bring it back from Hidden.'), t('Stop selling'),
    () => run('del', async () => { await del(`/api/products/${f.id}`); setF(null); d.reload(); }), true);
  return (
    <ToolPage title={t('Products')} right="plus" rightLabel={t('New product')} onRight={() => { setErr(''); setF({ ...blank, category: cat && cat !== '__hidden' ? cat : '' }); }} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x ? <Hero id="prh" label={t('Products for sale')} value={String(live.length)} note={avgMargin != null ? t('Average margin {p}%', { p: avgMargin }) : t('Add a cost to see your margin')} noteGood={(avgMargin ?? 0) >= 30}
        stats={[[t('Categories'), String(x.categories.length)], [t('Stock value'), x.stock_value != null ? money(x.stock_value) : '—'], [t('Hidden'), String(hidden.length)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Search value={q} onChange={setQ} placeholder={t('Search name, SKU or category')} />
          <Chips<string> value={cat} onChange={setCat} items={[['', t('All'), live.length], ...x.categories.map((c) => [c, c] as [string, string]), ...(hidden.length ? [['__hidden', t('Hidden'), hidden.length] as [string, string, number]] : [])]} />
          <Card>
            {list.length ? list.slice(0, 400).map((p) => {
              const m = Number(p.price) > 0 && p.cost != null && Number(p.cost) > 0 ? Math.round(((Number(p.price) - Number(p.cost)) / Number(p.price)) * 100) : null;
              return (
                <Item key={p.id} onPress={() => edit(p)} left={<Dot icon="box" tone={Number(p.active) ? 'dk' : 'warn'} />} title={p.name}
                  sub={[p.category, p.sku, Number(p.track_stock) ? t('{n} in stock', { n: Number(p.stock_qty) }) : null].filter(Boolean).join(' · ') || t('No category')}
                  right={money(p.price, 2)} rightSub={m != null ? <Tag text={t('{p}% margin', { p: m })} tone={m >= 30 ? 'good' : m >= 10 ? 'warn' : 'bad'} /> : undefined} />
              );
            }) : <None icon="box" title={q || cat ? t('Nothing found') : t('No products yet')} sub={q || cat ? t('Try another search or filter.') : t('Tap + to add what you sell.')} />}
          </Card>
        </>
      ) : null}
      <Sheet open={!!f} title={f?.id ? t('Edit product') : t('New product')} onClose={() => setF(null)}>
        {f ? (
          <>
            <In label={t('Name')} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} error={err || undefined} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <In style={{ flex: 1 }} label={t('Price')} value={f.price} onChangeText={(v) => setF({ ...f, price: v })} keyboardType="decimal-pad" placeholder="0.00" />
              <In style={{ flex: 1 }} label={t('Cost (optional)')} value={f.cost} onChangeText={(v) => setF({ ...f, cost: v })} keyboardType="decimal-pad" placeholder="0.00" />
            </View>
            {n(f.price) > 0 && f.cost.trim() !== '' && n(f.cost) >= 0 ? <Text style={{ color: V.mute, fontSize: 13 }}>{t('You keep {m} on each one ({p}% margin).', { m: money(n(f.price) - n(f.cost), 2), p: Math.round(((n(f.price) - n(f.cost)) / n(f.price)) * 100) })}</Text> : null}
            <In label={t('Category')} value={f.category} onChangeText={(v) => setF({ ...f, category: v })} placeholder={t('Drinks, Food, Services…')} />
            {x?.categories.length ? <Chips<string> value={f.category} onChange={(v) => setF({ ...f, category: v })} items={x.categories.map((c) => [c, c] as [string, string])} /> : null}
            <In label={t('SKU or barcode (optional)')} value={f.sku} onChangeText={(v) => setF({ ...f, sku: v })} autoCapitalize="none" />
            <Toggle label={t('Add tax')} value={f.taxable} onChange={(v) => setF({ ...f, taxable: v })} />
            <Toggle label={t('Count stock')} value={f.track_stock} onChange={(v) => setF({ ...f, track_stock: v })} />
            {f.track_stock ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {!f.id ? <In style={{ flex: 1 }} label={t('In stock now')} value={f.stock_qty} onChangeText={(v) => setF({ ...f, stock_qty: v })} keyboardType="decimal-pad" /> : null}
                <In style={{ flex: 1 }} label={t('Reorder at')} value={f.reorder_level} onChangeText={(v) => setF({ ...f, reorder_level: v })} keyboardType="decimal-pad" />
              </View>
            ) : null}
            {f.id && !f.active ? <Toggle label={t('Selling again')} value={f.active} onChange={(v) => setF({ ...f, active: v })} /> : null}
            <Btn text={t('Save')} icon="check" onPress={save} busy={busy === 'save'} />
            {f.id && f.active ? <Btn text={t('Stop selling')} icon="x" kind="dark" onPress={hide} busy={busy === 'del'} /> : null}
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
