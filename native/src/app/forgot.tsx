// Forgot password, inside the app (4.3): type your email, OENOD emails a reset link. Works signed out.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { post } from '../lib/api';
import { t } from '../lib/i18n';
import { GradientButton } from '../ui/Brand';
import { Icon } from '../ui/Icon';
import { A, AuthPage, ErrorLine, GField, Heading, In } from '../ui/AuthKit';

export default function Forgot() {
  const { email: e0 } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(String(e0 || ''));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const go = async () => {
    if (busy) return;
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErr(t('Type the email you use to sign in.')); return; }
    setErr(''); setBusy(true);
    try { await post('/api/auth/forgot', { email: v }); setSent(true); }
    catch (x: any) { setErr(x?.message || t('Something went wrong. Please try again.')); }
    finally { setBusy(false); }
  };
  return (
    <AuthPage>
      <In><View style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(42,59,196,0.18)', borderWidth: 1, borderColor: 'rgba(175,195,255,0.22)' }}><Icon name={sent ? 'mail' : 'shield'} size={28} color="#FFFFFF" /></View></In>
      {sent ? (<>
        <In delay={60}><Heading eyebrow={t('Password')} title={t('Check your email')} sub={t('If {email} has an OENOD account, we sent a link to choose a new password. It works for one hour.', { email: email.trim() })} /></In>
        <In delay={120}><GradientButton light title={t('Back to sign in')} iconRight="arrow" onPress={() => router.replace('/login')} /></In>
        <Text style={{ color: A.sub, fontSize: 14, textAlign: 'center' }} onPress={() => setSent(false)}>{t('No email? Check spam, or')} <Text style={{ color: A.sky, fontWeight: '700' }}>{t('send it again')}</Text></Text>
      </>) : (<>
        <In delay={60}><Heading eyebrow={t('Password')} title={t('Forgot your password?')} sub={t('Type the email you sign in with. We will send you a link to choose a new password.')} /></In>
        <In delay={120}><GField label={t('Email')} icon="mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" placeholder={t('you@company.com')} returnKeyType="send" onSubmitEditing={go} /></In>
        <ErrorLine text={err} />
        <In delay={180}><GradientButton light busy={busy} title={busy ? t('Sending…') : t('Send the link')} iconRight="arrow" onPress={go} /></In>
      </>)}
      <View style={{ flex: 1 }} />
    </AuthPage>
  );
}
