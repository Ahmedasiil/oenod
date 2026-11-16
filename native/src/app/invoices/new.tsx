// New invoice or quote (or edit a draft), built into the app: pick the customer, add lines, dates, note,
// then Save draft or Save and send. Prices and products come from your OENOD product list.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { get, post, put } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { money } from '../../lib/format';
import { t } from '../../lib/i18n';
import { Icon } from '../../ui/Icon';
import { FH, V } from '../../ui/M6';
import { Btn, Card, Dot, In, Item, None, Pick, Search, Sheet, ToolPage, isYmd, oops, plusDays, ymd } from '../../ui/T1';

type Cu = { id: number; name: string; email: string | null; organization: string | null };
type Prod = { id: number; name: string; price: number; sku?: string | null };
type Line = { key: number; description: string; qty: string; unit_price: string; taxable: boolean; product_id?: number | null };
let k = 1;
const blank = (): Line => ({ key: k++, description: '', qty: '1', unit_price: '', taxable: true });
const num = (s: string) => Number(String(s).replace(',', '.')) || 0;

export default function NewInvoice() {
  const p = useLocalSearchParams<{ id?: string; customer?: string; kind?: string }>();
  const editId = p.id ? Number(p.id) : null;
  const cus = useLoad(() => get<{ customers: Cu[] }>('/api/customers'));
  const prods = useLoad(() => get<{ products: Prod[] }>('/api/products').catch(() => ({ products: [] as Prod[] })));
  const [kind, setKind] = useState<'invoice' | 'quote'>(p.kind === 'quote' ? 'quote' : 'invoice');
  const [cid, setCid] = useState<number | null>(p.customer ? Number(p.customer) : null);
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [issue, setIssue] = useState(ymd());
  const [due, setDue] = useState(plusDays(14));
  const [notes, setNotes] = useState('');
  const [pickC, setPickC] = useState(false);
  const [pickP, setPickP] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [newC, setNewC] = useState(false);
  const [nc, setNc] = useState({ name: '', email: '', phone: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});

  // Editing a draft: fill everything in from the saved invoice.
  useEffect(() => {
    if (!editId) return;
    get<any>(`/api/invoices/${editId}`).then((i) => {
      setKind(i.kind === 'quote' ? 'quote' : 'invoice'); setCid(Number(i.customer_id)); setIssue(i.issue_date); setDue(i.due_date); setNotes(i.notes || '');
      setLines((i.items || []).map((l: any) => ({ key: k++, description: l.description, qty: String(Number(l.qty)), unit_price: String(Number(l.unit_price)), taxable: !!Number(l.taxable), product_id: l.product_id || null })));
    }).catch(oops);
  }, [editId]);

  const customers = cus.data?.customers || [];
  const who = customers.find((c) => c.id === cid);
  const found = useMemo(() => { const s = q.trim().toLowerCase(); return customers.filter((c) => !s || `${c.name} ${c.email || ''} ${c.organization || ''}`.toLowerCase().includes(s)).slice(0, 60); }, [customers, q]);
  const products = (prods.data?.products || []).filter((x) => !q.trim() || x.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 60);
  const sub = lines.reduce((a, l) => a + num(l.qty) * num(l.unit_price), 0);
  const set = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const save = async (send: boolean) => {
    const e: Record<string, string> = {};
    if (!cid) e.customer = t('Pick who this is for.');
    const good = lines.filter((l) => l.description.trim());
    if (!good.length) e.lines = t('Add at least one line.');
    if (good.some((l) => !(num(l.qty) > 0) || l.unit_price.trim() === '')) e.lines = t('Every line needs a quantity and a price.');
    if (!isYmd(issue)) e.issue = t('Use a date like {d}.', { d: ymd() });
    if (!isYmd(due)) e.due = t('Use a date like {d}.', { d: ymd() });
    else if (isYmd(issue) && due < issue) e.due = t('The due date must be on or after the issue date.');
    if (send && who && !who.email) e.customer = t('Add an email to this customer first, or save it as a draft.');
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(send ? 'send' : 'save');
    try {
      const body = { kind, customer_id: cid, issue_date: issue, due_date: due, notes: notes.trim(), items: good.map((l) => ({ description: l.description.trim(), qty: num(l.qty), unit_price: num(l.unit_price), taxable: l.taxable, product_id: l.product_id || null })) };
      const r = editId ? await put<{ id: number }>(`/api/invoices/${editId}`, body) : await post<{ id: number }>('/api/invoices', body);
      const id = editId || r.id;
      if (send) await post(`/api/invoices/${id}/send`, {});
      router.replace(`/invoices/${id}`);
    } catch (x) { oops(x); } finally { setBusy(null); }
  };
  const addCustomer = async () => {
    if (!nc.name.trim()) return setErr({ nc: t('Type a name.') });
    setBusy('nc');
    try {
      const r = await post<{ id: number }>('/api/customers', { name: nc.name.trim(), email: nc.email.trim() || null, phone: nc.phone.trim() || null });
      await cus.reload(); setCid(r.id); setNewC(false); setPickC(false); setNc({ name: '', email: '', phone: '' }); setErr({});
    } catch (x) { oops(x); } finally { setBusy(null); }
  };

  return (
    <ToolPage title={editId ? t('Edit draft') : kind === 'quote' ? t('New quote') : t('New invoice')} foot={false}>
      {!editId ? <Pick<'invoice' | 'quote'> label={t('What are you sending?')} value={kind} onChange={setKind} items={[['invoice', t('Invoice')], ['quote', t('Quote')]]} /> : null}
      <Card title={t('Who is it for?')}>
        <Item left={<Dot icon="user" tone={who ? 'nv' : 'dk'} />} title={who ? who.name : t('Pick a customer')} sub={who ? who.email || t('No email yet') : t('Search or add a new one')}
          rightSub={<Icon name="chevron" size={16} color={V.mute} duo={false} />} onPress={() => { setQ(''); setPickC(true); }} />
      </Card>
      {err.customer ? <Text style={{ color: '#FF8A96', fontSize: 12.5, marginTop: -8 }}>{err.customer}</Text> : null}

      <Card title={t('Lines')} right={t('From products')} onRight={() => { setQ(''); setPickP(lines[lines.length - 1]?.description ? -1 : lines[lines.length - 1].key); }}>
        {lines.map((l, n) => (
          <View key={l.key} style={{ paddingVertical: 12, gap: 10 }}>
            <In label={t('Line {n}', { n: n + 1 })} value={l.description} onChangeText={(v) => set(l.key, { description: v })} placeholder={t('What you did or sold')} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <In style={{ flex: 1 }} label={t('Qty')} value={l.qty} onChangeText={(v) => set(l.key, { qty: v })} keyboardType="decimal-pad" />
              <In style={{ flex: 1.4 }} label={t('Price each')} value={l.unit_price} onChangeText={(v) => set(l.key, { unit_price: v })} keyboardType="decimal-pad" placeholder="0.00" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable onPress={() => set(l.key, { taxable: !l.taxable })} accessibilityRole="checkbox" accessibilityState={{ checked: l.taxable }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} hitSlop={6}>
                <View style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: l.taxable ? '#FFFFFF' : 'transparent', borderWidth: 2, borderColor: l.taxable ? '#FFFFFF' : '#3A3D4A' }}>
                  {l.taxable ? <Icon name="check" size={13} color={V.navy} stroke={3} duo={false} /> : null}
                </View>
                <Text style={{ color: '#FFFFFF', fontSize: 13.5 }}>{t('Add tax')}</Text>
              </Pressable>
              <Text style={[FH, { color: '#FFFFFF', fontSize: 15 }]}>{money(num(l.qty) * num(l.unit_price), 2)}</Text>
              {lines.length > 1 ? <Pressable onPress={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} accessibilityRole="button" accessibilityLabel={t('Remove line {n}', { n: n + 1 })} hitSlop={8}><Text style={{ color: '#FF8A96', fontSize: 13, fontWeight: '600' }}>{t('Remove')}</Text></Pressable> : null}
            </View>
          </View>
        ))}
        <Pressable onPress={() => setLines((ls) => [...ls, blank()])} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 }}>
          <Icon name="plus" size={16} color="#AFC0FF" duo={false} /><Text style={{ color: '#AFC0FF', fontSize: 14, fontWeight: '600' }}>{t('Add a line')}</Text>
        </Pressable>
      </Card>
      {err.lines ? <Text style={{ color: '#FF8A96', fontSize: 12.5, marginTop: -8 }}>{err.lines}</Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <Text style={{ color: V.mute, fontSize: 13.5 }}>{t('Before tax')}</Text>
        <Text style={[FH, { color: '#FFFFFF', fontSize: 18 }]}>{money(sub, 2)}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <In style={{ flex: 1 }} label={t('Issue date')} value={issue} onChangeText={setIssue} placeholder="YYYY-MM-DD" autoCapitalize="none" error={err.issue} />
        <In style={{ flex: 1 }} label={kind === 'quote' ? t('Valid until') : t('Due date')} value={due} onChangeText={setDue} placeholder="YYYY-MM-DD" autoCapitalize="none" error={err.due} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[[t('Due now'), 0], [t('7 days'), 7], [t('14 days'), 14], [t('30 days'), 30]].map(([l, n]) => (
          <Pressable key={String(n)} onPress={() => setDue(plusDays(Number(n)))} accessibilityRole="button" style={{ flex: 1, paddingVertical: 8, borderRadius: 99, alignItems: 'center', backgroundColor: V.surf2 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '600' }}>{String(l)}</Text>
          </Pressable>
        ))}
      </View>
      <In label={t('Note to customer (optional)')} value={notes} onChangeText={setNotes} multiline placeholder={t('Thank you for your business!')} style={{ minHeight: 90 } as any} />
      <Btn text={kind === 'quote' ? t('Save and send quote') : t('Save and send')} icon="send" onPress={() => save(true)} busy={busy === 'send'} disabled={!!busy && busy !== 'send'} />
      <Btn text={t('Save as draft')} kind="dark" onPress={() => save(false)} busy={busy === 'save'} disabled={!!busy && busy !== 'save'} />

      <Sheet open={pickC} title={newC ? t('New customer') : t('Pick a customer')} onClose={() => { setPickC(false); setNewC(false); }}>
        {newC ? (
          <>
            <In label={t('Name')} value={nc.name} onChangeText={(v) => setNc({ ...nc, name: v })} error={err.nc} autoFocus />
            <In label={t('Email (to send invoices)')} value={nc.email} onChangeText={(v) => setNc({ ...nc, email: v })} keyboardType="email-address" autoCapitalize="none" />
            <In label={t('Phone (optional)')} value={nc.phone} onChangeText={(v) => setNc({ ...nc, phone: v })} keyboardType="phone-pad" />
            <Btn text={t('Add customer')} icon="check" onPress={addCustomer} busy={busy === 'nc'} />
          </>
        ) : (
          <>
            <Search value={q} onChange={setQ} placeholder={t('Search customers')} />
            <Btn text={t('New customer')} icon="plus" kind="dark" onPress={() => { setNc({ name: q, email: '', phone: '' }); setNewC(true); }} />
            <Card>
              {found.length ? found.map((c) => <Item key={c.id} left={<Dot icon="user" tone={c.id === cid ? 'nv' : 'dk'} />} title={c.name} sub={c.email || c.organization || ''} onPress={() => { setCid(c.id); setPickC(false); }} />)
                : <None icon="users" title={t('No customers found')} sub={t('Add them as a new customer.')} />}
            </Card>
          </>
        )}
      </Sheet>
      <Sheet open={pickP !== null} title={t('Add from products')} onClose={() => setPickP(null)}>
        <Search value={q} onChange={setQ} placeholder={t('Search products')} />
        <Card>
          {products.length ? products.map((x) => (
            <Item key={x.id} left={<Dot icon="box" />} title={x.name} sub={x.sku || ''} right={money(x.price, 2)} onPress={() => {
              const row = { description: x.name, unit_price: String(Number(x.price)), qty: '1', product_id: x.id };
              if (pickP && pickP > 0) set(pickP, row); else setLines((ls) => [...ls, { ...blank(), ...row }]);
              setPickP(null);
            }} />
          )) : <None icon="box" title={t('No products found')} sub={t('Type the line yourself instead.')} />}
        </Card>
      </Sheet>
    </ToolPage>
  );
}
