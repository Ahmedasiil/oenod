import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { post } from '../lib/api';
import { todayKey } from '../lib/format';
import { C, R, S } from '../lib/theme';
import { Button, Field, Muted } from '../ui/kit';
import { t } from '../lib/i18n';

const KINDS: [string, string][] = [['vacation', 'Vacation'], ['sick', 'Sick day'], ['personal', 'Personal'], ['unpaid', 'Unpaid']];
const valid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T12:00:00').getTime());

export default function NewTimeOff() {
  const [kind, setKind] = useState('vacation');
  const [start, setStart] = useState(todayKey());
  const [end, setEnd] = useState(todayKey());
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  const send = async () => {
    setError(''); setFields({});
    if (!valid(start) || !valid(end)) { setError(t('Use dates like 2026-12-24.')); return; }
    if (end < start) { setError(t('The last day must be on or after the first day.')); return; }
    setBusy(true);
    try {
      await post('/api/timeoff', { kind, starts_on: start, ends_on: end, reason: reason.trim() || undefined });
      router.back();
    } catch (e: any) { setError(e.message); setFields(e.fields || {}); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600', color: C.ink }}>{t('Type')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
            {KINDS.map(([v, l]) => (
              <Pressable key={v} onPress={() => setKind(v)} accessibilityRole="radio" accessibilityState={{ checked: kind === v }}
                style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: R.md, borderWidth: 1, borderColor: kind === v ? C.blue : C.line, backgroundColor: kind === v ? C.blueSoft : C.white }}>
                <Text style={{ fontWeight: '700', color: kind === v ? C.blue : C.ink }}>{t(l)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Field label={t('First day (YYYY-MM-DD)')} value={start} onChangeText={(v) => { setStart(v); if (valid(v) && end < v) setEnd(v); }} keyboardType="numbers-and-punctuation" error={fields.starts_on} />
        <Field label={t('Last day (YYYY-MM-DD)')} value={end} onChangeText={setEnd} keyboardType="numbers-and-punctuation" error={fields.ends_on} />
        <Field label={t('Note for your manager (optional)')} value={reason} onChangeText={setReason} maxLength={255} multiline style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }} />
        {error ? <Text style={{ color: C.bad, fontWeight: '600' }}>{error}</Text> : null}
        <Button title={t('Send request')} icon="check" onPress={send} busy={busy} />
        <Muted style={{ textAlign: 'center' }}>{t('Your manager is notified and can approve it from the app or the website.')}</Muted>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
