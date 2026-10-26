import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Baby, CalendarCheck, HeartPulse, Palmtree, Sun, Wallet } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { day } from '@/lib/format';
import { t } from '@/lib/i18n';
import { C, F, R } from '@/lib/theme';
import type { Me } from '@/lib/me';
import { Badge, Button, Card, EmptyState, ErrorText, IconTile, Input, List, Loading, Row, Screen, Section, T, toneColor } from '@/components/ui';
import { DateField } from '@/components/date-field';

type Kind = 'VACATION' | 'SICK' | 'PERSONAL' | 'UNPAID' | 'PARENTAL';
const TYPES: { k: Kind; label: string; icon: typeof Palmtree; tone: 'green' | 'red' | 'blue' | 'gray' | 'violet' }[] = [
  { k: 'VACATION', label: 'Vacation', icon: Palmtree, tone: 'green' },
  { k: 'SICK', label: 'Sick', icon: HeartPulse, tone: 'red' },
  { k: 'PERSONAL', label: 'Personal', icon: Sun, tone: 'blue' },
  { k: 'UNPAID', label: 'Unpaid', icon: Wallet, tone: 'gray' },
  { k: 'PARENTAL', label: 'Parental', icon: Baby, tone: 'violet' },
];
const STATUS: Record<string, 'green' | 'amber' | 'red' | 'gray'> = { APPROVED: 'green', PENDING: 'amber', REJECTED: 'red', CANCELLED: 'gray' };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const days = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5) + 1;

export default function LeaveScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { data, error, reload } = useApi<Me>('/api/me');
  const [type, setType] = useState<Kind>('VACATION');
  const tomorrow = iso(new Date(Date.now() + 864e5));
  const [start, setStart] = useState(tomorrow);
  const [end, setEnd] = useState(tomorrow);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (end < start) return setErr('The last day must be on or after the first day.');
    const employeeId = data?.employee?.id ?? session?.employee?.id;
    if (!employeeId) return setErr('Time off is for people with an employee profile.');
    setBusy(true);
    try {
      await api('/api/v1/leave', { body: { employeeId, type, startDate: start, endDate: end, reason: reason.trim() || undefined } });
      Alert.alert('Request sent', 'Your manager will get a notification. You will hear back here.');
      setReason(''); await reload();
      if (router.canGoBack()) router.back();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  if (!data && !error) return <Screen edges={[]}><Loading /></Screen>;
  const n = days(start, end);
  return (
    <Screen edges={[]}>
      {!!data?.employee?.leaveBalances.length && (
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          {data.employee.leaveBalances.map((b) => {
            const def = TYPES.find((x) => x.k === b.type);
            const I = def?.icon ?? Palmtree;
            const [, fg] = toneColor(def?.tone ?? 'blue');
            return (
              <Card key={b.type} style={{ flexGrow: 1, flexBasis: 140, gap: 10, padding: 16 }}>
                <IconTile tone={def?.tone ?? 'blue'} size={36}><I color={fg} size={18} /></IconTile>
                <View>
                  <Text style={st.balance}>{Number(b.hours)}<Text style={st.unit}> h</Text></Text>
                  <T v="small">{def?.label ?? b.type} left</T>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <Card style={{ gap: 18 }}>
        <T v="title" style={{ fontSize: 18 }}>{t('me.requestLeave')}</T>
        <View style={{ gap: 8 }}>
          <T v="small" style={{ fontFamily: F.semi, color: C.text }}>Type</T>
          <View style={st.types}>
            {TYPES.map(({ k, label, icon: I }) => {
              const on = type === k;
              return (
                <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setType(k)} style={[st.type, on && st.typeOn]}>
                  <I color={on ? '#fff' : C.text} size={16} />
                  <Text style={[st.typeText, on && { color: '#fff' }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <DateField label="First day" value={start} min={iso(new Date())} onChange={(v) => { setStart(v); if (end < v) setEnd(v); }} />
          <DateField label="Last day" value={end} min={start} onChange={setEnd} />
        </View>
        <View style={st.summary}>
          <CalendarCheck color={C.navy} size={18} />
          <Text style={st.summaryText}>{n} {n === 1 ? 'day' : 'days'} of {TYPES.find((x) => x.k === type)?.label.toLowerCase()} · {day(`${start}T12:00:00`)}{n > 1 ? ` – ${day(`${end}T12:00:00`)}` : ''}</Text>
        </View>
        <Input label={`${t('common.notes')} (${t('common.optional').toLowerCase()})`} placeholder="Anything your manager should know" value={reason} onChangeText={setReason} multiline style={{ minHeight: 72, textAlignVertical: 'top', paddingTop: 0 }} maxLength={500} />
        <ErrorText text={err || error} />
        <Button title={t('common.submit')} variant="primary" big loading={busy} onPress={submit} />
      </Card>

      <Section title="My requests">
        {data?.leave.length ? (
          <List>
            {data.leave.map((l) => {
              const def = TYPES.find((x) => x.k === l.type);
              const I = def?.icon ?? Palmtree;
              return (
                <Row key={l.id} title={def?.label ?? l.type} sub={`${day(l.startDate)}${l.endDate !== l.startDate ? ` – ${day(l.endDate)}` : ''}`}
                  icon={<IconTile tone={def?.tone ?? 'blue'}><I color={toneColor(def?.tone ?? 'blue')[1]} size={18} /></IconTile>}
                  right={<Badge dot text={l.status.charAt(0) + l.status.slice(1).toLowerCase()} tone={STATUS[l.status] ?? 'gray'} />} />
              );
            })}
          </List>
        ) : <Card><EmptyState icon={<Palmtree color={C.blue} size={24} />} title="No requests yet" text="Requests you send show up here with their status." /></Card>}
      </Section>
    </Screen>
  );
}

const st = StyleSheet.create({
  balance: { fontFamily: F.display, fontSize: 26, color: C.ink, letterSpacing: -0.6 },
  unit: { fontFamily: F.medium, fontSize: 14, color: C.muted },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  type: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.pill, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper },
  typeOn: { backgroundColor: C.navy, borderColor: C.navy },
  typeText: { fontFamily: F.semi, fontSize: 14, color: C.text },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.sky, borderRadius: R.sm, padding: 12 },
  summaryText: { flex: 1, fontFamily: F.semi, fontSize: 13.5, color: C.navy },
});
