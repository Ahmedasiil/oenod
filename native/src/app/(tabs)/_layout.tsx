import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { C } from '../../lib/theme';
import { t } from '../../lib/i18n';
import { Icon, IconName } from '../../ui/Icon';

const icon = (name: IconName) => ({ color }: { color: unknown }) => <Icon name={name} color={String(color ?? C.faint)} size={24} />;

export default function TabsLayout() {
  const { isManager, session } = useAuth();
  const hasEmployee = !!session?.employee;
  // Taller bar so Hindi, Punjabi, Urdu and Arabic labels are not cut off.
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.blue,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
        tabBarStyle: { borderTopColor: 'transparent', height: 66 + insets.bottom, paddingTop: 6, backgroundColor: C.white, shadowColor: '#000C58', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('Home'), tabBarIcon: icon('home') }} />
      <Tabs.Screen name="schedule" options={{ title: t('Schedule'), tabBarIcon: icon('calendar'), href: hasEmployee || isManager ? undefined : null }} />
      <Tabs.Screen name="timeoff" options={{ title: t('Time off'), tabBarIcon: icon('sun'), href: hasEmployee || isManager ? undefined : null }} />
      <Tabs.Screen name="team" options={{ title: t('Team'), tabBarIcon: icon('users'), href: isManager ? undefined : null }} />
      <Tabs.Screen name="me" options={{ title: t('Me'), tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
