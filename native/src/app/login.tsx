import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { FH, FH7, NavyFill, SubTop, V } from '../ui/M6';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../lib/auth';
import { BASE } from '../lib/api';
import { t } from '../lib/i18n';
import { router } from 'expo-router';
import { openTool } from './web';
import { ErrorLine, GField, In } from '../ui/AuthKit';
import { Icon, type IconName } from '../ui/Icon';
import { secure } from '../lib/secure';
import { SEEN } from './welcome';
import { IOS_STORE } from '../lib/store';

export default function Login() {
  const { signIn, verify2fa, pending2fa, providers, signInWith, signInQuick, quick } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const insets = useSafeAreaInsets();

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

  // 3.9.1: stays inside the app (in-app view), never the browser.
  const open = (path: string) => openTool(path.replace(/^\/#/, ''), t('OENOD'));

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

  const [note, setNote] = useState('');
  const faceId = () => {
    if (quick.on) { runQuick(); return; }
    setError(''); setNote(t('Face ID turns on after you sign in once with your email on this phone.'));
  };
  const kiosk = () => { setError(''); setNote(t('Kiosk runs on your workplace tablet: a manager signs in and opens Kiosk from All tools, then you clock in with your PIN or badge.')); };
  const SOC: Record<string, React.ReactNode> = {
    apple: <Svg width={17} height={17} viewBox="0 0 24 24"><Path fill="#FFFFFF" d="M16.4 12.6c0-2.5 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.5 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.2 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM14 5.2c.7-.9 1.2-2 1-3.2-1 .1-2.2.7-3 1.6-.6.7-1.2 1.9-1 3 1.1.1 2.3-.6 3-1.4z" /></Svg>,
    google: <Text style={[FH7, { color: '#FFFFFF', fontSize: 16 }]}>G</Text>,
    microsoft: <Svg width={15} height={15} viewBox="0 0 20 20"><Path fill="#FFFFFF" d="M0 0h9.5v9.5H0zM10.5 0H20v9.5h-9.5zM0 10.5h9.5V20H0zM10.5 10.5H20V20h-9.5z" /></Svg>,
  };
  const field = { height: 56, borderRadius: V.rM, backgroundColor: V.surf, borderWidth: 1, borderColor: V.line, paddingHorizontal: 18, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 };
  const chip = (label: string, icon: IconName, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: V.line, backgroundColor: V.surf, opacity: pressed ? 0.75 : 1 })}>
      <Icon name={icon} size={16} color="#FFFFFF" duo={false} />
      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );

  // Midnight v6 (approved 11-16): Face ID card, Apple / Google / Microsoft, email and password, "At work today?".
  return (
    <View style={{ flex: 1, backgroundColor: V.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 16, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <SubTop title={pending2fa ? t('Two-step check') : t('Sign in')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} />
          <In>
            <View style={{ alignItems: 'center' }}>
              <Text style={[FH, { color: '#FFFFFF', fontSize: 26 }]} accessibilityRole="header">{t(pending2fa ? 'Enter your code' : 'Welcome back')}</Text>
              <Text style={{ color: V.mute, fontSize: 14, marginTop: 4, textAlign: 'center' }}>{pending2fa ? t('Enter the 6-digit code from your authenticator app.') : t('Pick the easiest way for you')}</Text>
            </View>
          </In>
          {pending2fa ? (
            <In delay={60}><GField label={t('Code')} icon="shield" value={code} onChangeText={setCode} keyboardType="number-pad" autoFocus maxLength={8} textContentType="oneTimeCode" autoComplete="one-time-code" onSubmitEditing={go} /></In>
          ) : (
            <>
              <In delay={40}>
                <Pressable onPress={faceId} disabled={busy} accessibilityRole="button" accessibilityLabel={quick.on ? t('Sign in with {m}', { m: quick.name || t('Face ID') }) : t('Sign in with Face ID')}
                  style={({ pressed }) => ({ height: 140, borderRadius: V.rL, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2238D8', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
                  <NavyFill id="fid" />
                  <Scan />
                  <View style={{ zIndex: 1 }}><Icon name="face" size={44} color="#FFFFFF" stroke={1.6} duo={false} /></View>
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>{quick.on ? t('Sign in with {m}', { m: quick.name || t('Face ID') }) : t('Sign in with Face ID')}</Text>
                </Pressable>
              </In>
              {shown.length ? (
                <In delay={80}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {shown.map((p) => (
                      <Pressable key={p} onPress={() => social(p)} disabled={busy} accessibilityRole="button" accessibilityLabel={t('Continue with {p}', { p: LABEL[p] || p })}
                        style={({ pressed }) => ({ flex: 1, height: 54, borderRadius: V.rM, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: V.surf2, borderWidth: 1, borderColor: V.line, opacity: pressed || busy ? 0.75 : 1 })}>
                        {SOC[p] || null}
                        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13.5 }}>{LABEL[p] || p}</Text>
                      </Pressable>
                    ))}
                  </View>
                </In>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: V.line }} />
                <Text style={{ color: V.faint, fontSize: 12 }}>{t('or')}</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: V.line }} />
              </View>
              <In delay={120} style={{ gap: 12 }}>
                <View style={field}>
                  <Text style={{ color: V.faint, fontSize: 12 }}>{t('Email')}</Text>
                  <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" autoComplete="email" returnKeyType="next"
                    accessibilityLabel={t('Email')} placeholder="name@company.com" placeholderTextColor={V.faint} style={{ flex: 1, minWidth: 0, textAlign: 'right', color: '#D7DBEA', fontSize: 15, paddingVertical: 12 }} />
                </View>
                <View style={field}>
                  <Text style={{ color: V.faint, fontSize: 12 }}>{t('Password')}</Text>
                  <TextInput value={password} onChangeText={setPassword} secureTextEntry={!showPw} textContentType="password" autoComplete="password" returnKeyType="go" onSubmitEditing={go}
                    accessibilityLabel={t('Password')} style={{ flex: 1, minWidth: 0, textAlign: 'right', color: '#D7DBEA', fontSize: 15, paddingVertical: 12 }} />
                  <Pressable onPress={() => setShowPw(!showPw)} hitSlop={8} accessibilityRole="button" accessibilityLabel={showPw ? t('Hide password') : t('Show password')}>
                    <Text style={{ color: '#C9D2FF', fontSize: 12.5, fontWeight: '600' }}>{showPw ? t('Hide') : t('Show')}</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {IOS_STORE ? <View /> : <Pressable onPress={() => router.push('/signup')} accessibilityRole="link" hitSlop={6}><Text style={{ color: '#C9D2FF', fontWeight: '600', fontSize: 13.5 }}>{t('Create a free account')}</Text></Pressable>}
                  <Pressable onPress={() => open('/#/forgot')} accessibilityRole="link" hitSlop={6}><Text style={{ color: '#C9D2FF', fontWeight: '600', fontSize: 13.5 }}>{t('Forgot password?')}</Text></Pressable>
                </View>
              </In>
            </>
          )}
          <ErrorLine text={error} />
          {note && !error ? <Text style={{ color: '#C9D2FF', fontSize: 13, lineHeight: 18, textAlign: 'center' }}>{note}</Text> : null}
          <In delay={160}>
            <Pressable onPress={go} disabled={busy} accessibilityRole="button" accessibilityLabel={t(pending2fa ? 'Verify' : 'Sign in')}
              style={({ pressed }) => ({ height: 54, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', opacity: busy ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
              {busy ? <ActivityIndicator color={V.navy} /> : <Text style={[FH, { color: V.navy, fontSize: 16 }]}>{t(pending2fa ? 'Verify' : 'Sign in')}</Text>}
            </Pressable>
          </In>
          {!pending2fa ? (
            <In delay={200} style={{ gap: 12 }}>
              <Text style={{ color: V.faint, fontSize: 11.5, fontWeight: '700', letterSpacing: 1.4 }}>{t('At work today?').toUpperCase()}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {chip(t('Kiosk PIN'), 'pin', kiosk)}
                {chip(t('Scan badge'), 'scan', kiosk)}
                {chip(t('Join meeting'), 'video', () => router.push('/guest'))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Icon name="shield" size={13} color={V.faint} />
                <Text style={{ color: V.faint, fontSize: 12, flexShrink: 1, textAlign: 'center' }}>{t('Your sign-in is encrypted and kept in your phone’s secure keychain.')}</Text>
              </View>
            </In>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** The thin light line that sweeps over the Face ID card. */
function Scan() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(v, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    a.start(); return () => a.stop();
  }, [v]);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: '10%', right: '10%', top: 0, height: 2, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 138] }) }] }}>
      <Svg width="100%" height={2} viewBox="0 0 10 2" preserveAspectRatio="none">
        <Defs><LinearGradient id="scan" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} /><Stop offset="0.5" stopColor="#FFFFFF" /><Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} /></LinearGradient></Defs>
        <Rect width={10} height={2} fill="url(#scan)" />
      </Svg>
    </Animated.View>
  );
}
