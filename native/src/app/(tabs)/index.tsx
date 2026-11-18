import React, { useEffect, useState } from 'react';
import { Alert, Animated, Easing, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AskBar, BlackCard, Chip, GlanceGrid, HealthBar, KpiStrip, LightRow, NavyCard, QuickAccess, Sec as ProSec, Suggest, type Glance, type Kpi, type QA } from '../../ui/Pro';
import Svg, { Defs, LinearGradient as SvgGrad, Path, Rect, Stop } from 'react-native-svg';
import { Logo } from '../../ui/Logo';
import { BASE } from '../../lib/api';
import { openTool } from '../web';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../lib/auth';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { greeting, hm, minutesBetween, money, time, day } from '../../lib/format';
import { C, S } from '../../lib/theme';
import { Avatar, B, Button, Card, Divider, Empty, ErrorBox, H2, ListRow, Loading, Muted, Pill, Row, Screen, Stat } from '../../ui/kit';
import { DateTile, IconTile, tint } from '../../ui/Summary';
import { Icon, IconName } from '../../ui/Icon';
import { Pressy, Rise, useCountUp } from '../../ui/Motion';
import { t } from '../../lib/i18n';
import { currentFix, syncTracking, waitForConsent, type GeoMe } from '../../lib/geo';
import { syncLive } from '../../lib/live';
import { BriefBar, HeroChip, StatTrio } from '../../ui/Mid';
import { type Mini, type Tx } from '../../ui/M6';
import { Band, card, Ghost, H, HChip, HSec, Legend, LEGEND, NeedCard, Ph, Primary, TileGrid, type Need as HNeed, type TileItem } from '../../ui/H';
import type { PhName } from '../../ui/phPaths';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PoweredBy } from '../../ui/Brand';

type Clock = {
  employee: { id: number; name: string; job_title: string | null; location_id: number | null } | null;
  open: { id: number; clock_in: string; break_started_at: string | null; break_minutes: number } | null;
  open_minutes: number;
  today_minutes: number;
  next_shift: { starts_at: string; ends_at: string; role: string | null; location?: string | null } | null;
};

function useTick(on: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => set((x) => x + 1), 15000);
    return () => clearInterval(id);
  }, [on]);
}

function ClockCard({ clock, onChange }: { clock: Clock; onChange: (c: Clock) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const open = clock.open;
  const onBreak = !!open?.break_started_at;
  useTick(!!open);
  const nowUtc = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const worked = open ? Math.max(0, minutesBetween(open.clock_in, nowUtc) - (open.break_minutes || 0) - (onBreak ? minutesBetween(open.break_started_at, nowUtc) : 0)) : 0;

  const [geo, setGeo] = useState<GeoMe | null>(null);
  useEffect(() => { if (open) syncTracking().then(setGeo); }, [!!open]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = (msg: string) => { if (Platform.OS === 'web') window.alert(msg); else Alert.alert(t('Not done'), msg); };
  const act = async (action: 'in' | 'out' | 'break' | 'resume', retried = false): Promise<void> => {
    setBusy(action);
    try {
      let body: Record<string, unknown> = { action };
      if (action === 'in' || action === 'out') {
        const f = await currentFix();
        body = { ...body, ...f };
      }
      const r = await post<Clock>('/api/me/clock', body);
      onChange(r);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      syncTracking().then(setGeo);
    } catch (e: any) {
      if (e?.data?.geo_consent && !retried) {
        setBusy(null);
        router.push('/geo-consent');
        if (await waitForConsent()) return act(action, true);
        return;
      }
      if (e?.data?.geo_need_location) say(e.message + '\n\n' + t('Turn on location for OENOD in your phone settings (precise location), then try again.'));
      else say(e.message);
    } finally { setBusy(null); }
  };
  const gs = geo?.session?.state;
  const geoNote = !open || !geo?.session ? null
    : gs === 'outside' ? t('You are outside {s}. Time may not count unless your manager approves it.', { s: geo.session.site })
    : gs === 'off' ? t('Location is off. Turn it back on so your time counts at {s}.', { s: geo.session.site })
    : gs === 'lost' ? t('OENOD cannot confirm you are at {s}. Open the app with location on.', { s: geo.session.site })
    : gs === 'inside' ? t('On site at {s}. Location is shared until you clock out or start a break.', { s: geo.session.site })
    : null;

  return (
    <View style={{ gap: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: '#8B90A8', fontWeight: '600', fontSize: 12, letterSpacing: 1.4 }}>{t('Time clock').toUpperCase()}</Text>
        {open ? (onBreak ? <Pill text={t('On break')} kind="warn" /> : <LivePill text={t('Clocked in')} />) : <Pill text={t('Clocked out')} kind="plain" />}
      </Row>
      <Text style={{ color: '#FFFFFF', fontSize: 48, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="polite">
        {open ? hm(worked) : hm(clock.today_minutes)}
      </Text>
      <Text style={{ color: '#C9D3EA' }}>
        {open ? t('Since {t}', { t: time(open.clock_in) }) + (onBreak ? t(' · break since {t}', { t: time(open.break_started_at) }) : '') : t(clock.today_minutes ? 'Worked today' : 'Not clocked in yet today')}
      </Text>
      {!open ? (
        <Button title={t('Clock in')} icon="clock" kind="light" onPress={() => act('in')} busy={busy === 'in'} />
      ) : onBreak ? (
        <Button title={t('End break')} icon="coffee" kind="light" onPress={() => act('resume')} busy={busy === 'resume'} />
      ) : (
        <Row>
          <Button title={t('Break')} icon="coffee" kind="glass" onPress={() => act('break')} busy={busy === 'break'} style={{ flex: 1 }} />
          <Button title={t('Clock out')} icon="logout" kind="danger" onPress={() => act('out')} busy={busy === 'out'} style={{ flex: 1 }} />
        </Row>
      )}
      {geoNote ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: gs === 'inside' ? 'rgba(255,255,255,0.08)' : C.warnSoft, borderRadius: 12, padding: 10 }}>
          <Icon name="pin" size={16} color={gs === 'inside' ? '#C9D3EA' : C.warn} />
          <Text style={{ flex: 1, color: gs === 'inside' ? '#C9D3EA' : C.ink, fontSize: 13 }}>{geoNote}</Text>
        </View>
      ) : null}
      {clock.next_shift ? (
        <Text style={{ color: '#C9D3EA', fontSize: 13 }}>
          {t('Next shift: {d}', { d: `${day(clock.next_shift.starts_at)}, ${time(clock.next_shift.starts_at)}–${time(clock.next_shift.ends_at)}` })}{clock.next_shift.role ? ` · ${clock.next_shift.role}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

const ROLE_LABEL: Record<string, string> = { owner: 'Owner', admin: 'Admin', manager: 'Manager' };

type Quick = { icon: IconName; label: string; go: () => void; live?: boolean };
// Navy Glass Pro (3.9.1): a black card floating on the navy header, with a thin graphite line.
const glass = { borderRadius: 24, padding: 18, backgroundColor: '#0D0F18', borderWidth: 1, borderColor: '#1F2233',
  shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8 } as const;

/** Thin sales line with a soft fill, drawn from the last 14 days. */
function Sparkline({ values }: { values: number[] }) {
  const [w, setW] = useState(300);
  const h = 46;
  const max = Math.max(1, ...values), min = Math.min(...values);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * w, h - 4 - ((v - min) / Math.max(1, max - min)) * (h - 10)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: h, marginTop: 10 }}>
      {values.length > 1 ? (
        <Svg width={w} height={h}>
          <Defs><SvgGrad id="spk" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#B9C4FF" stopOpacity={0.35} /><Stop offset="1" stopColor="#B9C4FF" stopOpacity={0} /></SvgGrad></Defs>
          <Path d={`${line} L${w} ${h} L0 ${h}Z`} fill="url(#spk)" />
          <Path d={line} stroke="#B9C4FF" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );
}

/** Green dot that pulses softly: the only green in the app, used for "live" things. */
export function LiveDot({ size = 7 }: { size?: number }) {
  const v = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }));
    l.start(); return () => l.stop();
  }, [v]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size, backgroundColor: '#12C163',
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }] }} />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: '#12C163' }} />
    </View>
  );
}

function LivePill({ text }: { text?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(18,193,99,0.12)', borderWidth: 1, borderColor: 'rgba(18,193,99,0.28)' }}>
      <LiveDot size={6} />
      <Text style={{ color: '#3BD884', fontSize: 11.5, fontWeight: '700', letterSpacing: 0.2 }}>{text || t('Live')}</Text>
    </View>
  );
}

function SalesGlass({ x }: { x: any }) {
  const sales = useCountUp(Number(x?.sales_today || 0));
  if (!x) return <View style={[glass, { height: 170, justifyContent: 'center' }]}><Loading /></View>;
  const growth = x.sales_prev_week ? Math.round(((x.sales_week - x.sales_prev_week) / x.sales_prev_week) * 100) : null;
  const mini: [string, string][] = [[String(x.orders_today ?? 0), t('Orders')], [x.labor_pct == null ? '—' : `${Math.round(x.labor_pct)}%`, t('Labour')], [String((x.on_clock || []).length), t('Working now')]];
  return (
    <View style={glass}>
      <Row><Text style={{ color: '#8B90A8', fontSize: 12, fontWeight: '600', letterSpacing: 1.4, flex: 1 }}>{t("Today's sales").toUpperCase()}</Text><LivePill /></Row>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -1, flex: 1 }} numberOfLines={1}>{money(sales)}</Text>
        {growth == null ? null : <Text style={{ color: growth >= 0 ? '#5BE0A8' : '#F2B33D', fontWeight: '600', fontSize: 13, marginBottom: 5 }}>{t('{p}% vs last week', { p: `${growth >= 0 ? '+' : ''}${growth}` })}</Text>}
      </View>
      <Sparkline values={(x.series || []).map((d: any) => Number(d.total || 0))} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {mini.map(([v, l]) => (
          <View key={l} style={{ flex: 1, borderRadius: 14, padding: 10, backgroundColor: '#1A1D2B', borderWidth: 1, borderColor: '#23273A' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{v}</Text>
            <Text style={{ color: '#8B90A8', fontSize: 11.5 }} numberOfLines={1}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Quick actions (3.9.1): four black tiles with white icons, one tap to the things people open most. */
function QuickRow({ items }: { items: Quick[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map((q, n) => (
        <Rise key={q.label} delay={60 + n * 40} style={{ flex: 1 }}>
          <Pressy onPress={q.go} accessibilityRole="button" accessibilityLabel={q.label}
            style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingTop: 12, paddingBottom: 10, alignItems: 'center', gap: 8,
              shadowColor: '#000C58', shadowOpacity: C.dark ? 0 : 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D0F18', borderWidth: 1, borderColor: '#1F2233' }}>
              <Icon name={q.icon} color="#FFFFFF" size={21} duo={false} />
              {q.live ? <View style={{ position: 'absolute', top: 7, right: 7 }}><LiveDot size={6} /></View> : null}
            </View>
            <Text style={{ color: C.ink, fontWeight: '600', fontSize: 11.5 }} numberOfLines={1}>{q.label}</Text>
          </Pressy>
        </Rise>
      ))}
    </View>
  );
}

function CardHead({ title, right, icon }: { title: string; right?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      {icon}
      <Text style={{ flex: 1, color: C.ink, fontSize: 15, fontWeight: '700', letterSpacing: -0.1 }} accessibilityRole="header">{title}</Text>
      {right}
    </View>
  );
}
const Lnk = ({ text, go }: { text: string; go: () => void }) => <Pressable onPress={go} hitSlop={8} accessibilityRole="link"><Text style={{ color: C.blue, fontWeight: '600', fontSize: 13 }}>{text}</Text></Pressable>;

function SparkTile() {
  return (
    <View style={{ width: 28, height: 28, borderRadius: 9, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={28} height={28} style={{ position: 'absolute' }}><Defs><SvgGrad id="st" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#0B1C86" /><Stop offset="1" stopColor="#000738" /></SvgGrad></Defs><Rect width={28} height={28} fill="url(#st)" /></Svg>
      <View style={{ zIndex: 1 }}><Icon name="spark" size={16} color="#FFFFFF" duo={false} /></View>
    </View>
  );
}

/** Ava's morning brief from live data, shown as short bullets. */
function Brief() {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { get<{ brief: string }>('/api/ai/brief').then((r) => setText(r.brief)).catch((e) => setErr(e?.message || '')); }, []);
  const lines = (text || '').split('\n').map((l) => l.replace(/^\s*([-*•]|\d+\.)\s*/, '').trim()).filter(Boolean).slice(0, 4);
  const hour = new Date().getHours();
  return (
    <Card>
      <CardHead icon={<SparkTile />} title={t(hour < 12 ? "Ava's morning brief" : hour < 17 ? "Ava's afternoon brief" : "Ava's evening brief")} right={<Lnk text={t('Ask')} go={() => router.navigate('/ai')} />} />
      {text ? (
        <View style={{ gap: 9 }}>
          {lines.map((l, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 9 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.blue, marginTop: 7 }} />
              <Text style={{ flex: 1, color: C.ink, fontSize: 13.5, lineHeight: 19 }}>
                {l.split(/(\*\*[^*]+\*\*)/g).map((p, n) => p.startsWith('**') ? <Text key={n} style={{ fontWeight: '700' }}>{p.slice(2, -2)}</Text> : <Text key={n} style={{ color: C.sub }}>{p}</Text>)}
              </Text>
            </View>
          ))}
        </View>
      ) : err ? <Muted>{err}</Muted> : <Muted>{t('Ava is reading today’s numbers…')}</Muted>}
    </Card>
  );
}

const AV = ['#17A673', '#D98A1C', '#C2417A', '#0E8FB0', '#2A3BC4', '#0B1C86'];
function OnShift({ list, total }: { list: any[]; total: number }) {
  return (
    <Card onPress={() => router.navigate('/team')}>
      <CardHead title={t('On shift now')} right={<Pill text={total ? t('{a} of {b}', { a: list.length, b: total }) : String(list.length)} kind="good" />} />
      {list.length ? (
        <Row>
          <View style={{ flexDirection: 'row' }}>
            {list.slice(0, 6).map((o: any, i: number) => (
              <View key={o.id} style={{ marginLeft: i ? -9 : 0, borderRadius: 19, borderWidth: 2.5, borderColor: C.card }}>
                <Avatar name={`${o.first_name} ${o.last_name}`} color={o.color || AV[i % AV.length]} size={34} />
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <Lnk text={t('See all')} go={() => router.navigate('/team')} />
        </Row>
      ) : <Muted>{t('Nobody is clocked in right now.')}</Muted>}
    </Card>
  );
}

type Todo = { key: string; text: string; note?: string; go: () => void };
function Todos({ items }: { items: Todo[] }) {
  const [done, setDone] = useState<string[]>([]);
  if (!items.length) return null;
  return (
    <Card>
      <CardHead title={t('Your to-dos')} right={<Text style={{ color: C.faint, fontSize: 12 }}>{t('{a} of {b} done', { a: done.length, b: items.length })}</Text>} />
      {items.map((x, i) => {
        const on = done.includes(x.key);
        return (
          <View key={x.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: C.line }}>
            <Pressable onPress={() => setDone(on ? done.filter((k) => k !== x.key) : [...done, x.key])} accessibilityRole="checkbox" accessibilityState={{ checked: on }} hitSlop={8}
              style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.8, borderColor: on ? '#17A673' : '#C5CBDD', backgroundColor: on ? '#17A673' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {on ? <Icon name="check" size={15} color="#FFFFFF" duo={false} /> : null}
            </Pressable>
            <Pressable onPress={x.go} style={{ flex: 1 }} accessibilityRole="link">
              <Text style={{ color: on ? C.faint : C.ink, fontSize: 14, textDecorationLine: on ? 'line-through' : 'none' }}>{x.text}</Text>
            </Pressable>
            {x.note ? <Text style={{ color: C.faint, fontSize: 12 }}>{x.note}</Text> : null}
          </View>
        );
      })}
    </Card>
  );
}

const SUITES: [string, IconName, string, string][] = [
  ['People', 'users', '#000C58', 'Team, schedule, payroll'], ['Money', 'wallet', '#000C58', 'Wallet, invoices, books'],
  ['Customers', 'chat', '#000C58', 'CRM, reviews, Ava'], ['Operations', 'briefcase', '#000C58', 'Stock, POS, cameras'], ['AI & platform', 'spark', '#000C58', 'AI, Meet, docs'],
];
function Suites() {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 }}>
        <Text style={{ flex: 1, color: C.ink, fontSize: 15, fontWeight: '700' }} accessibilityRole="header">{t('Your suites')}</Text>
        <Lnk text={t('All tools')} go={() => router.navigate('/all')} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ paddingHorizontal: S.lg, gap: 8 }}>
        {SUITES.map(([n, ic, col, sub]) => (
          <Pressy key={n} onPress={() => router.navigate('/all')} accessibilityRole="button" accessibilityLabel={t(n)}
            style={{ width: 132, borderRadius: 18, padding: 14, gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
            <View style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: C.dark ? '#16205E' : col }}><Icon name={ic} size={18} color={C.dark ? '#B9C4FF' : '#FFFFFF'} duo={false} /></View>
            <Text style={{ color: C.ink, fontWeight: '700', fontSize: 13.5 }}>{t(n)}</Text>
            <Text style={{ color: C.faint, fontSize: 11.5, lineHeight: 15 }}>{t(sub)}</Text>
          </Pressy>
        ))}
      </ScrollView>
    </View>
  );
}

const openMeet = () => openTool('/meet', 'OENOD Meet');

/** Ava's briefing as numbered points, in a navy-band card (approved 3.9 look). */
function BriefPro() {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [at] = useState(new Date());
  useEffect(() => { get<{ brief: string }>('/api/ai/brief').then((r) => setText(r.brief)).catch((e) => setErr(e?.message || '')); }, []);
  const lines = (text || '').split('\n').map((l) => l.replace(/^\s*([-*•]|\d+\.)\s*/, '').trim()).filter(Boolean).slice(0, 3);
  return (
    <NavyCard icon="spark" title={t('Your day in 30 seconds')} sub={t("Ava's briefing · updated {t}", { t: at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) })} link={t('Ask')} onLink={() => router.navigate('/ai')}>
      {text ? lines.map((l, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
          <View style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: C.dark ? '#171C44' : '#EEF1FF', marginTop: 1 }}>
            <Text style={{ color: C.dark ? '#B9C4FF' : '#1B2A9E', fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
          </View>
          <Text style={{ flex: 1, color: C.ink, fontSize: 13, lineHeight: 19 }}>
            {l.split(/(\*\*[^*]+\*\*)/g).map((p, n) => p.startsWith('**') ? <Text key={n} style={{ fontWeight: '700' }}>{p.slice(2, -2)}</Text> : <Text key={n} style={{ color: C.sub }}>{p}</Text>)}
          </Text>
        </View>
      )) : <Muted style={{ paddingVertical: 8 }}>{err || t('Ava is reading today’s numbers…')}</Muted>}
    </NavyCard>
  );
}

type TO = { id: number; kind: string; starts_on: string; ends_on: string; status: string; first_name: string; last_name: string };
type SR = { id: number; kind: 'swap' | 'drop' | 'claim'; name: string; target_name: string | null; starts_at: string };

/** "Waiting for you": time off, shift swaps and overdue invoices, with one-tap answers. */
function Waiting({ x, onChanged }: { x: any; onChanged: () => void }) {
  const [to, setTo] = useState<TO[]>([]);
  const [sr, setSr] = useState<SR[]>([]);
  const [busy, setBusy] = useState('');
  const load = () => {
    get<{ requests: TO[] }>('/api/timeoff').then((r) => setTo((r.requests || []).filter((q) => q.status === 'pending'))).catch(() => {});
    get<{ requests: SR[] }>('/api/schedule').then((r) => setSr(r.requests || [])).catch(() => {});
  };
  useEffect(load, []);
  const say = (m: string) => (Platform.OS === 'web' ? window.alert(m) : Alert.alert(t('Not done'), m));
  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try { await fn(); if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); load(); onChanged(); }
    catch (e: any) { say(e.message); } finally { setBusy(''); }
  };
  const rows: React.ReactNode[] = [];
  for (const r of to.slice(0, 3)) {
    const span = r.starts_on === r.ends_on ? day(r.starts_on) : `${day(r.starts_on)} – ${day(r.ends_on)}`;
    rows.push(<LightRow key={'to' + r.id} first={!rows.length} kind="a" title={t('{n} · time off', { n: r.first_name })} sub={span}
      b={{ label: t('Deny'), go: () => run('d' + r.id, () => post(`/api/timeoff/${r.id}/decide`, { status: 'denied' })) }}
      a={{ label: t('Approve'), busy: busy === 'a' + r.id, go: () => run('a' + r.id, () => post(`/api/timeoff/${r.id}/decide`, { status: 'approved' })) }} />);
  }
  for (const r of sr.slice(0, 2)) {
    const what = r.kind === 'swap' ? t('Shift swap {d}', { d: `${day(r.starts_at)} ${time(r.starts_at)}` }) : r.kind === 'claim' ? t('Open shift {d}', { d: `${day(r.starts_at)} ${time(r.starts_at)}` }) : t('Give away {d}', { d: `${day(r.starts_at)} ${time(r.starts_at)}` });
    rows.push(<LightRow key={'sr' + r.id} first={!rows.length} kind="a" title={what} sub={r.target_name ? `${r.name} → ${r.target_name}` : r.name}
      b={{ label: t('Deny'), go: () => run('sd' + r.id, () => post(`/api/schedule/requests/${r.id}/decide`, { decision: 'decline' })) }}
      a={{ label: t('Approve'), busy: busy === 'sa' + r.id, go: () => run('sa' + r.id, () => post(`/api/schedule/requests/${r.id}/decide`, { decision: 'approve' })) }} />);
  }
  if (x?.overdue_count) rows.push(<LightRow key="inv" first={!rows.length} kind="r" title={t('{n} invoices overdue', { n: x.overdue_count })} sub={money(x.overdue_amount)}
    a={{ label: t('Remind'), go: () => router.push('/invoices') }} />);
  if (x?.to_approve) rows.push(<LightRow key="ts" first={!rows.length} kind="a" title={t('Approve {n} timesheets', { n: x.to_approve })} sub={t('Before payroll')}
    a={{ label: t('Review'), go: () => router.push('/timeclock') }} />);
  return (
    <NavyCard icon="bell" title={t('Waiting for you')} sub={rows.length ? t('{n} things need your OK', { n: rows.length }) : t('All caught up')} link={t('See all')} onLink={() => router.navigate('/timeoff')}>
      {rows.length ? rows : <LightRow first kind="g" title={t('Nothing waiting')} sub={t('New requests show up here')} />}
    </NavyCard>
  );
}

type Need = { k: string; title: string; href?: string; from?: string; to?: string; owed?: number; due?: string; amount?: number; qty?: number; unit?: string; starts?: string; role?: string; shifts?: number; minutes?: number };
type DshHome = { needs?: Need[]; forecast?: { points?: { day: string; bal: number }[]; events?: { type: string; i: number; amount: number }[] } | null };
type Meeting = { id: number; title: string; starts_at: string; duration_min?: number; people?: { name?: string }[] };
type Note = { id: number; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };
type Emp = { id: number; name: string; color: string | null; status: string; open_entry: { clock_in: string; break_started_at: string | null } | null };
type Pack = { k: string; label: string; ok: boolean; doc_id?: number | null; state?: string };

const NOTE_IC: Record<string, IconName> = { shift: 'calendar', schedule: 'calendar', timeoff: 'sun', pay: 'cash', payroll: 'cash', approval: 'check', message: 'chat', chat: 'chat', news: 'news', clock: 'clock', alert: 'bell', call: 'phone', invoice: 'doc', review: 'heart' };
const NEED: Record<string, [IconName, string, string]> = { tm: ['clock', 'Timesheets', 'Approve'], open: ['calendar', 'Open shift', 'Fill'], docs: ['doc', 'Documents', 'Open'], ex: ['cash', 'Expense', 'Review'], inv: ['doc', 'Overdue', 'Remind'], bill: ['wallet', 'Bill', 'Open'], quote: ['doc', 'Quote', 'Follow up'], stock: ['box', 'Low stock', 'Order'] };
const openHref = (href: string | null | undefined, title: string) => {
  const h = String(href || '');
  if (h.startsWith('#/')) return openTool(h.slice(1), title);
  if (h.startsWith('/')) return openTool(h, title);
  return router.push('/notifications');
};
const short = (n: number) => (Math.abs(n) >= 1000 ? money(n / 1000, 1).replace(/([0-9])$/, '$1') + 'k' : money(n));
const wkday = (iso?: string | null) => { if (!iso) return ''; const d = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso.replace(' ', 'T') + 'Z'); return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { weekday: 'short' }); };
const sameDay = (iso: string) => { const d = new Date(iso.replace(' ', 'T') + 'Z'); const n = new Date(); return d.toDateString() === n.toDateString(); };
function wx(w: any): string | null {
  const n = w?.now; if (!n || n.temp == null || isNaN(Number(n.temp))) return null;
  const l = String(n.label || '').toLowerCase();
  const g = /snow|flurr/.test(l) ? '❄' : /rain|shower|drizzle|storm/.test(l) ? '☂' : /clear|sun/.test(l) ? '☀' : '☁';
  return `${g} ${Math.round(Number(n.temp))}°`;
}
const soft = <T,>(p: Promise<T>) => p.catch(() => null);

/** Clock in / out / break, with the location check, shared by the home card and the pills under it. */
function useClockAct(onChange: (c: Clock) => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const say = (msg: string) => { if (Platform.OS === 'web') window.alert(msg); else Alert.alert(t('Not done'), msg); };
  const act = async (action: 'in' | 'out' | 'break' | 'resume', retried = false): Promise<void> => {
    setBusy(action);
    try {
      let body: Record<string, unknown> = { action };
      if (action === 'in' || action === 'out') body = { ...body, ...(await currentFix()) };
      const r = await post<Clock>('/api/me/clock', body);
      onChange(r);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      syncTracking();
    } catch (e: any) {
      if (e?.data?.geo_consent && !retried) {
        setBusy(null);
        router.push('/geo-consent');
        if (await waitForConsent()) return act(action, true);
        return;
      }
      if (e?.data?.geo_need_location) say(e.message + '\n\n' + t('Turn on location for OENOD in your phone settings (precise location), then try again.'));
      else say(e.message);
    } finally { setBusy(null); }
  };
  return { act, busy };
}

// Midnight v6 (approved 11-16): every block below is drawn to match the approved preview 1:1.
export default function Home() {
  const { session, isManager } = useAuth();
  const hasEmployee = !!session?.employee;
  const staff = hasEmployee && !isManager;
  const c = useLoad<Clock | null>(() => (hasEmployee ? get<Clock>('/api/me/clock') : Promise.resolve(null)), [hasEmployee]);
  const dash = useLoad<any>(() => (isManager ? get('/api/dashboard') : Promise.resolve(null)), [isManager]);
  const wal = useLoad<any>(() => (isManager ? soft(get('/api/wallet')) : Promise.resolve(null)), [isManager]);
  const home = useLoad<DshHome | null>(() => (isManager ? soft(get<DshHome>('/api/dsh1/home?dept=home')) : Promise.resolve(null)), [isManager]);
  const emps = useLoad<{ employees: Emp[] } | null>(() => (isManager ? soft(get<{ employees: Emp[] }>('/api/employees')) : Promise.resolve(null)), [isManager]);
  const meets = useLoad<{ meetings: Meeting[] } | null>(() => soft(get<{ meetings: Meeting[] }>('/api/meetings')), []);
  const notes = useLoad<{ items: Note[]; unread: number } | null>(() => soft(get<{ items: Note[]; unread: number }>('/api/notifications')), []);
  const wxr = useLoad<any>(() => soft(get('/api/storm/watch')), []);
  const ts = useLoad<{ entries: { clock_in: string; minutes: number }[] } | null>(() => (staff ? soft(get<any>('/api/me/timesheet')) : Promise.resolve(null)), [staff]);
  const pay = useLoad<any>(() => (staff ? soft(get('/api/me/pay')) : Promise.resolve(null)), [staff]);
  const ob = useLoad<{ pack?: Pack[] } | null>(() => (staff ? soft(get<{ pack?: Pack[] }>('/api/ob6/me')) : Promise.resolve(null)), [staff]);
  const [to, setTo] = useState<TO[]>([]);
  const [sr, setSr] = useState<SR[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const loadReq = () => {
    if (!isManager) return;
    get<{ requests: TO[] }>('/api/timeoff').then((r) => setTo((r.requests || []).filter((q) => q.status === 'pending'))).catch(() => {});
    get<{ requests: SR[] }>('/api/schedule').then((r) => setSr(r.requests || [])).catch(() => {});
  };
  useEffect(loadReq, [isManager]); // eslint-disable-line react-hooks/exhaustive-deps
  const clockAct = useClockAct((v) => c.setData(v));
  const first = (session?.user?.name || '').split(' ')[0];
  const unread = session?.notifications || 0;
  const company = session?.company?.name || '';
  const x = dash.data;
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(i); }, []);
  useEffect(() => { if (c.data) syncLive(c.data.open, c.data.next_shift?.location || company); }, [c.data?.open?.clock_in, c.data?.open?.break_started_at, !!c.data?.open]); // eslint-disable-line react-hooks/exhaustive-deps
  const ask = (q?: string) => router.navigate(q ? { pathname: '/ai', params: { q } } : '/ai');
  const open = c.data?.open;
  const onBreak = !!open?.break_started_at;
  const nx = c.data?.next_shift;
  const weather = wx(wxr.data);
  const dateChip = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const refresh = () => { c.refresh(); dash.refresh(); wal.refresh(); home.refresh(); emps.refresh(); meets.refresh(); notes.refresh(); ts.refresh(); pay.refresh(); ob.refresh(); loadReq(); };
  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try { await fn(); setDone((d) => [...d, key]); if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); setTimeout(() => { loadReq(); dash.refresh(); home.refresh(); }, 900); }
    catch (e: any) { if (Platform.OS === 'web') window.alert(e.message); else Alert.alert(t('Not done'), e.message); }
    finally { setBusy(''); }
  };

  // Owner numbers.
  const ser: number[] = (x?.series || []).map((d: any) => Number(d.total ?? d ?? 0));
  const growth = x?.sales_prev_week ? Math.round(((x.sales_week - x.sales_prev_week) / x.sales_prev_week) * 100) : null;
  const onNow = (x?.on_clock || []).length, planned = (x?.shifts_today || []).length;
  const team = (emps.data?.employees || []).filter((e) => e.status !== 'terminated');
  const breaks = team.filter((e) => e.open_entry?.break_started_at).length;
  const fc = home.data?.forecast;
  const nextPay = fc?.events?.find((e) => e.type === 'payroll') || null;
  const payDay = nextPay && fc?.points?.[nextPay.i]?.day ? fc.points[nextPay.i].day : null;
  const upcoming = (meets.data?.meetings || []).filter((m) => new Date(m.starts_at.replace(' ', 'T') + (m.starts_at.includes('Z') || m.starts_at.includes('+') ? '' : 'Z')).getTime() > Date.now() - (m.duration_min || 30) * 60000)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const nm = upcoming[0];
  const items = (notes.data?.items || []).slice(0, 6);

  // Staff numbers.
  const weekAgo = Date.now() - 7 * 86400000;
  const weekMin = (ts.data?.entries || []).filter((e) => new Date(e.clock_in.replace(' ', 'T') + 'Z').getTime() >= weekAgo).reduce((a, e) => a + (e.minutes || 0), 0) + (open ? c.data?.open_minutes || 0 : 0);
  const nowUtc = now.toISOString().replace('T', ' ').slice(0, 19);
  const worked = open ? Math.max(0, minutesBetween(open.clock_in, nowUtc) - (open.break_minutes || 0) - (onBreak ? minutesBetween(open.break_started_at, nowUtc) : 0)) : 0;
  const lastPay = pay.data?.lines?.[0];

  // "Needs you" cards (owners and managers).
  const minis: Mini[] = [];
  if (isManager) {
    for (const r of to.slice(0, 3)) {
      const k = 'to' + r.id;
      const span = r.starts_on === r.ends_on ? day(r.starts_on) : `${day(r.starts_on)} – ${day(r.ends_on)}`;
      minis.push({ tone: 'wh', icon: 'calendar', kind: t('Time off'), title: `${r.first_name} · ${span}`, btn: t('Approve'), busy: busy === k, done: done.includes(k),
        go: () => run(k, () => post(`/api/timeoff/${r.id}/decide`, { status: 'approved' })) });
    }
    for (const r of sr.slice(0, 2)) {
      const k = 'sr' + r.id;
      minis.push({ tone: 'dk', icon: 'chat', kind: r.kind === 'swap' ? t('Swap') : r.kind === 'claim' ? t('Open shift') : t('Give away'), title: `${r.name} · ${day(r.starts_at)} ${time(r.starts_at)}`, btn: t('Approve'), busy: busy === k, done: done.includes(k),
        go: () => run(k, () => post(`/api/schedule/requests/${r.id}/decide`, { decision: 'approve' })) });
    }
    const needs = (home.data?.needs || []).filter((n) => n.k !== 'to');
    if (home.data) {
      for (const n of needs.slice(0, 4)) {
        const m = NEED[n.k] || ['bell', 'Update', 'Open'];
        const extra = n.k === 'inv' || n.k === 'bill' ? money(n.owed) : n.k === 'ex' || n.k === 'quote' ? money(n.amount) : n.k === 'stock' ? `${n.qty ?? ''} ${n.unit || ''}`.trim() : '';
        minis.push({ tone: minis.length % 2 ? 'dk' : 'wh', icon: m[0], kind: t(m[1]), title: extra ? `${n.title} · ${extra}` : n.title, btn: t(m[2]), go: () => openHref(n.href, n.title) });
      }
    } else if (x) {
      if (x.overdue_count) minis.push({ tone: 'dk', icon: 'doc', kind: t('Overdue'), title: t('{n} invoices overdue', { n: x.overdue_count }) + ' · ' + money(x.overdue_amount), btn: t('Remind'), go: () => router.push('/invoices') });
      if (x.to_approve) minis.push({ tone: 'wh', icon: 'clock', kind: t('Timesheets'), title: t('Approve {n} timesheets', { n: x.to_approve }), btn: t('Review'), go: () => router.push('/timeclock') });
    }
  }
  const waiting = minis.filter((m) => !m.done).length;
  if (isManager) minis.push({ tone: 'nv', icon: 'spark', kind: t('Update'), title: t('Business calls are here'), btn: t('See it'), go: () => router.navigate('/phone') });

  // Staff "Needs you": newest notifications.
  const sMinis: Mini[] = staff ? items.filter((n) => !n.read_at).concat(items.filter((n) => n.read_at)).slice(0, 3).map((n, i) => ({
    tone: (['wh', 'nv', 'dk'] as const)[i % 3], icon: NOTE_IC[n.kind] || 'bell', kind: t(n.kind === 'timeoff' ? 'Time off' : n.kind === 'pay' || n.kind === 'payroll' ? 'Pay' : n.kind === 'shift' || n.kind === 'schedule' ? 'Schedule' : 'Update'),
    title: n.title, btn: t('View'), go: () => openHref(n.link, n.title),
  })) : [];

  const activity: Tx[] = items.map((n) => ({
    title: n.title, sub: n.body || undefined, icon: NOTE_IC[n.kind] || 'bell', navy: !n.read_at,
    left: n.link ? t('Open') : '', right: sameDay(n.created_at) ? time(n.created_at) : day(n.created_at), go: () => openHref(n.link, n.title),
  }));

  const pack = ob.data?.pack || [];
  const packOk = pack.filter((p) => p.ok).length;
  const PACK_GO: Record<string, string> = { tax: '/my-pay', deposit: '/my-pay', emergency: '/profile-edit', handbook: '/docs', contract: '/docs' };

  // ---------- 4.0 Navy Daylight (approved 11-17, live preview Jj2DsJyfZSMSmUfPLvDxYc) ----------
  const insets = useSafeAreaInsets();
  const [geo, setGeo] = useState<GeoMe | null>(null);
  useEffect(() => { if (open) syncTracking().then(setGeo).catch(() => {}); }, [!!open]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sec, setSec] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setSec(Date.now()), open ? 1000 : 15000); return () => clearInterval(i); }, [!!open]); // eslint-disable-line react-hooks/exhaustive-deps
  const clk = new Date(sec);
  const hhmm = clk.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const ampm = (hhmm.match(/\s?([AaPp]\.?\s?[Mm]\.?)$/) || [])[1] || '';
  const clockText = ampm ? hhmm.replace(ampm, '').trim() : hhmm;
  const dateText = clk.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const fullName = session?.user?.name || '';
  const initials = (fullName || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const utcMs = (s?: string | null) => (s ? new Date(s.replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? '' : 'Z')).getTime() : 0);
  const onSec = open ? Math.max(0, Math.floor((sec - utcMs(open.clock_in)) / 1000) - (open.break_minutes || 0) * 60 - (onBreak ? Math.floor((sec - utcMs(open.break_started_at)) / 1000) : 0)) : 0;
  const hms = [Math.floor(onSec / 3600), Math.floor((onSec % 3600) / 60), onSec % 60].map((n) => String(n).padStart(2, '0')).join(':');
  const site = geo?.session?.site || nx?.location || company;
  const onSite = geo?.session?.state === 'inside';
  const shiftH = nx ? Math.round((utcMs(nx.ends_at) - utcMs(nx.starts_at)) / 360000) / 10 : 0;

  const band = (
    <Band>
      <View style={{ paddingTop: insets.top + 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo width={68} color="#FFFFFF" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => router.push('/notifications')} accessibilityRole="button" accessibilityLabel={`${t('Notifications')}${unread ? ` (${unread})` : ''}`}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
            <Ph name="bell" size={20} color="#FFFFFF" duo={0.3} />
            {unread ? <View style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' }} /> : null}
          </Pressable>
          <Pressable onPress={() => router.navigate('/me')} accessibilityRole="button" accessibilityLabel={t('Me')}
            style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: H.navy, fontWeight: '800', fontSize: 14 }}>{initials}</Text>
          </Pressable>
        </View>
      </View>
    </Band>
  );

  const greet = (
    <View>
      <Text style={{ fontSize: 14, color: H.muted }}>{greeting()},</Text>
      <Text style={{ fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: H.ink }} numberOfLines={1}>{isManager ? first || fullName : fullName}</Text>
    </View>
  );
  const rowLine = (icon: PhName, strong: string, rest: string, right?: React.ReactNode) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: H.tint, alignItems: 'center', justifyContent: 'center' }}><Ph name={icon} size={16} color={H.blue} /></View>
      <Text style={{ flex: 1, fontSize: 13, color: H.ink }} numberOfLines={1}><Text style={{ fontWeight: '700' }}>{strong}</Text>{rest ? ` · ${rest}` : ''}</Text>
      {right}
    </View>
  );

  const staffCard = c.data ? (
    <View style={[card, { padding: 18 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {greet}
        {open ? <HChip text={onBreak ? t('On break') : t('Clocked in')} bg={onBreak ? '#FBF0E2' : H.tint} fg={onBreak ? '#A35A00' : H.blue} live={!onBreak} />
          : <HChip text={t('Not clocked in')} />}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 14 }}>
        <Text style={{ fontSize: 46, lineHeight: 50, fontWeight: '800', letterSpacing: -1.5, color: H.ink, fontVariant: ['tabular-nums'] }} accessibilityLabel={hhmm}>{clockText}</Text>
        <View style={{ paddingBottom: 6 }}>
          {ampm ? <Text style={{ fontSize: 15, fontWeight: '800', color: H.ink }}>{ampm.toUpperCase()}</Text> : null}
          <Text style={{ fontSize: 12, color: H.muted }}>{dateText}</Text>
        </View>
      </View>
      <View style={{ marginTop: 14, gap: 8 }}>
        {site ? rowLine('map-pin', site, open && geo?.session ? (onSite ? '' : t('Location not confirmed')) : '', onSite ? <HChip text={t('On site')} bg={H.tint} fg={H.blue} live h={22} /> : null) : null}
        {nx ? rowLine('calendar-dots', nx.role || t('Your shift'), sameDay(nx.starts_at) ? `${time(nx.starts_at)} – ${time(nx.ends_at)}` : `${day(nx.starts_at)} ${time(nx.starts_at)}`, shiftH ? <Text style={{ fontSize: 12, color: H.muted }}>{shiftH} h</Text> : null)
          : rowLine('calendar-dots', t('No shift today'), t('See your schedule'))}
      </View>
      {open ? (
        <View style={{ marginTop: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: H.tint, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: H.navy }}>{onBreak ? t('On break') : t('Time on shift')}</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: H.navy, fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="polite">{hms}</Text>
        </View>
      ) : null}
      <Primary style={{ marginTop: 14 }} icon="clock" ink={!!open} busy={clockAct.busy === 'in' || clockAct.busy === 'out'}
        text={open ? t('Clock out') : t('Clock in')} onPress={() => clockAct.act(open ? 'out' : 'in')} />
      {open ? (
        <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
          <Ghost text={onBreak ? t('End break') : t('Start break')} icon="coffee" busy={clockAct.busy === 'break' || clockAct.busy === 'resume'} onPress={() => clockAct.act(onBreak ? 'resume' : 'break')} />
          <Ghost text={t('My hours')} icon="timer" onPress={() => router.push('/timesheet')} />
        </View>
      ) : null}
      {open && geo?.session && geo.session.state !== 'inside' ? (
        <Text style={{ marginTop: 10, fontSize: 12.5, color: '#A35A00' }}>{t('Turn on location for OENOD in your phone settings (precise location), then try again.')}</Text>
      ) : null}
    </View>
  ) : (
    <View style={[card, { padding: 18, minHeight: 200, justifyContent: 'center' }]}>{c.error ? <ErrorBox text={c.error} onRetry={c.reload} /> : <Loading />}</View>
  );

  // Staff "Needs you": setup steps first, then unread updates.
  const sNeeds: HNeed[] = [];
  for (const p of pack.filter((q) => !q.ok).slice(0, 3)) {
    sNeeds.push({ key: 'p' + p.k, icon: p.k === 'contract' || p.k === 'handbook' ? 'pencil-simple-line' : p.k === 'tax' || p.k === 'deposit' ? 'money' : 'user-circle', tone: 'navy',
      title: t(p.label), sub: p.k === 'contract' || p.k === 'handbook' ? t('Sign') : t('Fill in'), go: () => openTool(p.doc_id ? `/docs/${Number(p.doc_id)}` : PACK_GO[p.k] || '/docs', t(p.label)) });
  }
  items.filter((n) => !n.read_at).slice(0, 4).forEach((n, i) => {
    sNeeds.push({ key: 'n' + n.id, icon: PH_NOTE[n.kind] || 'bell', tone: (['blue', 'ink', 'navy'] as const)[i % 3], title: n.title, sub: n.body || (sameDay(n.created_at) ? time(n.created_at) : day(n.created_at)), go: () => openHref(n.link, n.title) });
  });

  const staffTiles: TileItem[] = [
    { label: t('Schedule'), icon: 'calendar-dots', tone: 'ink', go: () => router.navigate('/schedule') },
    { label: t('Time off'), icon: 'sun-horizon', tone: 'ink', go: () => router.navigate('/timeoff') },
    { label: t('Pay stubs'), icon: 'money', tone: 'blue', go: () => router.push('/pay') },
    { label: t('Documents'), icon: 'file-text', tone: 'blue', badge: pack.filter((p) => !p.ok && (p.k === 'contract' || p.k === 'handbook')).length || undefined, go: () => openTool('/docs', t('Documents')) },
    { label: t('Training'), icon: 'graduation-cap', tone: 'navy', go: () => openTool('/academy', t('Academy')) },
    { label: t('Meet'), icon: 'video-camera', tone: 'navy', go: () => router.navigate('/meet') },
    { label: t('Messages'), icon: 'chat-circle-dots', tone: 'navy', go: () => openTool('/chat', t('Team chat')) },
    { label: t('Profile'), icon: 'user', tone: 'navy', go: () => router.navigate('/me') },
  ];

  // Today timeline (staff).
  const tl: { at: string; title: string; sub?: string; dot: string; go?: () => void }[] = [];
  if (open) tl.push({ at: time(open.clock_in), title: t('Clocked in'), sub: site, dot: '#12A25B' });
  if (nx && sameDay(nx.starts_at)) {
    if (!open) tl.push({ at: time(nx.starts_at), title: t('Shift starts'), sub: nx.role || site, dot: H.navy, go: () => router.navigate('/schedule') });
    tl.push({ at: time(nx.ends_at), title: t('Shift ends'), sub: shiftH ? `${shiftH} h` : undefined, dot: H.ink, go: () => router.navigate('/schedule') });
  }
  for (const m of upcoming.filter((m) => sameDay(m.starts_at)).slice(0, 2)) tl.push({ at: time(m.starts_at), title: m.title, sub: t('OENOD Meet'), dot: H.blue, go: () => router.navigate('/meet') });
  if (pay.data?.next_pay_date) tl.push({ at: `${wkday(pay.data.next_pay_date)} ${new Date(pay.data.next_pay_date + 'T12:00:00').getDate()}`, title: t('Next pay'), sub: lastPay ? t('Last pay {m}', { m: money(Number(lastPay.net || lastPay.gross || 0)) }) : undefined, dot: H.blue, go: () => router.push('/pay') });

  // Owner.
  const late = Math.max(0, planned - onNow);
  const oNeeds: HNeed[] = minis.filter((m) => !m.done && m.tone !== 'nv').map((m, i) => ({
    key: m.kind + i, icon: PH_ICON[m.icon] || 'bell', tone: (['navy', 'ink', 'blue'] as const)[i % 3], title: m.title, sub: m.btn ? `${m.kind} · ${m.btn}` : m.kind, go: m.go,
  }));
  const ownerTiles: TileItem[] = [
    { label: t('Team'), icon: 'users-three', tone: 'navy', go: () => router.navigate('/team') },
    { label: t('Meet'), icon: 'video-camera', tone: 'navy', go: () => router.navigate('/meet') },
    { label: t('Calls'), icon: 'phone', tone: 'navy', go: () => router.navigate('/phone') },
    { label: t('Payroll'), icon: 'money', tone: 'blue', go: () => router.push('/payroll') },
    { label: t('Invoices'), icon: 'receipt', tone: 'blue', badge: x?.overdue_count || undefined, go: () => router.push('/invoices') },
    { label: t('Schedule'), icon: 'calendar-dots', tone: 'ink', go: () => router.navigate('/schedule') },
    { label: t('Time clock'), icon: 'clock', tone: 'ink', badge: x?.to_approve || undefined, go: () => router.push('/timeclock') },
    { label: t('All tools'), icon: 'squares-four', tone: 'light', go: () => router.navigate('/all') },
  ];
  const week = ser.slice(-7);
  const wMax = Math.max(1, ...week);
  const stat = (v: string, l: string, go: () => void, mid?: boolean) => (
    <Pressable onPress={go} accessibilityRole="button" accessibilityLabel={`${l} ${v}`}
      style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderLeftWidth: mid ? 1 : 0, borderRightWidth: mid ? 1 : 0, borderColor: 'rgba(255,255,255,0.12)' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.8 }} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
      <Text style={{ color: H.soft, fontSize: 11 }}>{l}</Text>
    </Pressable>
  );
  const ownerCard = (
    <View style={[card, { padding: 18 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {greet}
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: H.ink, fontVariant: ['tabular-nums'] }}>{clockText} <Text style={{ fontSize: 13 }}>{ampm.toUpperCase()}</Text></Text>
          <Text style={{ fontSize: 12, color: H.muted }}>{dateText}</Text>
        </View>
      </View>
      {company ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}><Ph name="map-pin" size={15} color={H.muted} /><Text style={{ fontSize: 13, color: H.muted, flex: 1 }} numberOfLines={1}>{company}{weather ? ` · ${weather}` : ''}</Text></View> : null}
      <View style={{ marginTop: 14, flexDirection: 'row', borderRadius: 18, backgroundColor: H.navy, overflow: 'hidden' }}>
        {stat(x ? String(onNow) : '—', t('On shift'), () => router.navigate('/team'))}
        {stat(x ? String(late) : '—', t('Not in yet'), () => router.navigate('/team'), true)}
        {stat(x ? short(x.sales_today || 0) : '—', t('Sales today'), () => openTool('/sales', t('Sales')))}
      </View>
      <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
        <Ghost text={t("Who's working")} icon="map-pin" onPress={() => router.navigate('/team')} />
        {hasEmployee ? <Ghost text={open ? t('Clock out') : t('Clock in')} icon="clock" busy={!!clockAct.busy} onPress={() => clockAct.act(open ? 'out' : 'in')} />
          : <Ghost text={t('Ask Ava')} icon="sparkle" onPress={() => ask(t('Give me my 30-second brief for today.'))} />}
      </View>
    </View>
  );

  const needsRow = (list: HNeed[]) => list.length ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 2, gap: 10 }}>
      {list.map((n) => <NeedCard key={n.key} n={n} />)}
    </ScrollView>
  ) : (
    <View style={{ height: 118, borderRadius: 20, backgroundColor: '#E8ECFC', flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18 }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: H.navy, alignItems: 'center', justifyContent: 'center' }}><Ph name="check" size={22} color="#FFFFFF" duo={0.3} /></View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: H.ink }}>{t('You are all set')}</Text>
        <Text style={{ fontSize: 12.5, color: H.muted }}>{t('Nothing needs you right now.')}</Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={!!(c.refreshing || dash.refreshing)} onRefresh={refresh} tintColor="#FFFFFF" />}>
        {band}
        <View style={{ paddingHorizontal: 16, marginTop: -80, gap: 14, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
          {isManager ? (
            <>
              <Rise>{ownerCard}</Rise>
              {dash.error && !x ? <ErrorBox text={dash.error} onRetry={dash.reload} /> : null}
              <HSec title={t('Needs you')} right={oNeeds.length ? t('{n} waiting', { n: oNeeds.length }) : undefined} onRight={() => router.push('/notifications')} />
              {needsRow(oNeeds)}
              <HSec title={t('Everything')}><Legend items={LEGEND.map(([cc, l]) => [cc, t(l)] as [string, string])} /></HSec>
              <TileGrid items={ownerTiles} />
              <HSec title={t('This week')} right={t('Details')} onRight={() => router.navigate('/money')} />
              <View style={[card, { padding: 16, gap: 12 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text style={{ fontSize: 13, color: H.muted, fontWeight: '600' }}>{t('Sales')}</Text>
                  <Text><Text style={{ fontSize: 24, fontWeight: '800', color: H.ink }}>{x ? money(x.sales_week || 0) : '—'}</Text>{growth == null ? '' : <Text style={{ fontSize: 13, color: growth >= 0 ? '#12A25B' : '#B42318' }}>{`  ${growth >= 0 ? '▲' : '▼'} ${Math.abs(growth)}%`}</Text>}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 90 }}>
                  {(week.length ? week : [0, 0, 0, 0, 0, 0, 0]).map((v, i, a) => (
                    <View key={i} style={{ flex: 1, height: Math.max(8, (v / wMax) * 86), borderRadius: 8, backgroundColor: i === a.length - 1 ? H.ink : i % 2 ? '#DDE3FA' : '#C9D2F6' }} />
                  ))}
                </View>
              </View>
            </>
          ) : hasEmployee ? (
            <>
              <Rise>{staffCard}</Rise>
              <HSec title={t('Needs you')} right={sNeeds.length ? t('See all') : undefined} onRight={() => router.push('/notifications')} />
              {needsRow(sNeeds)}
              <HSec title={t('Everything')}><Legend items={LEGEND.map(([cc, l]) => [cc, t(l)] as [string, string])} /></HSec>
              <TileGrid items={staffTiles} />
              <HSec title={t('Today')} right={t('Full schedule')} onRight={() => router.navigate('/schedule')} />
              <View style={[card, { paddingVertical: 18, paddingHorizontal: 16 }]}>
                {tl.length ? tl.map((e, i) => (
                  <Pressable key={i} onPress={e.go} disabled={!e.go} accessibilityRole={e.go ? 'button' : undefined} style={{ flexDirection: 'row', gap: 12, paddingBottom: i < tl.length - 1 ? 16 : 0 }}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: 4, backgroundColor: e.dot }} />
                      {i < tl.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: H.line, marginTop: 4, marginBottom: -16 }} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: H.muted, fontWeight: '600' }}>{e.at}</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: H.ink }} numberOfLines={1}>{e.title}</Text>
                      {e.sub ? <Text style={{ fontSize: 12.5, color: H.muted }} numberOfLines={1}>{e.sub}</Text> : null}
                    </View>
                  </Pressable>
                )) : <Text style={{ fontSize: 14, color: H.muted }}>{t('Nothing else today.')}</Text>}
              </View>
            </>
          ) : (
            <>
              <View style={[card, { padding: 18, gap: 12 }]}>
                {greet}
                <Text style={{ fontSize: 13.5, color: H.muted }}>{t('Your digital business card and badge are under Me. When an employer adds you to their team, your shifts and time clock show up here.')}</Text>
                <Primary text={t('Join my team with a code')} icon="user-plus" onPress={() => router.push('/guest')} />
              </View>
              <TileGrid items={[
                { label: t('Wallet'), icon: 'wallet', tone: 'blue', go: () => router.push('/wallet') },
                { label: t('Meet'), icon: 'video-camera', tone: 'navy', go: () => router.navigate('/meet') },
                { label: t('Ava'), icon: 'sparkle', tone: 'navy', go: () => router.navigate('/ai') },
                { label: t('Profile'), icon: 'user', tone: 'navy', go: () => router.navigate('/me') },
              ]} />
            </>
          )}
          <PoweredBy />
        </View>
      </ScrollView>
    </View>
  );
}

const PH_NOTE: Record<string, PhName> = { shift: 'calendar-dots', schedule: 'calendar-dots', timeoff: 'sun-horizon', pay: 'money', payroll: 'money', approval: 'check', message: 'chat-circle-dots', chat: 'chat-circle-dots', news: 'megaphone', clock: 'clock', alert: 'warning', call: 'phone', invoice: 'receipt', review: 'star' };
const PH_ICON: Partial<Record<IconName, PhName>> = { calendar: 'calendar-dots', chat: 'chat-circle-dots', clock: 'clock', doc: 'receipt', cash: 'money', wallet: 'wallet', box: 'package', bell: 'bell', spark: 'sparkle', sun: 'sun-horizon', phone: 'phone' };
