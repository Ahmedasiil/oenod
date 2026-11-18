// Reservations, built into the app: bookings for the day, covers, seat / done / no-show in one tap, and add a booking.
import React, { useState } from 'react';
import { Share } from 'react-native';
import { get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { t } from '../lib/i18n';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Sheet, State, Tag, ToolPage, isYmd, oops, plusDays, ymd, useBusy } from '../ui/T1';

type R = { id: number; name: string; phone: string | null; party_size: number; starts_at: string; table_label: string | null; note: string | null; status: string; location: string | null };
type L = { date: string; reservations: R[]; covers: number; booking_url: string; booking_on: boolean };
const NEXT: Record<string, [string, string]> = { booked: ['confirmed', 'Confirm'], confirmed: ['seated', 'Seat'], seated: ['done', 'Done'] };
const tone = (s: string) => (s === 'seated' ? 'info' : s === 'done' ? 'good' : s === 'no_show' || s === 'cancelled' ? 'bad' : 'plain') as 'info' | 'good' | 'bad' | 'plain';
const hm = (s: string) => s.slice(11, 16);

export default function Reservations() {
  const [day, setDay] = useState(ymd());
  const d = useLoad(() => get<L>(`/api/reservations?date=${day}`), [day]);
  const [sel, setSel] = useState<R | null>(null);
  const [nw, setNw] = useState<{ name: string; phone: string; party: string; time: string; table: string; note: string } | null>(null);
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const live = (x?.reservations || []).filter((r) => !['cancelled', 'no_show'].includes(r.status));
  const setSt = (r: R, status: string) => run('s' + r.id + status, async () => { await post(`/api/reservations/${r.id}/status`, { status }); setSel(null); d.reload(); });
  const add = () => {
    if (!nw) return;
    if (!nw.name.trim()) return setErr(t('Whose booking is it?'));
    if (!(parseInt(nw.party, 10) > 0)) return setErr(t('How many people?'));
    if (!/^\d{1,2}:\d{2}$/.test(nw.time)) return setErr(t('Type the time like 19:30.'));
    if (!isYmd(day)) return;
    setErr('');
    run('add', async () => { await post('/api/reservations', { name: nw.name.trim(), phone: nw.phone || null, party_size: parseInt(nw.party, 10), starts_at: `${day} ${nw.time.padStart(5, '0')}`, table_label: nw.table || null, note: nw.note || null, status: 'confirmed' }); setNw(null); d.reload(); });
  };
  const share = async () => { if (!x) return; try { await Share.share({ message: t('Book a table with us: {u}', { u: x.booking_url }) }); } catch { oops(x.booking_url); } };
  return (
    <ToolPage title={t('Reservations')} right="plus" rightLabel={t('Add a booking')} onRight={() => { setErr(''); setNw({ name: '', phone: '', party: '2', time: '19:00', table: '', note: '' }); }} refreshing={d.refreshing} onRefresh={d.refresh}>
      <Chips<string> value={day} onChange={setDay} items={[[ymd(), t('Today')], [plusDays(1), t('Tomorrow')], [plusDays(2), t('In 2 days')]]} />
      {x ? <Hero id="res" label={t('Guests expected')} value={String(x.covers)} note={t('{n} bookings', { n: live.length })} noteGood
        stats={[[t('Seated now'), String(live.filter((r) => r.status === 'seated').length)], [t('Still to come'), String(live.filter((r) => ['booked', 'confirmed'].includes(r.status)).length)], [t('No-shows'), String(x.reservations.filter((r) => r.status === 'no_show').length)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Card>
            {x.reservations.length ? x.reservations.map((r) => <Item key={r.id} onPress={() => setSel(r)} left={<Dot icon="calendar" tone={r.status === 'seated' ? 'nv' : r.status === 'no_show' ? 'bad' : 'dk'} />} title={`${hm(r.starts_at)} · ${r.name}`}
              sub={[t('{n} people', { n: r.party_size }), r.table_label ? t('table {t}', { t: r.table_label }) : null, r.note].filter(Boolean).join(' · ')} rightSub={<Tag text={t(r.status.replace('_', ' '))} tone={tone(r.status)} />} />)
              : <None icon="calendar" title={t('No bookings this day')} sub={t('Tap + to add one, or share your booking page.')} />}
          </Card>
          {x.booking_on ? <Btn text={t('Share your booking page')} icon="link" onPress={share} /> : null}
        </>
      ) : null}
      <Sheet open={!!sel} title={sel ? `${hm(sel.starts_at)} · ${sel.name}` : ''} onClose={() => setSel(null)}>
        {sel ? (
          <>
            <Item title={t('{n} people', { n: sel.party_size })} sub={[sel.phone, sel.table_label ? t('table {t}', { t: sel.table_label }) : null].filter(Boolean).join(' · ') || undefined} rightSub={<Tag text={t(sel.status.replace('_', ' '))} tone={tone(sel.status)} />} />
            {NEXT[sel.status] ? <Btn text={t(NEXT[sel.status][1])} icon="check" kind="blue" onPress={() => setSt(sel, NEXT[sel.status][0])} busy={busy === 's' + sel.id + NEXT[sel.status][0]} /> : null}
            {['booked', 'confirmed'].includes(sel.status) ? <Btn text={t('No-show')} icon="x" kind="dark" onPress={() => setSt(sel, 'no_show')} busy={busy === 's' + sel.id + 'no_show'} /> : null}
            {['booked', 'confirmed'].includes(sel.status) ? <Btn text={t('Cancel booking')} icon="x" kind="red" onPress={() => setSt(sel, 'cancelled')} busy={busy === 's' + sel.id + 'cancelled'} /> : null}
          </>
        ) : null}
      </Sheet>
      <Sheet open={!!nw} title={t('Add a booking')} onClose={() => setNw(null)}>
        {nw ? (
          <>
            <In label={t('Name')} value={nw.name} onChangeText={(v) => setNw({ ...nw, name: v })} error={err || undefined} />
            <In label={t('Phone (optional)')} value={nw.phone} onChangeText={(v) => setNw({ ...nw, phone: v })} keyboardType="phone-pad" />
            <Pick<string> label={t('People')} value={nw.party} onChange={(v) => setNw({ ...nw, party: v })} items={['1', '2', '3', '4', '5', '6', '8', '10', '12'].map((n) => [n, n] as [string, string])} />
            <In label={t('Time')} value={nw.time} onChangeText={(v) => setNw({ ...nw, time: v })} />
            <In label={t('Table (optional)')} value={nw.table} onChangeText={(v) => setNw({ ...nw, table: v })} />
            <In label={t('Note (optional)')} value={nw.note} onChangeText={(v) => setNw({ ...nw, note: v })} />
            <Btn text={t('Save booking')} icon="check" onPress={add} busy={busy === 'add'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
