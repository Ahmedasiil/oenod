// Cars (managers): every GPS tracker and connected car, where it is, and for cars connected through
// "OnStar & connected cars" the car controls from oenod.com (lock, unlock, charging). Commands need the
// owner or an admin, always ask "Are you sure?" first, and a pending command is checked again until the car answers.
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { BASE, get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { t } from '../lib/i18n';
import { V } from '../ui/M6';
import { Btn, Card, Chips, Dot, Hero, Item, None, Sheet, State, Tag, ToolPage } from '../ui/T1';

type Dev = { id: number; provider: string; name: string; vehicle_name: string | null; plate: string | null; lat: number | null; lng: number | null; speed_kmh: number | null;
  fix_at: string | null; odometer_km: number | null; fuel_pct: number | null; ignition: number | boolean | null; address: string | null; hidden: number | null; first_name: string | null; last_name: string | null };
type List = { devices: Dev[]; admin: boolean; now: string };
type St = { locked?: boolean | null; charging?: boolean | null; plugged?: boolean | null; soc?: number | null; range_km?: number | null; limit?: number | null; ev?: boolean; at?: string | null };
type Act = 'lock' | 'unlock' | 'charge_start' | 'charge_stop' | 'charge_limit';
type CarView = { car: { state: St; mode: string; updated_at: string | null; needs_ok: boolean } | null; actions: Act[]; admin: boolean;
  log: { id: number; action: string; value: number | null; status: string; message: string | null; created_at: string; by_name: string | null }[] };
type Cmd = { id: number; status: 'done' | 'pending' | 'failed'; message: string; retry_s?: number };

const NAME: Record<Act, string> = { lock: 'Lock', unlock: 'Unlock', charge_start: 'Start charging', charge_stop: 'Stop charging', charge_limit: 'Set charge limit' };
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
      <CarSheet dev={open} now={now} onClose={() => setOpen(null)} />
    </ToolPage>
  );
}

function CarSheet({ dev, now, onClose }: { dev: Dev | null; now: number; onClose: () => void }) {
  const [v, setV] = useState<CarView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ act: Act; percent?: number } | null>(null);
  const [cmd, setCmd] = useState<Cmd | null>(null);
  const [sending, setSending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const load = (id: number) => get<CarView>(`/api/vehicles/gps/device/${id}/car`).then((r) => { setV(r); setErr(null); }).catch((e) => setErr(e?.message || t('Could not load this car.')));
  useEffect(() => {
    setV(null); setErr(null); setAsk(null); setCmd(null);
    if (dev && dev.provider === 'onstar') load(dev.id);
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
      const r = await post<Cmd>(`/api/vehicles/gps/device/${dev.id}/control`, { action: ask.act, confirm: true, ...(ask.act === 'charge_limit' ? { percent: ask.percent } : {}) });
      setCmd(r); setAsk(null); poll(r, dev.id);
    } catch (e: any) { setCmd({ id: 0, status: 'failed', message: e?.message || t('The car didn\'t do it.') }); setAsk(null); }
    finally { setSending(false); }
  };

  const st = v?.car?.state || {};
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
              {cmd ? <Tag text={cmd.message} tone={cmd.status === 'done' ? 'good' : cmd.status === 'failed' ? 'bad' : 'info'} /> : null}

              {ask ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: V.ink, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                    {ask.act === 'charge_limit' ? t('Set the charge limit to {n}%?', { n: ask.percent || 80 }) : t('{a} {c}? Are you sure?', { a: t(NAME[ask.act]), c: title(dev) })}
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
