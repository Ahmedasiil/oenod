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
import { IconTile, Mini, Section, tint } from '../../ui/Summary';
import { HeroCard } from '../../ui/Brand';
import { Rise } from '../../ui/Motion';
import { Icon } from '../../ui/Icon';
import { QR } from '../../ui/QR';
import { LANGS, t, useLang } from '../../lib/i18n';
import { QuickCard } from '../../ui/QuickCard';
import { useAppearance, type Mode } from '../../lib/appearance';
import { Pressable } from 'react-native';
import type { IconName } from '../../ui/Icon';

export default function Me() {
  const { session, signOut } = useAuth();
  const { lang, setLang } = useLang();
  const look = useAppearance();
  const MODES: [Mode, string, IconName][] = [['system', t('Automatic'), 'device'], ['light', t('Light'), 'sun'], ['dark', t('Dark'), 'moon']];
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
      <Rise><HeroCard seed={11}>
        <Row>
          <View style={{ borderRadius: 34, padding: 3, backgroundColor: 'rgba(255,255,255,0.18)' }}><Avatar name={u?.name || '?'} size={60} /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 21, fontWeight: '800', color: C.white }} numberOfLines={1}>{u?.name}</Text>
            <Text style={{ color: C.mist }} numberOfLines={2}>{[p.data?.employee?.job_title || p.data?.headline, session?.company?.name].filter(Boolean).join(' · ') || t('OENOD member')}</Text>
          </View>
        </Row>
        <Row style={{ gap: 8 }}>
          <Mini label={t('Role')} value={t(({ owner: 'Owner', admin: 'Admin', manager: 'Manager' } as Record<string, string>)[u?.role || ''] || (session?.employee ? 'Employee' : 'Member'))} />
          <Mini label={t('Language')} value={(LANGS.find((l) => l.code === lang)?.name) || lang} />
          <Mini label={t('Appearance')} value={look.mode === 'system' ? t('Automatic') : look.mode === 'light' ? t('Light') : t('Dark')} />
        </Row>
      </HeroCard></Rise>

      <Section>
      <H2>{t(session?.employee ? 'My badge and card' : 'My business card')}</H2>
      <Card style={{ alignItems: 'center', gap: S.md }}>
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
      </Section>

      <Section i={1}>
      <H2>{t('Appearance')}</H2>
      <View style={{ flexDirection: 'row', backgroundColor: C.seg, borderRadius: 16, padding: 4, gap: 4 }} accessibilityRole="radiogroup">
        {MODES.map(([m, l, ic]) => {
          const on = look.mode === m;
          return (
            <Pressable key={m} onPress={() => look.setMode(m)} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: on ? C.segOn : 'transparent', borderWidth: on ? 1 : 0, borderColor: C.line }}>
              <Icon name={ic} size={20} color={on ? C.link : C.sub} />
              <Text style={{ color: on ? C.ink : C.sub, fontWeight: '700', fontSize: 13 }}>{l}</Text>
            </Pressable>
          );
        })}
      </View>
      <Muted style={{ fontSize: 13 }}>{t('Automatic follows your phone’s light or dark setting.')}</Muted>
      </Section>

      <H2>{t('Language')}</H2>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {LANGS.map((l) => (
          <Button key={l.code} title={l.name} kind={lang === l.code ? 'primary' : 'secondary'} onPress={() => pickLang(l.code)} style={{ flexGrow: 1, flexBasis: '45%', minHeight: 48 }} />
        ))}
      </View>

      <QuickCard />

      <H2>{t('More')}</H2>
      <Card style={{ paddingVertical: S.xs }}>
        <ListRow title={t('Wallet')} sub={t('Get paid and transfer money to your bank')} left={<IconTile name="cash" color={tint(0)} />} onPress={() => router.push('/wallet')} />
        <Divider />
        <ListRow title={t('Open the full OENOD website')} sub={t('Payroll, POS, invoices, reports and everything else')} left={<IconTile name="globe" color={tint(1)} />} onPress={() => open('/#/')} />
        <Divider />
        <ListRow title={t('Edit my card and resume')} left={<IconTile name="user" color={tint(2)} />} onPress={() => open('/#/profile')} />
        <Divider />
        <ListRow title={t('Help and support')} left={<IconTile name="mail" color={tint(3)} />} onPress={() => open('/#/help')} />
        <Divider />
        <ListRow title={t('Privacy policy')} left={<IconTile name="check" color={tint(4)} />} onPress={() => open('/#/privacy')} />
        <Divider />
        <ListRow title={t('Delete my account')} sub={t('Permanently remove your login and personal information')} left={<IconTile name="x" color={C.bad} />} onPress={() => router.push('/delete-account')} />
      </Card>

      <Button title={t('Sign out')} icon="logout" kind="secondary" onPress={confirmOut} />
      <Muted style={{ textAlign: 'center', color: C.faint }}>OENOD {Constants.expoConfig?.version} · connected to {BASE.replace(/^https?:\/\//, '')}</Muted>
    </Screen>
  );
}
