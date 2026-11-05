import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { BASE } from '../lib/api';
import { C, S } from '../lib/theme';
import { Button, Field } from '../ui/kit';
import { t } from '../lib/i18n';
import { router } from 'expo-router';
import { Backdrop, Wordmark, PoweredBy } from '../ui/Brand';
import { Icon } from '../ui/Icon';
import { secure } from '../lib/secure';
import { SEEN } from './welcome';

export default function Login() {
  const { signIn, verify2fa, pending2fa, providers, signInWith, signInQuick, quick } = useAuth();
  const insets = useSafeAreaInsets();
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
    <Backdrop>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {router.canGoBack() ? (
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('Back')} style={{ position: 'absolute', zIndex: 2, top: insets.top + 8, left: 12, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <Icon name="back" color={C.white} />
        </Pressable>
      ) : null}
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 520, alignSelf: 'center', padding: S.xl, paddingTop: insets.top + 56, paddingBottom: insets.bottom + S.xl }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Wordmark width={190} />
          <Text style={{ color: C.mist, fontSize: 16, marginTop: 10, textAlign: 'center' }}>{t('Run your whole business from your phone.')}</Text>
        </View>
        <View style={{ backgroundColor: C.dark ? 'rgba(18,20,30,0.88)' : C.card, borderWidth: 1, borderColor: C.dark ? 'rgba(255,255,255,0.07)' : 'transparent', borderRadius: 30, shadowColor: '#000', shadowOpacity: C.dark ? 0 : 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, padding: S.xl, gap: S.lg }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.4 }}>{t(pending2fa ? 'Two-step check' : 'Welcome back')}</Text>
            {!pending2fa ? <Text style={{ color: C.sub, fontSize: 14 }}>{t('Owners and employees sign in here. OENOD opens the right home for you.')}</Text> : null}
          </View>
          {pending2fa ? (
            <>
              <Text style={{ color: C.sub, fontSize: 15 }}>{t('Enter the 6-digit code from your authenticator app.')}</Text>
              <Field label={t('Code')} value={code} onChangeText={setCode} keyboardType="number-pad" autoFocus maxLength={8} textContentType="oneTimeCode" autoComplete="one-time-code" onSubmitEditing={go} />
            </>
          ) : (
            <>
              <Field label={t('Email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" autoComplete="email" returnKeyType="next" />
              <Field label={t('Password')} value={password} onChangeText={setPassword} secureTextEntry textContentType="password" autoComplete="password" returnKeyType="go" onSubmitEditing={go} />
            </>
          )}
          {error ? <Text style={{ color: C.bad, fontSize: 14, fontWeight: '600' }} accessibilityLiveRegion="polite">{error}</Text> : null}
          <Button title={t(pending2fa ? 'Verify' : 'Sign in')} onPress={go} busy={busy} />
          {!pending2fa && quick.on ? (
            <Button title={t('Sign in with {m}', { m: quick.name || t('Face ID') })} kind="secondary" icon="user" onPress={runQuick} disabled={busy} />
          ) : null}
          {!pending2fa && shown.length ? (
            <View style={{ gap: S.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ flex: 1, height: 1, backgroundColor: C.line }} /><Text style={{ color: C.sub, fontSize: 13 }}>{t('or')}</Text><View style={{ flex: 1, height: 1, backgroundColor: C.line }} /></View>
              {shown.map((p) => (
                <Pressable key={p} onPress={() => social(p)} disabled={busy} accessibilityRole="button"
                  style={({ pressed }) => ({ borderWidth: 1, borderColor: p === 'apple' ? (C.dark ? C.white : '#000') : C.line, backgroundColor: p === 'apple' ? (C.dark ? C.white : '#000') : C.field, borderRadius: 999, minHeight: 54, justifyContent: 'center', alignItems: 'center', opacity: pressed || busy ? 0.7 : 1 })}>
                  <Text style={{ color: p === 'apple' ? (C.dark ? '#000' : C.white) : C.ink, fontWeight: '700', fontSize: 16 }}>{t('Continue with {p}', { p: LABEL[p] || p })}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {!pending2fa ? (
            <Pressable onPress={() => open('/#/forgot')} accessibilityRole="link" style={{ alignSelf: 'center', padding: 6 }}>
              <Text style={{ color: C.link, fontWeight: '600' }}>{t('Forgot your password?')}</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={{ alignItems: 'center', marginTop: S.xl, gap: 8 }}>
          <Text style={{ color: C.mist }}>{t('New to OENOD?')}</Text>
          <Pressable onPress={() => open('/#/signup')} accessibilityRole="link" style={{ padding: 6 }}>
            <Text style={{ color: '#A9BAFF', fontWeight: '700', fontSize: 16 }}>{t('Start your free trial')}</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: S.lg }}>
          <Icon name="shield" size={14} color={C.mist} />
          <Text style={{ color: C.mist, fontSize: 12 }}>{t('Your sign-in is encrypted and kept in your phone’s secure keychain.')}</Text>
        </View>
        <PoweredBy dark />
      </ScrollView>
    </KeyboardAvoidingView>
    </Backdrop>
  );
}
