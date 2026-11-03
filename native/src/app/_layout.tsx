import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, AppState, Text, View } from 'react-native';
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
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <Text style={{ color: C.white, fontSize: 28, fontWeight: '800', letterSpacing: 6 }}>OENOD</Text>
        <ActivityIndicator color={C.white} />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="employee/[id]" options={{ headerShown: true, title: t('Team member'), headerTintColor: C.white, headerStyle: { backgroundColor: C.navy } }} />
        <Stack.Screen name="notifications" options={{ headerShown: true, title: t('Notifications'), headerTintColor: C.white, headerStyle: { backgroundColor: C.navy } }} />
        <Stack.Screen name="timeoff-new" options={{ presentation: 'modal', headerShown: true, title: t('Request time off'), headerTintColor: C.white, headerStyle: { backgroundColor: C.navy } }} />
        <Stack.Screen name="shift/[id]" options={{ headerShown: true, title: t('Shift'), headerTintColor: C.white, headerStyle: { backgroundColor: C.navy } }} />
        <Stack.Screen name="availability" options={{ headerShown: true, title: t('My availability'), headerTintColor: C.white, headerStyle: { backgroundColor: C.navy } }} />
        <Stack.Screen name="pay" options={{ headerShown: true, title: t('My pay'), headerTintColor: C.white, headerStyle: { backgroundColor: C.navy } }} />
        <Stack.Screen name="wallet" options={{ headerShown: true, title: t('Wallet'), headerTintColor: C.white, headerStyle: { backgroundColor: C.navy } }} />
        <Stack.Screen name="feed" options={{ headerShown: true, title: t('Team news'), headerTintColor: C.white, headerStyle: { backgroundColor: C.navy } }} />
        <Stack.Screen name="geo-consent" options={{ presentation: 'modal', headerShown: true, title: t('Site attendance'), headerTintColor: C.white, headerStyle: { backgroundColor: C.navy } }} />
        <Stack.Screen name="timesheet" options={{ headerShown: true, title: t('My hours'), headerTintColor: C.white, headerStyle: { backgroundColor: C.navy } }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
      <LangProvider>
        <StatusBar style="light" />
        <Gate />
      </LangProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
