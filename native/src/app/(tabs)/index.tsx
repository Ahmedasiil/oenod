import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../lib/auth';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { greeting, hm, minutesBetween, money, time, day } from '../../lib/format';
import { C, S } from '../../lib/theme';
import { Avatar, B, Button, Card, Divider, Empty, ErrorBox, H2, ListRow, Loading, Muted, Pill, Row, Screen, Stat } from '../../ui/kit';
import { DateTile, IconTile, tint } from '../../ui/Summary';
import { AiOrb } from '../../ui/TabBar';
import { Icon, IconName } from '../../ui/Icon';
import { HeroCard } from '../../ui/Brand';
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

/** Four glass action squares inside the navy top panel. */
function Actions({ items }: { items: Quick[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {items.map((q, n) => (
        <Rise key={q.label} delay={80 + n * 50} style={{ flex: 1 }}>
          <Pressy onPress={q.go} accessibilityRole="button" accessibilityLabel={q.label}
            style={{ backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingVertical: 14, alignItems: 'center', gap: 8 }}>
            <Icon name={q.icon} color="#FFFFFF" size={24} />
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 12 }} numberOfLines={1}>{q.label}</Text>
          </Pressy>
        </Rise>
      ))}
    </View>
  );
}

/** A plain list of extra tools, each with a tinted icon square. */
function MoreList({ items }: { items: Quick[] }) {
  return (
    <Card style={{ paddingVertical: S.xs }}>
      {items.map((q, i) => (
        <View key={q.label}>
          {i ? <Divider /> : null}
          <ListRow title={q.label} left={<IconTile name={q.icon} color={tint(i + 1)} />} onPress={q.go} />
        </View>
      ))}
    </Card>
  );
}

function OwnerHero({ x }: { x: any }) {
  const sales = useCountUp(Number(x?.sales_today || 0));
  if (!x) return null;
  const growth = x.sales_prev_week ? Math.round(((x.sales_week - x.sales_prev_week) / x.sales_prev_week) * 100) : null;
  return (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: 15 }}>{t('Sales today')}</Text>
        {growth == null ? null : <Pill text={t('{p}% vs last week', { p: `${growth >= 0 ? '+' : ''}${growth}` })} kind={growth >= 0 ? 'good' : 'warn'} />}
      </Row>
      <Text style={{ color: '#FFFFFF', fontSize: 46, fontWeight: '800', letterSpacing: -1.8 }}>{money(sales)}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{t('This week')}: {money(x.sales_week)} · {t('Team')}: {String(x.headcount ?? '—')}</Text>
    </View>
  );
}

function OwnerBody({ d, more }: { d: ReturnType<typeof useLoad<any>>; more: Quick[] }) {
  if (d.loading && !d.data) return <Loading />;
  if (!d.data) return d.error ? <ErrorBox text={d.error} onRetry={d.reload} /> : null;
  const x = d.data;
  return (
    <>
      {x.pending_timeoff ? (
        <Card onPress={() => router.navigate('/timeoff')} style={{ borderColor: C.warnLine, backgroundColor: C.warnSoft }}>
          <Row><Icon name="sun" color={C.warn} /><B style={{ flex: 1 }}>{x.pending_timeoff === 1 ? t('1 time-off request to review') : t('{n} time-off requests to review', { n: x.pending_timeoff })}</B><Icon name="chevron" color={C.warn} size={18} /></Row>
        </Card>
      ) : null}
      <Rise delay={120}>
        <Row style={{ gap: 10 }}>
          <Stat label={t('Orders')} value={String(x.orders_today ?? 0)} />
          <Stat label={t('Labor')} value={x.labor_pct == null ? '—' : `${Math.round(x.labor_pct)}%`} />
          <Stat label={t('Working now')} value={String((x.on_clock || []).length)} />
        </Row>
      </Rise>
      <Rise delay={170}>
        <Pressy onPress={() => router.navigate('/ai')} accessibilityRole="button" accessibilityLabel={t('Ask OENOD AI')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
          <AiOrb size={44} still />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }}>{t('Your AI brief is ready')}</Text>
            <Text style={{ color: C.sub, fontSize: 13.5, marginTop: 2 }}>{t('OENOD AI read today’s numbers. Tap to see what matters.')}</Text>
          </View>
          <Icon name="chevron" color={C.faint} size={18} />
        </Pressy>
      </Rise>
      <Rise delay={220} style={{ gap: S.md }}>
        <H2 action={t('See all')} onAction={() => router.navigate('/team')}>{t('Working now')}</H2>
        <Card style={{ paddingVertical: S.xs }}>
          {(x.on_clock || []).length ? x.on_clock.map((o: any, i: number) => (
            <View key={o.id}>{i ? <Divider /> : null}
              <ListRow title={`${o.first_name} ${o.last_name}`} sub={`${o.job_title || t('Team')} · ${t('since {t}', { t: time(o.clock_in) })}`}
                left={<Avatar name={`${o.first_name} ${o.last_name}`} color={o.color} />}
                right={<Pill text={o.break_started_at ? t('Break') : t('In')} kind={o.break_started_at ? 'warn' : 'good'} />}
                onPress={() => router.push(`/employee/${o.employee_id}`)} />
            </View>
          )) : <Muted style={{ paddingVertical: S.md }}>{t('Nobody is clocked in right now.')}</Muted>}
        </Card>
        <H2 action={t('See all')} onAction={() => router.navigate('/schedule')}>{t('Shifts today')}</H2>
        <Card style={{ paddingVertical: S.xs }}>
          {(x.shifts_today || []).length ? x.shifts_today.map((s: any, i: number) => (
            <View key={i}>{i ? <Divider /> : null}
              <ListRow title={`${s.first_name} ${s.last_name}`} sub={s.role || undefined} left={<Avatar name={`${s.first_name} ${s.last_name}`} color={s.color} size={40} />}
                right={<Text style={{ color: C.ink, fontWeight: '700' }}>{time(s.starts_at)}–{time(s.ends_at)}</Text>} />
            </View>
          )) : <Muted style={{ paddingVertical: S.md }}>{t('No shifts scheduled today.')}</Muted>}
        </Card>
        <H2>{t('More tools')}</H2>
        <MoreList items={more} />
        {(x.low_stock || []).length ? (
          <>
            <H2>{t('Low stock')}</H2>
            <Card style={{ paddingVertical: S.xs }}>{x.low_stock.slice(0, 6).map((p: any, i: number) => (
              <View key={i}>{i ? <Divider /> : null}<ListRow title={p.name} left={<IconTile name="briefcase" color={C.warn} />} sub={t('{n} left · reorder at {r}', { n: Number(p.stock_qty ?? 0), r: Number(p.reorder_level ?? 0) })} /></View>
            ))}</Card>
          </>
        ) : null}
      </Rise>
    </>
  );
}

export default function Home() {
  const { session, isManager } = useAuth();
  const hasEmployee = !!session?.employee;
  const c = useLoad<Clock | null>(() => (hasEmployee ? get<Clock>('/api/me/clock') : Promise.resolve(null)), [hasEmployee]);
  const dash = useLoad<any>(() => (isManager ? get('/api/dashboard') : Promise.resolve(null)), [isManager]);
  const first = (session?.user?.name || '').split(' ')[0];
  const unread = session?.notifications || 0;
  const role = session?.user?.role || '';
  const who = isManager ? t(ROLE_LABEL[role] || 'Manager') : hasEmployee ? t('Employee') : t('Member');
  const company = session?.company?.name || 'OENOD';
  const ownerActions: Quick[] = [
    { icon: 'calendar', label: t('Schedule'), go: () => router.navigate('/schedule') },
    { icon: 'users', label: t('Team'), go: () => router.navigate('/team') },
    { icon: 'sun', label: t('Time off'), go: () => router.navigate('/timeoff') },
    { icon: 'cash', label: t('Wallet'), go: () => router.push('/wallet') },
  ];
  const ownerMore: Quick[] = [
    { icon: 'news', label: t('Team news'), go: () => router.push('/feed') },
    { icon: 'bell', label: t('Notifications'), go: () => router.push('/notifications') },
  ];
  const staffActions: Quick[] = [
    { icon: 'calendar', label: t('Shifts'), go: () => router.navigate('/schedule') },
    { icon: 'clock', label: t('Hours'), go: () => router.push('/timesheet') },
    { icon: 'cash', label: t('Pay'), go: () => router.push('/pay') },
    { icon: 'sun', label: t('Time off'), go: () => router.navigate('/timeoff') },
  ];
  const staffMore: Quick[] = [
    { icon: 'check', label: t('My availability'), go: () => router.push('/availability') },
    { icon: 'news', label: t('Team news'), go: () => router.push('/feed') },
    { icon: 'cash', label: t('Wallet'), go: () => router.push('/wallet') },
  ];
  const hero = isManager ? (<><OwnerHero x={dash.data} /><Actions items={ownerActions} /></>)
    : hasEmployee ? (<>{c.data ? <ClockCard clock={c.data} onChange={(x) => c.setData(x)} /> : null}<Actions items={staffActions} /></>)
    : undefined;
  return (
    <Screen
      eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
      title={`${greeting()}${first ? ', ' + first : ''}`}
      subtitle={`${who} · ${company}`}
      hero={hero}
      refreshing={c.refreshing || dash.refreshing}
      onRefresh={() => { c.refresh(); dash.refresh(); }}
      right={
        <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable onPress={() => router.push('/notifications')} accessibilityRole="button" accessibilityLabel={`${t('Notifications')}${unread ? ` (${unread})` : ''}`} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: hero ? 'rgba(255,255,255,0.12)' : C.card2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" color={hero ? '#FFFFFF' : C.ink} size={22} />
          {unread ? <View style={{ position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.bad, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>{unread > 9 ? '9+' : unread}</Text></View> : null}
        </Pressable>
        <Pressable onPress={() => router.navigate('/me')} accessibilityRole="button" accessibilityLabel={t('Me')} style={{ borderRadius: 22, overflow: 'hidden' }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#3D5BF5', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>{(session?.user?.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</Text>
          </View>
        </Pressable>
        </View>
      }
    >
      {isManager ? (
        <>
          <OwnerBody d={dash} more={ownerMore} />
          {hasEmployee && c.data ? (<><H2>{t('My time clock')}</H2><HeroCard seed={5}><ClockCard clock={c.data} onChange={(x) => c.setData(x)} /></HeroCard></>) : null}
        </>
      ) : hasEmployee ? (
        <>
          {!c.data ? (c.error ? <ErrorBox text={c.error} onRetry={c.reload} /> : <Loading />) : null}
          {c.data?.next_shift ? (
            <Rise delay={120}>
              <H2 action={t('See all')} onAction={() => router.navigate('/schedule')}>{t('Next shift')}</H2>
              <Card onPress={() => router.navigate('/schedule')} style={{ marginTop: S.md }}>
                <Row>
                  <DateTile iso={c.data.next_shift.starts_at} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.ink, fontSize: 17, fontWeight: '800' }}>{time(c.data.next_shift.starts_at)} – {time(c.data.next_shift.ends_at)}</Text>
                    <Muted>{[c.data.next_shift.role, c.data.next_shift.location].filter(Boolean).join(' · ') || t('Shift')}</Muted>
                  </View>
                  <Icon name="chevron" color={C.faint} size={18} />
                </Row>
              </Card>
            </Rise>
          ) : null}
          <Rise delay={200} style={{ gap: S.md }}>
            <H2>{t('More tools')}</H2>
            <MoreList items={staffMore} />
          </Rise>
        </>
      ) : (
        <>
          <Card onPress={() => router.push('/wallet')}>
            <Row><IconTile name="cash" color={tint(0)} /><View style={{ flex: 1 }}><B>{t('Wallet')}</B><Muted>{t('Get paid and transfer money to your bank')}</Muted></View><Icon name="chevron" color={C.faint} size={18} /></Row>
          </Card>
          <Card>
            <Empty icon="user" title={t('Your OENOD account')} sub={t('Your digital business card and badge are under Me. When an employer adds you to their team, your shifts and time clock show up here.')} />
          </Card>
        </>
      )}
    </Screen>
  );
}
