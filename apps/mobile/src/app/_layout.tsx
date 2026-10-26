import { useEffect } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { Wrench, Download } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Sora_300Light, Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider, useAuth } from '@/lib/auth';
import { usePlatformStatus, type Surface } from '@/lib/status';
import { linkToRoute } from '@/lib/links';
import { longDate, time } from '@/lib/format';
import { Button, NoticeContext } from '@/components/ui';
import { C, F, G } from '@/lib/theme';
import { t } from '@/lib/i18n';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Root() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { ready, session } = useAuth();
  const { maintenance, mustUpdate, readOnly, banner } = usePlatformStatus();
  // If the fonts fail to load the app still opens with the system font.
  const [fontsLoaded, fontError] = useFonts({ Sora_300Light, Sora_600SemiBold, Sora_700Bold, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const fonts = fontsLoaded || !!fontError;
  useNotificationLinks(Boolean(session));
  useEffect(() => { if (ready && fonts) SplashScreen.hideAsync().catch(() => {}); }, [ready, fonts]);
  if (!ready || !fonts) return null;
  if (mustUpdate) return <UpdateScreen s={mustUpdate} />;
  if (maintenance && !session?.user.isSuperAdmin) return <MaintenanceScreen s={maintenance} />;
  const notice = readOnly ? (readOnly.message || t('maintenance.readOnly')) : banner?.message;
  return (
    <NoticeContext.Provider value={session ? notice ?? null : null}>
    <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: C.bg }, headerTintColor: C.navy, headerTitleStyle: { fontFamily: F.display, fontSize: 17, color: C.ink }, headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="leave" options={{ title: 'Time off', presentation: 'modal' }} />
        <Stack.Screen name="payslips" options={{ title: 'Payslips' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="pay/send" options={{ title: 'Send money' }} />
        <Stack.Screen name="pay/topup" options={{ title: 'Add money', presentation: 'modal' }} />
        <Stack.Screen name="pay/cards" options={{ title: 'Cards' }} />
        <Stack.Screen name="pay/family" options={{ title: 'Family' }} />
        <Stack.Screen name="pay/markets" options={{ title: 'Markets' }} />
        <Stack.Screen name="pay/coach" options={{ title: 'Oeno, money coach' }} />
        <Stack.Screen name="pay/esim" options={{ title: 'Travel eSIM' }} />
        <Stack.Screen name="pay/security" options={{ title: 'Security' }} />
        <Stack.Screen name="pay/verify" options={{ title: 'Verify identity' }} />
        <Stack.Screen name="pay/help" options={{ title: 'Help' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="signin" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
    </NoticeContext.Provider>
  );
}

// Push notifications only exist on phones; the web preview skips them.
const useLastResponse = Platform.OS === 'web' ? () => null : Notifications.useLastNotificationResponse;

/** Tapping a push notification opens the matching screen. */
function useNotificationLinks(signedIn: boolean) {
  const router = useRouter();
  const last = useLastResponse();
  useEffect(() => {
    if (!signedIn || !last) return;
    const link = last.notification.request.content.data?.link;
    if (typeof link === 'string') router.push(linkToRoute(link) as never);
  }, [signedIn, last, router]);
}

function MaintenanceScreen({ s }: { s: Surface }) {
  return (
    <View style={st.full}>
      <LinearGradient colors={G.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={st.icon}><Wrench color="#fff" size={30} /></View>
      <Text style={st.title}>{s.title || t('maintenance.title')}</Text>
      <Text style={st.msg}>{s.message || t('maintenance.message')}</Text>
      {s.endsAt && <Text style={st.when}>{t('maintenance.backAround', { time: `${longDate(s.endsAt)}, ${time(s.endsAt)}` })}</Text>}
    </View>
  );
}

function UpdateScreen({ s }: { s: Surface }) {
  return (
    <View style={st.full}>
      <LinearGradient colors={G.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={st.icon}><Download color="#fff" size={30} /></View>
      <Text style={st.title}>{t('maintenance.updateTitle')}</Text>
      <Text style={st.msg}>{t('maintenance.updateMessage')}{s.latestVersion ? ` (${s.latestVersion})` : ''}</Text>
      {s.updateUrl && <Button title={t('maintenance.updateNow')} variant="light" onPress={() => Linking.openURL(s.updateUrl!)} style={{ marginTop: 18, alignSelf: 'stretch' }} big />}
    </View>
  );
}

const st = StyleSheet.create({
  full: { flex: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  icon: { width: 76, height: 76, borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { color: '#fff', fontSize: 26, fontFamily: F.display, textAlign: 'center', letterSpacing: -0.5 },
  msg: { color: C.onNavy, fontSize: 16, lineHeight: 24, textAlign: 'center', fontFamily: F.regular, maxWidth: 320 },
  when: { color: '#fff', fontSize: 14, fontFamily: F.semi, marginTop: 6 },
});
