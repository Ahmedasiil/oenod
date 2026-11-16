import React from 'react';
import { Tabs } from 'expo-router';
import { C } from '../../lib/theme';
import { t } from '../../lib/i18n';
import { Icon, IconName } from '../../ui/Icon';
import { TabBar } from '../../ui/TabBar';

// Reachable screens that just don't get a tab button. (expo-router 58 turns href: null into a redirect to Today,
// which made Me, Team and Time off impossible to open.)
const OFF_BAR = { oeOffBar: true } as any;

const icon = (name: IconName) => ({ color }: { color: unknown }) => <Icon name={name} color={String(color ?? C.faint)} size={24} duo={false} />;

// Five tabs, exactly as the approved Midnight design: Home, Meet, Ava (centre), All tools, Phone.
// Schedule, Money, Time off, Team and Me stay reachable from Home, All tools and the avatar.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(p) => <TabBar {...p} />}
      backBehavior="history"
      screenOptions={{ animation: 'shift', headerShown: false, sceneStyle: { backgroundColor: C.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: t('Home'), tabBarIcon: icon('home') }} />
      <Tabs.Screen name="meet" options={{ title: t('Meet'), tabBarIcon: icon('video') }} />
      <Tabs.Screen name="ai" options={{ title: t('Ava'), tabBarIcon: icon('spark') }} />
      <Tabs.Screen name="all" options={{ title: t('All tools'), tabBarIcon: icon('grid') }} />
      <Tabs.Screen name="phone" options={{ title: t('Business Phone'), tabBarIcon: icon('phone') }} />
      <Tabs.Screen name="schedule" options={{ title: t('Schedule'), ...OFF_BAR }} />
      <Tabs.Screen name="money" options={{ title: t('Money'), ...OFF_BAR }} />
      <Tabs.Screen name="timeoff" options={{ title: t('Time off'), ...OFF_BAR }} />
      <Tabs.Screen name="team" options={{ title: t('Team'), ...OFF_BAR }} />
      <Tabs.Screen name="me" options={{ title: t('Me'), ...OFF_BAR }} />
    </Tabs>
  );
}
