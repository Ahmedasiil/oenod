import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { openTool } from '../web';
import { Rise } from '../../ui/Motion';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { dayKey, day, hm, longDay, minutesBetween, time, todayKey } from '../../lib/format';
import { C, R, S } from '../../lib/theme';
import { t, locale } from '../../lib/i18n';
import type { MySchedule } from '../../lib/types';
import { Avatar, B, Button, Card, Empty, ErrorBox, H2, Loading, Muted, Pill, Row, Screen } from '../../ui/kit';
import { DateTile, IconTile, Section, Summary, shortDay, tint } from '../../ui/Summary';
import { Icon } from '../../ui/Icon';

type Shift = { id: number; starts_at: string; ends_at: string; role: string | null; location: string | null; notes?: string | null; break_minutes?: number; first_name?: string; last_name?: string; color?: string | null; published?: number; employee_id?: number | null };
type Req = { id: number; kind: 'swap' | 'drop' | 'claim'; name: string; target_name: string | null; starts_at: string; ends_at: string; role: string | null; note: string | null };

const addDays = (ymd: string, n: number) => { const d = new Date(ymd + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const WK = { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' };
const WKT = { color: '#FFFFFF', fontWeight: '700' as const, fontSize: 13 };
const say = (title: string, msg: string) => (Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg));

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.dark ? C.card2 : '#F5F7FB', borderRadius: 10, padding: 3 }} accessibilityRole="tablist">
      {options.map(([v, l]) => (
        <Pressable key={v} onPress={() => onChange(v)} accessibilityRole="tab" accessibilityState={{ selected: value === v }}
          style={{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center', backgroundColor: value === v ? C.card : 'transparent' }}>
          <Text style={{ fontWeight: '600', fontSize: 13, color: value === v ? C.ink : C.faint }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** The employee's own shifts, open shifts to pick up, and availability. */
function Mine() {
  const d = useLoad(() => get<MySchedule>('/api/me/schedule'));
  const [busy, setBusy] = useState<number | null>(null);
  const today = todayKey();
  if (d.loading && !d.data) return <Loading />;
  if (!d.data) return <ErrorBox text={d.error || t('Could not load.')} onRetry={d.reload} />;
  const x = d.data;
  const claim = async (id: number) => {
    setBusy(id);
    try { await post(`/api/shifts/${id}/claim`); say(t('Done'), t('Your manager was asked. You will get a notification when it is approved.')); d.reload(); }
    catch (e: any) { say(t('Not done'), e.message); }
    finally { setBusy(null); }
  };
  const toConfirm = x.shifts.filter((s) => !s.confirm).length;
  return (
    <>
      <Summary seed={4} label={t('Scheduled this week')} value={hm(x.week_minutes)}
        badge={toConfirm ? <Pill text={t('{n} to confirm', { n: toConfirm })} kind="warn" /> : <Pill text={t('All confirmed')} kind="good" />}
        minis={[[t('Upcoming'), String(x.shifts.length)], [t('Open shifts'), String(x.open.length)], [t('Next shift'), x.shifts[0] ? shortDay(x.shifts[0].starts_at) : '—']]} />
      <Section>
      <H2>{t('Upcoming shifts')}</H2>
      {x.shifts.length ? x.shifts.map((s) => (
        <Card key={s.id} onPress={() => router.push(`/shift/${s.id}`)}>
          <Row>
            <DateTile iso={s.starts_at} today={dayKey(s.starts_at) === today} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{time(s.starts_at)} – {time(s.ends_at)}</Text>
              <Muted>{[s.role, s.location].filter(Boolean).join(' · ') || t('Shift')}</Muted>
              <Row style={{ marginTop: 4, flexWrap: 'wrap', gap: 6 }}>
                {s.confirm === 'confirmed' ? <Pill text={t('Confirmed')} kind="good" /> : s.confirm === 'declined' ? <Pill text={t("Can't work")} kind="bad" /> : <Pill text={t('Tap to confirm')} kind="warn" />}
                {s.request ? <Pill text={t(s.request.kind === 'swap' ? 'Swap requested' : 'Give-away requested')} kind="info" /> : null}
              </Row>
            </View>
            <Icon name="chevron" color={C.faint} size={18} />
          </Row>
        </Card>
      )) : <Card><Empty icon="calendar" title={t('No shifts yet')} sub={t('When your manager publishes the schedule, your shifts show up here.')} /></Card>}
      </Section>

      <Section i={1}>
      <H2>{t('Open shifts')}</H2>
      {x.open.length ? x.open.map((o) => (
        <Card key={o.id}>
          <Row>
            <DateTile iso={o.starts_at} />
            <View style={{ flex: 1 }}>
              <B>{time(o.starts_at)} – {time(o.ends_at)}</B>
              <Muted>{[o.role, o.location, hm(o.minutes ?? minutesBetween(o.starts_at, o.ends_at))].filter(Boolean).join(' · ')}</Muted>
              {o.clash ? <Muted style={{ color: C.warn }}>{t('You already work at that time.')}</Muted> : null}
            </View>
            {o.claimed ? <Pill text={t('Requested')} kind="info" /> : <Button title={t('Pick up')} onPress={() => claim(o.id)} busy={busy === o.id} disabled={!!o.clash} style={{ minHeight: 40, paddingHorizontal: 14 }} />}
          </Row>
        </Card>
      )) : <Card><Muted>{t('No open shifts right now. Extra shifts your manager posts show up here.')}</Muted></Card>}
      </Section>

      <Card onPress={() => router.push('/availability')}>
        <Row><IconTile name="clock" color={tint(0)} /><View style={{ flex: 1 }}><B>{t('My availability')}</B><Muted>{t('Tell your manager when you can and cannot work.')}</Muted></View><Icon name="chevron" color={C.faint} size={18} /></Row>
      </Card>
    </>
  );
}

/** Managers: swap, give-away and pick-up requests waiting for a decision. */
function Requests({ list, onDone }: { list: Req[]; onDone: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!list.length) return null;
  const decide = async (id: number, decision: 'approve' | 'decline') => {
    setBusy(`${id}${decision}`);
    try { await post(`/api/schedule/requests/${id}/decide`, { decision }); onDone(); }
    catch (e: any) { say(t('Not done'), e.message); }
    finally { setBusy(null); }
  };
  const what = (r: Req) => r.kind === 'claim' ? t('{a} wants to pick up a shift', { a: r.name }) : r.kind === 'swap' ? t('{a} wants to swap with {b}', { a: r.name, b: r.target_name || '?' }) : t('{a} wants to give away a shift', { a: r.name });
  return (
    <>
      <H2>{`${t('Shift requests')} (${list.length})`}</H2>
      {list.map((r) => (
        <Card key={r.id}>
          <B>{what(r)}</B>
          <Muted>{day(r.starts_at)}, {time(r.starts_at)}–{time(r.ends_at)}{r.role ? ' · ' + r.role : ''}</Muted>
          {r.note ? <Muted>“{r.note}”</Muted> : null}
          <Row style={{ marginTop: S.md }}>
            <Button title={t('Deny')} kind="secondary" icon="x" onPress={() => decide(r.id, 'decline')} busy={busy === `${r.id}decline`} style={{ flex: 1 }} />
            <Button title={t('Approve')} icon="check" onPress={() => decide(r.id, 'approve')} busy={busy === `${r.id}approve`} style={{ flex: 1 }} />
          </Row>
        </Card>
      ))}
    </>
  );
}

/** Mon..Sun of the week holding ymd. */
const weekOf = (ymd: string) => { const d = new Date(ymd + 'T12:00:00'); const off = (d.getDay() + 6) % 7; return Array.from({ length: 7 }, (_, i) => addDays(ymd, i - off)); };
const weekNo = (ymd: string) => { const d = new Date(ymd + 'T12:00:00'); const j = new Date(d.getFullYear(), 0, 1); return Math.ceil(((+d - +j) / 864e5 + j.getDay() + 1) / 7); };

/** The 7-day strip under the header: the picked day is ink, days with shifts get a dot. */
function WeekStrip({ days, sel, set, has, onPrev, onNext }: { days: string[]; sel: string; set: (d: string) => void; has: Set<string>; onPrev: () => void; onNext: () => void }) {
  const today = todayKey();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 10 }}>
      <Pressable onPress={onPrev} hitSlop={10} accessibilityLabel={t('Previous week')} style={{ width: 22, alignItems: 'center' }}><Icon name="back" size={16} color={C.faint} duo={false} /></Pressable>
      {days.map((d) => {
        const on = d === sel;
        const dt = new Date(d + 'T12:00:00');
        return (
          <Pressable key={d} onPress={() => set(d)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14, gap: 4, backgroundColor: on ? (C.dark ? '#FFFFFF' : '#0A1230') : 'transparent' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: on ? (C.dark ? '#4A5372' : '#9AA5C8') : C.faint }}>{dt.toLocaleDateString(locale(), { weekday: 'short' }).slice(0, 3)}</Text>
            <Text style={{ fontSize: 16, fontWeight: on || d === today ? '800' : '600', color: on ? (C.dark ? '#0A1230' : '#FFFFFF') : d === today ? C.blue : C.ink }}>{dt.getDate()}</Text>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: has.has(d) ? (on ? '#AFC3FF' : C.blue) : 'transparent' }} />
          </Pressable>
        );
      })}
      <Pressable onPress={onNext} hitSlop={10} accessibilityLabel={t('Next week')} style={{ width: 22, alignItems: 'center' }}><Icon name="chevron" size={16} color={C.faint} duo={false} /></Pressable>
    </View>
  );
}

/** Dark AI card: a short tip about the picked day. */
function AiTip({ text, onOpen }: { text: string; onOpen: () => void }) {
  return (
    <View style={{ borderRadius: 20, padding: 16, backgroundColor: '#0B1B3F', overflow: 'hidden', gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: '#3D5BF5', alignItems: 'center', justifyContent: 'center' }}><Icon name="spark" size={18} color="#FFFFFF" duo={false} /></View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: '#AFC3FF', fontSize: 12, fontWeight: '600' }}>{t('OENOD AI')}</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 14, lineHeight: 20 }}>{text}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={onOpen} accessibilityRole="button" style={{ height: 34, paddingHorizontal: 14, borderRadius: 11, backgroundColor: '#FFFFFF', justifyContent: 'center' }}><Text style={{ color: '#0A1230', fontWeight: '700', fontSize: 13 }}>{t('Open schedule')}</Text></Pressable>
        <Pressable onPress={() => router.push('/ai')} accessibilityRole="button" style={{ height: 34, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>{t('Ask AI')}</Text></Pressable>
      </View>
    </View>
  );
}

/** One shift: time column, avatar, name and role, status pill. */
function ShiftRow({ s }: { s: Shift }) {
  const now = Date.now();
  const live = +new Date(s.starts_at) <= now && +new Date(s.ends_at) > now;
  const name = s.first_name ? `${s.first_name} ${s.last_name || ''}`.trim() : t('Open shift');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: C.card, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line }}>
      <View style={{ width: 66 }}>
        <Text style={{ color: C.ink, fontWeight: '700', fontSize: 13.5 }} numberOfLines={1} adjustsFontSizeToFit>{time(s.starts_at)}</Text>
        <Text style={{ color: C.faint, fontSize: 11 }} numberOfLines={1} adjustsFontSizeToFit>{t('to {t}', { t: time(s.ends_at) })}</Text>
      </View>
      {s.first_name ? <Avatar name={name} color={s.color} size={36} /> : <View style={{ width: 36, height: 36, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.faint, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={16} color={C.faint} duo={false} /></View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.ink, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{name}</Text>
        <Text style={{ color: C.faint, fontSize: 12.5 }} numberOfLines={1}>{[s.role, s.location].filter(Boolean).join(' · ') || hm(minutesBetween(s.starts_at, s.ends_at) - (s.break_minutes || 0))}</Text>
      </View>
      {!s.published ? <Pill text={t('Draft')} kind="warn" /> : !s.employee_id ? <Pill text={t('Open')} kind="warn" /> : live ? <Pill text={t('On now')} kind="good" /> : <Pill text={hm(minutesBetween(s.starts_at, s.ends_at) - (s.break_minutes || 0))} kind="info" />}
    </View>
  );
}

function Everyone({ sel, from, onLoaded }: { sel: string; from: string; onLoaded: (days: Set<string>) => void }) {
  const { isManager } = useAuth();
  const to = addDays(from, 6);
  const d = useLoad(async () => {
    const r = await get<{ shifts: Shift[]; hours: number }>(`/api/shifts?from=${from}&to=${to}`);
    const q = isManager ? await get<{ requests: Req[] }>('/api/schedule').catch(() => ({ requests: [] as Req[] })) : { requests: [] as Req[] };
    const shifts = (r.shifts || []).filter((s) => s.published || isManager);
    onLoaded(new Set(shifts.map((s) => dayKey(s.starts_at))));
    return { shifts, requests: q.requests || [] };
  }, [from, isManager]);
  const list = useMemo(() => (d.data?.shifts || []).filter((s) => dayKey(s.starts_at) === sel).sort((a, b) => a.starts_at.localeCompare(b.starts_at)), [d.data, sel]);
  const weekMin = (d.data?.shifts || []).reduce((a, s) => a + minutesBetween(s.starts_at, s.ends_at) - (s.break_minutes || 0), 0);
  const open = list.filter((s) => !s.employee_id).length;
  const drafts = (d.data?.shifts || []).filter((s) => !s.published).length;
  const tip = open === 1 ? t('1 open shift on this day still needs someone. Post it so your team can pick it up.') : open ? t('{n} open shifts on this day still need someone. Post them so your team can pick them up.', { n: open })
    : drafts ? t('{n} shifts this week are drafts. Publish the schedule so your team gets notified.', { n: drafts })
    : list.length ? t('{n} people are working, {h} scheduled in total this week.', { n: new Set(list.map((s) => s.employee_id)).size, h: hm(weekMin) })
    : t('Nobody is scheduled on this day yet.');
  const dayName = new Date(sel + 'T12:00:00').toLocaleDateString(locale(), { weekday: 'long' });
  if (d.loading && !d.data) return <Loading />;
  if (d.error && !d.data) return <ErrorBox text={d.error} onRetry={d.reload} />;
  return (
    <>
      {isManager ? <Rise><AiTip text={tip} onOpen={() => openTool('/schedule', t('Schedule'))} /></Rise> : null}
      <Requests list={d.data?.requests || []} onDone={d.reload} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <Text style={{ flex: 1, color: C.ink, fontSize: 16, fontWeight: '700' }} accessibilityRole="header">{`${dayName} · ${list.length === 1 ? t('1 shift') : t('{n} shifts', { n: list.length })}`}</Text>
        <Text style={{ color: C.faint, fontSize: 12.5 }}>{t('{h} this week', { h: hm(weekMin) })}</Text>
      </View>
      {list.length ? <View style={{ gap: 8 }}>{list.map((s) => <ShiftRow key={s.id} s={s} />)}</View>
        : <Card><Empty icon="calendar" title={t('No shifts on this day')} sub={isManager ? t('Tap Add shift to plan this day.') : t('Nobody is scheduled on this day.')} /></Card>}
    </>
  );
}

export default function Schedule() {
  const { isManager, session } = useAuth();
  const [view, setView] = useState<'mine' | 'all'>(session?.employee && !isManager ? 'mine' : 'all');
  const [k, setK] = useState(0);
  const [sel, setSel] = useState(todayKey());
  const [has, setHas] = useState<Set<string>>(new Set());
  const days = weekOf(sel);
  const dt = new Date(sel + 'T12:00:00');
  const eyebrow = `${dt.toLocaleDateString(locale(), { month: 'long' })}, ${t('week {n}', { n: weekNo(sel) })}`;
  const below = (
    <View style={{ gap: 10 }}>
      {session?.employee ? <Segmented value={view} onChange={(v) => setView(v as any)} options={[['all', t('Everyone')], ['mine', t('My shifts')]]} /> : null}
      {view === 'all' ? <WeekStrip days={days} sel={sel} set={setSel} has={has} onPrev={() => setSel(addDays(sel, -7))} onNext={() => setSel(addDays(sel, 7))} /> : null}
    </View>
  );
  const fab = isManager && view === 'all' ? (
    <Pressable onPress={() => openTool('/schedule', t('Schedule'))} accessibilityRole="button" accessibilityLabel={t('Add shift')}
      style={({ pressed }) => ({ height: 50, paddingHorizontal: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.dark ? '#FFFFFF' : '#0A1230', opacity: pressed ? 0.85 : 1, shadowColor: '#0A1230', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 })}>
      <Icon name="plus" size={18} color={C.dark ? '#0A1230' : '#FFFFFF'} duo={false} />
      <Text style={{ color: C.dark ? '#0A1230' : '#FFFFFF', fontWeight: '700', fontSize: 14 }}>{t('Add shift')}</Text>
    </Pressable>
  ) : undefined;
  return (
    <Screen eyebrow={eyebrow} title={t('Schedule')} below={below} fab={fab} refreshing={false} onRefresh={() => setK((x) => x + 1)}
      right={<Pressable onPress={() => openTool('/schedule', t('Schedule'))} accessibilityLabel={t('Search')} style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.dark ? C.card2 : '#F5F7FB' }}><Icon name="search" size={19} color={C.ink} duo={false} /></Pressable>}>
      {view === 'mine' ? <Mine key={k} /> : <Everyone key={`${k}-${days[0]}`} sel={sel} from={days[0]} onLoaded={setHas} />}
      {isManager && view === 'all' ? <View style={{ height: 60 }} /> : null}
    </Screen>
  );
}
