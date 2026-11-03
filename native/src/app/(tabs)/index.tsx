import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../lib/auth';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { greeting, hm, minutesBetween, money, time, day } from '../../lib/format';
import { C, S } from '../../lib/theme';
import { Avatar, B, Button, Card, Empty, ErrorBox, H2, ListRow, Loading, Muted, Pill, Row, Screen, Stat } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
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
    <View style={{ backgroundColor: C.navy, borderRadius: 22, padding: S.xl, gap: S.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: '#C9D3EA', fontWeight: '600' }}>{t('Time clock')}</Text>
        {open ? <Pill text={t(onBreak ? 'On break' : 'Clocked in')} kind={onBreak ? 'warn' : 'good'} /> : <Pill text={t('Clocked out')} kind="plain" />}
      </Row>
      <Text style={{ color: C.white, fontSize: 40, fontWeight: '800', letterSpacing: -1 }} accessibilityLiveRegion="polite">
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
          <Button title={t('Break')} icon="coffee" kind="secondary" onPress={() => act('break')} busy={busy === 'break'} style={{ flex: 1 }} />
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

function Manager() {
  const d = useLoad(() => get('/api/dashboard'));
  if (d.loading && !d.data) return <Loading />;
  if (!d.data) return d.error ? <ErrorBox text={d.error} onRetry={d.reload} /> : null;
  const x = d.data;
  const growth = x.sales_prev_week ? Math.round(((x.sales_week - x.sales_prev_week) / x.sales_prev_week) * 100) : null;
  return (
    <>
      <H2>{t('Today')}</H2>
      <Row style={{ flexWrap: 'wrap' }}>
        <Stat label={t('Sales today')} value={money(x.sales_today)} sub={t('{n} orders', { n: x.orders_today })} />
        <Stat label={t('Labor')} value={x.labor_pct == null ? '—' : `${Math.round(x.labor_pct)}%`} sub={`${hm((x.labor_hours_today || 0) * 60)} · ${money(x.labor_cost_today)}`} />
      </Row>
      <Row style={{ flexWrap: 'wrap' }}>
        <Stat label={t('This week')} value={money(x.sales_week)} sub={growth == null ? t('vs last week') : t('{p}% vs last week', { p: `${growth >= 0 ? '+' : ''}${growth}` })} />
        <Stat label={t('Team')} value={String(x.headcount ?? '—')} sub={t('{n} working now', { n: (x.on_clock || []).length })} />
      </Row>
      {x.pending_timeoff ? (
        <Card onPress={() => router.navigate('/timeoff')} style={{ borderColor: '#F4D9B5', backgroundColor: C.warnSoft }}>
          <Row><Icon name="sun" color={C.warn} /><B style={{ flex: 1 }}>{x.pending_timeoff === 1 ? t('1 time-off request to review') : t('{n} time-off requests to review', { n: x.pending_timeoff })}</B><Icon name="chevron" color={C.warn} size={18} /></Row>
        </Card>
      ) : null}
      <H2>{t('Working now')}</H2>
      <Card>
        {(x.on_clock || []).length ? x.on_clock.map((o: any) => (
          <ListRow key={o.id} title={`${o.first_name} ${o.last_name}`} sub={`${o.job_title || t('Team')} · ${t('since {t}', { t: time(o.clock_in) })}${o.break_started_at ? ' · ' + t('on break') : ''}`}
            left={<Avatar name={`${o.first_name} ${o.last_name}`} color={o.color} />} onPress={() => router.push(`/employee/${o.employee_id}`)} />
        )) : <Muted>{t('Nobody is clocked in right now.')}</Muted>}
      </Card>
      <H2>{t('Shifts today')}</H2>
      <Card>
        {(x.shifts_today || []).length ? x.shifts_today.map((s: any, i: number) => (
          <ListRow key={i} title={`${s.first_name} ${s.last_name}`} sub={`${time(s.starts_at)}–${time(s.ends_at)}${s.role ? ' · ' + s.role : ''}`} left={<Avatar name={`${s.first_name} ${s.last_name}`} color={s.color} size={36} />} />
        )) : <Muted>{t('No shifts scheduled today.')}</Muted>}
      </Card>
      {(x.low_stock || []).length ? (
        <>
          <H2>{t('Low stock')}</H2>
          <Card>{x.low_stock.slice(0, 6).map((p: any, i: number) => <ListRow key={i} title={p.name} sub={t('{n} left · reorder at {r}', { n: Number(p.stock_qty ?? 0), r: Number(p.reorder_level ?? 0) })} />)}</Card>
        </>
      ) : null}
    </>
  );
}

export default function Home() {
  const { session, isManager } = useAuth();
  const hasEmployee = !!session?.employee;
  const c = useLoad<Clock | null>(() => (hasEmployee ? get<Clock>('/api/me/clock') : Promise.resolve(null)), [hasEmployee]);
  const first = (session?.user?.name || '').split(' ')[0];
  const unread = session?.notifications || 0;
  return (
    <Screen
      title={`${greeting()}${first ? ', ' + first : ''}`}
      subtitle={session?.company?.name || 'OENOD'}
      refreshing={c.refreshing}
      onRefresh={c.refresh}
      right={
        <Pressable onPress={() => router.push('/notifications')} accessibilityRole="button" accessibilityLabel={`${t('Notifications')}${unread ? ` (${unread})` : ''}`} style={{ padding: 8 }}>
          <Icon name="bell" color={C.white} size={26} />
          {unread ? <View style={{ position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.bad, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.white, fontSize: 11, fontWeight: '800' }}>{unread > 9 ? '9+' : unread}</Text></View> : null}
        </Pressable>
      }
    >
      {hasEmployee ? (
        c.data ? <ClockCard clock={c.data} onChange={(x) => c.setData(x)} /> : c.error ? <ErrorBox text={c.error} onRetry={c.reload} /> : <Loading />
      ) : null}
      <Card onPress={() => router.push('/wallet')}>
        <Row><Icon name="cash" color={C.blue} /><View style={{ flex: 1 }}><B>{t('Wallet')}</B><Muted>{t('Get paid and transfer money to your bank')}</Muted></View><Icon name="chevron" color={C.faint} size={18} /></Row>
      </Card>
      {hasEmployee && c.data ? (
        <Card onPress={() => router.push('/timesheet')}>
          <Row><Icon name="clock" color={C.blue} /><B style={{ flex: 1 }}>{t('My hours and timesheet')}</B><Icon name="chevron" color={C.faint} size={18} /></Row>
        </Card>
      ) : null}
      {hasEmployee ? (
        <Card onPress={() => router.push('/pay')}>
          <Row><Icon name="cash" color={C.blue} /><B style={{ flex: 1 }}>{t('My pay stubs')}</B><Icon name="chevron" color={C.faint} size={18} /></Row>
        </Card>
      ) : null}
      {hasEmployee || isManager ? (
        <Card onPress={() => router.push('/feed')}>
          <Row><Icon name="users" color={C.blue} /><B style={{ flex: 1 }}>{t('Team news')}</B><Icon name="chevron" color={C.faint} size={18} /></Row>
        </Card>
      ) : null}
      {isManager ? <Manager /> : null}
      {!hasEmployee && !isManager ? (
        <Card>
          <Empty icon="user" title={t('Your OENOD account')} sub={t('Your digital business card and badge are under Me. When an employer adds you to their team, your shifts and time clock show up here.')} />
        </Card>
      ) : null}
    </Screen>
  );
}
