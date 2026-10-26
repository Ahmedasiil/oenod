import { useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ExternalLink, Globe, LogOut, MapPin, Palmtree, Receipt, ShieldCheck } from 'lucide-react-native';
import { LOCALES } from '@oenod/i18n';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { API_URL, APP_VERSION } from '@/lib/config';
import { locale, t } from '@/lib/i18n';
import { C, F } from '@/lib/theme';
import { Avatar, Badge, HeroCard, IconTile, List, Row, Screen, Section, T } from '@/components/ui';

export default function More() {
  const router = useRouter();
  const { session, can, signOut, refresh } = useAuth();
  const [sharing, setSharing] = useState(Boolean(session?.employee?.shareLiveLocation));
  const lang = LOCALES.find((l) => l.code === locale());
  const role = session?.role ? session.role.charAt(0) + session.role.slice(1).toLowerCase() : null;

  const toggleSharing = async (v: boolean) => {
    setSharing(v);
    try { await api('/api/me', { method: 'PATCH', body: { shareLiveLocation: v } }); await refresh(); }
    catch (e) { setSharing(!v); Alert.alert('Not saved', (e as Error).message); }
  };
  const confirmSignOut = () => Alert.alert(t('common.signOut'), 'You will need your password to sign back in.', [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.signOut'), style: 'destructive', onPress: () => signOut() }]);

  return (
    <Screen title={t('common.more')}>
      <HeroCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar name={session?.user.name ?? ''} size={58} ring />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={st.name} numberOfLines={1}>{session?.user.name}</Text>
            <Text style={st.email} numberOfLines={1}>{session?.user.email}</Text>
          </View>
        </View>
        <View style={st.orgRow}>
          <Text style={st.org} numberOfLines={1}>{session?.org?.name}</Text>
          {role && <View style={st.rolePill}><Text style={st.roleText}>{session?.employee?.jobTitle ?? role}</Text></View>}
        </View>
      </HeroCard>

      <Section title={t('modules.me')}>
        <List>
          <Row title={t('nav.notifications')} icon={<IconTile><Bell color={C.blue} size={18} /></IconTile>} right={session?.unread ? <Badge text={String(session.unread)} tone="red" /> : undefined} chevron onPress={() => router.push('/notifications')} />
          {can('me') && <Row title={t('me.payslips')} icon={<IconTile tone="green"><Receipt color={C.green} size={18} /></IconTile>} chevron onPress={() => router.push('/payslips')} />}
          {can('leave') && <Row title={t('me.leave')} icon={<IconTile tone="amber"><Palmtree color={C.amber} size={18} /></IconTile>} chevron onPress={() => router.push('/leave')} />}
        </List>
      </Section>

      {session?.employee && can('me') && (
        <Section title="Privacy">
          <List>
            <Row title="Share live location" sub="Only while you're clocked in and the app is open." icon={<IconTile tone="violet"><MapPin color={C.violet} size={18} /></IconTile>}
              right={<Switch value={sharing} onValueChange={toggleSharing} trackColor={{ true: C.navy, false: C.line }} thumbColor="#fff" ios_backgroundColor={C.line} />} />
          </List>
        </Section>
      )}

      <Section title={t('common.settings')}>
        <List>
          <Row title={t('common.language')} sub={lang?.native ?? locale()} icon={<IconTile><Globe color={C.blue} size={18} /></IconTile>} />
          <Row title={t('nav.security')} sub={session?.user.twoFactor ? 'Two-step sign-in is on' : 'Turn on two-step sign-in'} icon={<IconTile tone={session?.user.twoFactor ? 'green' : 'amber'}><ShieldCheck color={session?.user.twoFactor ? C.green : C.amber} size={18} /></IconTile>} right={<ExternalLink color={C.faint} size={16} />} onPress={() => Linking.openURL(`${API_URL}/app/account/security`)} />
          <Row title="Open OENOD on the web" icon={<IconTile tone="navy"><ExternalLink color="#fff" size={17} /></IconTile>} right={<ExternalLink color={C.faint} size={16} />} onPress={() => Linking.openURL(`${API_URL}/app`)} />
        </List>
      </Section>

      <List>
        <Row title={t('common.signOut')} danger icon={<IconTile tone="red"><LogOut color={C.red} size={18} /></IconTile>} onPress={confirmSignOut} />
      </List>
      <T v="caption" color={C.faint} style={{ textAlign: 'center' }}>OENOD {APP_VERSION}</T>
    </Screen>
  );
}

const st = StyleSheet.create({
  name: { color: '#fff', fontFamily: F.display, fontSize: 20, letterSpacing: -0.4 },
  email: { color: C.onNavy, fontFamily: F.medium, fontSize: 13.5 },
  orgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.16)', paddingTop: 14, marginTop: 4 },
  org: { color: '#fff', fontFamily: F.semi, fontSize: 14, flex: 1 },
  rolePill: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  roleText: { color: '#fff', fontFamily: F.semi, fontSize: 12 },
});
