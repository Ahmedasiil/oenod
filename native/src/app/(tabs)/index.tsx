import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
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
        <Text style={{ color: '#C9D3EA', fontWeight: '600' }}>{t('Time clock')}</Text>
        {open ? <Pill text={t(onBreak ? 'On break' : 'Clocked in')} kind={onBreak ? 'warn' : 'good'} /> : <Pill text={t('Clocked out')} kind="plain" />}
      </Row>
      <Text style={{ color: '#FFFFFF', fontSize: 46, fontWeight: '800', letterSpacing: -1.8 }} accessibilityLiveRegion="polite">
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

type Quick = { icon: IconName; label: string; go: () => void };
const glass = { borderRadius: 20, padding: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' } as const;

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
          <Defs><SvgGrad id="spk" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#AFC3FF" stopOpacity={0.35} /><Stop offset="1" stopColor="#AFC3FF" stopOpacity={0} /></SvgGrad></Defs>
          <Path d={`${line} L${w} ${h} L0 ${h}Z`} fill="url(#spk)" />
          <Path d={line} stroke="#AFC3FF" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );
}

function LivePill() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 22, paddingHorizontal: 9, borderRadius: 999, backgroundColor: 'rgba(23,166,115,0.16)' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#5BE0A8' }} />
      <Text style={{ color: '#5BE0A8', fontSize: 11.5, fontWeight: '600' }}>{t('Live')}</Text>
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
      <Row><Text style={{ color: '#9AA5C8', fontSize: 13, flex: 1 }}>{t("Today's sales")}</Text><LivePill /></Row>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -1, flex: 1 }} numberOfLines={1}>{money(sales)}</Text>
        {growth == null ? null : <Text style={{ color: growth >= 0 ? '#5BE0A8' : '#F2B33D', fontWeight: '600', fontSize: 13, marginBottom: 5 }}>{t('{p}% vs last week', { p: `${growth >= 0 ? '+' : ''}${growth}` })}</Text>}
      </View>
      <Sparkline values={(x.series || []).map((d: any) => Number(d.total || 0))} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {mini.map(([v, l]) => (
          <View key={l} style={{ flex: 1, borderRadius: 14, padding: 10, backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{v}</Text>
            <Text style={{ color: '#9AA5C8', fontSize: 11.5 }} numberOfLines={1}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Four white quick-action buttons. */
function QuickRow({ items }: { items: Quick[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map((q, n) => (
        <Rise key={q.label} delay={60 + n * 40} style={{ flex: 1 }}>
          <Pressy onPress={q.go} accessibilityRole="button" accessibilityLabel={q.label}
            style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingTop: 12, paddingBottom: 10, alignItems: 'center', gap: 7 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.dark ? 'rgba(175,195,255,0.12)' : '#EEF1FF' }}>
              <Icon name={q.icon} color={C.dark ? '#AFC3FF' : '#000C58'} size={20} duo={false} />
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
      <Svg width={28} height={28} style={{ position: 'absolute' }}><Defs><SvgGrad id="st" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#3D5BF5" /><Stop offset="1" stopColor="#6B5CF6" /></SvgGrad></Defs><Rect width={28} height={28} fill="url(#st)" /></Svg>
      <View style={{ zIndex: 1 }}><Icon name="spark" size={16} color="#FFFFFF" duo={false} /></View>
    </View>
  );
}

/** OENOD AI's morning brief from live data, shown as short bullets. */
function Brief() {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { get<{ brief: string }>('/api/ai/brief').then((r) => setText(r.brief)).catch((e) => setErr(e?.message || '')); }, []);
  const lines = (text || '').split('\n').map((l) => l.replace(/^\s*([-*•]|\d+\.)\s*/, '').trim()).filter(Boolean).slice(0, 4);
  const hour = new Date().getHours();
  return (
    <Card>
      <CardHead icon={<SparkTile />} title={t(hour < 12 ? 'Morning brief' : hour < 17 ? 'Afternoon brief' : 'Evening brief')} right={<Lnk text={t('Ask')} go={() => router.navigate('/ai')} />} />
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
      ) : err ? <Muted>{err}</Muted> : <Muted>{t('OENOD AI is reading today’s numbers…')}</Muted>}
    </Card>
  );
}

const AV = ['#17A673', '#D98A1C', '#C2417A', '#0E8FB0', '#3D5BF5', '#6B5CF6'];
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
  ['People', 'users', '#3D5BF5', 'Team, schedule, payroll'], ['Money', 'wallet', '#17A673', 'Wallet, invoices, books'],
  ['Customers', 'chat', '#C2417A', 'CRM, reviews, Ava'], ['Operations', 'briefcase', '#D98A1C', 'Stock, POS, cameras'], ['AI & platform', 'spark', '#6B5CF6', 'AI, Meet, docs'],
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
            <View style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: col }}><Icon name={ic} size={18} color="#FFFFFF" duo={false} /></View>
            <Text style={{ color: C.ink, fontWeight: '700', fontSize: 13.5 }}>{t(n)}</Text>
            <Text style={{ color: C.faint, fontSize: 11.5, lineHeight: 15 }}>{t(sub)}</Text>
          </Pressy>
        ))}
      </ScrollView>
    </View>
  );
}

const openMeet = () => WebBrowser.openBrowserAsync(`${BASE}/#/meet`, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN, controlsColor: '#3D5BF5' });

export default function Home() {
  const { session, isManager } = useAuth();
  const hasEmployee = !!session?.employee;
  const c = useLoad<Clock | null>(() => (hasEmployee ? get<Clock>('/api/me/clock') : Promise.resolve(null)), [hasEmployee]);
  const dash = useLoad<any>(() => (isManager ? get('/api/dashboard') : Promise.resolve(null)), [isManager]);
  const first = (session?.user?.name || '').split(' ')[0];
  const unread = session?.notifications || 0;
  const role = session?.user?.role || '';
  const company = session?.company?.name || '';
  const x = dash.data;
  const quick: Quick[] = [
    hasEmployee ? { icon: 'clock', label: t('Clock in'), go: () => router.push('/timesheet') } : { icon: 'users', label: t('Team'), go: () => router.navigate('/team') },
    { icon: 'calendar', label: t('Schedule'), go: () => router.navigate('/schedule') },
    { icon: 'send', label: t('Pay'), go: () => router.navigate('/money') },
    { icon: 'video', label: t('Meet'), go: openMeet },
  ];
  const todos: Todo[] = [];
  if (x?.pending_timeoff) todos.push({ key: 'to', text: x.pending_timeoff === 1 ? t('Approve 1 time-off request') : t('Approve {n} time-off requests', { n: x.pending_timeoff }), go: () => router.navigate('/timeoff') });
  if (x?.overdue_count) todos.push({ key: 'inv', text: t('Follow up on {n} overdue invoices', { n: x.overdue_count }), note: money(x.overdue_amount), go: () => openTool('/invoices', t('Invoices')) });
  for (const p of (x?.low_stock || []).slice(0, 2)) todos.push({ key: 'ls' + p.name, text: t('Order {p}, {n} left', { p: p.name, n: Number(p.stock_qty ?? 0) }), note: t('Low'), go: () => openTool('/inventory', t('Inventory')) });
  if (x?.to_approve) todos.push({ key: 'ta', text: t('Approve {n} timesheets', { n: x.to_approve }), go: () => openTool('/time', t('Time clock')) });

  const hero = isManager ? <SalesGlass x={x} />
    : hasEmployee ? (c.data ? <View style={glass}><ClockCard clock={c.data} onChange={(v) => c.setData(v)} /></View> : <View style={[glass, { height: 150, justifyContent: 'center' }]}><Loading /></View>)
    : undefined;
  const top = (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
      <Logo width={55} color="#FFFFFF" />
      <View style={{ flex: 1 }} />
      <Pressable onPress={() => router.push('/notifications')} accessibilityRole="button" accessibilityLabel={`${t('Notifications')}${unread ? ` (${unread})` : ''}`} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="bell" color="#FFFFFF" size={21} duo={false} />
        {unread ? <View style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B6B', borderWidth: 2, borderColor: '#050B24' }} /> : null}
      </Pressable>
      <Pressable onPress={() => router.navigate('/me')} accessibilityRole="button" accessibilityLabel={t('Me')} style={{ marginLeft: 6 }}>
        <Avatar name={session?.user?.name || '?'} size={34} />
      </Pressable>
    </View>
  );
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const who = isManager ? t(ROLE_LABEL[role] || 'Manager') : hasEmployee ? t('Employee') : t('Member');
  return (
    <Screen
      top={top}
      eyebrow={company ? `${dateLine} · ${company}` : `${dateLine} · ${who}`}
      title={`${greeting()}${first ? ', ' + first : ''}`}
      hero={hero ?? <View />}
      refreshing={c.refreshing || dash.refreshing}
      onRefresh={() => { c.refresh(); dash.refresh(); }}
    >
      {isManager ? (
        <>
          {dash.error && !x ? <ErrorBox text={dash.error} onRetry={dash.reload} /> : null}
          <Rise><Brief /></Rise>
          <QuickRow items={quick} />
          {x ? <Rise delay={120}><OnShift list={x.on_clock || []} total={(x.shifts_today || []).length || Number(x.headcount || 0)} /></Rise> : null}
          <Rise delay={160}><Todos items={todos} /></Rise>
          {x && (x.shifts_today || []).length ? (
            <Rise delay={200}>
              <Card style={{ paddingBottom: 6 }}>
                <CardHead title={t('Shifts today')} right={<Lnk text={t('See all')} go={() => router.navigate('/schedule')} />} />
                {x.shifts_today.slice(0, 5).map((s: any, i: number) => (
                  <View key={i}>{i ? <Divider /> : null}
                    <ListRow title={`${s.first_name} ${s.last_name}`} sub={s.role || undefined} left={<Avatar name={`${s.first_name} ${s.last_name}`} color={s.color} size={36} />}
                      right={<Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{time(s.starts_at)}–{time(s.ends_at)}</Text>} />
                  </View>
                ))}
              </Card>
            </Rise>
          ) : null}
          <Rise delay={240}><Suites /></Rise>
        </>
      ) : hasEmployee ? (
        <>
          {c.error && !c.data ? <ErrorBox text={c.error} onRetry={c.reload} /> : null}
          <QuickRow items={quick} />
          {c.data?.next_shift ? (
            <Rise delay={120}>
              <Card onPress={() => router.navigate('/schedule')}>
                <CardHead title={t('Next shift')} right={<Lnk text={t('See all')} go={() => router.navigate('/schedule')} />} />
                <Row>
                  <DateTile iso={c.data.next_shift.starts_at} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.ink, fontSize: 16, fontWeight: '800' }}>{time(c.data.next_shift.starts_at)} – {time(c.data.next_shift.ends_at)}</Text>
                    <Muted>{[c.data.next_shift.role, c.data.next_shift.location].filter(Boolean).join(' · ') || t('Shift')}</Muted>
                  </View>
                </Row>
              </Card>
            </Rise>
          ) : null}
          <Rise delay={160}>
            <Card style={{ paddingVertical: 4 }}>
              <ListRow title={t('My availability')} left={<IconTile name="check" color={tint(1)} size={36} />} onPress={() => router.push('/availability')} />
              <Divider />
              <ListRow title={t('Team news')} left={<IconTile name="news" color={tint(2)} size={36} />} onPress={() => router.push('/feed')} />
              <Divider />
              <ListRow title={t('Time off')} left={<IconTile name="sun" color={tint(3)} size={36} />} onPress={() => router.navigate('/timeoff')} />
            </Card>
          </Rise>
          <Rise delay={200}><Suites /></Rise>
        </>
      ) : (
        <>
          <Card onPress={() => router.push('/wallet')}>
            <Row><IconTile name="wallet" color={tint(0)} /><View style={{ flex: 1 }}><B>{t('Wallet')}</B><Muted>{t('Get paid and transfer money to your bank')}</Muted></View><Icon name="chevron" color={C.faint} size={18} /></Row>
          </Card>
          <Card>
            <Empty icon="user" title={t('Your OENOD account')} sub={t('Your digital business card and badge are under Me. When an employer adds you to their team, your shifts and time clock show up here.')} />
          </Card>
        </>
      )}
    </Screen>
  );
}
