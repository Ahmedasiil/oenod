import React, { useEffect, useState } from 'react';
import { Alert, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import { Bento, FH, Li, List, Minis, Pills, Prog, Sec, TeamStrip, Tick, TopRow, TxCards, V, type Mini, type Tx } from '../../ui/M6';

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
    a={{ label: t('Remind'), go: () => openTool('/invoices', t('Invoices')) }} />);
  if (x?.to_approve) rows.push(<LightRow key="ts" first={!rows.length} kind="a" title={t('Approve {n} timesheets', { n: x.to_approve })} sub={t('Before payroll')}
    a={{ label: t('Review'), go: () => openTool('/time', t('Time clock')) }} />);
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

  const top = <TopRow name={session?.user?.name || '?'} unread={unread} onBell={() => router.push('/notifications')} onMe={() => router.navigate('/me')} />;

  const heroSub = isManager
    ? (x ? (nextPay && (growth ?? 0) >= 0 ? t('Sales are up and payroll is ready.') : (growth ?? 0) >= 0 ? t('Sales are up and your team is on it.') : t('Here is your business today.')) : t('Loading your day…'))
    : open ? t('You are clocked in. Have a great shift.')
    : nx && sameDay(nx.starts_at) ? t('Your shift starts at {t}.', { t: time(nx.starts_at) })
    : nx ? t('Next shift {d}', { d: `${day(nx.starts_at)} ${time(nx.starts_at)}` }) : t('Have a great day.');
  const trio = isManager
    ? [
      { label: t('Sales today'), value: x ? money(x.sales_today || 0) : '—', note: growth == null ? undefined : `${growth >= 0 ? '▲' : '▼'} ${Math.abs(growth)}%`, good: true, go: () => openTool('/sales', t('Sales')) },
      { label: t('On shift'), value: x ? String(onNow) : '—', note: breaks ? t('{n} on break', { n: breaks }) : planned && onNow < planned ? t('{n} not in', { n: planned - onNow }) : t('clocked in now'), good: true, go: () => router.navigate('/team') },
      nextPay
        ? { label: t('Payroll {d}', { d: wkday(payDay) }), value: short(nextPay.amount), note: t('Ready'), good: true, go: () => router.push('/payroll') }
        : { label: t('Orders'), value: x ? String(x.orders_today ?? 0) : '—', note: x?.labor_pct != null ? t('Labour {n}%', { n: Math.round(x.labor_pct) }) : undefined, good: true, go: () => openTool('/sales', t('Sales')) },
    ]
    : [
      { label: t('This week'), value: `${Math.round(weekMin / 6) / 10}h`, note: t('worked'), good: true, go: () => router.push('/timesheet') },
      { label: t('Next pay'), value: pay.data?.next_pay_date ? wkday(pay.data.next_pay_date) + ' ' + new Date(pay.data.next_pay_date + 'T12:00:00').getDate() : '—', note: lastPay ? t('Last {m}', { m: money(Number(lastPay.net || lastPay.gross || 0)) }) : t('Pay stubs'), good: true, go: () => router.push('/pay') },
      { label: t('Today'), value: c.data ? hm(open ? worked : c.data.today_minutes).replace(/ 00m$/, '') : '—', note: open ? (onBreak ? t('On break') : t('Clocked in')) : t('Not clocked in'), good: true, go: () => router.push('/timesheet') },
    ];
  const hero = (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {isManager ? (company ? <HeroChip text={company} /> : null) : <HeroChip text={c.data?.employee?.job_title || company || t('Team')} />}
        <HeroChip text={dateChip} />
        {weather ? <HeroChip text={weather} /> : null}
      </View>
      <Text style={[FH, { color: '#FFFFFF', fontSize: 25, lineHeight: 28 }]} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
        {isManager ? `${greeting()}${first ? ', ' + first : ''}` : t('Hi {n}', { n: first })}
      </Text>
      <Text style={{ color: '#D5DCFF', fontSize: 13, marginTop: -6 }} numberOfLines={1}>{heroSub}</Text>
      <StatTrio items={trio} />
      <BriefBar title={isManager ? t("Ava's 30-second brief") : t("Ava's brief for you")} sub={isManager ? t('Tap to hear today in 30 seconds') : t("Tap to hear today's notes")}
        onPress={() => ask(isManager ? t('Give me my 30-second brief for today.') : t('What do I need to know for my shift today?'))} />
    </View>
  );

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
      if (x.overdue_count) minis.push({ tone: 'dk', icon: 'doc', kind: t('Overdue'), title: t('{n} invoices overdue', { n: x.overdue_count }) + ' · ' + money(x.overdue_amount), btn: t('Remind'), go: () => openTool('/invoices', t('Invoices')) });
      if (x.to_approve) minis.push({ tone: 'wh', icon: 'clock', kind: t('Timesheets'), title: t('Approve {n} timesheets', { n: x.to_approve }), btn: t('Review'), go: () => openTool('/time', t('Time clock')) });
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
  const PACK_GO: Record<string, string> = { tax: '/my-pay', deposit: '/my-pay', emergency: '/me', handbook: '/my-hr', contract: '/my-hr' };

  return (
    <Screen top={top} hero={hero} refreshing={c.refreshing || dash.refreshing} onRefresh={refresh}>
      {isManager ? (
        <>
          {dash.error && !x ? <ErrorBox text={dash.error} onRetry={dash.reload} /> : null}
          <Sec title={t('Needs you')} right={waiting ? t('{n} waiting', { n: waiting }) : t('All caught up')} />
          <Rise><Minis items={minis} /></Rise>
          <Sec title={t('Money & meetings')} right={t('Details')} onRight={() => router.navigate('/money')} />
          <Rise delay={40}>
            <Bento
              tall={{ label: t('Cash this week'), value: x ? money(x.sales_week || 0) : '—', note: growth == null ? undefined : t('{p} vs last week', { p: `${growth >= 0 ? '▲' : '▼'} ${Math.abs(growth)}%` }),
                noteColor: (growth ?? 0) >= 0 ? V.mint : '#FFC07A', series: ser.slice(-10), foot: wal.data?.balance ? t('Wallet {m}', { m: money(wal.data.balance.available) }) : '•••• OENOD', go: () => router.navigate('/money') }}
              a={{ icon: 'cash', label: t('Next payroll'), value: nextPay ? money(nextPay.amount) : t('Pay team'), note: nextPay ? `${wkday(payDay)} · ${t('Run it')}` : t('Review and pay'), go: () => router.push('/payroll') }}
              b={{ icon: 'video', label: t('Next meeting'), value: nm ? time(nm.starts_at) : t('Start one'), note: nm ? (sameDay(nm.starts_at) ? nm.title : `${day(nm.starts_at)} · ${nm.title}`) : t('Ready when you are'), face: nm?.people?.[0]?.name, go: () => router.navigate('/meet') }} />
          </Rise>
          <Pills items={[{ label: t('Pay team'), icon: 'cash', go: () => router.push('/payroll') }, { label: t('Meet'), icon: 'video', go: () => router.navigate('/meet') }]}
            more={{ label: t('All tools'), go: () => router.navigate('/all') }} />
          {team.length ? (
            <>
              <Sec title={t('Your team')} right={t('See all')} onRight={() => router.navigate('/team')} />
              <TeamStrip people={[...team].sort((a, b) => Number(!!b.open_entry) - Number(!!a.open_entry)).slice(0, 12).map((e) => ({ id: e.id, name: e.name, color: e.color, on: !!e.open_entry }))}
                onOpen={(p) => router.push(`/employee/${p.id}`)} />
            </>
          ) : null}
          {activity.length ? (
            <>
              <Sec title={t('Recent activity')} right={t('View all')} onRight={() => router.push('/notifications')} />
              <TxCards items={activity} />
            </>
          ) : null}
        </>
      ) : hasEmployee ? (
        <>
          {c.error && !c.data ? <ErrorBox text={c.error} onRetry={c.reload} /> : null}
          {sMinis.length ? <Rise><Minis items={sMinis} /></Rise> : null}
          <Rise delay={40}>
            <Bento bigValue={28}
              tall={{ label: nx && sameDay(nx.starts_at) ? t('Your shift · {a} – {b}', { a: time(nx.starts_at), b: time(nx.ends_at) }) : t('Time clock'),
                value: open ? (onBreak ? t('On break') : t('Clocked in')) : t('Clock in'),
                note: open ? t('{h} worked', { h: hm(worked) }) : t('Location checked when you tap'), busy: !!clockAct.busy,
                foot: open ? t('Since {t}', { t: time(open.clock_in) }) : t('Tap to start'),
                go: () => (open ? router.push('/timesheet') : clockAct.act('in')) }}
              a={{ icon: 'cash', label: t('Next pay'), value: pay.data?.next_pay_date ? `${wkday(pay.data.next_pay_date)} ${new Date(pay.data.next_pay_date + 'T12:00:00').getDate()}` : t('Pay stubs'), note: lastPay ? t('Last pay {m}', { m: money(Number(lastPay.net || lastPay.gross || 0)) }) : t('See your pay'), go: () => router.push('/pay') }}
              b={{ icon: 'calendar', label: t('Next shift'), value: nx ? `${wkday(nx.starts_at)} ${time(nx.starts_at)}` : t('None yet'), note: nx ? (nx.location || nx.role || day(nx.starts_at)) : t('My shifts'), go: () => router.navigate('/schedule') }} />
          </Rise>
          {open ? (
            <Pills items={[
              onBreak ? { label: t('End break'), icon: 'coffee', busy: clockAct.busy === 'resume', go: () => clockAct.act('resume') } : { label: t('Break'), icon: 'coffee', busy: clockAct.busy === 'break', go: () => clockAct.act('break') },
              { label: t('Clock out'), icon: 'logout', danger: true, busy: clockAct.busy === 'out', go: () => clockAct.act('out') },
            ]} />
          ) : null}
          {pack.length && packOk < pack.length ? (
            <List>
              <View style={{ paddingVertical: 12, gap: 8 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '600' }}>{t('Finish your setup')}</Text>
                <Text style={{ color: V.mute, fontSize: 12, marginTop: -6 }}>{t('{a} of {b} done', { a: packOk, b: pack.length })}</Text>
                <Prog pct={(100 * packOk) / pack.length} />
              </View>
              {pack.map((p) => (
                <Li key={p.k} title={t(p.label)} muted={p.ok} left={<Tick done={p.ok} />} btn={p.ok ? undefined : p.k === 'tax' ? t('Fill in') : p.k === 'contract' || p.k === 'handbook' ? t('Sign') : t('Start')}
                  onBtn={() => openTool(p.doc_id ? `/docs/${Number(p.doc_id)}` : PACK_GO[p.k] || '/my-hr', t(p.label))} />
              ))}
            </List>
          ) : null}
          <Sec title={t('Grow with OENOD')} right={t('Why these?')} onRight={() => ask(t('Which courses and skills should I work on next?'))} />
          <TxCards items={[
            { title: t('Your courses'), sub: t('Academy · picked by your team'), icon: 'cap', navy: true, left: t('Start'), right: '', go: () => openTool('/academy', t('Academy')) },
            { title: t('Upgrade your résumé'), sub: t('Ava writes it for you'), icon: 'doc', left: t('Build it'), right: t('2 min'), go: () => openTool('/resume', t('Résumé')) },
            { title: t('Team news'), sub: t('Updates from your team'), icon: 'news', left: t('Read'), right: '', go: () => router.push('/feed') },
          ]} />
        </>
      ) : (
        <>
          <NavyCard icon="wallet" title={t('Wallet')} sub={t('Get paid and transfer money to your bank')} link={t('Open')} onLink={() => router.push('/wallet')} />
          <Card>
            <Empty icon="user" title={t('Your OENOD account')} sub={t('Your digital business card and badge are under Me. When an employer adds you to their team, your shifts and time clock show up here.')} />
          </Card>
        </>
      )}
    </Screen>
  );
}
