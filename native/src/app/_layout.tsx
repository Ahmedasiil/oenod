import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { AppState } from 'react-native';
import { Splash } from '../ui/Brand';
import { AppearanceProvider, takeReturnTo } from '../lib/appearance';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { C } from '../lib/theme';
import { LangProvider, t } from '../lib/i18n';
import { stopTracking, syncTracking } from '../lib/geo'; // also registers the location task (Android)
import { onWatchPair, watchPending } from '../../modules/oenod-watchlink/src';
import { lastCrash } from '../../modules/oenod-tap/src';
import { post } from '../lib/api';
import Constants from 'expo-constants';
import { stopPhone, syncPhone } from '../lib/phone';
import { loadSeasonSwitch } from '../lib/season';
import { startSeasonIcon } from '../lib/seasonIcon';

function Gate() {
  const { ready, session } = useAuth();
  // Seasonal logo: HQ's on/off switch, checked once a day and whenever the app comes back.
  useEffect(() => { loadSeasonSwitch(); const sub = AppState.addEventListener('change', (st) => { if (st === 'active') loadSeasonSwitch(); }); const stop = startSeasonIcon(); return () => { sub.remove(); stop(); }; }, []);
  const signedIn = !!session?.user;
  const hasEmployee = !!session?.employee;
  useEffect(() => {
    if (!ready) return;
    if (!signedIn || !hasEmployee) { stopTracking(); return; }
    syncTracking();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') syncTracking(); });
    return () => sub.remove();
  }, [ready, signedIn, hasEmployee]);
  // Business Phone (3.8, iPhone): ring company calls on this phone when the person has a phone seat.
  useEffect(() => {
    if (!ready) return;
    if (!signedIn) { stopPhone(); return; }
    syncPhone();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') syncPhone(); });
    return () => sub.remove();
  }, [ready, signedIn]);
  // 4.3 (Android): if the app closed by itself last time, send the reason to OENOD support once, so it gets fixed.
  useEffect(() => {
    if (!ready || !signedIn) return;
    const c = lastCrash(); if (!c) return;
    post('/api/support', { subject: `App closed by itself (Android ${Constants.expoConfig?.version || ''})`, body: c, priority: 'normal' }).catch(() => {});
  }, [ready, signedIn]);
  // Apple Watch asks to connect (3.7): open "Connect a watch" with its code filled in, ready for Allow.
  useEffect(() => {
    if (!ready || !signedIn) return;
    const open = (code: string) => setTimeout(() => router.push({ pathname: '/watch', params: { code } } as any), 0);
    const p = watchPending(); if (p) open(p);
    const off = onWatchPair(open);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') { const q = watchPending(); if (q) open(q); } });
    return () => { off(); sub.remove(); };
  }, [ready, signedIn]);
  useEffect(() => {
    if (!ready || !signedIn) return;
    const r = takeReturnTo();
    if (r) setTimeout(() => router.navigate(r as any), 0);
  }, [ready, signedIn]);
  if (!ready) return <Splash />;
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: C.bg }, headerBackButtonDisplayMode: 'minimal', headerTitleStyle: { fontWeight: '800', fontSize: 17 } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="employee/[id]" options={{ headerShown: true, title: t('Team member'), headerTintColor: C.ink, headerStyle: { backgroundColor: C.dark ? C.bg : '#FFFFFF' }, headerShadowVisible: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: t('Notifications'), headerTintColor: C.ink, headerStyle: { backgroundColor: C.dark ? C.bg : '#FFFFFF' }, headerShadowVisible: false }} />
        <Stack.Screen name="timeoff-new" options={{ presentation: 'modal', headerShown: true, title: t('Request time off'), headerTintColor: C.ink, headerStyle: { backgroundColor: C.dark ? C.bg : '#FFFFFF' }, headerShadowVisible: false }} />
        <Stack.Screen name="shift/[id]" options={{ headerShown: true, title: t('Shift'), headerTintColor: C.ink, headerStyle: { backgroundColor: C.dark ? C.bg : '#FFFFFF' }, headerShadowVisible: false }} />
        <Stack.Screen name="availability" options={{ headerShown: true, title: t('My availability'), headerTintColor: C.ink, headerStyle: { backgroundColor: C.dark ? C.bg : '#FFFFFF' }, headerShadowVisible: false }} />
        <Stack.Screen name="pay" options={{ headerShown: true, title: t('My pay'), headerTintColor: C.ink, headerStyle: { backgroundColor: C.dark ? C.bg : '#FFFFFF' }, headerShadowVisible: false }} />
        <Stack.Screen name="wallet" options={{ headerShown: true, title: t('Wallet'), headerTintColor: C.ink, headerStyle: { backgroundColor: C.dark ? C.bg : '#FFFFFF' }, headerShadowVisible: false }} />
        <Stack.Screen name="feed" options={{ headerShown: true, title: t('Team news'), headerTintColor: C.ink, headerStyle: { backgroundColor: C.dark ? C.bg : '#FFFFFF' }, headerShadowVisible: false }} />
        <Stack.Screen name="geo-consent" options={{ presentation: 'modal', headerShown: true, title: t('Site attendance'), headerTintColor: C.ink, headerStyle: { backgroundColor: C.dark ? C.bg : '#FFFFFF' }, headerShadowVisible: false }} />
        <Stack.Screen name="delete-account" options={{ presentation: 'modal', headerShown: true, title: t('Delete my account'), headerTintColor: C.ink, headerStyle: { backgroundColor: C.dark ? C.bg : '#FFFFFF' }, headerShadowVisible: false }} />
        <Stack.Screen name="watch" options={{ headerShown: true, title: t('Connect a watch'), headerTintColor: C.ink, headerStyle: { backgroundColor: C.dark ? C.bg : '#FFFFFF' }, headerShadowVisible: false }} />
        <Stack.Screen name="timesheet" options={{ headerShown: true, title: t('My hours'), headerTintColor: C.ink, headerStyle: { backgroundColor: C.dark ? C.bg : '#FFFFFF' }, headerShadowVisible: false }} />
        <Stack.Screen name="setup" options={{ animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: '#050B24' } }} />
        <Stack.Screen name="payroll" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="invoices/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="invoices/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="invoices/new" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="customers/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="customers/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="expenses" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="timeclock" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="inventory" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="sales/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="sales/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="register" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="products" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="reports" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="chat/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="chat/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="reviews" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="support/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="support/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="hiring/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="hiring/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="onboarding/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="onboarding/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="performance/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="performance/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="resume/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="resume/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="accounting" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="banking" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="marketing" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="projects/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="projects/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="payrun/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="payrun/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="academy/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="academy/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="docs/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="docs/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="storm" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="cameras" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="settings" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="security" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="loyalty" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="reservations" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="suppliers" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="calls" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="shiftplan" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="profile-edit" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="card" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="jobs/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="jobs/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="mail/index" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="mail/[id]" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="mail/new" options={{ contentStyle: { backgroundColor: '#0A0B10' } }} />
        <Stack.Screen name="web" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="kiosk" options={{ animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: '#000C58' } }} />
        <Stack.Screen name="call" options={{ presentation: 'fullScreenModal', gestureEnabled: false, contentStyle: { backgroundColor: '#000C58' } }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" options={{ contentStyle: { backgroundColor: '#050B24' } }} />
        <Stack.Screen name="login" options={{ animation: 'fade_from_bottom', contentStyle: { backgroundColor: '#050B24' } }} />
        <Stack.Screen name="signup" options={{ contentStyle: { backgroundColor: '#050B24' } }} />
      </Stack.Protected>
      {/* Guests can join a meeting whether or not they have an account. */}
      <Stack.Screen name="guest" options={{ contentStyle: { backgroundColor: '#050B24' } }} />
      <Stack.Screen name="m/[code]" options={{ contentStyle: { backgroundColor: '#050B24' } }} />
    </Stack>
  );
}

export default function RootLayout() {
  // Midnight heading font (Space Grotesk, same as the approved design). Text falls back to the system font until it loads.
  useFonts({ SG6: require('../../assets/fonts/SpaceGrotesk-SemiBold.ttf'), SG7: require('../../assets/fonts/SpaceGrotesk-Bold.ttf') });
  return (
    <SafeAreaProvider>
      <AuthProvider>
      <LangProvider>
      <AppearanceProvider>
        <StatusBar style={C.dark ? "light" : "dark"} />
        <Gate />
      </AppearanceProvider>
      </LangProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
