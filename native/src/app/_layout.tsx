import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';
import { Splash } from '../ui/Brand';
import { AppearanceProvider, takeReturnTo } from '../lib/appearance';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { C } from '../lib/theme';
import { LangProvider, t } from '../lib/i18n';
import { stopTracking, syncTracking } from '../lib/geo'; // also registers the background location task

function Gate() {
  const { ready, session } = useAuth();
  const signedIn = !!session?.user;
  const hasEmployee = !!session?.employee;
  useEffect(() => {
    if (!ready) return;
    if (!signedIn || !hasEmployee) { stopTracking(); return; }
    syncTracking();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') syncTracking(); });
    return () => sub.remove();
  }, [ready, signedIn, hasEmployee]);
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
        <Stack.Screen name="timesheet" options={{ headerShown: true, title: t('My hours'), headerTintColor: C.ink, headerStyle: { backgroundColor: C.dark ? C.bg : '#FFFFFF' }, headerShadowVisible: false }} />
        <Stack.Screen name="setup" options={{ animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: '#050B24' } }} />
        <Stack.Screen name="web" options={{ animation: 'slide_from_bottom' }} />
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
