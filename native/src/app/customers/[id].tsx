// One customer, built into the app: call, text, email, new invoice; what they spent, how often they come,
// what they owe, their invoices and history; edit their details.
import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { del, get, put } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date, money } from '../../lib/format';
import { t } from '../../lib/i18n';
import { Av, FH, V } from '../../ui/M6';
import { Actions, Btn, Card, Dot, Hero, In, Item, None, Sheet, State, Tag, ToolPage, sure, useBusy } from '../../ui/T1';

type C = { id: number; name: string; email: string | null; phone: string | null; organization: string | null; address: string | null; tags: string | null; notes: string | null;
  birthday?: string | null; source?: string | null; marketing_opt_out?: number; created_at?: string };
type X = { customer: C; segment: string; segment_label: string; stats: { lifetime: number; visits: number; avg_ticket: number; last: string | null; balance: number; overdue: number; points: number; every_days?: number | null };
  invoices: { id: number; number: string; total: number; amount_paid: number; status: string; due_date: string }[]; timeline: { kind: string; title: string; at: string; sub?: string | null; amount: number | null }[] };
const tone = (s: string) => (s === 'vip' ? 'info' : s === 'at_risk' ? 'warn' : s === 'lost' ? 'bad' : s === 'new' ? 'good' : 'plain') as 'info' | 'warn' | 'bad' | 'good' | 'plain';

/** Managers get the full picture (/360); everyone else gets the basic record. */
async function load(id: number): Promise<X> {
  try { return await get<X>(`/api/customers/${id}/360`); } catch (e: any) {
    if (e?.status && e.status !== 403) throw e;
    const c = await get<any>(`/api/customers/${id}`);
    return { customer: c, segment: '', segment_label: '', stats: { lifetime: 0, visits: (c.sales || []).length, avg_ticket: 0, last: c.sales?.[0]?.created_at || null, balance: 0, overdue: 0, points: Number(c.points || 0) },
      invoices: c.invoices || [], timeline: (c.sales || []).map((s: any) => ({ kind: 'sale', title: t('Sale {n}', { n: s.number }), at: s.created_at, amount: Number(s.total) })) };
  }
}

export default function Customer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => load(Number(id)), [id]);
  const { busy, run } = useBusy();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState<C | null>(null);
  const [err, setErr] = useState('');
  const x = d.data; const c = x?.customer;
  const tel = c?.phone ? c.phone.replace(/[^\d+]/g, '') : '';
  const openEdit = () => { if (c) { setF({ ...c }); setErr(''); setEdit(true); } };
  const save = () => {
    if (!f || !f.name.trim()) return setErr(t('Type a name.'));
    run('save', async () => {
      await put(`/api/customers/${f.id}`, { name: f.name.trim(), email: f.email?.trim() || null, phone: f.phone?.trim() || null, organization: f.organization?.trim() || null, address: f.address?.trim() || null,
        tags: f.tags?.trim() || null, notes: f.notes ?? null, birthday: f.birthday || null, source: f.source || null, marketing_opt_out: !!Number(f.marketing_opt_out || 0) });
      setEdit(false); d.reload();
    });
  };
  const remove = () => c && sure(t('Delete {n}?', { n: c.name }), t('Their past sales stay in your records without a name.'), t('Delete'),
    () => run('del', async () => { await del(`/api/customers/${c.id}`); router.back(); }), true);
  return (
    <ToolPage title={c?.name || t('Customer')} right="doc" rightLabel={t('Edit details')} onRight={openEdit} refreshing={d.refreshing} onRefresh={d.refresh}>
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x && c ? (
        <>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Av name={c.name} size={84} ring />
            <Text style={[FH, { color: '#FFFFFF', fontSize: 22 }]} numberOfLines={1}>{c.name}</Text>
            {c.organization ? <Text style={{ color: V.mute, fontSize: 13.5 }}>{c.organization}</Text> : null}
            {x.segment ? <View style={{ alignSelf: 'center' }}><Tag text={t(x.segment_label)} tone={tone(x.segment)} /></View> : null}
          </View>
          <Actions items={[
            { icon: 'phone', label: t('Call'), go: () => Linking.openURL(`tel:${tel}`), off: !tel },
            { icon: 'chat', label: t('Text'), go: () => Linking.openURL(`sms:${tel}`), off: !tel },
            { icon: 'mail', label: t('Email'), go: () => Linking.openURL(`mailto:${c.email}`), off: !c.email },
            { icon: 'doc', label: t('Invoice'), go: () => router.push({ pathname: '/invoices/new', params: { customer: String(c.id) } }) },
          ]} />
          <Hero id="cud" label={t('Spent with you')} value={money(x.stats.lifetime, 2)}
            note={x.stats.overdue > 0 ? t('{m} is late', { m: money(x.stats.overdue, 2) }) : x.stats.balance > 0 ? t('Owes {m}', { m: money(x.stats.balance, 2) }) : t('Nothing owed')} noteGood={!(x.stats.overdue > 0)}
            stats={[[t('Visits'), String(x.stats.visits)], [t('Average'), money(x.stats.avg_ticket)], [t('Last visit'), x.stats.last ? date(String(x.stats.last).slice(0, 10)).replace(/,? \d{4}$/, '') : '—']]} />
          <Card title={t('Details')}>
            <Item left={<Dot icon="mail" />} title={c.email || t('No email')} sub={t('Email')} onPress={c.email ? () => Linking.openURL(`mailto:${c.email}`) : openEdit} />
            <Item left={<Dot icon="phone" />} title={c.phone || t('No phone')} sub={t('Phone')} onPress={tel ? () => Linking.openURL(`tel:${tel}`) : openEdit} />
            <Item left={<Dot icon="pin" />} title={c.address || t('No address')} sub={t('Address')} onPress={openEdit} />
            {c.tags ? <Item left={<Dot icon="grid" />} title={c.tags} sub={t('Tags')} /> : null}
            {x.stats.points ? <Item left={<Dot icon="heart" />} title={String(x.stats.points)} sub={t('Loyalty points')} /> : null}
          </Card>
          {c.notes ? <Card title={t('Notes')}><Text style={{ color: V.mute, fontSize: 14, lineHeight: 20, paddingVertical: 10 }}>{c.notes}</Text></Card> : null}
          <Card title={t('Invoices')} right={t('New')} onRight={() => router.push({ pathname: '/invoices/new', params: { customer: String(c.id) } })}>
            {x.invoices.length ? x.invoices.slice(0, 20).map((i) => (
              <Item key={i.id} left={<Dot icon="doc" tone={i.status === 'paid' ? 'good' : 'dk'} />} title={i.number} sub={t('Due {d}', { d: date(i.due_date) })}
                right={money(i.total, 2)} rightSub={<Tag text={t(i.status === 'sent' ? (Number(i.amount_paid) > 0 ? 'Part paid' : 'Sent') : i.status.charAt(0).toUpperCase() + i.status.slice(1))} tone={i.status === 'paid' ? 'good' : i.status === 'sent' ? 'info' : 'plain'} />}
                onPress={() => router.push(`/invoices/${i.id}`)} />
            )) : <None icon="doc" title={t('No invoices yet')} />}
          </Card>
          {x.timeline.length ? (
            <Card title={t('History')}>
              {x.timeline.slice(0, 25).map((e, n) => <Item key={n} left={<Dot icon={e.kind === 'sale' ? 'cart' : e.kind === 'payment' ? 'cash' : e.kind === 'invoice' ? 'doc' : 'check'} />} title={e.title} sub={[date(String(e.at).slice(0, 10)), e.sub].filter(Boolean).join(' · ')} right={e.amount != null ? money(e.amount, 2) : undefined} />)}
            </Card>
          ) : null}
          <Btn text={t('Edit details')} icon="doc" kind="dark" onPress={openEdit} />
          <Btn text={t('Delete customer')} icon="x" kind="dark" onPress={remove} busy={busy === 'del'} />
        </>
      ) : null}
      <Sheet open={edit} title={t('Edit customer')} onClose={() => setEdit(false)}>
        {f ? (
          <>
            <In label={t('Name')} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} error={err || undefined} />
            <In label={t('Email')} value={f.email || ''} onChangeText={(v) => setF({ ...f, email: v })} keyboardType="email-address" autoCapitalize="none" />
            <In label={t('Phone')} value={f.phone || ''} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" />
            <In label={t('Company')} value={f.organization || ''} onChangeText={(v) => setF({ ...f, organization: v })} />
            <In label={t('Address')} value={f.address || ''} onChangeText={(v) => setF({ ...f, address: v })} />
            <In label={t('Tags (comma between)')} value={f.tags || ''} onChangeText={(v) => setF({ ...f, tags: v })} />
            <In label={t('Notes (only your team sees these)')} value={f.notes || ''} onChangeText={(v) => setF({ ...f, notes: v })} multiline style={{ minHeight: 90 } as any} />
            <Btn text={t('Save')} icon="check" onPress={save} busy={busy === 'save'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
