// Expenses, built into the app: snap a receipt with the camera (Ava reads it), check it, send it.
// Managers approve or reject right here. Shows this month's spending, what waits for approval and who is owed money.
import React, { useMemo, useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date, money } from '../lib/format';
import { t } from '../lib/i18n';
import { Icon } from '../ui/Icon';
import { FH, V } from '../ui/M6';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Search, Sheet, State, Tag, ToolPage, isYmd, oops, sure, useBusy, ymd } from '../ui/T1';

type Ex = { id: number; who: string | null; kind: string; spent_on: string; merchant: string | null; category: string | null; amount: number; tax: number; method: string; note: string | null;
  file_id: number | null; status: string; flags: [string, string, string][]; clean: boolean; mine: boolean; decided_note?: string | null; km?: number | null };
type Home = { mgr: boolean; month: number; prev: number; tax_back: number; waiting: { count: number; amount: number }; queue: number; owed: { people: number; amount: number }; categories: string[]; can_scan?: boolean };
type F = 'all' | 'waiting' | 'mine' | 'approved' | 'rejected';
type Meth = 'personal' | 'company_card' | 'cash';
type Draft = { merchant: string; amount: string; tax: string; spent_on: string; category: string; method: Meth; note: string; file_id: number | null; receipt_id: number | null; photo: string | null };
const empty = (mgr: boolean): Draft => ({ merchant: '', amount: '', tax: '', spent_on: ymd(), category: 'Other', method: mgr ? 'company_card' : 'personal', note: '', file_id: null, receipt_id: null, photo: null });
const stTone = (s: string) => (s === 'approved' || s === 'paid' ? 'good' : s === 'rejected' ? 'bad' : s === 'submitted' ? 'warn' : 'plain') as 'good' | 'bad' | 'warn' | 'plain';
const stText = (s: string) => ({ submitted: t('Waiting'), approved: t('Approved'), paid: t('Paid back'), rejected: t('Rejected'), draft: t('Draft') } as Record<string, string>)[s] || s;
const num = (s: string) => Number(String(s).replace(',', '.')) || 0;

export default function Expenses() {
  const h = useLoad(() => get<Home>('/api/exp5'));
  const l = useLoad(() => get<{ rows: Ex[] }>('/api/exp5/list'));
  const mgr = !!h.data?.mgr;
  const ap = useLoad(() => (mgr ? get<{ rows: Ex[] }>('/api/exp5/approvals') : Promise.resolve({ rows: [] as Ex[] })), [mgr]);
  const [f, setF] = useState<F>('all');
  const [q, setQ] = useState('');
  const [cam, setCam] = useState(false);
  const [perm, askPerm] = useCameraPermissions();
  const camRef = useRef<any>(null);
  const [form, setForm] = useState<Draft | null>(null);
  const [aiMsg, setAiMsg] = useState('');
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<Ex | null>(null);
  const [why, setWhy] = useState('');
  const { busy, run } = useBusy();
  const reload = () => { h.reload(); l.reload(); ap.reload(); };
  const rows = l.data?.rows || [];
  const queue = ap.data?.rows || [];
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const src = f === 'waiting' && mgr ? queue : rows;
    return src.filter((x) => (f === 'all' || f === 'waiting' ? (f === 'all' || x.status === 'submitted') : f === 'mine' ? x.mine : x.status === f))
      .filter((x) => !s || `${x.merchant || ''} ${x.who || ''} ${x.category || ''} ${x.amount}`.toLowerCase().includes(s));
  }, [rows, queue, f, q, mgr]);
  const cats = h.data?.categories?.length ? h.data.categories : ['Supplies', 'Meals', 'Travel', 'Fuel', 'Repairs', 'Software', 'Equipment', 'Marketing', 'Utilities', 'Rent', 'Inventory', 'Other'];

  const startSnap = async () => {
    if (!perm?.granted) { const p = await askPerm(); if (!p.granted) { setForm(empty(mgr)); setAiMsg(t('Camera is off for OENOD. Type the receipt in, or turn the camera on in Settings.')); return; } }
    setCam(true);
  };
  const snap = async () => {
    const c = camRef.current; if (!c) return;
    const ph = await c.takePictureAsync({ base64: true, quality: 0.55, skipProcessing: true }).catch(oops);
    if (!ph?.base64) return;
    setCam(false);
    const d0 = { ...empty(mgr), photo: ph.uri as string };
    setForm(d0); setAiMsg(t('Ava is reading your receipt…'));
    run('scan', async () => {
      const r = await post<any>('/api/ox/receipts/scan', { name: 'receipt.jpg', data: 'data:image/jpeg;base64,' + ph.base64 });
      const x = r.draft || {};
      setForm({ ...d0, merchant: x.merchant || '', amount: x.amount != null ? String(x.amount) : '', tax: x.tax != null ? String(x.tax) : '', spent_on: x.spent_on || x.date || ymd(),
        category: cats.includes(x.category) ? x.category : 'Other', method: (['personal', 'company_card', 'cash'].includes(x.method) ? x.method : d0.method) as Meth, note: x.note || '', file_id: r.file?.id || null, receipt_id: r.id || null });
      setAiMsg(r.duplicate ? t('Careful: this looks like a receipt you already sent ({m} on {d}).', { m: r.duplicate.merchant || '', d: r.duplicate.spent_on || '' }) : r.ai ? t('Ava filled this in. Check it, then send.') : (r.ai_message || t('Fill in the details below.')));
    });
  };
  const send = (draft: boolean) => {
    if (!form) return;
    if (!form.merchant.trim()) return setErr(t('Where did you spend it?'));
    if (!(num(form.amount) > 0)) return setErr(t('Type the total you paid.'));
    if (num(form.tax) > num(form.amount)) return setErr(t('Tax cannot be more than the total.'));
    if (!isYmd(form.spent_on) || form.spent_on > ymd()) return setErr(t('Use a date like {d}, not in the future.', { d: ymd() }));
    setErr('');
    run(draft ? 'draft' : 'send', async () => {
      await post('/api/exp5/item', { kind: 'receipt', merchant: form.merchant.trim(), amount: num(form.amount), tax: num(form.tax), spent_on: form.spent_on, category: form.category, method: form.method, note: form.note.trim() || null, file_id: form.file_id, receipt_id: form.receipt_id, draft });
      setForm(null); reload();
    });
  };
  const decide = (x: Ex, action: 'approve' | 'reject') => {
    if (action === 'reject' && !why.trim()) return setErr(t('Say why, so they can fix it.'));
    run(action, async () => {
      const r = await post<any>('/api/exp5/decide', { action, ids: [x.id], note: why.trim() || null });
      if (r?.skipped?.length) oops(r.skipped[0].why);
      setOpen(null); setWhy(''); setErr(''); reload();
    });
  };
  const hx = h.data;
  return (
    <ToolPage title={t('Expenses')} right="scan" rightLabel={t('Snap a receipt')} onRight={startSnap} refreshing={h.refreshing || l.refreshing} onRefresh={() => { h.refresh(); l.refresh(); ap.refresh(); }}>
      {hx ? <Hero id="exh" label={t('Spent this month')} value={money(hx.month, 2)}
        note={hx.prev > 0 ? t('{p}% vs last month', { p: (hx.month >= hx.prev ? '+' : '') + Math.round(((hx.month - hx.prev) / hx.prev) * 100) }) : t('Approved and paid')} noteGood={!(hx.month > hx.prev)}
        stats={[[t('Waiting'), String(mgr ? hx.queue : hx.waiting.count)], [t('Tax back'), money(hx.tax_back)], [mgr ? t('To pay back') : t('Owed to you'), money(hx.owed.amount)]]} /> : null}
      <State loading={(h.loading && !hx) || (l.loading && !l.data)} error={!hx ? h.error : !l.data ? l.error : null} onRetry={reload} />
      {hx && l.data ? (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Btn text={t('Snap a receipt')} icon="scan" onPress={startSnap} /></View>
            <View style={{ flex: 1 }}><Btn text={t('Type it in')} icon="plus" kind="dark" onPress={() => { setAiMsg(''); setErr(''); setForm(empty(mgr)); }} /></View>
          </View>
          {mgr && queue.length ? (
            <Card title={t('Needs your OK')} right={t('{n} waiting', { n: queue.length })} onRight={() => setF('waiting')}>
              {queue.slice(0, 4).map((x) => (
                <Item key={x.id} left={<Dot icon="clock" tone="warn" />} title={`${x.merchant || t('Expense')} · ${money(x.amount, 2)}`} sub={[x.who, date(x.spent_on), x.category].filter(Boolean).join(' · ')}
                  rightSub={<Tag text={t('Review')} tone="warn" />} onPress={() => { setWhy(''); setErr(''); setOpen(x); }} />
              ))}
            </Card>
          ) : null}
          <Search value={q} onChange={setQ} placeholder={t('Search store, person or amount')} />
          <Chips<F> value={f} onChange={setF} items={[['all', t('All'), rows.length], ['waiting', t('Waiting'), mgr ? queue.length : rows.filter((x) => x.status === 'submitted').length], ...(mgr ? [['mine', t('Mine')] as [F, string]] : []), ['approved', t('Approved')], ['rejected', t('Rejected')]]} />
          <Card>
            {list.length ? list.slice(0, 300).map((x) => (
              <Item key={x.id} onPress={() => { setWhy(''); setErr(''); setOpen(x); }} left={<Dot icon={x.kind === 'mileage' ? 'pin' : x.file_id ? 'doc' : 'cash'} tone={x.clean ? 'dk' : 'warn'} />}
                title={x.merchant || (x.kind === 'mileage' ? t('Mileage') : t('Expense'))} sub={[mgr ? x.who : null, date(x.spent_on), x.category].filter(Boolean).join(' · ')}
                right={money(x.amount, 2)} rightSub={<Tag text={stText(x.status)} tone={stTone(x.status)} />} />
            )) : <None icon="cash" title={t('Nothing here yet')} sub={t('Snap your first receipt. Ava reads it for you.')} />}
          </Card>
        </>
      ) : null}

      <Sheet open={cam} title={t('Snap a receipt')} onClose={() => setCam(false)}>
        <View style={{ borderRadius: 24, overflow: 'hidden', aspectRatio: 3 / 4, backgroundColor: '#000' }}>
          {cam ? <CameraView ref={camRef} style={{ flex: 1 }} facing="back" /> : null}
        </View>
        <Text style={{ color: V.mute, fontSize: 13, textAlign: 'center' }}>{t('Fit the whole receipt in the frame, then tap the button.')}</Text>
        <Pressable onPress={snap} accessibilityRole="button" accessibilityLabel={t('Take photo')} style={{ alignSelf: 'center', width: 76, height: 76, borderRadius: 38, borderWidth: 5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' }} />
        </Pressable>
      </Sheet>

      <Sheet open={!!form} title={t('Expense')} onClose={() => setForm(null)}>
        {form ? (
          <>
            {form.photo ? <Image source={{ uri: form.photo }} style={{ width: '100%', height: 160, borderRadius: 18 }} resizeMode="cover" accessibilityLabel={t('Receipt photo')} /> : null}
            {aiMsg ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: 'rgba(74,99,255,0.16)' }}>
                <Icon name="spark" size={16} color="#AFC0FF" duo={false} /><Text style={{ color: '#DCE3FF', fontSize: 13, flex: 1 }}>{aiMsg}</Text>
              </View>
            ) : null}
            <In label={t('Store or company')} value={form.merchant} onChangeText={(v) => setForm({ ...form, merchant: v })} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <In style={{ flex: 1.3 }} label={t('Total paid')} value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} keyboardType="decimal-pad" placeholder="0.00" />
              <In style={{ flex: 1 }} label={t('Tax in it')} value={form.tax} onChangeText={(v) => setForm({ ...form, tax: v })} keyboardType="decimal-pad" placeholder="0.00" />
            </View>
            <In label={t('Date')} value={form.spent_on} onChangeText={(v) => setForm({ ...form, spent_on: v })} placeholder="YYYY-MM-DD" autoCapitalize="none" />
            <Pick<string> label={t('Category')} value={form.category} onChange={(v) => setForm({ ...form, category: v })} items={cats.filter((c) => c !== 'Mileage' && c !== 'Per diem').map((c) => [c, t(c)] as [string, string])} />
            <Pick<Meth> label={t('Paid with')} value={form.method} onChange={(v) => setForm({ ...form, method: v })} items={[['personal', t('My own money')], ['company_card', t('Company card')], ['cash', t('Company cash')]]} />
            <In label={t('Note (optional)')} value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} placeholder={t('What was it for?')} />
            {err ? <Text style={{ color: '#FF8A96', fontSize: 13 }}>{err}</Text> : null}
            <Btn text={t('Send for approval')} icon="send" onPress={() => send(false)} busy={busy === 'send' || busy === 'scan'} />
            <Btn text={t('Save as draft')} kind="dark" onPress={() => send(true)} busy={busy === 'draft'} disabled={busy === 'scan'} />
          </>
        ) : null}
      </Sheet>

      <Sheet open={!!open} title={open?.merchant || t('Expense')} onClose={() => setOpen(null)}>
        {open ? (
          <>
            <Text style={[FH, { color: '#FFFFFF', fontSize: 30, textAlign: 'center' }]}>{money(open.amount, 2)}</Text>
            <View style={{ alignItems: 'center' }}><Tag text={stText(open.status)} tone={stTone(open.status)} /></View>
            <Card>
              <Item title={t('Who')} right={open.who || '—'} />
              <Item title={t('Date')} right={date(open.spent_on)} />
              <Item title={t('Category')} right={t(open.category || 'Other')} />
              <Item title={t('Tax')} right={money(open.tax, 2)} />
              <Item title={t('Paid with')} right={({ personal: t('Own money'), company_card: t('Company card'), cash: t('Cash') } as Record<string, string>)[open.method] || open.method} />
              <Item title={t('Receipt')} right={open.file_id ? t('Attached') : t('None')} />
            </Card>
            {open.flags?.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{open.flags.map((fl) => <Tag key={fl[0]} text={t(fl[1])} tone={fl[2] === 'bad' ? 'bad' : 'warn'} />)}</View> : null}
            {open.note ? <Text style={{ color: V.mute, fontSize: 14 }}>{open.note}</Text> : null}
            {open.decided_note ? <Text style={{ color: '#FF8A96', fontSize: 14 }}>{open.decided_note}</Text> : null}
            {mgr && open.status === 'submitted' && !open.mine ? (
              <>
                <In label={t('Note (needed to reject)')} value={why} onChangeText={setWhy} placeholder={t('Why, or a question')} error={err || undefined} />
                <Btn text={t('Approve')} icon="check" onPress={() => decide(open, 'approve')} busy={busy === 'approve'} />
                <Btn text={t('Reject')} icon="x" kind="dark" onPress={() => sure(t('Reject this expense?'), t('They get your note and can fix it.'), t('Reject'), () => decide(open, 'reject'), true)} busy={busy === 'reject'} />
              </>
            ) : null}
            {open.mine && open.status === 'draft' ? <Btn text={t('Send for approval')} icon="send" onPress={() => run('sub', async () => { await post(`/api/exp5/item/${open.id}/submit`, {}); setOpen(null); reload(); })} busy={busy === 'sub'} /> : null}
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
