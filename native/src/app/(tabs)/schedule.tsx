import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../../lib/auth';
import { get } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { dayKey, hm, longDay, minutesBetween, time, todayKey } from '../../lib/format';
import { C, R, S } from '../../lib/theme';
import { Avatar, B, Card, Empty, ErrorBox, Loading, Muted, Pill, Row, Screen } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { t, locale } from '../../lib/i18n';

type Shift = { id: number; starts_at: string; ends_at: string; role: string | null; location: string | null; notes?: string | null; break_minutes?: number; first_name?: string; last_name?: string; color?: string | null; published?: number; employee_id?: number | null };

const addDays = (ymd: string, n: number) => { const d = new Date(ymd + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#E8EBF2', borderRadius: R.md, padding: 4 }} accessibilityRole="tablist">
      {options.map(([v, l]) => (
        <Pressable key={v} onPress={() => onChange(v)} accessibilityRole="tab" accessibilityState={{ selected: value === v }}
          style={{ flex: 1, paddingVertical: 10, borderRadius: R.sm, alignItems: 'center', backgroundColor: value === v ? C.white : 'transparent' }}>
          <Text style={{ fontWeight: '700', color: value === v ? C.ink : C.sub }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function Schedule() {
  const { isManager, session } = useAuth();
  const [view, setView] = useState<'mine' | 'all'>(session?.employee ? 'mine' : 'all');
  const [from, setFrom] = useState(todayKey());
  const to = addDays(from, 6);
  const d = useLoad(async () => {
    if (view === 'mine') { const r = await get<{ shifts: Shift[] }>('/api/me/shifts'); return { shifts: r.shifts, hours: null as number | null }; }
    const r = await get<{ shifts: Shift[]; hours: number }>(`/api/shifts?from=${from}&to=${to}`);
    return { shifts: r.shifts.filter((s) => s.published || isManager), hours: r.hours };
  }, [view, from]);

  const groups = useMemo(() => {
    const m = new Map<string, Shift[]>();
    for (const s of d.data?.shifts || []) { const k = dayKey(s.starts_at); if (!m.has(k)) m.set(k, []); m.get(k)!.push(s); }
    return [...m.entries()];
  }, [d.data]);
  const today = todayKey();
  const total = (d.data?.shifts || []).reduce((a, s) => a + minutesBetween(s.starts_at, s.ends_at) - (s.break_minutes || 0), 0);

  return (
    <Screen title={t('Schedule')} subtitle={t(view === 'mine' ? 'Your upcoming shifts' : 'Everyone, this week')} refreshing={d.refreshing} onRefresh={d.refresh}>
      {isManager && session?.employee ? <Segmented value={view} onChange={(v) => setView(v as any)} options={[['mine', t('My shifts')], ['all', t('Everyone')]]} /> : null}
      {view === 'all' ? (
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => setFrom(addDays(from, -7))} accessibilityRole="button" accessibilityLabel={t('Previous week')} style={{ padding: 10 }}><Icon name="back" color={C.blue} /></Pressable>
          <B>{new Date(from + 'T12:00:00').toLocaleDateString(locale(), { month: 'short', day: 'numeric' })} – {new Date(to + 'T12:00:00').toLocaleDateString(locale(), { month: 'short', day: 'numeric' })}</B>
          <Pressable onPress={() => setFrom(addDays(from, 7))} accessibilityRole="button" accessibilityLabel={t('Next week')} style={{ padding: 10 }}><Icon name="chevron" color={C.blue} /></Pressable>
        </Row>
      ) : null}
      {d.loading && !d.data ? <Loading /> : d.error && !d.data ? <ErrorBox text={d.error} onRetry={d.reload} /> : !groups.length ? (
        <Card><Empty icon="calendar" title={t('No shifts yet')} sub={t(view === 'mine' ? 'When your manager publishes the schedule, your shifts show up here.' : 'No shifts in this week.')} /></Card>
      ) : (
        <>
          <Muted>{d.data!.shifts.length === 1 ? t('1 shift') : t('{n} shifts', { n: d.data!.shifts.length })} · {hm(total)}</Muted>
          {groups.map(([k, list]) => (
            <View key={k} style={{ gap: S.sm }}>
              <Row><B>{longDay(list[0].starts_at)}</B>{k === today ? <Pill text={t('Today')} /> : null}</Row>
              {list.map((s) => (
                <Card key={s.id} style={{ borderLeftWidth: 4, borderLeftColor: s.color || C.blue }}>
                  <Row>
                    {view === 'all' && s.first_name ? <Avatar name={`${s.first_name} ${s.last_name}`} color={s.color} size={36} /> : null}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>{time(s.starts_at)} – {time(s.ends_at)}</Text>
                      <Muted>{[view === 'all' && s.first_name ? `${s.first_name} ${s.last_name}` : null, s.role, s.location].filter(Boolean).join(' · ') || t('Shift')}</Muted>
                      {s.notes ? <Muted style={{ marginTop: 4 }}>{s.notes}</Muted> : null}
                    </View>
                    <Muted>{hm(minutesBetween(s.starts_at, s.ends_at) - (s.break_minutes || 0))}</Muted>
                  </Row>
                  {view === 'all' && !s.published ? <View style={{ marginTop: 8 }}><Pill text={t('Draft, not published')} kind="warn" /></View> : null}
                </Card>
              ))}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
