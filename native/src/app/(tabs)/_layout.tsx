import React from 'react';
import { Tabs } from 'expo-router';
import { C } from '../../lib/theme';
import { t } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { TabBar } from '../../ui/TabBar';

// Reachable screens that just don't get a tab button. (expo-router 58 turns href: null into a redirect to Today,
// which made Me, Team and Time off impossible to open.)
const OFF_BAR = { oeOffBar: true } as any;

// 4.0 Navy Daylight (approved 11-17): five tabs with Meet raised in the middle.
// Employee: Home, Shifts, Meet, Ava, Me.  Owner/manager: Home, Team, Meet, Calls, Me.
// All tools, Money and Time off open from the Home grid; Ava and Calls stay reachable for everyone.
export default function TabsLayout() {
  const { isManager } = useAuth();
  const off = (show: boolean) => (show ? {} : OFF_BAR);
  return (
    <Tabs
      tabBar={(p) => <TabBar {...p} />}
      backBehavior="history"
      screenOptions={{ animation: 'shift', headerShown: false, sceneStyle: { backgroundColor: C.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: t('Home') }} />
      <Tabs.Screen name="schedule" options={{ title: t('Shifts'), ...off(!isManager) }} />
      <Tabs.Screen name="team" options={{ title: t('Team'), ...off(isManager) }} />
      <Tabs.Screen name="meet" options={{ title: t('Meet') }} />
      <Tabs.Screen name="phone" options={{ title: t('Calls'), ...off(isManager) }} />
      <Tabs.Screen name="ai" options={{ title: t('Ava'), ...off(!isManager) }} />
      <Tabs.Screen name="me" options={{ title: t('Me') }} />
      <Tabs.Screen name="all" options={{ title: t('All tools'), ...OFF_BAR }} />
      <Tabs.Screen name="money" options={{ title: t('Money'), ...OFF_BAR }} />
      <Tabs.Screen name="timeoff" options={{ title: t('Time off'), ...OFF_BAR }} />
    </Tabs>
  );
}
