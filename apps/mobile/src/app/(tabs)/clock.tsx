import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { formatDate } from '@oenod/i18n';
import { Coffee, LogIn, LogOut, MapPin, Navigation, ShieldCheck } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { currentPosition } from '@/lib/location';
import { hoursBetween, time } from '@/lib/format';
import { locale, t } from '@/lib/i18n';
import { C, F } from '@/lib/theme';
import type { ClockState, Me } from '@/lib/me';
import { Badge, Button, Card, ErrorText, IconTile, Loading, Progress, Row, Screen, T } from '@/components/ui';

type Action = 'in' | 'out' | 'break_start' | 'break_end';
const RING = 236, STROKE = 14, RADIUS = (RING - STROKE) / 2, CIRC = 2 * Math.PI * RADIUS;

export default function ClockScreen() {
  const { session, can } = useAuth();
  const { data, error, refreshing, reload, refetch } = useApi<ClockState>('/api/time/clock');
  const me = useApi<Me>(can('me') ? '/api/me' : null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  useFocusEffect(useCallback(() => { refetch(); }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  // While clocked in with sharing on, send a location ping every two minutes so managers see the live map.
  const sharing = Boolean(session?.employee?.shareLiveLocation);
  useEffect(() => {
    if (!data?.open || !sharing) return;
    const ping = async () => { const p = await currentPosition(); if (p) api('/api/live/ping', { body: p }).catch(() => {}); };
    ping();
    const i = setInterval(ping, 120_000);
    return () => clearInterval(i);
  }, [data?.open?.id, sharing]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (action: Action) => {
    setErr(null); setNote(null); setBusy(action);
    try {
      const p = action === 'in' || action === 'out' ? await currentPosition() : null;
      if (!p && action === 'in') setNote("Location is off, so your manager will see this punch without a place.");
      await api('/api/time/clock', { body: { action, source: 'MOBILE', ...(p ? { lat: p.lat, lng: p.lng } : {}) } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await refetch();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setErr((e as Error).message);
    } finally { setBusy(null); }
  };

  if (!data && !error) return <Screen><Loading /></Screen>;
  const open = data?.open;
  const onBreak = Boolean(data?.onBreak);
  const secs = open ? Math.max(0, Math.floor((now - new Date(open.clockIn).getTime()) / 1000) - (open.breakMinutes ?? 0) * 60) : 0;
  const hh = String(Math.floor(secs / 3600)).padStart(2, '0'), mm = String(Math.floor((secs % 3600) / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
  // The ring fills toward today's shift length (or eight hours when there's no shift).
  const shift = me.data?.shifts.find((s) => new Date(s.start).toDateString() === new Date().toDateString());
  const target = (shift ? hoursBetween(shift.start, shift.end) : 8) * 3600;
  const pct = Math.min(1, secs / target);
  const color = onBreak ? '#F5B83D' : C.navy;
  const week = data?.hoursThisWeek ?? 0;

  return (
    <Screen title={t('modules.time')} subtitle={formatDate(locale(), new Date(), { weekday: 'long', month: 'long', day: 'numeric' })} refreshing={refreshing} onRefresh={reload}>
      <ErrorText text={error} />

      <Card style={{ alignItems: 'center', paddingVertical: 26, gap: 18 }}>
        <Badge dot tone={onBreak ? 'amber' : open ? 'green' : 'gray'} text={onBreak ? t('me.onBreak') : open ? `${t('me.clockedIn')} · ${time(open.clockIn)}` : t('me.clockedOut')} />
        <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={onBreak ? '#F5B83D' : C.blue} />
                <Stop offset="1" stopColor={color} />
              </SvgGradient>
            </Defs>
            <Circle cx={RING / 2} cy={RING / 2} r={RADIUS} stroke={C.hair} strokeWidth={STROKE} fill="none" />
            {open && <Circle cx={RING / 2} cy={RING / 2} r={RADIUS} stroke="url(#g)" strokeWidth={STROKE} fill="none" strokeLinecap="round"
              strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={CIRC * (1 - Math.max(pct, 0.005))} transform={`rotate(-90 ${RING / 2} ${RING / 2})`} />}
          </Svg>
          <T v="label">{open ? t('me.hoursWorked') : t('common.today')}</T>
          <Text style={st.timer}>{hh}:{mm}<Text style={st.secs}>:{ss}</Text></Text>
          <T v="small">{shift ? `${time(shift.start)} – ${time(shift.end)}` : t('me.noShift')}</T>
        </View>

        <View style={{ alignSelf: 'stretch', gap: 10 }}>
          {!open ? (
            <Button big variant="primary" title={t('me.clockIn')} icon={<LogIn color="#fff" size={20} />} loading={busy === 'in'} onPress={() => act('in')} />
          ) : (
            <>
              <Button big variant={onBreak ? 'primary' : 'soft'} title={onBreak ? t('me.endBreak') : t('me.startBreak')} icon={<Coffee color={onBreak ? '#fff' : C.navy} size={19} />} loading={busy === 'break_start' || busy === 'break_end'} onPress={() => act(onBreak ? 'break_end' : 'break_start')} />
              <Button big variant="danger" title={t('me.clockOut')} icon={<LogOut color={C.red} size={19} />} loading={busy === 'out'} disabled={onBreak} onPress={() => act('out')} />
            </>
          )}
        </View>
        <ErrorText text={err} />
        {note && <T v="small" style={{ textAlign: 'center' }}>{note}</T>}
      </Card>

      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ gap: 2 }}>
            <T v="small">{t('common.thisWeek')}</T>
            <Text style={st.week}>{week}<Text style={st.weekUnit}> h</Text></Text>
          </View>
          <T v="caption">40h</T>
        </View>
        <Progress value={week / 40} height={8} />
      </Card>

      <Card padded={false} style={{ paddingVertical: 4 }}>
        <Row
          icon={<IconTile tone={sharing ? 'green' : 'blue'}>{sharing ? <Navigation color={C.green} size={18} /> : <MapPin color={C.blue} size={18} />}</IconTile>}
          title={sharing ? 'Live location is on' : 'Location only at clock in/out'}
          sub={sharing ? 'While you are clocked in and the app is open, your manager sees you on the live map.' : 'Turn on live location in More if your team uses the live map.'} />
        <View style={st.sep} />
        <Row icon={<IconTile tone="violet"><ShieldCheck color={C.violet} size={18} /></IconTile>} title="Your punches are protected" sub="Every clock in and out is time-stamped and kept in your timesheet." />
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  timer: { fontFamily: F.display, fontSize: 46, color: C.ink, letterSpacing: -1.5, fontVariant: ['tabular-nums'], marginVertical: 2 },
  secs: { fontFamily: F.displayLight, fontSize: 26, color: C.muted, letterSpacing: 0 },
  week: { fontFamily: F.display, fontSize: 28, color: C.ink, letterSpacing: -0.6 },
  weekUnit: { fontFamily: F.medium, fontSize: 15, color: C.muted },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: 68 },
});
