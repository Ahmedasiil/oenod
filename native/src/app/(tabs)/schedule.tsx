import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
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
    <View style={{ flexDirection: 'row', backgroundColor: C.seg, borderRadius: R.md, padding: 4 }} accessibilityRole="tablist">
      {options.map(([v, l]) => (
        <Pressable key={v} onPress={() => onChange(v)} accessibilityRole="tab" accessibilityState={{ selected: value === v }}
          style={{ flex: 1, paddingVertical: 10, borderRadius: R.sm, alignItems: 'center', backgroundColor: value === v ? C.segOn : 'transparent' }}>
          <Text style={{ fontWeight: '700', color: value === v ? C.ink : C.sub }}>{l}</Text>
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

function Everyone() {
  const { isManager } = useAuth();
  const [from, setFrom] = useState(todayKey());
  const to = addDays(from, 6);
  const d = useLoad(async () => {
    const r = await get<{ shifts: Shift[]; hours: number }>(`/api/shifts?from=${from}&to=${to}`);
    const q = isManager ? await get<{ requests: Req[] }>('/api/schedule').catch(() => ({ requests: [] as Req[] })) : { requests: [] as Req[] };
    return { shifts: r.shifts.filter((s) => s.published || isManager), requests: q.requests || [] };
  }, [from, isManager]);
  const groups = useMemo(() => {
    const m = new Map<string, Shift[]>();
    for (const s of d.data?.shifts || []) { const k = dayKey(s.starts_at); if (!m.has(k)) m.set(k, []); m.get(k)!.push(s); }
    return [...m.entries()];
  }, [d.data]);
  const today = todayKey();
  const total = (d.data?.shifts || []).reduce((a, s) => a + minutesBetween(s.starts_at, s.ends_at) - (s.break_minutes || 0), 0);
  const fmt = (ymd: string) => new Date(ymd + 'T12:00:00').toLocaleDateString(locale(), { month: 'short', day: 'numeric' });
  return (
    <>
      <Summary seed={6} label={`${fmt(from)} – ${fmt(to)}`} value={hm(total)}
        badge={(d.data?.requests || []).length ? <Pill text={d.data!.requests.length === 1 ? t('1 request') : t('{n} requests', { n: d.data!.requests.length })} kind="warn" /> : undefined}
        minis={[[t('Shifts'), String(d.data?.shifts.length ?? 0)], [t('People'), String(new Set((d.data?.shifts || []).map((s) => s.employee_id).filter(Boolean)).size)], [t('Open shifts'), String((d.data?.shifts || []).filter((s) => !s.employee_id).length)]]}>
        <Row style={{ gap: 8 }}>
          <Pressable onPress={() => setFrom(addDays(from, -7))} accessibilityRole="button" accessibilityLabel={t('Previous week')} style={WK}><Icon name="back" color={C.white} size={18} /><Text style={WKT}>{t('Previous week')}</Text></Pressable>
          <Pressable onPress={() => setFrom(addDays(from, 7))} accessibilityRole="button" accessibilityLabel={t('Next week')} style={WK}><Text style={WKT}>{t('Next week')}</Text><Icon name="chevron" color={C.white} size={18} /></Pressable>
        </Row>
      </Summary>
      {d.loading && !d.data ? <Loading /> : d.error && !d.data ? <ErrorBox text={d.error} onRetry={d.reload} /> : (
        <>
          <Requests list={d.data?.requests || []} onDone={d.reload} />
          {!groups.length ? <Card><Empty icon="calendar" title={t('No shifts yet')} sub={t('No shifts in this week.')} /></Card> : (
            <>
              {groups.map(([k, list]) => (
                <Section key={k} i={0}>
                  <H2 right={k === today ? <Pill text={t('Today')} /> : undefined}>{longDay(list[0].starts_at)}</H2>
                  {list.map((s) => (
                    <Card key={s.id}>
                      <Row>
                        {s.first_name ? <Avatar name={`${s.first_name} ${s.last_name}`} color={s.color} size={40} /> : <IconTile name="plus" color={tint(2)} />}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>{time(s.starts_at)} – {time(s.ends_at)}</Text>
                          <Muted>{[s.first_name ? `${s.first_name} ${s.last_name}` : t('Open shift'), s.role, s.location].filter(Boolean).join(' · ')}</Muted>
                          {s.notes ? <Muted style={{ marginTop: 4 }}>{s.notes}</Muted> : null}
                        </View>
                        <Muted>{hm(minutesBetween(s.starts_at, s.ends_at) - (s.break_minutes || 0))}</Muted>
                      </Row>
                      {!s.published ? <View style={{ marginTop: 8 }}><Pill text={t('Draft, not published')} kind="warn" /></View> : null}
                    </Card>
                  ))}
                </Section>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}

export default function Schedule() {
  const { isManager, session } = useAuth();
  const [view, setView] = useState<'mine' | 'all'>(session?.employee ? 'mine' : 'all');
  const [k, setK] = useState(0);
  return (
    <Screen title={t('Schedule')} subtitle={t(view === 'mine' ? 'Your upcoming shifts' : 'Everyone, this week')} refreshing={false} onRefresh={() => setK((x) => x + 1)}>
      {isManager && session?.employee ? <Segmented value={view} onChange={(v) => setView(v as any)} options={[['mine', t('My shifts')], ['all', t('Everyone')]]} /> : null}
      {view === 'mine' ? <Mine key={k} /> : <Everyone key={k} />}
    </Screen>
  );
}
