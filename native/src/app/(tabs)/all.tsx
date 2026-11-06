// Everything: every OENOD tool in the same five suites as the website. Tools built into the app
// open natively; the rest open the full oenod.com tool inside the app, already signed in.
import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { BASE } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { C } from '../../lib/theme';
import { t } from '../../lib/i18n';
import { Avatar, Screen } from '../../ui/kit';
import { Rise } from '../../ui/Motion';
import { Icon, IconName } from '../../ui/Icon';
import { openTool } from '../web';

type Tool = { name: string; icon: IconName; app?: string; web?: string; browser?: boolean; who: 'all' | 'staff' | 'mgr' | 'team' };
type Suite = { name: string; color: string; soft: [string, string]; tools: Tool[] };

const SUITES: Suite[] = [
  { name: 'People', color: '#3D5BF5', soft: ['#EEF1FF', 'rgba(61,91,245,0.16)'], tools: [
    { name: 'Team', icon: 'users', app: '/team', who: 'mgr' },
    { name: 'Schedule', icon: 'calendar', app: '/schedule', who: 'team' },
    { name: 'Time off', icon: 'sun', app: '/timeoff', who: 'team' },
    { name: 'My hours', icon: 'clock', app: '/timesheet', who: 'staff' },
    { name: 'My availability', icon: 'check', app: '/availability', who: 'staff' },
    { name: 'Time clock', icon: 'clock', web: '/time', who: 'mgr' },
    { name: 'Hiring', icon: 'briefcase', web: '/hiring', who: 'mgr' },
    { name: 'Onboarding', icon: 'check', web: '/onboarding', who: 'mgr' },
    { name: 'Payroll', icon: 'cash', web: '/payroll', who: 'mgr' },
    { name: 'Performance', icon: 'chart', web: '/performance', who: 'mgr' },
    { name: 'Academy', icon: 'spark', web: '/academy', who: 'all' },
  ] },
  { name: 'Money', color: '#17A673', soft: ['#E6F6EF', 'rgba(23,166,115,0.16)'], tools: [
    { name: 'Wallet', icon: 'wallet', app: '/wallet', who: 'all' },
    { name: 'My pay', icon: 'cash', app: '/pay', who: 'staff' },
    { name: 'Invoices', icon: 'news', web: '/invoices', who: 'mgr' },
    { name: 'Sales', icon: 'chart', web: '/sales', who: 'mgr' },
    { name: 'Accounting', icon: 'chart', web: '/accounting', who: 'mgr' },
    { name: 'Expenses', icon: 'briefcase', web: '/expenses', who: 'mgr' },
    { name: 'Cash flow', icon: 'cash', web: '/cashflow', who: 'mgr' },
    { name: 'Banking', icon: 'shield', web: '/banking', who: 'mgr' },
  ] },
  { name: 'Customers', color: '#C2417A', soft: ['#FBEAF2', 'rgba(194,65,122,0.18)'], tools: [
    { name: 'Customers', icon: 'users', web: '/customers', who: 'mgr' },
    { name: 'Reviews', icon: 'spark', web: '/reviews', who: 'mgr' },
    { name: 'Phone line', icon: 'phone', web: '/phone', who: 'mgr' },
    { name: 'Marketing', icon: 'news', web: '/marketing', who: 'mgr' },
    { name: 'Reservations', icon: 'calendar', web: '/reservations', who: 'mgr' },
    { name: 'Loyalty', icon: 'check', web: '/loyalty', who: 'mgr' },
    { name: 'Gift cards', icon: 'cash', web: '/gift-cards', who: 'mgr' },
  ] },
  { name: 'Operations', color: '#D98A1C', soft: ['#FFF3E0', 'rgba(217,138,28,0.18)'], tools: [
    { name: 'Inventory', icon: 'briefcase', web: '/inventory', who: 'mgr' },
    { name: 'POS', icon: 'cash', web: '/pos', who: 'mgr' },
    { name: 'Products', icon: 'grid', web: '/products', who: 'mgr' },
    { name: 'Suppliers', icon: 'send', web: '/suppliers', who: 'mgr' },
    { name: 'Cameras', icon: 'video', web: '/cameras', who: 'mgr' },
    { name: 'Parking', icon: 'pin', web: '/parking', who: 'mgr' },
    { name: 'Locations', icon: 'pin', web: '/locations', who: 'mgr' },
    { name: 'Reports', icon: 'chart', web: '/reports', who: 'mgr' },
  ] },
  { name: 'AI & platform', color: '#6B5CF6', soft: ['#F0EEFF', 'rgba(107,92,246,0.18)'], tools: [
    { name: 'OENOD AI', icon: 'spark', app: '/ai', who: 'all' },
    { name: 'Meet', icon: 'video', web: '/meet', browser: true, who: 'team' },
    { name: 'Join a meeting', icon: 'link', app: '/guest', who: 'all' },
    { name: 'Team chat', icon: 'chat', web: '/chat', who: 'team' },
    { name: 'Team news', icon: 'news', app: '/feed', who: 'team' },
    { name: 'Docs', icon: 'news', web: '/docs', who: 'mgr' },
    { name: 'Notifications', icon: 'bell', app: '/notifications', who: 'all' },
    { name: 'Settings', icon: 'globe', web: '/settings', who: 'mgr' },
    { name: 'Security', icon: 'shield', web: '/security', who: 'mgr' },
    { name: 'Help', icon: 'chat', web: '/help', who: 'all' },
  ] },
];

export default function Everything() {
  const { session, isManager } = useAuth();
  const { width } = useWindowDimensions();
  const [q, setQ] = useState('');
  const staff = !!session?.employee;
  const ok = (w: Tool['who']) => w === 'all' || (w === 'mgr' && isManager) || (w === 'staff' && staff) || (w === 'team' && (staff || isManager));
  const cols = width >= 900 ? 6 : width >= 600 ? 5 : 4;
  const groups = useMemo(() => SUITES.map((s) => ({
    ...s,
    tools: s.tools.filter((x) => ok(x.who)
      && (!q.trim() || t(x.name).toLowerCase().includes(q.trim().toLowerCase()))),
  })).filter((s) => s.tools.length), [isManager, staff, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = SUITES.reduce((a, s) => a + s.tools.filter((x) => ok(x.who)).length, 0);
  const go = (x: Tool) => {
    if (x.app) { router.navigate(x.app as any); return; }
    // Video calls open in the phone's secure browser, which handles camera and microphone itself.
    if (x.web && x.browser) { WebBrowser.openBrowserAsync(`${BASE}/#${x.web}`, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN, controlsColor: '#3D5BF5' }); return; }
    if (x.web) openTool(x.web, t(x.name));
  };
  const u = session?.user;
  return (
    <Screen eyebrow={t('{n} tools in 5 suites', { n: count }).toUpperCase()} title={t('Everything')}
      right={<Pressable onPress={() => router.navigate('/me')} accessibilityRole="button" accessibilityLabel={t('Me')}><Avatar name={u?.name || '?'} size={42} /></Pressable>}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
        <Icon name="grid" size={18} color={C.faint} />
        <TextInput value={q} onChangeText={setQ} placeholder={t('Search tools')} placeholderTextColor={C.faint} style={{ flex: 1, color: C.ink, fontSize: 16, paddingVertical: 12 }} accessibilityLabel={t('Search tools')} autoCorrect={false} />
        {q ? <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel={t('Clear')}><Icon name="x" size={18} color={C.faint} /></Pressable> : null}
      </View>
      {groups.map((g, gi) => (
        <Rise key={g.name} delay={gi * 60} style={{ gap: 12, marginTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: g.color }} />
            <Text accessibilityRole="header" style={{ color: C.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>{t(g.name)}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
            {g.tools.map((x) => (
              <Pressable key={x.name} onPress={() => go(x)} accessibilityRole="button" accessibilityLabel={t(x.name)}
                style={({ pressed }) => ({ width: `${100 / cols}%`, alignItems: 'center', gap: 7, opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
                <View style={{ width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: C.dark ? g.soft[1] : g.soft[0] }}>
                  <Icon name={x.icon} size={25} color={g.color} />
                </View>
                <Text numberOfLines={2} style={{ color: C.ink, fontSize: 12, fontWeight: '600', textAlign: 'center', paddingHorizontal: 2 }}>{t(x.name)}</Text>
              </Pressable>
            ))}
          </View>
        </Rise>
      ))}
      {!groups.length ? <Text style={{ color: C.sub, textAlign: 'center', padding: 24 }}>{t('No tools match “{q}”.', { q })}</Text> : null}
    </Screen>
  );
}
