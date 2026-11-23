// Join a meeting as a guest: no account needed. Paste the link or code from the invite; the meeting
// opens in the secure in-app browser (camera and microphone work there), and the host lets you in.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { BASE, post } from '../lib/api';
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

/** The 10 numbers of a meeting code ("482 913 5067", "482-913-5067" or a #/meet-join/<code> link), else null. */
export function meetingCode(v: string): string | null {
  const s = String(v || '').trim();
  const j = s.match(/(?:meet-join|\/j)\/([\d\s-]{10,16})/); // 4.5: oenod.com/j/<code> short links too
  const d = (j ? j[1] : s).replace(/[\s-]+/g, '');
  if (/^\d{10}$/.test(d)) return d;
  const m = meetingId(s);
  return m && /^\d{10}$/.test(m) ? m : null;
}

/** Turn whatever the person typed or pasted into the meeting's id. Codes are looked up on oenod.com. Throws with a clear message. */
export async function resolveMeeting(v: string): Promise<string> {
  const code = meetingCode(v);
  if (code) {
    const r = await post<{ token?: string }>('/api/public/mc1-find', { code });
    if (!r?.token) throw new Error(t('No meeting has that code. Check the numbers in your invite and try again.'));
    return r.token;
  }
  const id = meetingId(v);
  if (!id) throw new Error(t('Type the 10-number meeting code, like 482 913 5067, or paste the whole link from your invite.'));
  return id;
}

/** Meetings open in the app's own meeting room (4.3), signed in or as a guest. */
export const openMeeting = (id: string, replace = false) => (replace ? router.replace : router.push)({ pathname: '/room/[token]', params: { token: id } });

export default function Guest() {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (busy) return;
    setErr(''); setBusy(true);
    try { openMeeting(await resolveMeeting(v)); }
    catch (e: any) { setErr(e?.message || t('Something went wrong. Please try again.')); }
    finally { setBusy(false); }
  };
  return (
    <AuthPage>
      <In><View style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(42,59,196,0.18)', borderWidth: 1, borderColor: 'rgba(175,195,255,0.22)' }}><Icon name="video" size={28} color="#FFFFFF" /></View></In>
      <In delay={60}><Heading eyebrow={t('OENOD Meet')} title={t('Join a meeting')} sub={t('No account needed. Type the meeting code or paste the link you were sent. You will add your name on the next screen.')} /></In>
      <In delay={120}><GField label={t('Meeting link or code')} icon="link" value={v} onChangeText={setV} autoCapitalize="none" autoCorrect={false} keyboardType="default" placeholder={t('10-number code or link')} returnKeyType="go" onSubmitEditing={go} /></In>
      <ErrorLine text={err} />
      <In delay={180}><GradientButton light busy={busy} title={busy ? t('Finding the meeting…') : t('Continue')} iconRight="arrow" onPress={go} /></In>
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
