import React, { useEffect, useState } from 'react';
import { Alert, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AskBar, BlackCard, Chip, GlanceGrid, HealthBar, KpiStrip, LightRow, NavyCard, QuickAccess, Sec, Suggest, type Glance, type Kpi, type QA } from '../../ui/Pro';
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
import { BriefBar, HeroChip, MidSec, MoneyBento, PillRow, StatTrio, ToolGrid } from '../../ui/Mid';

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

export default function Home() {
  const { session, isManager } = useAuth();
  const { width } = useWindowDimensions();
  const hasEmployee = !!session?.employee;
  const c = useLoad<Clock | null>(() => (hasEmployee ? get<Clock>('/api/me/clock') : Promise.resolve(null)), [hasEmployee]);
  const dash = useLoad<any>(() => (isManager ? get('/api/dashboard') : Promise.resolve(null)), [isManager]);
  const wal = useLoad<any>(() => (isManager ? get('/api/wallet').catch(() => null) : Promise.resolve(null)), [isManager]);
  const first = (session?.user?.name || '').split(' ')[0];
  const unread = session?.notifications || 0;
  const company = session?.company?.name || '';
  const x = dash.data;
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(i); }, []);
  useEffect(() => { if (c.data) syncLive(c.data.open, c.data.next_shift?.location || company); }, [c.data?.open?.clock_in, c.data?.open?.break_started_at, !!c.data?.open]); // eslint-disable-line react-hooks/exhaustive-deps
  const side = Math.max(S.lg + 4, (width - 760) / 2 + S.lg);
  const ask = (q?: string) => router.navigate(q ? { pathname: '/ai', params: { q } } : '/ai');
  const open = c.data?.open;
  const nx = c.data?.next_shift;

  // Live numbers strip (owners and managers).
  const ser: number[] = (x?.series || []).map((d: any) => Number(d.total || 0));
  const growth = x?.sales_prev_week ? Math.round(((x.sales_week - x.sales_prev_week) / x.sales_prev_week) * 100) : null;
  const onNow = (x?.on_clock || []).length, planned = (x?.shifts_today || []).length;
  const kpis: Kpi[] = x ? [
    { label: t('Sales today'), value: money(x.sales_today || 0), delta: growth == null ? undefined : `${growth >= 0 ? '+' : ''}${growth}%`, up: (growth ?? 0) >= 0, series: ser.slice(-7), go: () => openTool('/sales', t('Sales')) },
    { label: t('Orders'), value: String(x.orders_today ?? 0), series: ser.slice(-7), go: () => openTool('/sales', t('Sales')) },
    { label: t('Labour'), value: x.labor_pct == null ? '—' : `${Math.round(x.labor_pct)}%`, up: (x.labor_pct ?? 0) <= 30, go: () => openTool('/time', t('Time clock')) },
    { label: t('Working now'), value: planned ? t('{a} of {b}', { a: onNow, b: planned }) : String(onNow), up: !planned || onNow >= planned, delta: planned && onNow < planned ? t('{n} not in', { n: planned - onNow }) : undefined, go: () => router.navigate('/team') },
    ...(x.open_ar != null ? [{ label: t('Owed to you'), value: money(x.open_ar), go: () => openTool('/invoices', t('Invoices')) }] : []),
  ] : [];

  const qa: QA[] = isManager ? [
    hasEmployee ? { label: open ? t('Clock out') : t('Clock in'), sub: open ? t('Since {t}', { t: time(open.clock_in) }) : t('Not clocked in'), icon: 'clock', go: () => router.push('/timesheet') }
      : { label: t('Kiosk'), sub: t('Staff clock in here'), icon: 'clock', go: () => router.push('/kiosk') },
    { label: t('Schedule'), sub: planned ? t('{n} shifts today', { n: planned }) : t('This week'), icon: 'calendar', go: () => router.navigate('/schedule') },
    { label: t('Meet'), sub: t('Start or join'), icon: 'video', go: openMeet },
    { label: t('Invoices'), sub: x?.overdue_count ? t('{n} overdue', { n: x.overdue_count }) : t('All paid'), icon: 'news', go: () => openTool('/invoices', t('Invoices')) },
    { label: t('Calls'), sub: t('Business Phone'), icon: 'phone', go: () => openTool('/calls', t('Business Phone')) },
    { label: t('Payroll'), sub: t('Review and pay'), icon: 'cash', go: () => openTool('/payroll', t('Payroll')) },
  ] : [
    { label: open ? t('Clock out') : t('Clock in'), sub: open ? t('Since {t}', { t: time(open.clock_in) }) : nx ? `${time(nx.starts_at)}–${time(nx.ends_at)}` : t('Not clocked in'), icon: 'clock', go: () => router.push('/timesheet') },
    { label: t('My shifts'), sub: nx ? t('Next: {d}', { d: `${day(nx.starts_at)} ${time(nx.starts_at)}` }) : t('This week'), icon: 'calendar', go: () => router.navigate('/schedule') },
    { label: t('Time off'), sub: t('Ask for days off'), icon: 'sun', go: () => router.navigate('/timeoff') },
    { label: t('My pay'), sub: t('Pay stubs'), icon: 'cash', go: () => router.push('/pay') },
    { label: t('Team chat'), sub: t('Messages'), icon: 'chat', go: () => openTool('/chat', t('Team chat')) },
    { label: t('Meet'), sub: t('Join a meeting'), icon: 'video', go: openMeet },
  ];

  // At a glance: each area's live number and light.
  const low = (x?.low_stock || []).length;
  const glance: Glance[] = x ? [
    { label: t('Schedule'), value: String(planned), hint: t('shifts today'), icon: 'calendar', go: () => router.navigate('/schedule') },
    { label: t('Time'), value: planned ? `${onNow}/${planned}` : String(onNow), hint: t('clocked in now'), icon: 'clock', kind: planned && onNow < planned ? 'a' : 'g', go: () => openTool('/time', t('Time clock')) },
    { label: t('Invoices'), value: String(x.overdue_count || 0), hint: x.overdue_count ? t('overdue · {m}', { m: money(x.overdue_amount) }) : t('nothing overdue'), icon: 'news', kind: x.overdue_count ? 'r' : 'g', go: () => openTool('/invoices', t('Invoices')) },
    { label: t('Inventory'), value: String(low), hint: low ? t('low: {p}', { p: x.low_stock[0].name }) : t('stock is fine'), icon: 'briefcase', kind: low ? 'a' : 'g', go: () => openTool('/inventory', t('Inventory')) },
    { label: t('Time off'), value: String(x.pending_timeoff || 0), hint: t('requests waiting'), icon: 'sun', kind: x.pending_timeoff ? 'a' : 'g', go: () => router.navigate('/timeoff') },
    { label: t('Ask Ava'), value: '✦', hint: t('“How can I cut labour?”'), icon: 'spark', kind: 'ava', go: () => ask(t('How can I cut labour?')) },
  ] : [];
  const gN = glance.filter((g) => g.kind === 'g' || !g.kind).length, aN = glance.filter((g) => g.kind === 'a').length, rN = glance.filter((g) => g.kind === 'r').length;
  const score = glance.length ? Math.round(100 - aN * 6 - rN * 12) : 0;

  const top = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Logo width={64} color="#FFFFFF" />
      <View style={{ flex: 1 }} />
      <Pressable onPress={() => router.push('/notifications')} accessibilityRole="button" accessibilityLabel={`${t('Notifications')}${unread ? ` (${unread})` : ''}`}
        style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }}>
        <Icon name="bell" color="#FFFFFF" size={19} duo={false} />
        {unread ? <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5484D', borderWidth: 2, borderColor: '#0B1C86' }}><Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>{unread > 9 ? '9+' : unread}</Text></View> : null}
      </Pressable>
      <Pressable onPress={() => router.navigate('/me')} accessibilityRole="button" accessibilityLabel={t('Me')}
        style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <Text style={{ color: '#000C58', fontWeight: '700', fontSize: 13 }}>{(session?.user?.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}</Text>
        {open ? <View style={{ position: 'absolute', right: -3, bottom: -3, width: 11, height: 11, borderRadius: 6, backgroundColor: '#2BD884', borderWidth: 2, borderColor: '#0B1C86' }} /> : null}
      </Pressable>
    </View>
  );
  const dateChip = `${now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  // Midnight (11-16): a calm hero card (chips, greeting, three numbers, Ava's brief), the rest below it.
  const salesNote = growth == null ? undefined : `${growth >= 0 ? '▲' : '▼'} ${Math.abs(growth)}%`;
  const heroSub = isManager
    ? (x ? (growth != null && growth >= 0 ? t('Sales are up and your team is on it.') : t('Here is your business today.')) : t('Loading your day…'))
    : nx ? t('Next shift {d}', { d: `${day(nx.starts_at)} ${time(nx.starts_at)}` }) : t('Have a great day.');
  const trio = isManager
    ? [
      { label: t('Sales today'), value: x ? money(x.sales_today || 0) : '—', note: salesNote, good: (growth ?? 0) >= 0, go: () => openTool('/sales', t('Sales')) },
      { label: t('On shift'), value: x ? (planned ? `${onNow}/${planned}` : String(onNow)) : '—', note: planned && onNow < planned ? t('{n} not in', { n: planned - onNow }) : t('clocked in now'), go: () => router.navigate('/team') },
      { label: t('Orders'), value: x ? String(x.orders_today ?? 0) : '—', note: x?.labor_pct != null ? t('Labour {n}%', { n: Math.round(x.labor_pct) }) : undefined, go: () => openTool('/sales', t('Sales')) },
    ]
    : [
      { label: t('Today'), value: c.data ? hm(open ? c.data.open_minutes : c.data.today_minutes) : '—', note: open ? t('Clocked in') : t('Not clocked in'), good: !!open, go: () => router.push('/timesheet') },
      { label: t('Next shift'), value: nx ? time(nx.starts_at) : '—', note: nx ? day(nx.starts_at) : t('None yet'), go: () => router.navigate('/schedule') },
      { label: t('My pay'), value: '→', note: t('Pay stubs'), go: () => router.push('/pay') },
    ];
  const hero = C.dark ? (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {company ? <HeroChip text={company} /> : null}
        <HeroChip text={now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} />
        {open ? <HeroChip text={t('On shift')} /> : null}
      </View>
      <View>
        <Text style={{ color: '#FFFFFF', fontSize: 27, fontWeight: '700', letterSpacing: -0.6 }} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>{`${greeting()}${first ? ', ' + first : ''}`}</Text>
        <Text style={{ color: '#DCE3FF', fontSize: 14, marginTop: 4 }} numberOfLines={1}>{heroSub}</Text>
      </View>
      <StatTrio items={trio} />
      <BriefBar title={t("Ava's 30-second brief")} sub={t('Tap to hear today in 30 seconds')} onPress={() => ask(t('Give me my 30-second brief for today.'))} />
    </View>
  ) : (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {company ? <Chip text={nx?.location ? `${company} · ${nx.location}` : company} icon="pin" /> : null}
        <Chip text={dateChip} icon="calendar" />
        {open ? <Chip text={t('On shift')} icon="clock" /> : null}
      </View>
      <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '700', letterSpacing: -0.4, marginTop: -2 }} accessibilityRole="header">{`${greeting()}${first ? ', ' + first : ''}`}</Text>
      <AskBar label={t('Ask Ava anything…')} button={t('Ask')} onPress={() => ask()} />
      <Suggest onPick={ask} items={isManager
        ? [[t('Who is working today?'), t('Who is working today?')], [t('Sales this week'), t('How were sales this week?')], [t('Overdue invoices'), t('Which invoices are overdue?')]]
        : [[t('When is my next shift?'), t('When is my next shift?')], [t('My hours this week'), t('How many hours did I work this week?')], [t('Ask for time off'), t('How do I ask for time off?')]]} />
      {isManager ? (x ? <KpiStrip items={kpis} side={side} /> : <View style={{ height: 96, justifyContent: 'center' }}><Loading /></View>) : null}
      <QuickAccess title={t('Quick access')} items={qa} />
    </View>
  );

  return (
    <Screen top={top} hero={hero} refreshing={c.refreshing || dash.refreshing} onRefresh={() => { c.refresh(); dash.refresh(); wal.refresh(); }}>
      {isManager ? (
        <>
          {dash.error && !x ? <ErrorBox text={dash.error} onRetry={dash.reload} /> : null}
          {C.dark ? <Rise><ToolGrid items={qa.map((q) => ({ icon: q.icon, label: q.label, sub: q.sub, go: q.go }))} /></Rise> : null}
          <Rise><Waiting x={x} onChanged={dash.refresh} /></Rise>
          {C.dark && x ? (
            <>
              <MidSec title={t('Money & meetings')} right={t('Details')} onRight={() => router.navigate('/money')} />
              <Rise delay={40}>
                <MoneyBento b={{
                  cash: { label: t('Sales this week'), value: money(x.sales_week || 0), note: growth == null ? undefined : t('{p} vs last week', { p: `${growth >= 0 ? '▲' : '▼'} ${Math.abs(growth)}%` }), up: (growth ?? 0) >= 0, series: ser.slice(-10), go: () => openTool('/sales', t('Sales')) },
                  pay: { label: t('In your wallet'), value: wal.data?.balance ? money(wal.data.balance.available) : '—', note: t('Review payroll'), go: () => openTool('/payroll', t('Payroll')) },
                  meet: { label: t('Meet'), title: t('Start a meeting'), note: t('Ready when you are'), go: openMeet },
                }} />
              </Rise>
              <PillRow items={[
                { label: t('Pay team'), icon: 'cash', primary: true, go: () => openTool('/payroll', t('Payroll')) },
                { label: t('Meet'), icon: 'video', go: openMeet },
                { label: t('Invoices'), icon: 'news', go: () => openTool('/invoices', t('Invoices')) },
                { label: t('All tools'), icon: 'grid', go: () => router.navigate('/all') },
              ]} />
            </>
          ) : null}
          <Rise delay={60}><BriefPro /></Rise>
          {x ? (
            <>
              <Sec title={t('Your team today')} right={t('Live')} />
              <Rise delay={100}>
                <NavyCard icon="users" title={t('On shift now')} sub={planned ? t('{a} of {b} clocked in', { a: onNow, b: planned }) : t('{n} clocked in', { n: onNow })} link={t('Schedule')} onLink={() => router.navigate('/schedule')}>
                  {(x.shifts_today || []).length ? (x.shifts_today as any[]).slice(0, 5).map((s, i) => {
                    const on = (x.on_clock || []).some((o: any) => o.first_name === s.first_name && o.last_name === s.last_name);
                    const late = !on && new Date(s.starts_at.replace(' ', 'T') + 'Z') < now;
                    return <LightRow key={i} first={!i} kind={on ? 'g' : late ? 'r' : 'a'} title={`${s.first_name} ${s.last_name}`}
                      sub={`${s.role ? s.role + ' · ' : ''}${on ? t('clocked in') : late ? t('Shift started {t} · not clocked in', { t: time(s.starts_at) }) : t('Starts {t}', { t: time(s.starts_at) })}`}
                      right={<Text style={{ color: C.sub, fontSize: 12, fontVariant: ['tabular-nums'] }}>{time(s.starts_at)}–{time(s.ends_at)}</Text>} onPress={() => router.navigate('/team')} />;
                  }) : (x.on_clock || []).length ? (x.on_clock as any[]).map((o, i) => <LightRow key={o.id} first={!i} kind="g" title={`${o.first_name} ${o.last_name}`} sub={t('clocked in')} />)
                    : <LightRow first kind="a" title={t('Nobody is clocked in right now.')} />}
                </NavyCard>
              </Rise>
              <Sec title={t('At a glance')} right={t('Every area, live')} />
              <Rise delay={140}>
                <NavyCard icon="chart" title={t('Business health')} sub={t('Score {n} · {w}', { n: score, w: score >= 80 ? t('good') : score >= 60 ? t('needs a look') : t('needs action') })} link={t('All tools')} onLink={() => router.navigate('/all')}>
                  <HealthBar g={gN} a={aN} r={rN} />
                  <GlanceGrid items={glance} />
                </NavyCard>
              </Rise>
              {C.dark ? null : <Rise delay={180}>
                <BlackCard eyebrow={t('Available in your OENOD wallet')} value={wal.data?.balance ? money(wal.data.balance.available) : '—'}
                  sub={wal.data?.balance?.pending ? t('{m} on the way', { m: money(wal.data.balance.pending) }) : t('Payroll, invoices and payouts in one place')}
                  a={{ label: t('Review payroll'), go: () => openTool('/payroll', t('Payroll')) }} b={{ label: t('Timesheets'), go: () => openTool('/time', t('Time clock')) }} />
              </Rise>}
            </>
          ) : null}
        </>
      ) : hasEmployee ? (
        <>
          {c.error && !c.data ? <ErrorBox text={c.error} onRetry={c.reload} /> : null}
          <Rise>
            <NavyCard icon="clock" title={t('Time clock')} sub={open ? t('Clocked in since {t}', { t: time(open.clock_in) }) : t('Not clocked in yet today')}>
              {c.data ? <View style={{ backgroundColor: '#0A0B14', borderRadius: 16, padding: 14, marginTop: 6 }}><ClockCard clock={c.data} onChange={(v) => c.setData(v)} /></View> : <Loading />}
            </NavyCard>
          </Rise>
          {C.dark ? <Rise delay={30}><ToolGrid items={qa.map((q) => ({ icon: q.icon, label: q.label, sub: q.sub, go: q.go }))} /></Rise> : null}
          {nx ? (
            <Rise delay={60}>
              <NavyCard icon="calendar" title={t('Next shift')} sub={[nx.role, nx.location].filter(Boolean).join(' · ') || t('Shift')} link={t('My shifts')} onLink={() => router.navigate('/schedule')}>
                <Row style={{ paddingVertical: 6 }}>
                  <DateTile iso={nx.starts_at} />
                  <Text style={{ color: C.ink, fontSize: 16, fontWeight: '800' }}>{time(nx.starts_at)} – {time(nx.ends_at)}</Text>
                </Row>
              </NavyCard>
            </Rise>
          ) : null}
          <Rise delay={100}><BriefPro /></Rise>
          <Rise delay={140}>
            <NavyCard icon="users" title={t('My team')} sub={t('News, availability and time off')}>
              <LightRow first kind="g" title={t('Team news')} onPress={() => router.push('/feed')} />
              <LightRow kind="g" title={t('My availability')} onPress={() => router.push('/availability')} />
              <LightRow kind="g" title={t('Time off')} onPress={() => router.navigate('/timeoff')} />
            </NavyCard>
          </Rise>
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
