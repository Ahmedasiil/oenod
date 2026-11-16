// Time clock, built into the app (managers): who is on the clock right now, who is late, recent hours,
// approve hours, and clock someone out who forgot.
import React, { useMemo, useState } from 'react';
import { Linking, Text } from 'react-native';
import { get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date } from '../lib/format';
import { t } from '../lib/i18n';
import { Av, V } from '../ui/M6';
import { Btn, Card, Chips, Dot, Hero, Item, None, Sheet, State, Tag, ToolPage, plusDays, sure, useBusy, ymd } from '../ui/T1';

type P = { id: number; name: string; job_title: string | null; phone: string | null; status: 'late' | 'noshow' | 'in' | 'break' | 'later' | 'done' | 'off'; entry_id: number | null; in_since: string | null;
  minutes: number; week_minutes: number; shift: { starts_at: string; ends_at: string; role: string | null } | null; inside: boolean | null; distance_m: number | null; has_app: boolean };
type Al = { sev: 'bad' | 'warn'; kind: string; employee_id: number; text: string };
type Map = { people: P[]; alerts: Al[]; totals: { on: number; late: number; alerts: number; hours: number; cost: number } };
type En = { id: number; employee_id: number; first_name?: string; last_name?: string; employee?: string; clock_in: string; clock_out: string | null; minutes: number | null; status: string; note?: string | null };
type F = 'open' | 'closed' | 'approved' | 'all';
const hm = (m: number | null | undefined) => { const n = Math.max(0, Math.round(Number(m || 0))); return `${Math.floor(n / 60)}h ${String(n % 60).padStart(2, '0')}m`; };
/** Server times are UTC ("2026-11-16 14:05:00"); show them in the phone's own time. */
const tm = (s?: string | null) => { if (!s) return '—'; const d = new Date(String(s).replace(' ', 'T') + (/[zZ+]/.test(String(s).slice(10)) ? '' : 'Z')); return isNaN(d.getTime()) ? String(s).slice(11, 16) : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
const nm = (x: { name?: string; first_name?: string; last_name?: string; employee?: string }) => x.name || x.employee || `${x.first_name || ''} ${x.last_name || ''}`.trim() || t('Someone');

export default function TimeClock() {
  const live = useLoad(() => get<Map>('/api/time/map'));
  const from = plusDays(-13), to = ymd();
  const ent = useLoad(() => get<{ entries: En[]; summary?: any }>(`/api/time?from=${from}&to=${to}`));
  const [f, setF] = useState<F>('closed');
  const [pick, setPick] = useState<number[]>([]);
  const [open, setOpen] = useState<P | null>(null);
  const { busy, run } = useBusy();
  const reload = () => { live.reload(); ent.reload(); setPick([]); };
  const ppl = live.data?.people || [];
  const on = ppl.filter((p) => p.status === 'in' || p.status === 'break');
  const late = ppl.filter((p) => p.status === 'late' || p.status === 'noshow');
  const alerts = (live.data?.alerts || []).filter((a) => a.kind !== 'late' && a.kind !== 'noshow');
  const rows = ent.data?.entries || [];
  const list = useMemo(() => rows.filter((e) => f === 'all' || e.status === f), [rows, f]);
  const waiting = rows.filter((e) => e.status === 'closed');
  const total = rows.reduce((s, e) => s + Number(e.minutes || 0), 0);
  const approve = (ids: number[]) => ids.length && sure(t('Approve {n} time entries?', { n: ids.length }), t('Approved hours go to payroll.'), t('Approve'),
    () => run('ap', async () => { await post('/api/time/approve', { ids }); reload(); }));
  const out = (x: P) => x.entry_id && sure(t('Clock out {n}?', { n: nm(x) }), t('Their shift ends now. They get a note that you did it.'), t('Clock out'),
    () => run('out', async () => { await post(`/api/time/${x.entry_id}/clockout`, {}); setOpen(null); reload(); }), true);
  const nudge = (x: P) => sure(t('Send {n} a reminder?', { n: nm(x) }), x.has_app ? t('They get a notice on their phone right now.') : t('{n} does not use the app yet, so call them instead.', { n: nm(x) }), x.has_app ? t('Send') : t('OK'),
    () => x.has_app && run('nudge', async () => { await post('/api/time/nudge', { employee_id: x.id, message: x.status === 'late' ? t('Your shift has started. Please clock in when you arrive.') : t('Please check in with your manager.') }); setOpen(null); }));
  const toggle = (id: number) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <ToolPage title={t('Time clock')} right="check" rightLabel={t('Approve all waiting')} onRight={() => approve(waiting.map((e) => e.id))} refreshing={live.refreshing || ent.refreshing} onRefresh={() => { live.refresh(); ent.refresh(); }}>
      {live.data ? <Hero id="tch" label={t('On the clock now')} value={String(on.length)} note={late.length ? t('{n} late for their shift', { n: late.length }) : t('Nobody is late')} noteGood={!late.length}
        stats={[[t('Hours today'), String(live.data.totals.hours)], [t('To approve'), String(waiting.length)], [t('On break'), String(on.filter((x) => x.status === 'break').length)]]} /> : null}
      <State loading={live.loading && !live.data} error={!live.data ? live.error : null} onRetry={reload} />
      {live.data ? (
        <>
          <Card title={t('Working now')}>
            {on.length ? on.map((x) => (
              <Item key={x.id} left={<Av name={nm(x)} size={42} />} title={nm(x)} sub={[t('In since {t}', { t: tm(x.in_since) }), x.job_title, x.inside === false ? t('Away from site') : null].filter(Boolean).join(' · ')}
                right={hm(x.minutes)} rightSub={x.status === 'break' ? <Tag text={t('On break')} tone="warn" /> : x.inside === false ? <Tag text={t('Off site')} tone="bad" /> : <Tag text={t('Working')} tone="good" />} onPress={() => setOpen(x)} />
            )) : <None icon="clock" title={t('Nobody is clocked in')} sub={t('People show up here the moment they clock in.')} />}
          </Card>
          {late.length ? (
            <Card title={t('Late')}>
              {late.map((x) => <Item key={x.id} left={<Av name={nm(x)} size={42} />} title={nm(x)} sub={t('Shift started {t}', { t: tm(x.shift?.starts_at) })} rightSub={<Tag text={x.status === 'noshow' ? t('Did not come') : t('Not in yet')} tone="bad" />} onPress={() => setOpen(x)} />)}
            </Card>
          ) : null}
          {alerts.length ? (
            <Card title={t('Heads up')}>
              {alerts.slice(0, 8).map((a, n) => <Item key={n} left={<Dot icon="bell" tone={a.sev === 'bad' ? 'bad' : 'warn'} />} title={a.text.split(' is ')[0]} sub={a.text.includes(' is ') ? a.text.slice(a.text.indexOf(' is ') + 1) : a.text} onPress={() => { const p = ppl.find((x) => x.id === a.employee_id); if (p) setOpen(p); }} />)}
            </Card>
          ) : null}
          <Chips<F> value={f} onChange={(k) => { setF(k); setPick([]); }} items={[['closed', t('To approve'), waiting.length], ['open', t('Still in')], ['approved', t('Approved')], ['all', t('All'), rows.length]]} />
          <Card title={t('Last 2 weeks')} right={f === 'closed' && waiting.length ? (pick.length ? t('Approve {n}', { n: pick.length }) : t('Approve all')) : undefined}
            onRight={() => approve(pick.length ? pick : waiting.map((e) => e.id))}>
            {list.length ? list.slice(0, 300).map((e) => (
              <Item key={e.id} left={<Av name={nm(e)} size={40} />} title={nm(e)} sub={`${date(String(e.clock_in).slice(0, 10))} · ${tm(e.clock_in)}–${tm(e.clock_out)}`} right={hm(e.minutes)}
                rightSub={e.status === 'closed' ? <Tag text={pick.includes(e.id) ? t('Picked') : t('Tap to pick')} tone={pick.includes(e.id) ? 'info' : 'warn'} /> : <Tag text={e.status === 'approved' ? t('Approved') : t('Still in')} tone={e.status === 'approved' ? 'good' : 'plain'} />}
                onPress={e.status === 'closed' ? () => toggle(e.id) : undefined} />
            )) : <None icon="clock" title={t('Nothing here')} sub={f === 'closed' ? t('All hours are approved.') : undefined} />}
          </Card>
          {f === 'closed' && waiting.length ? <Btn text={pick.length ? t('Approve {n} picked', { n: pick.length }) : t('Approve all {n}', { n: waiting.length })} icon="check" onPress={() => approve(pick.length ? pick : waiting.map((e) => e.id))} busy={busy === 'ap'} /> : null}
        </>
      ) : null}
      <Sheet open={!!open} title={open ? nm(open) : ''} onClose={() => setOpen(null)}>
        {open ? (
          <>
            <Text style={{ color: V.mute, fontSize: 14, textAlign: 'center' }}>
              {open.entry_id ? t('Clocked in at {t} · {h} so far', { t: tm(open.in_since), h: hm(open.minutes) }) : open.shift ? t('Shift {a} to {b}', { a: tm(open.shift.starts_at), b: tm(open.shift.ends_at) }) : t('Not on the clock')}
            </Text>
            <Text style={{ color: V.mute, fontSize: 13, textAlign: 'center' }}>{t('{h} this week', { h: hm(open.week_minutes) })}</Text>
            {open.phone ? <Btn text={t('Call {n}', { n: open.name.split(' ')[0] })} icon="phone" kind="dark" onPress={() => Linking.openURL(`tel:${open.phone!.replace(/[^\d+]/g, '')}`)} /> : null}
            <Btn text={t('Send a reminder')} icon="bell" kind="dark" onPress={() => nudge(open)} busy={busy === 'nudge'} />
            {open.entry_id ? <Btn text={t('Clock them out now')} icon="x" kind="red" onPress={() => out(open)} busy={busy === 'out'} /> : null}
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
