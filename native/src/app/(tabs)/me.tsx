import React, { useState } from 'react';
import { Alert, Platform, Share, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../../lib/auth';
import { BASE, get } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { label } from '../../lib/format';
import { C, S } from '../../lib/theme';
import { Avatar, Button, Card, Divider, H2, ListRow, Muted, Pill, Row, Screen } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { QR } from '../../ui/QR';
import { LANGS, t, useLang } from '../../lib/i18n';
import { QuickCard } from '../../ui/QuickCard';

export default function Me() {
  const { session, signOut } = useAuth();
  const { lang, setLang } = useLang();
  const pickLang = async (code: typeof lang) => {
    if (code === lang) return;
    const restart = await setLang(code);
    if (restart) { const msg = t('Restart the app to finish switching the layout direction.'); if (Platform.OS === 'web') window.alert(msg); else Alert.alert(t('Language'), msg); }
  };
  const p = useLoad(() => get('/api/me/profile'));
  const [which, setWhich] = useState<'card' | 'badge'>(session?.employee ? 'badge' : 'card');
  const u = session?.user;
  const badgeUrl: string | undefined = p.data?.employee?.badge_url;
  const cardUrl: string | undefined = p.data?.card_url;
  const qrValue = which === 'badge' && session?.employee ? (badgeUrl || session.employee.qr_token) : cardUrl;

  const open = (path: string) => WebBrowser.openBrowserAsync(`${BASE}/?lang=${lang}${path.replace(/^\//, '')}`);
  const confirmOut = () => {
    if (Platform.OS === 'web') { if (window.confirm(t('Sign out of OENOD on this device?'))) signOut(); return; }
    Alert.alert(t('Sign out?'), t('You will need to sign in again.'), [{ text: t('Cancel'), style: 'cancel' }, { text: t('Sign out'), style: 'destructive', onPress: () => signOut() }]);
  };

  return (
    <Screen title={t('Me')} subtitle={u?.email} refreshing={p.refreshing} onRefresh={p.refresh}>
      <Card style={{ alignItems: 'center', gap: S.md }}>
        <Row>
          <Avatar name={u?.name || '?'} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink }}>{u?.name}</Text>
            <Muted>{[p.data?.employee?.job_title || p.data?.headline, session?.company?.name].filter(Boolean).join(' · ') || t('OENOD member')}</Muted>
          </View>
          {u?.role ? <Pill text={label(u.role)} kind="plain" /> : null}
        </Row>
        {session?.employee ? (
          <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
            <Button title={t('Work badge')} kind={which === 'badge' ? 'primary' : 'secondary'} onPress={() => setWhich('badge')} style={{ flex: 1, minHeight: 44 }} />
            <Button title={t('Business card')} kind={which === 'card' ? 'primary' : 'secondary'} onPress={() => setWhich('card')} style={{ flex: 1, minHeight: 44 }} />
          </View>
        ) : null}
        {qrValue ? (
          <View style={{ padding: 12, backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.line }}>
            <QR value={qrValue} size={210} />
          </View>
        ) : null}
        <Muted style={{ textAlign: 'center' }}>
          {t(which === 'badge' ? 'Show this at the kiosk to clock in, or to prove you work here.' : 'Let people scan this to save your contact details.')}
        </Muted>
        {which === 'card' && cardUrl ? (
          <Row>
            <Button title={t('Share my card')} icon="globe" kind="secondary" onPress={() => Share.share({ message: cardUrl, url: cardUrl })} style={{ flex: 1 }} />
          </Row>
        ) : null}
      </Card>

      <H2>{t('Language')}</H2>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {LANGS.map((l) => (
          <Button key={l.code} title={l.name} kind={lang === l.code ? 'primary' : 'secondary'} onPress={() => pickLang(l.code)} style={{ flexGrow: 1, flexBasis: '45%', minHeight: 48 }} />
        ))}
      </View>

      <QuickCard />

      <H2>{t('More')}</H2>
      <Card style={{ paddingVertical: S.xs }}>
        <ListRow title={t('Wallet')} sub={t('Get paid and transfer money to your bank')} left={<Icon name="cash" color={C.blue} />} onPress={() => router.push('/wallet')} />
        <Divider />
        <ListRow title={t('Open the full OENOD website')} sub={t('Payroll, POS, invoices, reports and everything else')} left={<Icon name="globe" color={C.blue} />} onPress={() => open('/#/')} />
        <Divider />
        <ListRow title={t('Edit my card and resume')} left={<Icon name="user" color={C.blue} />} onPress={() => open('/#/profile')} />
        <Divider />
        <ListRow title={t('Help and support')} left={<Icon name="mail" color={C.blue} />} onPress={() => open('/#/help')} />
        <Divider />
        <ListRow title={t('Privacy policy')} left={<Icon name="check" color={C.blue} />} onPress={() => open('/#/privacy')} />
        <Divider />
        <ListRow title={t('Delete my account')} sub={t('Permanently remove your login and personal information')} left={<Icon name="x" color={C.bad} />} onPress={() => router.push('/delete-account')} />
      </Card>

      <Button title={t('Sign out')} icon="logout" kind="secondary" onPress={confirmOut} />
      <Muted style={{ textAlign: 'center', color: C.faint }}>OENOD {Constants.expoConfig?.version} · connected to {BASE.replace(/^https?:\/\//, '')}</Muted>
    </Screen>
  );
}
