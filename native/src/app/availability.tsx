import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { get, put } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { C, R, S } from '../lib/theme';
import { locale, t } from '../lib/i18n';
import type { MySchedule } from '../lib/types';
import { B, Button, Card, ErrorBox, Field, Loading, Muted, Row } from '../ui/kit';
import { PoweredBy } from '../ui/Brand';

type Mode = 'any' | 'off' | 'hours';
type DayRow = { mode: Mode; start: string; end: string };
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first; 0 is Sunday like the website
const dayName = (wd: number) => new Date(2026, 10, 1 + wd).toLocaleDateString(locale(), { weekday: 'long' }); // 2026-11-01 is a Sunday
const okTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export default function Availability() {
  const d = useLoad(() => get<MySchedule>('/api/me/schedule'));
  const [rows, setRows] = useState<Record<number, DayRow>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!d.data) return;
    const next: Record<number, DayRow> = {};
    for (let wd = 0; wd < 7; wd++) next[wd] = { mode: 'any', start: '09:00', end: '17:00' };
    for (const a of d.data.availability) {
      if (a.kind === 'unavailable' && !a.start_time) next[a.weekday] = { mode: 'off', start: '09:00', end: '17:00' };
      else if (a.kind === 'available' && a.start_time && a.end_time) next[a.weekday] = { mode: 'hours', start: a.start_time.slice(0, 5), end: a.end_time.slice(0, 5) };
    }
    setRows(next);
  }, [d.data]);

  const set = (wd: number, patch: Partial<DayRow>) => setRows((r) => ({ ...r, [wd]: { ...r[wd], ...patch } }));
  const save = async () => {
    setError('');
    const out: { weekday: number; kind: string; start_time?: string; end_time?: string }[] = [];
    for (const wd of ORDER) {
      const r = rows[wd];
      if (r.mode === 'off') out.push({ weekday: wd, kind: 'unavailable' });
      if (r.mode === 'hours') {
        if (!okTime(r.start) || !okTime(r.end) || r.end <= r.start) { setError(t('{d}: use times like 09:00 and 17:00, with the end after the start.', { d: dayName(wd) })); return; }
        out.push({ weekday: wd, kind: 'available', start_time: r.start, end_time: r.end });
      }
    }
    setBusy(true);
    try { await put('/api/me/availability', { rows: out }); router.back(); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (d.loading && !d.data) return <Loading />;
  if (!d.data) return <View style={{ padding: S.lg }}><ErrorBox text={d.error || t('Could not load.')} onRetry={d.reload} /></View>;
  if (!Object.keys(rows).length) return <Loading />;
  const modes: [Mode, string][] = [['any', t('Any time')], ['hours', t('Only these hours')], ['off', t('Not available')]];
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Muted>{t('Your manager sees this when building the schedule.')}</Muted>
        {ORDER.map((wd) => (
          <Card key={wd} style={{ gap: S.sm }}>
            <B>{dayName(wd)}</B>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {modes.map(([m, l]) => (
                <Pressable key={m} onPress={() => set(wd, { mode: m })} accessibilityRole="radio" accessibilityState={{ checked: rows[wd].mode === m }}
                  style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: R.md, borderWidth: 1, borderColor: rows[wd].mode === m ? C.blue : C.line, backgroundColor: rows[wd].mode === m ? C.blueSoft : C.card2 }}>
                  <Text style={{ fontWeight: '700', color: rows[wd].mode === m ? C.blue : C.ink }}>{l}</Text>
                </Pressable>
              ))}
            </View>
            {rows[wd].mode === 'hours' ? (
              <Row>
                <View style={{ flex: 1 }}><Field label={t('From')} value={rows[wd].start} onChangeText={(v) => set(wd, { start: v })} keyboardType="numbers-and-punctuation" maxLength={5} /></View>
                <View style={{ flex: 1 }}><Field label={t('To')} value={rows[wd].end} onChangeText={(v) => set(wd, { end: v })} keyboardType="numbers-and-punctuation" maxLength={5} /></View>
              </Row>
            ) : null}
          </Card>
        ))}
        {error ? <Text style={{ color: C.bad, fontWeight: '600' }}>{error}</Text> : null}
        <Button title={t('Save availability')} icon="check" onPress={save} busy={busy} />
        <PoweredBy />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
