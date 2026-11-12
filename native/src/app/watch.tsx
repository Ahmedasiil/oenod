// Connect a watch: the Apple Watch or Wear OS app shows a 6-digit code; type it here. On iPhone the Apple Watch
// app sends its code to this screen by itself (3.7), so the person checks what the watch can do and taps Allow.
// Lists connected watches, each can be removed (its key stops working right away).
import React, { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Platform, Alert, Text, TextInput, View } from 'react-native';
import { api, BASE, get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date } from '../lib/format';
import { C } from '../lib/theme';
import { t } from '../lib/i18n';
import { Button, Card, Divider, ErrorBox, H2, ListRow, Muted } from '../ui/kit';
import { IconTile, Summary, tint } from '../ui/Summary';
import { PoweredBy } from '../ui/Brand';
import { ScrollView } from 'react-native';

type W = { id: number; name: string; platform: string; created_at: string; last_used_at: string | null };
const say = (title: string, msg: string) => (Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg));

export default function Watch() {
  const d = useLoad(() => get<{ watches: W[] }>('/api/watch/devices'));
  const q = useLocalSearchParams<{ code?: string }>();
  const fromWatch = typeof q.code === 'string' && /^\d{6}$/.test(q.code) ? q.code : '';
  const [code, setCode] = useState(fromWatch);
  useEffect(() => { if (fromWatch) setCode(fromWatch); }, [fromWatch]);
  const [busy, setBusy] = useState(false);
  const digits = code.replace(/\D/g, '').slice(0, 6);
  const link = async () => {
    setBusy(true);
    try { await post('/api/watch/link', { code: digits }); setCode(''); say(t('Connected'), t('Your watch is connected. It opens in a few seconds.')); setTimeout(d.reload, 4000); }
    catch (e: any) { say(t('Not connected'), e.message); }
    finally { setBusy(false); }
  };
  const remove = (w: W) => {
    const go = async () => { try { await api('DELETE', `/api/watch/devices/${w.id}`); d.reload(); } catch (e: any) { say(t('Not done'), e.message); } };
    if (Platform.OS === 'web') { if (window.confirm(t('Remove {n}?', { n: w.name }))) go(); return; }
    Alert.alert(t('Remove {n}?', { n: w.name }), t('The watch is signed out right away.'), [{ text: t('Cancel'), style: 'cancel' }, { text: t('Remove'), style: 'destructive', onPress: go }]);
  };
  const list = d.data?.watches || [];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60, width: '100%', maxWidth: 760, alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
      <Summary label={t('Apple Watch and Wear OS')} value={t('Your wrist')} minis={[[t('Clock in'), '✓'], [t('Next shift'), '✓'], [t("Today's sales"), '✓']]} />
      <Card style={{ gap: 12 }}>
        <Text style={{ color: C.ink, fontSize: 16, fontWeight: '700' }}>{fromWatch ? t('Your Apple Watch wants to connect') : t('Type the code on your watch')}</Text>
        <Muted>{fromWatch ? t('Check that your watch shows the same code, then tap Allow.') : t('Open OENOD on your watch. It shows a 6-digit code. Type it here.')}</Muted>
        <TextInput value={digits} onChangeText={setCode} keyboardType="number-pad" maxLength={7} placeholder="000 000" placeholderTextColor={C.faint}
          accessibilityLabel={t('Watch code')} textContentType="oneTimeCode"
          style={{ fontSize: 30, fontWeight: '800', letterSpacing: 8, textAlign: 'center', color: C.ink, paddingVertical: 12, borderRadius: 16, backgroundColor: C.dark ? C.card2 : '#F5F7FB' }} />
        <View style={{ gap: 6, padding: 12, borderRadius: 14, backgroundColor: C.dark ? C.card2 : '#F5F7FB' }}>
          <Text style={{ color: C.ink, fontWeight: '700' }}>{t('Your watch will be able to:')}</Text>
          <Muted>{'• ' + t('Clock you in and out (with site attendance rules)')}</Muted>
          <Muted>{'• ' + t('Show your next shift and hours today')}</Muted>
          <Muted>{'• ' + t("Show today's sales, if you are a manager")}</Muted>
          <Muted>{t('You can remove the watch here at any time.')}</Muted>
        </View>
        <Text style={{ color: C.faint, fontSize: 12.5, lineHeight: 18 }}>
          {t('By connecting, you agree to the')} <Text style={{ color: C.blue, fontWeight: '700' }} onPress={() => Linking.openURL(BASE + '/#/terms')}>{t('Terms of Service')}</Text> {t('and the')} <Text style={{ color: C.blue, fontWeight: '700' }} onPress={() => Linking.openURL(BASE + '/#/privacy')}>{t('Privacy Policy')}</Text>.
        </Text>
        <Button title={t('Allow and connect')} icon="check" onPress={link} busy={busy} disabled={digits.length !== 6} />
      </Card>
      <H2>{t('My watches')}</H2>
      {d.error && !d.data ? <ErrorBox text={d.error} onRetry={d.reload} /> : (
        <Card style={{ paddingVertical: 4 }}>
          {list.length ? list.map((w, i) => (
            <View key={w.id}>{i ? <Divider /> : null}
              <ListRow title={w.name} sub={w.last_used_at ? t('Last used {d}', { d: date(w.last_used_at) }) : t('Connected {d}', { d: date(w.created_at) })}
                left={<IconTile name="clock" color={tint(w.platform === 'wearos' ? 2 : 0)} />}
                right={<Button title={t('Remove')} kind="secondary" onPress={() => remove(w)} style={{ minHeight: 36, paddingHorizontal: 12 }} />} />
            </View>
          )) : <Muted style={{ padding: 12 }}>{t('No watch connected yet.')}</Muted>}
        </Card>
      )}
      <PoweredBy />
    </ScrollView>
  );
}
