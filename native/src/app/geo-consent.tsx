import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { answerConsent } from '../lib/geo';
import { C, R, S } from '../lib/theme';
import { t } from '../lib/i18n';
import { B, Button, Card, ErrorBox, Loading, Muted, Row } from '../ui/kit';
import { IconTile, tint } from '../ui/Summary';
import { Icon } from '../ui/Icon';

type Policy = { version: number; text: string; retention_days: number; consented: boolean };

export default function GeoConsent() {
  const d = useLoad(() => get<Policy>('/api/geo/policy'));
  const [tick, setTick] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => answerConsent(false), []); // leaving without accepting

  const accept = async () => {
    if (!d.data) return;
    setBusy(true); setError('');
    try {
      await post('/api/geo/consent', { version: d.data.version, accept: true });
      answerConsent(true);
      router.back();
    } catch (e: any) {
      if (e?.status === 409) { setTick(false); d.reload(); }
      setError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }}>
      {d.loading && !d.data ? <Loading /> : d.error && !d.data ? <ErrorBox text={d.error} onRetry={d.reload} /> : d.data ? (
        <>
          <Card style={{ gap: 6 }}>
            <Row><IconTile name="pin" color={tint(0)} /><B style={{ flex: 1 }}>{t('Your workplace uses site attendance')}</B></Row>
            <Muted>{t('While you are clocked in, OENOD shares your location with your managers so they know you are on site. Never on breaks and never after you clock out.')}</Muted>
            <Muted>{t('Location history is deleted after {n} days.', { n: d.data.retention_days })}</Muted>
          </Card>
          <Card>
            {/* Plain text from the server, never HTML. */}
            <Text style={{ color: C.ink, lineHeight: 21 }} selectable>{d.data.text}</Text>
          </Card>
          <Pressable onPress={() => setTick((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: tick }}
            style={{ flexDirection: 'row', gap: S.md, alignItems: 'center', padding: S.md, borderRadius: R.md, backgroundColor: C.card, borderWidth: 1, borderColor: tick ? C.blue : C.line }}>
            <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: tick ? C.blue : C.faint, backgroundColor: tick ? C.blue : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {tick ? <Icon name="check" color={C.white} size={16} /> : null}
            </View>
            <Text style={{ flex: 1, color: C.ink }}>{t('I have read this and I agree to share my location while I am clocked in.')}</Text>
          </Pressable>
          {error ? <Text style={{ color: C.bad }}>{error}</Text> : null}
          <Button title={t('Agree and clock in')} icon="check" onPress={accept} busy={busy} disabled={!tick} />
          <Button title={t('Not now')} kind="secondary" onPress={() => router.back()} />
        </>
      ) : null}
    </ScrollView>
  );
}
