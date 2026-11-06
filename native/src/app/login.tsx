import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../lib/auth';
import { BASE } from '../lib/api';
import { t } from '../lib/i18n';
import { router } from 'expo-router';
import { GradientButton } from '../ui/Brand';
import { A, AuthPage, ErrorLine, GField, GlassBtn, Heading, In } from '../ui/AuthKit';
import { Icon } from '../ui/Icon';
import { secure } from '../lib/secure';
import { SEEN } from './welcome';

export default function Login() {
  const { signIn, verify2fa, pending2fa, providers, signInWith, signInQuick, quick } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const go = async () => {
    setError('');
    if (!pending2fa && (!email.trim() || !password)) { setError(t('Enter your email and password.')); return; }
    setBusy(true);
    try {
      if (pending2fa) await verify2fa(code);
      else await signIn(email, password);
    } catch (e: any) {
      setError(e?.message || t('Could not sign in.'));
    } finally {
      setBusy(false);
    }
  };

  const open = (path: string) => WebBrowser.openBrowserAsync(BASE + path);

  const runQuick = async () => {
    setError(''); setBusy(true);
    try { await signInQuick(); } catch (e: any) { setError(e?.message || t('Could not sign in.')); } finally { setBusy(false); }
  };
  // First time on this phone: show the welcome pages first.
  useEffect(() => {
    if (quick.on || pending2fa || router.canGoBack()) return;
    secure.get(SEEN).then((v) => { if (!v) router.replace('/welcome'); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const asked = useRef(false);
  useEffect(() => { if (quick.on && !pending2fa && !asked.current) { asked.current = true; runQuick(); } }, [quick.on]); // eslint-disable-line react-hooks/exhaustive-deps

  const social = async (p: string) => {
    setError(''); setBusy(true);
    try { await signInWith(p); } catch (e: any) { setError(e?.message || t('Could not sign in.')); } finally { setBusy(false); }
  };
  const LABEL: Record<string, string> = { google: 'Google', apple: 'Apple', microsoft: 'Microsoft' };
  // Apple's rules: when another provider is offered on iPhone, Apple comes first.
  const shown = [...providers].sort((a, b) => (a === 'apple' ? -1 : b === 'apple' ? 1 : 0));

  return (
    <AuthPage back={router.canGoBack()}>
      <In><Heading eyebrow={pending2fa ? t('Two-step check') : t('Sign in')} title={t(pending2fa ? 'Enter your code' : 'Welcome back')}
        sub={pending2fa ? t('Enter the 6-digit code from your authenticator app.') : t('Owners and employees sign in here. OENOD opens the right home for you.')} /></In>
      {pending2fa ? (
        <In delay={60}><GField label={t('Code')} icon="shield" value={code} onChangeText={setCode} keyboardType="number-pad" autoFocus maxLength={8} textContentType="oneTimeCode" autoComplete="one-time-code" onSubmitEditing={go} /></In>
      ) : (
        <In delay={60} style={{ gap: 14 }}>
          <GField label={t('Email')} icon="mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" autoComplete="email" returnKeyType="next" />
          <GField label={t('Password')} icon="shield" secure value={password} onChangeText={setPassword} textContentType="password" autoComplete="password" returnKeyType="go" onSubmitEditing={go} />
          <Pressable onPress={() => open('/#/forgot')} accessibilityRole="link" style={{ alignSelf: 'flex-end', paddingVertical: 2 }} hitSlop={6}>
            <Text style={{ color: A.sky, fontWeight: '600', fontSize: 14 }}>{t('Forgot your password?')}</Text>
          </Pressable>
        </In>
      )}
      <ErrorLine text={error} />
      <In delay={110} style={{ gap: 12 }}>
        <GradientButton light title={t(pending2fa ? 'Verify' : 'Sign in')} iconRight="arrow" onPress={go} busy={busy} />
        {!pending2fa && quick.on ? <GlassBtn title={t('Sign in with {m}', { m: quick.name || t('Face ID') })} icon="face" onPress={runQuick} disabled={busy} /> : null}
      </In>
      {!pending2fa && shown.length ? (
        <In delay={160} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: A.line }} />
            <Text style={{ color: A.faint, fontSize: 12, fontWeight: '600', letterSpacing: 1.2 }}>{t('or').toUpperCase()}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: A.line }} />
          </View>
          {shown.map((p) => (
            <Pressable key={p} onPress={() => social(p)} disabled={busy} accessibilityRole="button"
              style={({ pressed }) => ({ minHeight: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
                borderColor: p === 'apple' ? '#FFFFFF' : A.line, backgroundColor: p === 'apple' ? '#FFFFFF' : A.glass, opacity: pressed || busy ? 0.75 : 1 })}>
              <Text style={{ color: p === 'apple' ? '#000000' : '#FFFFFF', fontWeight: '700', fontSize: 16 }}>{t('Continue with {p}', { p: LABEL[p] || p })}</Text>
            </Pressable>
          ))}
        </In>
      ) : null}
      {!pending2fa ? (
        <In delay={210} style={{ gap: 14, marginTop: 4 }}>
          <Pressable onPress={() => router.push('/guest')} accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: A.glass, borderWidth: 1, borderColor: A.line }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(61,91,245,0.2)' }}><Icon name="video" size={20} color="#FFFFFF" /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: A.ink, fontWeight: '700', fontSize: 15 }}>{t('Join a meeting')}</Text>
              <Text style={{ color: A.sub, fontSize: 13 }}>{t('No account needed')}</Text>
            </View>
            <Icon name="chevron" size={18} color={A.sub} />
          </Pressable>
          <Text style={{ color: A.sub, fontSize: 15, textAlign: 'center' }}>
            {t('New to OENOD?')} <Text onPress={() => router.push('/signup')} style={{ color: A.sky, fontWeight: '700' }}>{t('Create a free account')}</Text>
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            <Icon name="shield" size={13} color={A.faint} />
            <Text style={{ color: A.faint, fontSize: 12 }}>{t('Your sign-in is encrypted and kept in your phone’s secure keychain.')}</Text>
          </View>
        </In>
      ) : null}
    </AuthPage>
  );
}
