import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Briefcase, CalendarX2, Hand, MapPin, Repeat2, Undo2 } from 'lucide-react-native';
import { formatDate } from '@oenod/i18n';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { hoursBetween, time } from '@/lib/format';
import { locale, t } from '@/lib/i18n';
import { C, F, R, shadow } from '@/lib/theme';
import type { Me, Shift } from '@/lib/me';
import { Badge, Button, EmptyState, ErrorText, Input, Loading, Screen, Segmented } from '@/components/ui';

const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString();

export default function Shifts() {
  const { data, error, refreshing, reload, refetch } = useApi<Me>('/api/me');
  useFocusEffect(useCallback(() => { refetch(); }, [])); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState<'mine' | 'open'>('mine');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const act = async (id: string, action: 'pickup' | 'swap' | 'cancel_swap', n?: string) => {
    setErr(null); setBusy(id + action);
    try { await api(`/api/me/shifts/${id}`, { body: { action, note: n || undefined } }); setSwapFor(null); setNote(''); await refetch(); if (action === 'pickup') Alert.alert('Shift is yours', 'It has been added to your schedule.'); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };

  if (!data && !error) return <Screen><Loading /></Screen>;
  const shifts = data?.shifts ?? [];
  const openShifts = data?.openShifts ?? [];
  const total = Math.round(shifts.reduce((h, s) => h + hoursBetween(s.start, s.end), 0) * 10) / 10;

  return (
    <Screen title={t('me.mySchedule')} subtitle={shifts.length ? `${shifts.length} ${t('me.upcoming').toLowerCase()} · ${total}h` : undefined} refreshing={refreshing} onRefresh={reload}>
      <Segmented value={tab} onChange={setTab} options={[['mine', t('me.upcoming'), shifts.length], ['open', t('me.openShifts'), openShifts.length]] as const} />
      <ErrorText text={error || err} />

      {tab === 'mine' && (shifts.length ? shifts.map((s) => {
        const started = new Date(s.start) <= new Date();
        const asked = s.status === 'SWAP_REQUESTED';
        return (
          <ShiftCard key={s.id} s={s} badge={asked ? <Badge text={t('me.swapAsked')} tone="amber" dot /> : isToday(s.start) ? <Badge text={t('common.today')} tone="blue" dot /> : undefined}>
            {swapFor === s.id ? (
              <View style={{ gap: 10 }}>
                <Input placeholder="Why, or who could cover? (optional)" value={note} onChangeText={setNote} maxLength={300} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button title={t('common.cancel')} onPress={() => setSwapFor(null)} style={{ flex: 1 }} />
                  <Button title="Send request" variant="primary" loading={busy === s.id + 'swap'} onPress={() => act(s.id, 'swap', note)} style={{ flex: 1 }} />
                </View>
              </View>
            ) : started ? null : asked ? (
              <FooterAction icon={<Undo2 color={C.blue} size={16} />} label={t('me.keepShift')} loading={busy === s.id + 'cancel_swap'} onPress={() => act(s.id, 'cancel_swap')} />
            ) : (
              <FooterAction icon={<Repeat2 color={C.blue} size={16} />} label={t('me.swap')} onPress={() => { setSwapFor(s.id); setNote(''); }} />
            )}
          </ShiftCard>
        );
      }) : <EmptyState icon={<CalendarX2 color={C.blue} size={24} />} title={t('me.noShift')} text="When your manager publishes the schedule, your shifts show up here." />)}

      {tab === 'open' && (openShifts.length ? openShifts.map((s) => (
        <ShiftCard key={s.id} s={s}>
          <Button title={t('me.pickUp')} variant="primary" icon={<Hand color="#fff" size={17} />} loading={busy === s.id + 'pickup'} onPress={() => act(s.id, 'pickup')} />
        </ShiftCard>
      )) : <EmptyState icon={<Hand color={C.blue} size={24} />} title="No open shifts right now" text="You'll get a notification when one comes up." />)}
    </Screen>
  );
}

function ShiftCard({ s, badge, children }: { s: Shift; badge?: React.ReactNode; children?: React.ReactNode }) {
  const d = new Date(s.start);
  return (
    <View style={st.card}>
      <View style={st.body}>
        <View style={[st.date, isToday(s.start) && { backgroundColor: C.navy }]}>
          <Text style={[st.dow, isToday(s.start) && { color: C.onNavy }]}>{formatDate(locale(), d, { weekday: 'short' })}</Text>
          <Text style={[st.dom, isToday(s.start) && { color: '#fff' }]}>{d.getDate()}</Text>
          <Text style={[st.mon, isToday(s.start) && { color: C.onNavyMuted }]}>{formatDate(locale(), d, { month: 'short' })}</Text>
        </View>
        <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <Text style={st.time} numberOfLines={1}>{time(s.start)} – {time(s.end)}</Text>
            <View style={st.hours}><Text style={st.hoursText}>{hoursBetween(s.start, s.end)}h</Text></View>
          </View>
          <View style={{ gap: 4 }}>
            {s.role && <View style={st.metaRow}><Briefcase color={C.muted} size={14} /><Text style={st.meta} numberOfLines={1}>{s.role}</Text></View>}
            {s.location && <View style={st.metaRow}><MapPin color={C.muted} size={14} /><Text style={st.meta} numberOfLines={1}>{s.location.name}</Text></View>}
          </View>
          {badge}
        </View>
      </View>
      {children ? <View style={st.footer}>{children}</View> : null}
    </View>
  );
}

function FooterAction({ icon, label, onPress, loading }: { icon: React.ReactNode; label: string; onPress: () => void; loading?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={loading} accessibilityRole="button" style={({ pressed }) => [st.footerBtn, pressed && { opacity: 0.6 }]}>
      {icon}<Text style={st.footerText}>{loading ? '…' : label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.paper, borderRadius: R.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, overflow: 'hidden', ...shadow(1) },
  body: { flexDirection: 'row', gap: 14, padding: 16 },
  date: { width: 58, borderRadius: 16, backgroundColor: C.sky, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  dow: { fontFamily: F.bold, fontSize: 11, color: C.blue, textTransform: 'uppercase', letterSpacing: 0.6 },
  dom: { fontFamily: F.display, fontSize: 24, color: C.navy, lineHeight: 30 },
  mon: { fontFamily: F.semi, fontSize: 11, color: C.muted, textTransform: 'uppercase' },
  time: { fontFamily: F.display, fontSize: 17, color: C.ink, letterSpacing: -0.3, flexShrink: 1 },
  hours: { backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  hoursText: { fontFamily: F.bold, fontSize: 12, color: C.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontFamily: F.medium, fontSize: 13.5, color: C.muted, flexShrink: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, padding: 12, paddingHorizontal: 16 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  footerText: { fontFamily: F.bold, fontSize: 14, color: C.blue },
});
