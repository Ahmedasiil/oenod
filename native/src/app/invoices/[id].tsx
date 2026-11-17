// One invoice or quote, built into the app: amount, customer, lines, payments, and every action
// (send, remind, record a payment, share the pay link, duplicate, turn a quote into an invoice, edit a draft, void).
import React, { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date, money } from '../../lib/format';
import { t } from '../../lib/i18n';
import { FH, V } from '../../ui/M6';
import { Actions, Btn, Card, Dot, Hero, In, Item, Pick, Sheet, State, Tag, ToolPage, isYmd, oops, sure, useBusy, ymd } from '../../ui/T1';
import { invState, type Inv } from '../../lib/inv';

type Line = { id: number; description: string; qty: number; unit_price: number; line_total: number; taxable: number };
type Pay = { id: number; amount: number; method: string; reference: string | null; paid_at: string };
type Full = Inv & { items: Line[]; payments: Pay[]; public_url: string; subtotal: number; tax: number; discount: number; notes: string | null; customer_id: number;
  customer_address?: string | null; company?: { name: string; currency?: string }; converted?: { id: number; number: string } | null };
type M = 'card' | 'cash' | 'bank' | 'cheque' | 'other';

export default function InvoiceView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => get<Full>(`/api/invoices/${Number(id)}`), [id]);
  const { busy, run } = useBusy();
  const [pay, setPay] = useState(false);
  const [amt, setAmt] = useState('');
  const [method, setMethod] = useState<M>('card');
  const [ref, setRef] = useState('');
  const [on, setOn] = useState(ymd());
  const [err, setErr] = useState('');
  const i = d.data;
  const quote = i?.kind === 'quote';
  const unpaid = !!i && i.kind === 'invoice' && i.status === 'sent' && Number(i.balance ?? i.total - i.amount_paid) > 0;
  const balance = i ? Math.round((Number(i.total) - Number(i.amount_paid)) * 100) / 100 : 0;
  const share = () => i && Share.share({ message: `${quote ? t('Quote') : t('Invoice')} ${i.number} · ${money(quote ? i.total : balance, 2)}\n${i.public_url}`, url: i.public_url })
    .catch(() => { (globalThis as any).navigator?.clipboard?.writeText?.(i.public_url)?.catch?.(() => {}); oops(t('Pay link: {u}', { u: i.public_url })); });
  const send = () => i && sure(quote ? t('Email this quote?') : t('Email this invoice?'), i.customer_email ? t('It goes to {e} with a link to view and pay.', { e: i.customer_email }) : t('Add an email to this customer first.'),
    t('Send'), () => run('send', async () => { await post(`/api/invoices/${i.id}/send`, {}); d.reload(); }));
  const remind = () => i && sure(t('Send a friendly reminder?'), t('{c} gets a short note with the pay link.', { c: i.customer || '' }), t('Send reminder'),
    () => run('remind', async () => { await post(`/api/invoices/${i.id}/remind`, {}); d.reload(); }));
  const dup = () => i && run('dup', async () => { const r = await post<{ id: number }>(`/api/invoices/${i.id}/duplicate`, {}); router.replace(`/invoices/${r.id}`); });
  const convert = () => i && sure(t('Turn this quote into an invoice?'), t('The quote stays on file, marked converted.'), t('Make invoice'),
    () => run('conv', async () => { const r = await post<{ id: number }>(`/api/invoices/${i.id}/convert`, {}); router.replace(`/invoices/${r.id}`); }));
  const voidIt = () => i && sure(t('Void {n}?', { n: i.number }), t('It stays in your records, marked void, and can no longer be paid.'), t('Void'),
    () => run('void', async () => { await post(`/api/invoices/${i.id}/void`, {}); d.reload(); }), true);
  const openPay = () => { setAmt(balance.toFixed(2)); setMethod('card'); setRef(''); setOn(ymd()); setErr(''); setPay(true); };
  const savePay = () => {
    const a = Number(amt.replace(',', '.'));
    if (!(a > 0)) return setErr(t('Type the amount you received.'));
    if (a > balance + 0.001) return setErr(t('That is more than the balance ({m}).', { m: money(balance, 2) }));
    if (!isYmd(on)) return setErr(t('Use a date like {d}.', { d: ymd() }));
    run('pay', async () => { await post(`/api/invoices/${i!.id}/payments`, { amount: a, method, reference: ref.trim(), paid_at: on }); setPay(false); d.reload(); });
  };
  const [st, tone] = i ? invState(i) : ['', 'plain' as const];
  return (
    <ToolPage title={i ? i.number : quote ? t('Quote') : t('Invoice')} right="link" rightLabel={t('Share the link')} onRight={share} refreshing={d.refreshing} onRefresh={d.refresh}>
      <State loading={d.loading && !i} error={!i ? d.error : null} onRetry={d.reload} />
      {i ? (
        <>
          <Hero id="ivd" label={i.customer || t('No customer')} value={money(i.status === 'sent' ? balance : i.total, 2)}
            note={i.status === 'paid' ? t('Paid in full') : quote ? t('Quote total') : i.status === 'sent' ? t('Balance due {d}', { d: date(i.due_date) }) : t('Total')} noteGood={!i.overdue}
            stats={[[t('Issued'), date(i.issue_date).replace(/,? \d{4}$/, '')], [t('Due'), date(i.due_date).replace(/,? \d{4}$/, '')], [t('Paid'), money(i.amount_paid, 2)]]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Tag text={st} tone={tone} />{i.recurring ? <Tag text={t('Repeats {r}', { r: t(i.recurring) })} tone="info" /> : null}</View>
          <Actions items={[
            { icon: 'send', label: i.status === 'draft' ? t('Send') : t('Send again'), go: send, off: i.status === 'void' },
            { icon: 'cash', label: t('Got paid'), go: openPay, off: !unpaid && !(i.status === 'draft' && !quote) },
            { icon: 'bell', label: t('Remind'), go: remind, off: !unpaid },
            { icon: 'link', label: t('Share'), go: share },
          ]} />
          <Card title={t('What it is for')}>
            {i.items.map((l) => (
              <Item key={l.id} title={l.description} sub={`${Number(l.qty)} × ${money(l.unit_price, 2)}${Number(l.taxable) ? ' · ' + t('taxed') : ''}`} right={money(l.line_total, 2)} />
            ))}
            {Number(i.discount) > 0 ? <Item title={t('Discount')} right={'−' + money(i.discount, 2)} /> : null}
            <Item title={t('Tax')} right={money(i.tax, 2)} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 }}>
              <Text style={[FH, { color: V.ink, fontSize: 17 }]}>{t('Total')}</Text>
              <Text style={[FH, { color: V.ink, fontSize: 17 }]}>{money(i.total, 2)}</Text>
            </View>
          </Card>
          {i.payments?.length ? (
            <Card title={t('Payments')}>
              {i.payments.map((p) => <Item key={p.id} left={<Dot icon="check" tone="good" />} title={money(p.amount, 2)} sub={[t(p.method === 'oenod_pay' ? 'OENOD Pay' : p.method), p.reference].filter(Boolean).join(' · ')} rightSub={date(String(p.paid_at).slice(0, 10))} />)}
            </Card>
          ) : null}
          <Card title={t('Customer')} right={t('Open')} onRight={() => router.push(`/customers/${i.customer_id}`)}>
            <Item left={<Dot icon="user" />} title={i.customer || '—'} sub={[i.customer_email, i.customer_address].filter(Boolean).join(' · ') || t('No email yet')} onPress={() => router.push(`/customers/${i.customer_id}`)} />
          </Card>
          {i.notes ? <Card title={t('Note to customer')}><Text style={{ color: V.mute, fontSize: 14, paddingVertical: 10, lineHeight: 20 }}>{i.notes}</Text></Card> : null}
          <View style={{ gap: 10 }}>
            {quote && i.status !== 'draft' && i.quote_status !== 'converted' ? <Btn text={t('Turn into an invoice')} icon="doc" onPress={convert} busy={busy === 'conv'} /> : null}
            {i.status === 'draft' ? <Btn text={t('Edit draft')} icon="doc" kind="dark" onPress={() => router.push({ pathname: '/invoices/new', params: { id: String(i.id) } })} /> : null}
            <Btn text={t('Duplicate')} icon="plus" kind="dark" onPress={dup} busy={busy === 'dup'} />
            {i.status !== 'void' && i.status !== 'paid' ? <Btn text={quote ? t('Void quote') : t('Void invoice')} icon="x" kind="dark" onPress={voidIt} busy={busy === 'void'} /> : null}
          </View>
        </>
      ) : null}
      <Sheet open={pay} title={t('Record a payment')} onClose={() => setPay(false)}>
        <In label={t('Amount received')} value={amt} onChangeText={setAmt} keyboardType="decimal-pad" error={err || undefined} />
        <Pick<M> label={t('How they paid')} value={method} onChange={setMethod} items={[['card', t('Card')], ['cash', t('Cash')], ['bank', t('Bank transfer')], ['cheque', t('Cheque')], ['other', t('Other')]]} />
        <In label={t('Date')} value={on} onChangeText={setOn} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        <In label={t('Reference (optional)')} value={ref} onChangeText={setRef} placeholder={t('Cheque number, e-transfer note…')} />
        <Btn text={t('Save payment')} icon="check" onPress={savePay} busy={busy === 'pay'} />
      </Sheet>
    </ToolPage>
  );
}
