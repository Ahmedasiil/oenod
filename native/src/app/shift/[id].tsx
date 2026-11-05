import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { hm, longDay, minutesBetween, time } from '../../lib/format';
import { C, R, S } from '../../lib/theme';
import { t } from '../../lib/i18n';
import type { MySchedule } from '../../lib/types';
import { Avatar, B, Button, Card, ErrorBox, Field, H2, ListRow, Loading, Muted, Pill, Row } from '../../ui/kit';
import { IconTile, Summary, tint } from '../../ui/Summary';

const say = (title: string, msg: string) => (Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg));

export default function ShiftDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => get<MySchedule>('/api/me/schedule'), [id]);
  const [mode, setMode] = useState<'none' | 'decline' | 'swap'>('none');
  const [note, setNote] = useState('');
  const [target, setTarget] = useState<number | 0>(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (d.loading && !d.data) return <Loading />;
  const s = d.data?.shifts.find((x) => x.id === Number(id));
  if (!s) return <View style={{ padding: S.lg }}><ErrorBox text={d.error || t('Not found.')} onRetry={d.reload} /></View>;
  const started = new Date(s.starts_at.replace(' ', 'T') + 'Z').getTime() < Date.now();

  const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key); setError('');
    try { await fn(); say(t('Done'), done); setMode('none'); setNote(''); d.reload(); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  };
  const confirm = () => run('confirm', () => post(`/api/shifts/${s.id}/confirm`, { answer: 'confirm' }), t('Your manager can see you confirmed this shift.'));
  const decline = () => {
    if (!note.trim()) { setError(t('Tell your manager why you cannot work it.')); return; }
    run('decline', () => post(`/api/shifts/${s.id}/confirm`, { answer: 'decline', note: note.trim() }), t('Your manager was told you cannot work this shift.'));
  };
  const swap = () => run('swap', () => post(`/api/shifts/${s.id}/swap`, { target_employee_id: target || undefined, note: note.trim() || undefined }),
    target ? t('Your teammate and your manager were asked. You keep the shift until your manager approves.') : t('Your manager was asked. You keep the shift until it is approved.'));

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Summary seed={15} label={longDay(s.starts_at)} value={`${time(s.starts_at)} – ${time(s.ends_at)}`}
        badge={s.confirm === 'confirmed' ? <Pill text={t('Confirmed')} kind="good" /> : s.confirm === 'declined' ? <Pill text={t("Can't work")} kind="bad" /> : <Pill text={t('Not confirmed yet')} kind="warn" />}
        minis={[[t('Paid time'), hm(s.minutes ?? minutesBetween(s.starts_at, s.ends_at) - (s.break_minutes || 0))], [t('Role'), s.role || '—'], [t('Location'), s.location || '—']]}
        foot={[s.request ? t(s.request.kind === 'swap' ? 'Swap requested' : 'Give-away requested') : null, s.notes].filter(Boolean).join(' · ') || undefined} />

      {(s.tasks || []).length ? (<><H2>{t('Tasks for this shift')}</H2><Card style={{ paddingVertical: S.xs }}>{s.tasks!.map((x, i) => <ListRow key={i} title={String(x)} left={<IconTile name="check" color={tint(i)} size={34} />} />)}</Card></>) : null}

      {(s.with || []).length ? (
        <>
          <H2>{t('Working with you')}</H2>
          <Card>{s.with!.map((w, i) => <ListRow key={i} title={`${w.first_name} ${w.last_name}`} sub={`${time(w.starts_at)}–${time(w.ends_at)}${w.role ? ' · ' + w.role : ''}`} left={<Avatar name={`${w.first_name} ${w.last_name}`} color={w.color} size={36} />} />)}</Card>
        </>
      ) : null}

      {!started ? (
        <>
          {mode === 'none' ? (
            <View style={{ gap: S.sm }}>
              {s.confirm !== 'confirmed' ? <Button title={t('Confirm I will work it')} icon="check" onPress={confirm} busy={busy === 'confirm'} /> : null}
              {!s.request ? <Button title={t('Swap or give away')} icon="users" kind="secondary" onPress={() => { setMode('swap'); setError(''); }} /> : null}
              {s.confirm !== 'declined' ? <Button title={t("I can't work it")} icon="x" kind="secondary" onPress={() => { setMode('decline'); setError(''); }} /> : null}
            </View>
          ) : null}
          {mode === 'decline' ? (
            <Card style={{ gap: S.md }}>
              <B>{t("I can't work it")}</B>
              <Field label={t('Reason for your manager')} value={note} onChangeText={setNote} maxLength={255} multiline />
              <Row><Button title={t('Cancel')} kind="secondary" onPress={() => setMode('none')} style={{ flex: 1 }} /><Button title={t('Send')} kind="danger" onPress={decline} busy={busy === 'decline'} style={{ flex: 1 }} /></Row>
            </Card>
          ) : null}
          {mode === 'swap' ? (
            <Card style={{ gap: S.md }}>
              <B>{t('Who should take it?')}</B>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[{ id: 0, first_name: t('Anyone (give away)'), last_name: '' }, ...(d.data?.teammates || [])].map((p) => (
                  <Pressable key={p.id} onPress={() => setTarget(p.id)} accessibilityRole="radio" accessibilityState={{ checked: target === p.id }}
                    style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.md, borderWidth: 1, borderColor: target === p.id ? C.blue : C.line, backgroundColor: target === p.id ? C.blueSoft : C.card2 }}>
                    <Text style={{ fontWeight: '700', color: target === p.id ? C.blue : C.ink }}>{`${p.first_name} ${p.last_name}`.trim()}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label={t('Note (optional)')} value={note} onChangeText={setNote} maxLength={255} />
              <Row><Button title={t('Cancel')} kind="secondary" onPress={() => setMode('none')} style={{ flex: 1 }} /><Button title={t('Send request')} onPress={swap} busy={busy === 'swap'} style={{ flex: 1 }} /></Row>
            </Card>
          ) : null}
        </>
      ) : null}
      {error ? <Text style={{ color: C.bad, fontWeight: '600' }}>{error}</Text> : null}
      <Button title={t('Back')} kind="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}
