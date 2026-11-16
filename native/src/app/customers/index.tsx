// Customers, built into the app: who buys from you, how often they come back, who owes you, and a + to add one.
import React, { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date, money } from '../../lib/format';
import { t } from '../../lib/i18n';
import { Av } from '../../ui/M6';
import { Btn, Card, Chips, Hero, In, Item, None, Search, Sheet, State, Tag, ToolPage, useBusy } from '../../ui/T1';

export type Cu = { id: number; name: string; email: string | null; phone: string | null; organization: string | null; tags: string | null; visits: number; lifetime: number;
  last_visit: string | null; balance: number | null; overdue: number | null; segment: string };
type L = { customers: Cu[]; segments: Record<string, number>; labels: Record<string, string>; totals: { customers: number; lifetime: number; repeat_rate: number; avg_value: number } };
export const segTone = (s: string) => (s === 'vip' ? 'info' : s === 'at_risk' ? 'warn' : s === 'lost' ? 'bad' : s === 'new' ? 'good' : 'plain') as 'info' | 'warn' | 'bad' | 'good' | 'plain';

export default function Customers() {
  const d = useLoad(() => get<L>('/api/customers'));
  const [seg, setSeg] = useState('');
  const [q, setQ] = useState('');
  const [add, setAdd] = useState(false);
  const [f, setF] = useState({ name: '', email: '', phone: '', organization: '' });
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (x?.customers || []).filter((c) => (!seg || c.segment === seg) && (!s || `${c.name} ${c.email || ''} ${c.phone || ''} ${c.organization || ''} ${c.tags || ''}`.toLowerCase().includes(s)));
  }, [x, seg, q]);
  const save = () => {
    if (!f.name.trim()) return setErr(t('Type a name.'));
    run('add', async () => {
      const r = await post<{ id: number }>('/api/customers', { name: f.name.trim(), email: f.email.trim() || null, phone: f.phone.trim() || null, organization: f.organization.trim() || null });
      setAdd(false); setF({ name: '', email: '', phone: '', organization: '' }); router.push(`/customers/${r.id}`);
    });
  };
  return (
    <ToolPage title={t('Customers')} right="plus" rightLabel={t('New customer')} onRight={() => { setErr(''); setAdd(true); }} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x ? <Hero id="cuh" label={t('Customers')} value={String(x.totals.customers)} note={t('{p}% come back again', { p: x.totals.repeat_rate })}
        stats={[[t('Lifetime sales'), money(x.totals.lifetime)], [t('Average value'), money(x.totals.avg_value)], [t('VIP'), String(x.segments.vip || 0)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Search value={q} onChange={setQ} placeholder={t('Search name, email, phone or tag')} />
          <Chips<string> value={seg} onChange={setSeg} items={[['', t('All'), x.customers.length], ...Object.entries(x.labels).filter(([k]) => x.segments[k]).map(([k, l]) => [k, t(l), x.segments[k]] as [string, string, number])]} />
          <Card>
            {list.length ? list.slice(0, 400).map((c) => (
              <Item key={c.id} onPress={() => router.push(`/customers/${c.id}`)} left={<Av name={c.name} size={42} />}
                title={c.name} sub={[c.organization, c.last_visit ? t('Last visit {d}', { d: date(String(c.last_visit).slice(0, 10)) }) : c.email || c.phone].filter(Boolean).join(' · ')}
                right={money(c.lifetime)} rightSub={c.overdue ? <Tag text={t('Owes {m}', { m: money(c.balance || 0) })} tone="bad" /> : <Tag text={t(x.labels[c.segment] || c.segment)} tone={segTone(c.segment)} />} />
            )) : <None icon="users" title={q || seg ? t('No one found') : t('No customers yet')} sub={q || seg ? t('Try another search or filter.') : t('Tap + to add your first customer.')} />}
          </Card>
        </>
      ) : null}
      <Sheet open={add} title={t('New customer')} onClose={() => setAdd(false)}>
        <In label={t('Name')} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} error={err || undefined} autoFocus />
        <In label={t('Email')} value={f.email} onChangeText={(v) => setF({ ...f, email: v })} keyboardType="email-address" autoCapitalize="none" />
        <In label={t('Phone')} value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" />
        <In label={t('Company (optional)')} value={f.organization} onChangeText={(v) => setF({ ...f, organization: v })} />
        <Btn text={t('Add customer')} icon="check" onPress={save} busy={busy === 'add'} />
      </Sheet>
    </ToolPage>
  );
}
