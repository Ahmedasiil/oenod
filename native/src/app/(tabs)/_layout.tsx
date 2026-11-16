import React from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { C } from '../../lib/theme';
import { t } from '../../lib/i18n';
import { Icon, IconName } from '../../ui/Icon';
import { TabBar } from '../../ui/TabBar';

// Reachable screens that just don't get a tab button. (expo-router 58 turns href: null into a redirect to Today,
// which made Me, Team and Time off impossible to open.)
const OFF_BAR = { oeOffBar: true } as any;

const icon = (name: IconName) => ({ color }: { color: unknown }) => <Icon name={name} color={String(color ?? C.faint)} size={22} duo={false} />;

// Five tabs, like the website's five suites: Today, Schedule, OENOD AI (centre orb), Money, Everything.
// Time off, Team and Me stay reachable from Today, Everything and the avatar.
export default function TabsLayout() {
  const { isManager, session } = useAuth();
  const hasEmployee = !!session?.employee;
  const hasCompany = !!session?.company;
  return (
    <Tabs
      tabBar={(p) => <TabBar {...p} />}
      backBehavior="history"
      screenOptions={{ animation: 'shift', headerShown: false, sceneStyle: { backgroundColor: C.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: t('Today'), tabBarIcon: icon('home') }} />
      <Tabs.Screen name="schedule" options={{ title: t('Schedule'), tabBarIcon: icon('calendar'), href: hasEmployee || isManager ? undefined : null }} />
      <Tabs.Screen name="ai" options={{ title: t('Ava'), tabBarIcon: icon('spark') }} />
      <Tabs.Screen name="money" options={{ title: t('Money'), tabBarIcon: icon('wallet'), href: hasCompany || hasEmployee ? undefined : null }} />
      <Tabs.Screen name="all" options={{ title: t('Everything'), tabBarIcon: icon('grid') }} />
      <Tabs.Screen name="timeoff" options={{ title: t('Time off'), ...OFF_BAR }} />
      <Tabs.Screen name="team" options={{ title: t('Team'), ...OFF_BAR }} />
      <Tabs.Screen name="me" options={{ title: t('Me'), ...OFF_BAR }} />
    </Tabs>
  );
}
