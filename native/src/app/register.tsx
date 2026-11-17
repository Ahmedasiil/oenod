// Register, built into the app: tap products to fill the cart, pick the customer, take cash (with change) or record a card / other payment.
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { money } from '../lib/format';
import { t } from '../lib/i18n';
import { FH, V } from '../ui/M6';
import { Btn, Card, Chips, In, Item, None, Pick, Search, Sheet, State, Tag, ToolPage, useBusy } from '../ui/T1';

type P = { id: number; name: string; price: number; category: string | null; active: number | boolean; sku: string | null; stock_qty: number; track_stock: number | boolean };
type Cu = { id: number; name: string };
type Line = { key: string; product_id?: number; name: string; price: number; qty: number };
type Pay = 'cash' | 'card' | 'other';

export default function Register() {
  const { width } = useWindowDimensions();
  const pd = useLoad(() => get<{ products: P[]; categories: string[] }>('/api/products'));
  const cd = useLoad(() => get<{ customers: Cu[] }>('/api/customers').catch(() => ({ customers: [] as Cu[] })));
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<Line[]>([]);
  const [who, setWho] = useState<Cu | null>(null);
  const [pickC, setPickC] = useState(false);
  const [custom, setCustom] = useState(false);
  const [cn, setCn] = useState(''); const [cp, setCp] = useState('');
  const [pay, setPay] = useState(false);
  const [method, setMethod] = useState<Pay>('card');
  const [tender, setTender] = useState('');
  const [tip, setTip] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ id: number; number: number; total: number; change: number | null } | null>(null);
  const { busy, run } = useBusy();
  const prods = (pd.data?.products || []).filter((p) => Number(p.active));
  const shown = useMemo(() => { const s = q.trim().toLowerCase(); return prods.filter((p) => (!cat || p.category === cat) && (!s || `${p.name} ${p.sku || ''}`.toLowerCase().includes(s))); }, [prods, cat, q]);
  const sub = cart.reduce((a, l) => a + l.price * l.qty, 0);
  const add = (p: P) => setCart((c) => { const k = 'p' + p.id; const f = c.find((l) => l.key === k); return f ? c.map((l) => (l.key === k ? { ...l, qty: l.qty + 1 } : l)) : [...c, { key: k, product_id: p.id, name: p.name, price: Number(p.price), qty: 1 }]; });
  const bump = (k: string, n: number) => setCart((c) => c.map((l) => (l.key === k ? { ...l, qty: l.qty + n } : l)).filter((l) => l.qty > 0));
  const count = (id: number) => cart.find((l) => l.product_id === id)?.qty || 0;
  const cols = width >= 700 ? 4 : 3;
  const charge = () => {
    const tp = Number(tip.replace(',', '.')) || 0;
    const td = tender.trim() === '' ? null : Number(tender.replace(',', '.'));
    if (method === 'cash' && td !== null && (isNaN(td) || td + 0.001 < sub + tp)) return setErr(t('Cash given is less than the total before tax ({m}). The register adds tax.', { m: money(sub + tp, 2) }));
    setErr('');
    run('pay', async () => {
      const r = await post<any>('/api/sales', { payment_method: method, customer_id: who?.id || null, tip: tp, tendered: method === 'cash' ? td : null,
        lines: cart.map((l) => (l.product_id ? { product_id: l.product_id, qty: l.qty } : { name: l.name, price: l.price, qty: l.qty })) });
      setPay(false); setDone({ id: r.id, number: r.number, total: Number(r.total), change: r.change }); setCart([]); setWho(null); setTip(''); setTender('');
    });
  };
  return (
    <ToolPage title={t('Register')} right="dots" rightLabel={t('Custom item')} onRight={() => { setCn(''); setCp(''); setCustom(true); }} foot={false}>
      <State loading={pd.loading && !pd.data} error={!pd.data ? pd.error : null} onRetry={pd.reload} />
      {pd.data ? (
        <>
          <Search value={q} onChange={setQ} placeholder={t('Search products or SKU')} />
          <Chips<string> value={cat} onChange={setCat} items={[['', t('All')], ...(pd.data.categories || []).map((c) => [c, c] as [string, string])]} />
          {shown.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {shown.slice(0, 120).map((p) => {
                const n = count(p.id);
                return (
                  <Pressable key={p.id} onPress={() => add(p)} accessibilityRole="button" accessibilityLabel={`${p.name}, ${money(p.price, 2)}`}
                    style={({ pressed }) => ({ width: (Math.min(width, 760) - 32 - (cols - 1) * 10) / cols, minHeight: 92, borderRadius: 20, padding: 12, justifyContent: 'space-between', opacity: pressed ? 0.75 : 1,
                      backgroundColor: n ? '#1B2A8C' : V.surf, borderWidth: 1, borderColor: n ? '#4A63FF' : V.line })}>
                    <Text style={{ color: V.ink, fontSize: 13.5, fontWeight: '600' }} numberOfLines={2}>{p.name}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[FH, { color: V.ink, fontSize: 14 }]}>{money(p.price, 2)}</Text>
                      {n ? <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><Text style={{ color: V.navy, fontWeight: '800', fontSize: 12 }}>{n}</Text></View> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : <None icon="box" title={t('No products here')} sub={t('Add products on the Products screen, or tap ··· for a custom item.')} />}
          <Card title={t('Cart')} right={cart.length ? t('Clear') : undefined} onRight={() => setCart([])}>
            <Item left={undefined} title={who ? who.name : t('Walk-in customer')} sub={who ? t('Tap to change') : t('Tap to pick a customer')} onPress={() => setPickC(true)} />
            {cart.map((l) => (
              <View key={l.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
                <View style={{ flex: 1 }}><Text style={{ color: V.ink, fontSize: 14.5, fontWeight: '600' }} numberOfLines={1}>{l.name}</Text><Text style={{ color: V.mute, fontSize: 12.5 }}>{money(l.price, 2)}</Text></View>
                <Pressable onPress={() => bump(l.key, -1)} accessibilityRole="button" accessibilityLabel={t('One less {n}', { n: l.name })} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: V.surf2, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 18 }}>−</Text></Pressable>
                <Text style={[FH, { color: V.ink, minWidth: 22, textAlign: 'center' }]}>{l.qty}</Text>
                <Pressable onPress={() => bump(l.key, 1)} accessibilityRole="button" accessibilityLabel={t('One more {n}', { n: l.name })} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: V.surf2, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 18 }}>+</Text></Pressable>
              </View>
            ))}
          </Card>
          <Btn text={cart.length ? t('Charge {m} + tax', { m: money(sub, 2) }) : t('Tap products to start')} icon="cash" disabled={!cart.length} onPress={() => { setErr(''); setPay(true); }} />
        </>
      ) : null}

      <Sheet open={pickC} title={t('Customer')} onClose={() => setPickC(false)}>
        <Item title={t('Walk-in customer')} onPress={() => { setWho(null); setPickC(false); }} />
        {(cd.data?.customers || []).slice(0, 200).map((c) => <Item key={c.id} title={c.name} onPress={() => { setWho(c); setPickC(false); }} />)}
      </Sheet>
      <Sheet open={custom} title={t('Custom item')} onClose={() => setCustom(false)}>
        <In label={t('What is it')} value={cn} onChangeText={setCn} />
        <In label={t('Price')} value={cp} onChangeText={setCp} keyboardType="decimal-pad" placeholder="0.00" />
        <Btn text={t('Add to cart')} icon="plus" disabled={!cn.trim() || !(Number(cp.replace(',', '.')) >= 0) || cp.trim() === ''}
          onPress={() => { setCart((c) => [...c, { key: 'c' + Date.now(), name: cn.trim(), price: Number(cp.replace(',', '.')), qty: 1 }]); setCustom(false); }} />
      </Sheet>
      <Sheet open={pay} title={t('Take payment')} onClose={() => setPay(false)}>
        <Text style={[FH, { color: V.ink, fontSize: 30, textAlign: 'center' }]}>{money(sub, 2)}</Text>
        <Text style={{ color: V.mute, fontSize: 13, textAlign: 'center', marginTop: -8 }}>{t('Before tax. Tax is added for you.')}</Text>
        <Pick<Pay> label={t('How they pay')} value={method} onChange={setMethod} items={[['card', t('Card (on your terminal)')], ['cash', t('Cash')], ['other', t('Other')]]} />
        {method === 'cash' ? <In label={t('Cash given (optional)')} value={tender} onChangeText={setTender} keyboardType="decimal-pad" placeholder="0.00" error={err || undefined} /> : null}
        <In label={t('Tip (optional)')} value={tip} onChangeText={setTip} keyboardType="decimal-pad" placeholder="0.00" />
        <Btn text={t('Finish sale')} icon="check" onPress={charge} busy={busy === 'pay'} />
      </Sheet>
      <Sheet open={!!done} title={t('Sale done')} onClose={() => setDone(null)}>
        {done ? (
          <>
            <Text style={[FH, { color: '#9CF0C0', fontSize: 30, textAlign: 'center' }]}>{money(done.total, 2)}</Text>
            <View style={{ alignItems: 'center' }}><Tag text={t('Sale #{n}', { n: done.number })} tone="good" /></View>
            {done.change != null ? <Text style={[FH, { color: V.ink, fontSize: 20, textAlign: 'center' }]}>{t('Change: {m}', { m: money(done.change, 2) })}</Text> : null}
            <Btn text={t('Next sale')} icon="plus" onPress={() => setDone(null)} />
            <Btn text={t('See receipt')} icon="doc" kind="dark" onPress={() => { const id = done.id; setDone(null); router.push(`/sales/${id}`); }} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
