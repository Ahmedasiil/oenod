import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { formatDate, greeting } from '@oenod/i18n';
import { Bell, Briefcase, CalendarDays, CircleCheck, Clock, GraduationCap, Hourglass, MapPin, Megaphone, Palmtree, Receipt, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { day, time, hoursBetween } from '@/lib/format';
import { locale, t } from '@/lib/i18n';
import { C, F, R, shadow } from '@/lib/theme';
import type { ClockState, Me } from '@/lib/me';
import { Avatar, Badge, Button, Card, ErrorText, HeroCard, IconButton, IconTile, List, Loading, Progress, Row, Screen, Section, Stat, T } from '@/components/ui';

const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString();
const elapsed = (from: string, breakMin = 0) => {
  const m = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 60000) - breakMin);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};

// oenodpay-only accounts (no company) land on Pay.
export default function Home() {
  const { session } = useAuth();
  if (!session?.org) return <Redirect href="/pay" />;
  return <BusinessHome />;
}

function BusinessHome() {
  const router = useRouter();
  const { session, can } = useAuth();
  const me = useApi<Me>(can('me') ? '/api/me' : null);
  const clock = useApi<ClockState>(can('time') ? '/api/time/clock' : null);
  const [acking, setAcking] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(i); }, []);
  const name = session?.employee?.name ?? session?.user.name ?? '';
  const first = name.split(' ')[0];
  const next = me.data?.shifts[0];
  const open = clock.data?.open;
  const refresh = () => { me.reload(); clock.reload(); };
  // Coming back to Home (after clocking in, picking up a shift…) shows fresh numbers.
  useFocusEffect(useCallback(() => { clock.refetch(); }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  const ack = async (id: string) => {
    setAcking(id);
    try { await api(`/api/announcements/${id}/ack`, { body: {} }); me.setData((d) => d && { ...d, announcements: d.announcements.map((a) => (a.id === id ? { ...a, acked: true } : a)) }); } catch {} finally { setAcking(null); }
  };

  // This week's numbers: hours worked against hours scheduled.
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + ((7 - weekEnd.getDay()) % 7)); weekEnd.setHours(23, 59, 59);
  const scheduled = (me.data?.shifts ?? []).filter((s) => new Date(s.start) <= weekEnd).reduce((h, s) => h + hoursBetween(s.start, s.end), 0) + (clock.data?.hoursThisWeek ?? 0);
  const vacation = me.data?.employee?.leaveBalances.find((b) => b.type === 'VACATION');

  const actions = [
    can('leave') && { key: 'leave', label: t('me.leave'), icon: <Palmtree color={C.blue} size={22} />, go: () => router.push('/leave') },
    can('me') && { key: 'pay', label: t('me.payslips'), icon: <Receipt color={C.blue} size={22} />, go: () => router.push('/payslips') },
    can('me') && { key: 'shifts', label: t('me.shifts'), icon: <CalendarDays color={C.blue} size={22} />, go: () => router.push('/shifts') },
    can('ai') && { key: 'ai', label: t('me.assistant'), icon: <Sparkles color={C.blue} size={22} />, go: () => router.push('/ai') },
  ].filter(Boolean) as { key: string; label: string; icon: React.ReactNode; go: () => void }[];

  return (
    <Screen refreshing={me.refreshing || clock.refreshing} onRefresh={refresh}>
      {/* Greeting */}
      <View style={st.top}>
        <Avatar name={name} size={46} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="small" numberOfLines={1}>{greeting(locale())},</T>
          <T v="title" numberOfLines={1} style={{ fontSize: 22 }}>{first}</T>
        </View>
        <IconButton label={t('nav.notifications')} badge={session?.unread} onPress={() => router.push('/notifications')}><Bell color={C.ink} size={20} /></IconButton>
      </View>
      <T v="label" style={{ marginTop: -6 }}>{formatDate(locale(), new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}{session?.org?.name ? `  ·  ${session.org.name}` : ''}</T>

      {/* Next shift + clock status */}
      <HeroCard>
        <View style={st.heroHead}>
          <T v="label" color={C.onNavyMuted}>{t('me.nextShift')}</T>
          {can('time') && (
            <View style={[st.status, open && { backgroundColor: 'rgba(22,164,100,0.18)' }]}>
              <View style={[st.statusDot, { backgroundColor: clock.data?.onBreak ? '#F5B83D' : open ? '#3DDC97' : C.onNavyMuted }]} />
              <Text style={st.statusText}>{clock.data?.onBreak ? t('me.onBreak') : open ? `${t('me.onTheClock')} · ${elapsed(open.clockIn, open.breakMinutes)}` : t('me.clockedOut')}</Text>
            </View>
          )}
        </View>
        {next ? (
          <View style={{ gap: 6 }}>
            <Text style={st.heroDay}>{isToday(next.start) ? t('common.today') : day(next.start)}</Text>
            <Text style={st.heroTime}>{time(next.start)} – {time(next.end)}</Text>
            <View style={st.meta}>
              {next.location && <Meta icon={<MapPin color={C.onNavy} size={14} />} text={next.location.name} />}
              {next.role && <Meta icon={<Briefcase color={C.onNavy} size={14} />} text={next.role} />}
              <Meta icon={<Hourglass color={C.onNavy} size={14} />} text={`${hoursBetween(next.start, next.end)}h`} />
            </View>
          </View>
        ) : <Text style={[st.heroDay, { fontSize: 20 }]}>{t('me.noShift')}</Text>}
        {can('time') && (
          <Button big variant="light" title={open ? t('me.clockOut') : t('me.clockIn')} icon={<Clock color={C.navy} size={19} />} onPress={() => router.push('/clock')} style={{ marginTop: 6 }} />
        )}
      </HeroCard>

      {/* Quick actions */}
      {actions.length > 0 && (
        <View style={st.actions}>
          {actions.map((a) => (
            <Pressable key={a.key} accessibilityRole="button" onPress={a.go} style={({ pressed }) => [st.action, pressed && { transform: [{ scale: 0.96 }] }]}>
              <View style={st.actionIcon}>{a.icon}</View>
              <Text style={st.actionText} numberOfLines={1}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <ErrorText text={me.error} />
      {can('me') && !me.data && !me.error && <Loading />}

      {/* This week */}
      {can('time') && clock.data && (
        <Section title={t('common.thisWeek')}>
          <Card style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View style={{ gap: 2 }}>
                <T v="small">{t('me.hoursWorked')}</T>
                <Text style={st.big}>{clock.data.hoursThisWeek}<Text style={st.bigUnit}> / {Math.round(scheduled * 10) / 10}h</Text></Text>
              </View>
              <Badge text={`${Math.round((clock.data.hoursThisWeek / Math.max(scheduled, 1)) * 100)}%`} tone="blue" />
            </View>
            <Progress value={clock.data.hoursThisWeek / Math.max(scheduled, 1)} height={8} />
          </Card>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Stat icon={<IconTile size={36}><CalendarDays color={C.blue} size={18} /></IconTile>} label={t('me.upcoming')} value={String(me.data?.shifts.length ?? 0)} onPress={() => router.push('/shifts')} />
            {vacation && <Stat icon={<IconTile size={36} tone="green"><Palmtree color={C.green} size={18} /></IconTile>} label={t('me.leave')} value={`${Number(vacation.hours)}h`} onPress={() => router.push('/leave')} />}
          </View>
        </Section>
      )}

      {/* Announcements */}
      {me.data?.announcements.filter((a) => !a.acked || !a.requireAck).slice(0, 3).map((a) => (
        <Card key={a.id} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <IconTile tone="violet"><Megaphone color={C.violet} size={19} /></IconTile>
            <View style={{ flex: 1 }}>
              <T v="label">{t('me.announcements')}</T>
              <T v="heading" numberOfLines={2}>{a.title}</T>
            </View>
          </View>
          <T v="body">{a.body}</T>
          {a.requireAck && !a.acked && <Button title="I've read this" variant="primary" loading={acking === a.id} onPress={() => ack(a.id)} />}
        </Card>
      ))}

      {/* Tasks */}
      {me.data && me.data.tasks.length > 0 && (
        <Section title={t('me.myTasks')}>
          <List>
            {me.data.tasks.slice(0, 5).map((k) => (
              <Row key={k.id} title={k.title} sub={k.dueDate ? day(k.dueDate) : undefined}
                icon={<IconTile><CircleCheck color={C.blue} size={19} /></IconTile>}
                right={k.priority === 'HIGH' || k.priority === 'URGENT' ? <Badge text={k.priority === 'URGENT' ? 'Urgent' : 'High'} tone="red" /> : undefined} />
            ))}
          </List>
        </Section>
      )}

      {/* Training */}
      {me.data && me.data.trainings.some((x) => x.status !== 'COMPLETED') && (
        <Section title={t('me.training')}>
          <List>
            {me.data.trainings.filter((x) => x.status !== 'COMPLETED').map((x) => (
              <Row key={x.id} title={x.course.title} sub={x.dueDate ? `Due ${day(x.dueDate)}` : undefined} icon={<IconTile tone="amber"><GraduationCap color={C.amber} size={19} /></IconTile>} chevron />
            ))}
          </List>
        </Section>
      )}

    </Screen>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <View style={st.metaItem}>{icon}<Text style={st.metaText} numberOfLines={1}>{text}</Text></View>;
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 6 },
  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.10)' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { color: '#fff', fontFamily: F.semi, fontSize: 12 },
  heroDay: { color: '#fff', fontFamily: F.semi, fontSize: 15, opacity: 0.9 },
  heroTime: { color: '#fff', fontFamily: F.display, fontSize: 30, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '100%' },
  metaText: { color: C.onNavy, fontFamily: F.medium, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 4, borderRadius: R.lg, backgroundColor: C.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, ...shadow(1) },
  actionIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: C.sky, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: F.semi, fontSize: 12, color: C.ink },
  big: { fontFamily: F.display, fontSize: 30, color: C.ink, letterSpacing: -0.8 },
  bigUnit: { fontFamily: F.medium, fontSize: 15, color: C.muted, letterSpacing: 0 },
});
