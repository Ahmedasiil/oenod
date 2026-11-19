// Cars (managers): every GPS tracker and connected car, where it is, and for cars connected through
// "OnStar & connected cars" the car controls from oenod.com (lock, unlock, charging). Commands need the
// owner or an admin, always ask "Are you sure?" first, and a pending command is checked again until the car answers.
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { BASE, get, post, put } from '../lib/api';
import { openTool } from './web';
import { useLoad } from '../lib/useLoad';
import { t } from '../lib/i18n';
import { V } from '../ui/M6';
import { Btn, Card, Chips, Dot, Hero, Item, None, Sheet, State, Tag, ToolPage } from '../ui/T1';

type Dev = { id: number; provider: string; name: string; vehicle_name: string | null; plate: string | null; lat: number | null; lng: number | null; speed_kmh: number | null;
  fix_at: string | null; odometer_km: number | null; fuel_pct: number | null; ignition: number | boolean | null; address: string | null; hidden: number | null; first_name: string | null; last_name: string | null };
type List = { devices: Dev[]; admin: boolean; now: string };
type Hl = { doors_open?: number | null; windows_open?: number | null; open?: string[]; warnings?: string[]; dtc?: number | null; tires_kpa?: number[]; tires_low?: boolean; v12_pct?: number | null; v12?: string | null;
  speed?: number | null; gear?: string | null; online?: boolean | null; asleep?: boolean | null; sentry?: boolean | null; sentry_name?: string | null; home?: boolean | null; service?: boolean | null;
  in_c?: number | null; out_c?: number | null; hvac?: boolean | null; fuel?: number | null };
type St = { locked?: boolean | null; charging?: boolean | null; plugged?: boolean | null; soc?: number | null; range_km?: number | null; limit?: number | null; ev?: boolean; at?: string | null; h?: Hl; sched?: string | null };
type Act = 'lock' | 'unlock' | 'charge_start' | 'charge_stop' | 'charge_limit' | 'port_open' | 'port_close' | 'destination' | 'schedule' | 'schedule_off';
type CarView = { tier?: '' | 'basic' | 'premium'; locked_out?: Act[]; car: { state: St; mode: string; updated_at: string | null; needs_ok: boolean } | null; actions: Act[]; admin: boolean;
  log: { id: number; action: string; value: number | null; status: string; message: string | null; created_at: string; by_name: string | null }[] };
type Cmd = { id: number; status: 'done' | 'pending' | 'failed'; message: string; retry_s?: number };

const NAME: Record<Act, string> = { lock: 'Lock', unlock: 'Unlock', charge_start: 'Start charging', charge_stop: 'Stop charging', charge_limit: 'Set charge limit',
  port_open: 'Open charge port', port_close: 'Close charge port', destination: 'Send destination', schedule: 'Set charging schedule', schedule_off: 'Turn off charging schedule' };
type Alerts = { tier: string; kinds: { k: string; label: string; on: boolean; email: boolean }[]; items: { id: number; kind: string; title: string; created_at: string; dev_id: number | null }[]; admin: boolean; live: boolean };
type Place = { id: number; name: string; address: string; lat: number; lng: number };
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const LIMITS = [50, 60, 70, 80, 90, 100];

const ago = (iso: string | null, now: number) => {
  if (!iso) return t('No position yet');
  const s = Math.max(0, Math.round((now - Date.parse(iso.replace(' ', 'T') + (iso.endsWith('Z') ? '' : 'Z'))) / 1000));
  if (s < 90) return t('just now');
  if (s < 3600) return t('{n} min ago', { n: Math.round(s / 60) });
  if (s < 86400) return t('{n} h ago', { n: Math.round(s / 3600) });
  return t('{n} days ago', { n: Math.round(s / 86400) });
};
const title = (d: Dev) => d.vehicle_name || d.name || t('Car');
const moving = (d: Dev) => (d.speed_kmh || 0) >= 3;

export default function Cars() {
  const d = useLoad(() => get<List>('/api/vehicles/gps'));
  const [open, setOpen] = useState<Dev | null>(null);
  const [tab, setTab] = useState<'all' | 'moving' | 'parked'>('all');
  const al = useLoad(() => get<Alerts>('/api/vehicles/gps/alerts').catch(() => null as Alerts | null));
  const [alOpen, setAlOpen] = useState(false);
  const x = d.data;
  const now = x ? Date.parse(x.now.replace(' ', 'T') + (x.now.endsWith('Z') ? '' : 'Z')) || Date.now() : Date.now();
  useEffect(() => { const i = setInterval(() => d.refresh(), 30000); return () => clearInterval(i); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const devs = (x?.devices || []).filter((y) => !y.hidden);
  const mov = devs.filter(moving);
  const shown = tab === 'moving' ? mov : tab === 'parked' ? devs.filter((y) => !moving(y)) : devs;

  return (
    <ToolPage title={t('Cars')} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x ? <Hero id="car" label={t('Cars tracked')} value={String(devs.length)} note={mov.length ? t('{n} moving now', { n: mov.length }) : t('All parked')} noteGood
        stats={[[t('Moving'), String(mov.length)], [t('Parked'), String(devs.length - mov.length)], [t('Connected cars'), String(devs.filter((y) => y.provider === 'onstar').length)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Chips value={tab} onChange={setTab} items={[['all', t('All'), devs.length], ['moving', t('Moving'), mov.length], ['parked', t('Parked'), devs.length - mov.length]]} />
          <Card>
            {shown.length ? shown.map((y) => (
              <Item key={y.id} onPress={() => setOpen(y)} left={<Dot icon="pin" tone={moving(y) ? 'good' : 'nv'} />} title={title(y)}
                sub={[y.plate, [y.first_name, y.last_name].filter(Boolean).join(' ') || null, y.address].filter(Boolean).join(' · ') || ago(y.fix_at, now)}
                rightSub={<Tag text={moving(y) ? `${Math.round(y.speed_kmh || 0)} km/h` : ago(y.fix_at, now)} tone={moving(y) ? 'good' : 'plain'} />} />
            )) : <None icon="pin" title={t('No cars yet')} sub={t('Connect a GPS tracker or your car on oenod.com, under Vehicles, GPS.')} />}
          </Card>
        </>
      ) : null}
      {al.data && (al.data.items.length || al.data.admin) ? (
        <Card title={t('Car alerts')} right={al.data.admin && al.data.tier === 'premium' ? t('Choose') : undefined} onRight={() => setAlOpen(true)}>
          {al.data.tier !== 'premium' ? <Text style={{ color: V.mute, fontSize: 13, paddingVertical: 8 }}>{t('Alerts come with Premium. Upgrade on oenod.com under Plan.')}</Text> : null}
          {al.data.items.slice(0, 8).map((a) => <Item key={a.id} left={<Dot icon="bell" tone="bad" />} title={a.title} right={ago(a.created_at, now)} />)}
          {al.data.tier === 'premium' && !al.data.items.length ? <None icon="bell" title={t('No alerts yet')} sub={t('You get one when a door opens, the car moves, or something needs a look.')} /> : null}
        </Card>
      ) : null}
      <AlertSheet open={alOpen} data={al.data} onClose={() => setAlOpen(false)} onSaved={al.reload} />
      <CarSheet dev={open} now={now} onClose={() => setOpen(null)} />
    </ToolPage>
  );
}

function CarSheet({ dev, now, onClose }: { dev: Dev | null; now: number; onClose: () => void }) {
  const [v, setV] = useState<CarView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ act: Act; percent?: number; address?: string; lat?: number; lng?: number; label?: string; start?: string; stop?: string } | null>(null);
  const [dest, setDest] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [sStart, setSStart] = useState('23:00');
  const [sStop, setSStop] = useState('06:00');
  const [ferr, setFerr] = useState('');
  const [cmd, setCmd] = useState<Cmd | null>(null);
  const [sending, setSending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const load = (id: number) => get<CarView>(`/api/vehicles/gps/device/${id}/car`).then((r) => { setV(r); setErr(null); }).catch((e) => setErr(e?.message || t('Could not load this car.')));
  useEffect(() => {
    setV(null); setErr(null); setAsk(null); setCmd(null); setDest(''); setFerr('');
    if (dev && dev.provider === 'onstar') { load(dev.id); get<{ places: Place[] }>('/api/vehicles/gps/places').then((r) => setPlaces(r.places || [])).catch(() => setPlaces([])); }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [dev?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const poll = (c: Cmd, id: number) => {
    if (timer.current) clearTimeout(timer.current);
    if (c.status !== 'pending') { load(id); return; }
    timer.current = setTimeout(() => {
      get<Cmd>(`/api/vehicles/gps/control/${c.id}`).then((r) => { setCmd(r); poll(r, id); }).catch((e) => setCmd({ id: c.id, status: 'failed', message: e?.message || t('Could not reach the car.') }));
    }, Math.max(3, c.retry_s || 5) * 1000);
  };
  const send = async () => {
    if (!dev || !ask) return;
    setSending(true);
    try {
      const r = await post<Cmd>(`/api/vehicles/gps/device/${dev.id}/control`, { action: ask.act, confirm: true, ...(ask.act === 'charge_limit' ? { percent: ask.percent } : {}),
        ...(ask.act === 'destination' ? (ask.lat != null && ask.lng != null ? { lat: ask.lat, lng: ask.lng } : { address: ask.address }) : {}),
        ...(ask.act === 'schedule' ? { start: ask.start, stop: ask.stop } : {}) });
      setCmd(r); setAsk(null); poll(r, dev.id);
    } catch (e: any) { setCmd({ id: 0, status: 'failed', message: e?.message || t('The car didn\'t do it.') }); setAsk(null); }
    finally { setSending(false); }
  };

  const st = v?.car?.state || {};
  const h = st.h || {};
  const health: [string, 'good' | 'warn' | 'bad'][] = [];
  if (h.doors_open != null) health.push([h.doors_open ? t('{n} doors open', { n: h.doors_open }) : t('Doors closed'), h.doors_open ? 'warn' : 'good']);
  if (h.windows_open != null) health.push([h.windows_open ? t('{n} windows open', { n: h.windows_open }) : t('Windows closed'), h.windows_open ? 'warn' : 'good']);
  for (const o of h.open || []) health.push([t('{x} open', { x: t(o) }), 'warn']);
  if (h.warnings) health.push([h.warnings.length ? t('Warning: {w}', { w: h.warnings.map((w) => t(w)).join(', ') }) : t('No warning lights'), h.warnings.length ? 'bad' : 'good']);
  if (h.dtc) health.push([t('{n} engine codes', { n: h.dtc }), 'bad']);
  if (h.tires_kpa?.length) health.push([t('Tires {p} kPa', { p: h.tires_kpa.join(' · ') }), h.tires_low ? 'bad' : 'good']);
  if (h.v12_pct != null) health.push([t('12V battery {n}%', { n: h.v12_pct }), h.v12_pct < 50 ? 'warn' : 'good']);
  if (h.fuel != null) health.push([t('Fuel {n}%', { n: Math.round(h.fuel) }), h.fuel < 15 ? 'warn' : 'good']);
  if (h.speed) health.push([t('Moving · {n} km/h', { n: h.speed }), 'warn']);
  if (h.sentry != null) health.push([h.sentry ? t('{s} on', { s: h.sentry_name || t('Guard mode') }) : t('{s} off', { s: h.sentry_name || t('Guard mode') }), h.sentry ? 'good' : 'warn']);
  if (h.home) health.push([t('At home'), 'good']);
  if (h.service) health.push([t('In service'), 'warn']);
  if (h.in_c != null) health.push([t('Inside {n}°C', { n: Math.round(h.in_c) }), 'good']);
  if (h.asleep) health.push([t('Car is asleep'), 'warn']); else if (h.online === false) health.push([t('Car is offline'), 'warn']);
  const goDest = () => {
    const a = dest.trim(); if (!a) { setFerr(t('Type an address or pick a saved place.')); return; }
    setFerr(''); setAsk({ act: 'destination', address: a, label: a });
  };
  const goSched = () => {
    if (!HHMM.test(sStart) || !HHMM.test(sStop)) { setFerr(t('Use the time format 23:00.')); return; }
    setFerr(''); setAsk({ act: 'schedule', start: sStart, stop: sStop });
  };
  const can = (a: Act) => !!v?.admin && !!v.actions.includes(a);
  const map = dev && dev.lat != null && dev.lng != null ? `https://www.google.com/maps/search/?api=1&query=${dev.lat},${dev.lng}` : null;
  const row = (k: string, val: string) => (
    <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: V.mute, fontSize: 14 }}>{k}</Text><Text style={{ color: V.ink, fontSize: 14, fontWeight: '600' }}>{val}</Text>
    </View>
  );

  return (
    <Sheet open={!!dev} title={dev ? title(dev) : ''} onClose={onClose}>
      {dev ? (
        <>
          <View>
            {row(t('Last seen'), ago(dev.fix_at, now))}
            {dev.address ? row(t('Where'), dev.address) : null}
            {row(t('Speed'), `${Math.round(dev.speed_kmh || 0)} km/h`)}
            {dev.odometer_km != null ? row(t('Odometer'), `${Math.round(dev.odometer_km).toLocaleString()} km`) : null}
            {dev.fuel_pct != null ? row(t('Fuel'), `${Math.round(dev.fuel_pct)}%`) : null}
          </View>
          {map ? <Btn text={t('Open in Maps')} icon="pin" onPress={() => Linking.openURL(map)} /> : null}

          {dev.provider === 'onstar' ? (
            <>
              {err ? <Text style={{ color: V.mute, fontSize: 13 }}>{err}</Text> : null}
              {v?.car ? (
                <View>
                  {st.locked != null ? row(t('Doors'), st.locked ? t('Locked') : t('Unlocked')) : null}
                  {st.ev && st.soc != null ? row(t('Battery'), `${st.soc}%${st.range_km != null ? ` · ${st.range_km} km` : ''}`) : null}
                  {st.ev && st.charging != null ? row(t('Charging'), st.charging ? t('Yes') : st.plugged ? t('Plugged in') : t('No')) : null}
                  {st.ev && st.limit != null ? row(t('Charge limit'), `${st.limit}%`) : null}
                  {v.car.mode === 'simulated' ? <Tag text={t('Test car')} tone="info" /> : null}
                </View>
              ) : null}
              {health.length ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: V.faint, fontSize: 11.5, fontWeight: '700', letterSpacing: 1.2 }}>{t('CAR HEALTH')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {health.map(([txt, tn]) => <Tag key={txt} text={txt} tone={tn} />)}
                  </View>
                </View>
              ) : null}
              {cmd ? <Tag text={cmd.message} tone={cmd.status === 'done' ? 'good' : cmd.status === 'failed' ? 'bad' : 'info'} /> : null}

              {ask ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: V.ink, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                    {ask.act === 'charge_limit' ? t('Set the charge limit to {n}%?', { n: ask.percent || 80 })
                      : ask.act === 'destination' ? t('Send {p} to {c}?', { p: ask.label || '', c: title(dev) })
                      : ask.act === 'schedule' ? t('Charge {c} from {a} to {b}?', { c: title(dev), a: ask.start || '', b: ask.stop || '' })
                      : t('{a} {c}? Are you sure?', { a: t(NAME[ask.act]), c: title(dev) })}
                  </Text>
                  {ask.act === 'unlock' ? <Text style={{ color: V.mute, fontSize: 13, textAlign: 'center' }}>{t('Anyone near the car can open it once it is unlocked.')}</Text> : null}
                  {ask.act === 'charge_limit' ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                      {LIMITS.map((p) => <Btn key={p} text={`${p}%`} kind={ask.percent === p ? 'blue' : 'white'} onPress={() => setAsk({ act: 'charge_limit', percent: p })} />)}
                    </View>
                  ) : null}
                  <Btn text={t('Yes, {a}', { a: t(NAME[ask.act]).toLowerCase() })} kind={ask.act === 'unlock' ? 'red' : 'blue'} busy={sending} onPress={send} />
                  <Btn text={t('Cancel')} onPress={() => setAsk(null)} />
                </View>
              ) : v && cmd?.status !== 'pending' ? (
                v.admin ? (
                  <View style={{ gap: 10 }}>
                    {can('lock') ? <Btn text={t('Lock')} icon="shield" kind="blue" onPress={() => setAsk({ act: 'lock' })} /> : null}
                    {can('unlock') ? <Btn text={t('Unlock')} icon="shield" kind="red" onPress={() => setAsk({ act: 'unlock' })} /> : null}
                    {can('charge_start') && !st.charging ? <Btn text={t('Start charging')} icon="spark" onPress={() => setAsk({ act: 'charge_start' })} /> : null}
                    {can('charge_stop') && st.charging ? <Btn text={t('Stop charging')} icon="spark" onPress={() => setAsk({ act: 'charge_stop' })} /> : null}
                    {can('charge_limit') ? <Btn text={t('Set charge limit')} icon="spark" onPress={() => setAsk({ act: 'charge_limit', percent: st.limit && LIMITS.includes(st.limit) ? st.limit : 80 })} /> : null}
                    {can('port_open') || can('port_close') ? (
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        {can('port_open') ? <Btn text={t('Open port')} icon="spark" onPress={() => setAsk({ act: 'port_open' })} style={{ flex: 1 }} /> : null}
                        {can('port_close') ? <Btn text={t('Close port')} icon="spark" onPress={() => setAsk({ act: 'port_close' })} style={{ flex: 1 }} /> : null}
                      </View>
                    ) : null}
                    {can('destination') ? (
                      <View style={{ gap: 8 }}>
                        <Text style={{ color: V.mute, fontSize: 12.5, fontWeight: '600' }}>{t('Send a destination to the car')}</Text>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <TextInput value={dest} onChangeText={setDest} placeholder={t('Address')} placeholderTextColor={V.faint} accessibilityLabel={t('Address')}
                            style={{ flex: 1, minHeight: 48, borderRadius: 14, paddingHorizontal: 14, backgroundColor: V.surf2, color: V.ink, fontSize: 15, borderWidth: 1, borderColor: V.line }} />
                          <Btn text={t('Send')} icon="send" onPress={goDest} />
                        </View>
                        {places.length ? (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {places.slice(0, 8).map((pl) => (
                              <Pressable key={pl.id} onPress={() => setAsk({ act: 'destination', lat: pl.lat, lng: pl.lng, label: pl.name })} accessibilityRole="button"
                                style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 99, backgroundColor: V.surf2, borderWidth: 1, borderColor: V.line }}>
                                <Text style={{ color: V.ink, fontSize: 13, fontWeight: '600' }}>{pl.name}</Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    {can('schedule') ? (
                      <View style={{ gap: 8 }}>
                        <Text style={{ color: V.mute, fontSize: 12.5, fontWeight: '600' }}>{st.sched ? t('Charging schedule: {s}', { s: st.sched }) : t('Charging schedule')}</Text>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          {[[sStart, setSStart, t('Start')], [sStop, setSStop, t('Stop')]].map(([val, set, l]) => (
                            <TextInput key={l as string} value={val as string} onChangeText={set as (s: string) => void} placeholder="23:00" maxLength={5} keyboardType="numbers-and-punctuation" placeholderTextColor={V.faint} accessibilityLabel={l as string}
                              style={{ flex: 1, minHeight: 48, borderRadius: 14, paddingHorizontal: 14, backgroundColor: V.surf2, color: V.ink, fontSize: 16, textAlign: 'center', borderWidth: 1, borderColor: V.line }} />
                          ))}
                          <Btn text={t('Set')} icon="clock" onPress={goSched} />
                        </View>
                        {can('schedule_off') && st.sched ? <Btn text={t('Turn off schedule')} onPress={() => setAsk({ act: 'schedule_off' })} /> : null}
                      </View>
                    ) : null}
                    {ferr ? <Text style={{ color: '#D93A3A', fontSize: 13 }}>{ferr}</Text> : null}
                    {v.locked_out?.length ? (
                      <View style={{ gap: 8, padding: 14, borderRadius: 16, backgroundColor: V.surf2 }}>
                        <Text style={{ color: V.ink, fontSize: 14, fontWeight: '700' }}>{t('More with Premium')}</Text>
                        <Text style={{ color: V.mute, fontSize: 13 }}>{v.locked_out.map((a) => t(NAME[a] || a)).join(', ')}</Text>
                        <Btn text={t('See plans')} kind="blue" onPress={() => openTool('/plan', t('Plan'))} />
                      </View>
                    ) : null}
                    {v.car?.needs_ok ? <Text style={{ color: V.mute, fontSize: 13, textAlign: 'center' }}>{t('To control this car, connect it again on oenod.com and allow car controls.')}</Text> : null}
                  </View>
                ) : <Text style={{ color: V.mute, fontSize: 13, textAlign: 'center' }}>{t('Only the owner or an admin can lock, unlock or charge this car.')}</Text>
              ) : null}

              {v?.log.length ? (
                <Card title={t('Recent commands')}>
                  {v.log.map((l) => <Item key={l.id} left={<Dot icon={l.status === 'done' ? 'check' : l.status === 'failed' ? 'x' : 'clock'} tone={l.status === 'done' ? 'good' : l.status === 'failed' ? 'bad' : 'nv'} />}
                    title={t(NAME[l.action as Act] || l.action) + (l.value ? ` ${l.value}%` : '')} sub={[l.by_name, l.message].filter(Boolean).join(' · ')} right={ago(l.created_at, now)} />)}
                </Card>
              ) : null}
            </>
          ) : null}
          <Text style={{ color: V.mute, fontSize: 12, textAlign: 'center' }}>{t('Full map and history on {s}', { s: BASE.replace(/^https?:\/\//, '') })}</Text>
        </>
      ) : null}
    </Sheet>
  );
}

function AlertSheet({ open, data, onClose, onSaved }: { open: boolean; data: Alerts | null; onClose: () => void; onSaved: () => void }) {
  const [on, setOn] = useState<Record<string, boolean>>({});
  const [mail, setMail] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!data) return;
    setOn(Object.fromEntries(data.kinds.map((k) => [k.k, k.on]))); setMail(Object.fromEntries(data.kinds.map((k) => [k.k, k.email])));
  }, [data, open]);
  const save = async () => {
    setBusy(true);
    try { await put('/api/vehicles/gps/alerts', { on: Object.keys(on).filter((k) => on[k]), email: Object.keys(mail).filter((k) => mail[k]) }); onSaved(); onClose(); }
    catch { /* keeps the sheet open */ } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} title={t('Choose alerts')} onClose={onClose}>
      {data?.kinds.map((k) => (
        <View key={k.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
          <Text style={{ flex: 1, color: V.ink, fontSize: 15 }}>{t(k.label)}</Text>
          <Pressable onPress={() => setMail((m) => ({ ...m, [k.k]: !m[k.k] }))} accessibilityRole="checkbox" accessibilityState={{ checked: !!mail[k.k] }} disabled={!on[k.k]}
            style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 99, backgroundColor: mail[k.k] && on[k.k] ? V.ice : V.surf2, opacity: on[k.k] ? 1 : 0.4 }}>
            <Text style={{ color: V.ink, fontSize: 12, fontWeight: '600' }}>{t('Email')}</Text>
          </Pressable>
          <Switch value={!!on[k.k]} onValueChange={(b) => setOn((o) => ({ ...o, [k.k]: b }))} accessibilityLabel={t(k.label)} />
        </View>
      ))}
      <Btn text={t('Save')} icon="check" kind="blue" onPress={save} busy={busy} />
    </Sheet>
  );
}
