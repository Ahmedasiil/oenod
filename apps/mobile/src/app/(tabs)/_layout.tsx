import { StyleSheet, View, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDays, Clock, House, LayoutGrid, Sparkles, Wallet, type LucideIcon } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { C, F } from '@/lib/theme';

// The active tab sits in a soft pill so it's clear at a glance where you are.
const icon = (I: LucideIcon) => ({ focused, color }: { focused: boolean; color: ColorValue }) => (
  <View style={[st.pill, focused && st.pillOn]}>
    <I color={String(color)} size={21} strokeWidth={focused ? 2.3 : 1.9} />
  </View>
);

// Each tab shows only when the person's role or grants include that module.
// oenodpay-only accounts (no company) open straight on Pay.
export default function TabsLayout() {
  const { can, session } = useAuth();
  const insets = useSafeAreaInsets();
  const hide = (m: string) => (can(m) ? undefined : null);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.navy,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: { height: 74 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: C.paper, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, boxShadow: '0px -6px 24px rgba(10,19,64,0.06)' },
        tabBarLabelStyle: { fontFamily: F.semi, fontSize: 11, marginTop: 2 },
        tabBarBadgeStyle: { backgroundColor: C.red, fontFamily: F.bold, fontSize: 10 },
      }}>
      <Tabs.Screen name="index" options={{ title: t('nav.home'), href: session?.org ? undefined : null, tabBarIcon: icon(House) }} />
      <Tabs.Screen name="pay" options={{ title: 'Pay', tabBarIcon: icon(Wallet) }} />
      <Tabs.Screen name="clock" options={{ title: t('me.clock'), href: hide('time'), tabBarIcon: icon(Clock) }} />
      <Tabs.Screen name="shifts" options={{ title: t('me.shifts'), href: hide('me'), tabBarIcon: icon(CalendarDays) }} />
      <Tabs.Screen name="ai" options={{ title: t('me.assistant'), href: hide('ai'), tabBarIcon: icon(Sparkles) }} />
      <Tabs.Screen name="more" options={{ title: t('common.more'), tabBarBadge: session?.unread ? Math.min(session.unread, 99) : undefined, tabBarIcon: icon(LayoutGrid) }} />
    </Tabs>
  );
}

const st = StyleSheet.create({
  pill: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: C.sky },
});
