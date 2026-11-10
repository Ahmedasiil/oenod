// Join a meeting as a guest: no account needed. Paste the link or code from the invite; the meeting
// opens in the secure in-app browser (camera and microphone work there), and the host lets you in.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { BASE } from '../lib/api';
import { t } from '../lib/i18n';
import { GradientButton } from '../ui/Brand';
import { Icon } from '../ui/Icon';
import { A, AuthPage, ErrorLine, GField, Heading, In } from '../ui/AuthKit';

/** Pull the meeting id out of a pasted link or code (same rule as oenod.com/#/meet-join). */
export function meetingId(v: string): string | null {
  const s = String(v || '').trim();
  const m = s.match(/#\/m\/([A-Za-z0-9_-]{6,128})/) || s.match(/\/m\/([A-Za-z0-9_-]{6,128})/) || s.match(/^([A-Za-z0-9_-]{6,128})$/);
  return m ? m[1] : null;
}

export const openMeeting = (id: string) => WebBrowser.openBrowserAsync(`${BASE}/#/m/${id}`, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN, controlsColor: '#2A3BC4', toolbarColor: '#050B24' });

export default function Guest() {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const go = () => {
    const id = meetingId(v);
    if (!id) { setErr(t('That does not look like a meeting link. Copy the whole link from your invite and try again.')); return; }
    setErr('');
    openMeeting(id);
  };
  return (
    <AuthPage>
      <In><View style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(42,59,196,0.18)', borderWidth: 1, borderColor: 'rgba(175,195,255,0.22)' }}><Icon name="video" size={28} color="#FFFFFF" /></View></In>
      <In delay={60}><Heading eyebrow={t('OENOD Meet')} title={t('Join a meeting')} sub={t('No account needed. Paste the meeting link or code you were sent. You will add your name on the next screen.')} /></In>
      <In delay={120}><GField label={t('Meeting link or code')} icon="link" value={v} onChangeText={setV} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://oenod.com/#/m/…" returnKeyType="go" onSubmitEditing={go} /></In>
      <ErrorLine text={err} />
      <In delay={180}><GradientButton light title={t('Continue')} iconRight="arrow" onPress={go} /></In>
      <In delay={240} style={{ gap: 12 }}>
        {[['shield', t('Encrypted call. The host lets you in.')], ['video', t('Camera and microphone stay off until you turn them on.')], ['globe', t('Works on any phone, tablet or computer.')]].map(([ic, x]) => (
          <View key={x} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Icon name={ic as any} size={17} color={A.sky} /><Text style={{ flex: 1, color: A.sub, fontSize: 14 }}>{x}</Text></View>
        ))}
      </In>
      <View style={{ flex: 1 }} />
      <Text style={{ color: A.sub, fontSize: 14, textAlign: 'center' }} onPress={() => router.replace('/login')}>{t('Have an OENOD account?')} <Text style={{ color: A.sky, fontWeight: '700' }}>{t('Sign in')}</Text></Text>
    </AuthPage>
  );
}
