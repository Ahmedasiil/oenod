import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { BASE } from '../lib/api';
import { C, S } from '../lib/theme';
import { Button, Field } from '../ui/kit';
import { t } from '../lib/i18n';

export default function Login() {
  const { signIn, verify2fa, pending2fa } = useAuth();
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

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#000' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: S.xl, paddingTop: insets.top + S.xl }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Text style={{ color: C.white, fontSize: 40, fontWeight: '900', letterSpacing: 8 }} accessibilityRole="header">OENOD</Text>
          <Text style={{ color: '#C9D3EA', fontSize: 16, marginTop: 8, textAlign: 'center' }}>{t('Run your whole business from your phone.')}</Text>
        </View>
        <View style={{ backgroundColor: C.white, borderRadius: 22, padding: S.xl, gap: S.lg }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>{t(pending2fa ? 'Two-step check' : 'Sign in')}</Text>
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
          {!pending2fa ? (
            <Pressable onPress={() => open('/#/forgot')} accessibilityRole="link" style={{ alignSelf: 'center', padding: 6 }}>
              <Text style={{ color: C.blue, fontWeight: '600' }}>{t('Forgot your password?')}</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={{ alignItems: 'center', marginTop: S.xl, gap: 8 }}>
          <Text style={{ color: '#C9D3EA' }}>{t('New to OENOD?')}</Text>
          <Pressable onPress={() => open('/#/signup')} accessibilityRole="link" style={{ padding: 6 }}>
            <Text style={{ color: C.white, fontWeight: '700', fontSize: 16 }}>{t('Start your free trial')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
