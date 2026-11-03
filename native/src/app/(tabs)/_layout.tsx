import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { C } from '../../lib/theme';
import { t } from '../../lib/i18n';
import { Icon, IconName } from '../../ui/Icon';

const icon = (name: IconName) => ({ color }: { color: unknown }) => <Icon name={name} color={String(color ?? C.faint)} size={24} />;

export default function TabsLayout() {
  const { isManager, session } = useAuth();
  const hasEmployee = !!session?.employee;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.blue,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { borderTopColor: C.line },
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
