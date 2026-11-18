// Storm Center, built into the app (owners and admins): close early, close for the day or open late in three taps.
// OENOD shows who is affected, then updates shifts, tells the team and customers, and can end it and restore shifts.
import React, { useState } from 'react';
import { Text } from 'react-native';
import { get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { t } from '../lib/i18n';
import { V } from '../ui/M6';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Sheet, State, Tag, ToolPage, isYmd, sure, useBusy } from '../ui/T1';

type Ev = { id: number; kind: string; title: string; reason_label: string; message: string; from: string; until: string; active: boolean; now: boolean; by: string | null };
type H = { admin: boolean; events: Ev[]; reasons: Record<string, string>; today: string; tomorrow: string; now: string; sms: boolean; locations: { id: number; name: string }[]; checks?: any };
type Imp = { window: { title: string; day_text: string }; shifts: { name: string; action: string }[]; bookings: { id: number; name: string; when: string }[]; people: number; clocked_in: number; message: string; staff_message: string; channels: { sms: boolean } };
type K = 'close_early' | 'closed_day' | 'late_open';

export default function Storm() {
  const d = useLoad(() => get<H>('/api/storm'));
  const [pl, setPl] = useState<{ kind: K; day: string; from: string; until: string; reason: string } | null>(null);
  const [imp, setImp] = useState<Imp | null>(null);
  const [msg, setMsg] = useState({ customers: '', staff: '' });
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const active = (x?.events || []).filter((e) => e.active);
  const past = (x?.events || []).filter((e) => !e.active).slice(0, 10);
  const plan = (kind: K) => { setErr(''); setImp(null); setPl({ kind, day: x?.today || '', from: kind === 'close_early' ? '15:00' : '', until: kind === 'late_open' ? '12:00' : '', reason: 'storm' }); };
  const body = () => pl && { kind: pl.kind, day: pl.day, from: pl.kind === 'close_early' ? pl.from : undefined, until: pl.kind === 'late_open' ? pl.until : undefined, reason: pl.reason };
  const preview = () => {
    if (!pl) return;
    if (!isYmd(pl.day)) return setErr(t('Type the day like 2026-12-01.'));
    if (pl.kind === 'close_early' && !/^\d{1,2}:\d{2}$/.test(pl.from)) return setErr(t('Type the closing time like 15:00.'));
    if (pl.kind === 'late_open' && !/^\d{1,2}:\d{2}$/.test(pl.until)) return setErr(t('Type the opening time like 12:00.'));
    setErr('');
    run('pv', async () => { const r = await post<Imp>('/api/storm/preview', body()); setImp(r); setMsg({ customers: r.message, staff: r.staff_message }); });
  };
  const go = () => imp && sure(t('Do it now?'), t('Shifts are updated and everyone is told.'), t('Do it'), () => run('go', async () => {
    await post('/api/storm/go', { ...body(), message: msg.customers, staff_message: msg.staff, do: { customers: true, cancel_bookings: false, staff: true, staff_sms: !!imp.channels?.sms, shifts: true, google_hours: true } });
    setPl(null); setImp(null); d.reload();
  }));
  const end = (e: Ev) => sure(t('End it now?'), t('Shifts go back to how they were and the team is told.'), t('End it'), () => run('end' + e.id, async () => { await post(`/api/storm/${e.id}/end`, { tell_staff: true, restore_shifts: true }); d.reload(); }));
  const check = (e: Ev) => run('ck' + e.id, async () => { const r = await post<{ sent: number }>(`/api/storm/${e.id}/check`, { who: 'all', sms: false }); sure(t('Sent'), t('{n} people were asked if they are safe.', { n: r.sent }), t('OK'), () => {}); });
  return (
    <ToolPage title={t('Storm Center')} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x ? <Hero id="stm" label={active.length ? t('Happening now') : t('All normal')} value={active.length ? active[0].title : t('Open as usual')} note={active.length ? active[0].reason_label : t('Bad weather or an outage? Change your hours in three taps.')} noteGood={!active.length}
        stats={[[t('Today'), x.today], [t('Time now'), x.now], [t('Past closures'), String(past.length)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          {active.map((e) => (
            <Card key={e.id} title={e.title}>
              <Item left={<Dot icon="cloud" tone="warn" />} title={e.reason_label} sub={`${e.from} – ${e.until}`} />
              <Text style={{ color: V.mute, fontSize: 13.5, lineHeight: 19, paddingVertical: 6 }}>{e.message}</Text>
              {x.admin ? <Btn text={t('Ask the team if they are safe')} icon="users" onPress={() => check(e)} busy={busy === 'ck' + e.id} /> : null}
              {x.admin ? <Btn text={t('End it and restore shifts')} icon="check" kind="dark" onPress={() => end(e)} busy={busy === 'end' + e.id} /> : null}
            </Card>
          ))}
          {x.admin ? (
            <Card title={t('What do you need to do?')}>
              <Item left={<Dot icon="clock" tone="warn" />} title={t('Close early')} sub={t('Shifts end early and customers are told')} onPress={() => plan('close_early')} />
              <Item left={<Dot icon="x" tone="bad" />} title={t('Closed for the day')} sub={t('Shifts are cancelled and bookings told')} onPress={() => plan('closed_day')} />
              <Item left={<Dot icon="sun" tone="nv" />} title={t('Open late')} sub={t('Shifts start later')} onPress={() => plan('late_open')} />
            </Card>
          ) : <Card><None icon="cloud" title={t('Only owners and admins can change hours')} /></Card>}
          <Card title={t('Before')}>{past.length ? past.map((e) => <Item key={e.id} left={<Dot icon="cloud" />} title={e.title} sub={[e.reason_label, e.by].filter(Boolean).join(' · ')} />) : <None icon="sun" title={t('No closures yet')} />}</Card>
        </>
      ) : null}
      <Sheet open={!!pl} title={pl ? (pl.kind === 'close_early' ? t('Close early') : pl.kind === 'closed_day' ? t('Closed for the day') : t('Open late')) : ''} onClose={() => setPl(null)}>
        {pl && x ? (
          <>
            <Chips<string> value={pl.day} onChange={(v) => setPl({ ...pl, day: v })} items={[[x.today, t('Today')], [x.tomorrow, t('Tomorrow')]]} />
            <In label={t('Day')} value={pl.day} onChangeText={(v) => setPl({ ...pl, day: v })} error={err || undefined} />
            {pl.kind === 'close_early' ? <In label={t('Close at')} value={pl.from} onChangeText={(v) => setPl({ ...pl, from: v })} /> : null}
            {pl.kind === 'late_open' ? <In label={t('Open at')} value={pl.until} onChangeText={(v) => setPl({ ...pl, until: v })} /> : null}
            <Pick<string> label={t('Why?')} value={pl.reason} onChange={(v) => setPl({ ...pl, reason: v })} items={Object.entries(x.reasons).map(([k, v]) => [k, t(v)] as [string, string])} />
            {!imp ? <Btn text={t('See who is affected')} icon="users" kind="blue" onPress={preview} busy={busy === 'pv'} /> : (
              <>
                <Card title={imp.window.title}>
                  <Item title={t('Shifts that change')} right={String(imp.shifts.length)} />
                  <Item title={t('Bookings')} right={String(imp.bookings.length)} />
                  <Item title={t('People told')} right={String(imp.people)} />
                  {imp.clocked_in ? <Item title={t('Clocked in right now')} right={String(imp.clocked_in)} /> : null}
                </Card>
                <In label={t('Message to customers')} value={msg.customers} onChangeText={(v) => setMsg({ ...msg, customers: v })} multiline />
                <In label={t('Message to the team')} value={msg.staff} onChangeText={(v) => setMsg({ ...msg, staff: v })} multiline />
                <Btn text={t('Do it now')} icon="check" kind="red" onPress={go} busy={busy === 'go'} />
              </>
            )}
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
