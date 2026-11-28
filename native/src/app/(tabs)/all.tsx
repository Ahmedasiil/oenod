// All tools (Midnight v6, approved 11-16): search, favourites on a navy card, then every tool in rows of three
// with glossy 3-D icons, grouped People, Money, Talk, Ava/mail/learning and Operations. Every tool opens inside
// the app with the same sign-in. Tools the company hasn't switched on show "Turn on" to owners and admins only.
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useAuth } from '../../lib/auth';
import { t } from '../../lib/i18n';
import { Icon, type IconName } from '../../ui/Icon';
import { V } from '../../ui/M6';
import { PageBody, PageTop } from '../../ui/PageTop';
import { Pressy } from '../../ui/Motion';
import { card, H, Ph, TileIcon, type Tone } from '../../ui/H';
import type { PhName } from '../../ui/phPaths';
import { PoweredBy } from '../../ui/Brand';
import { openTool } from '../web';
import { post } from '../../lib/api';
import { oops, sure } from '../../ui/T1';
import { IOS_STORE } from '../../lib/store';

type Who = 'all' | 'staff' | 'mgr' | 'team';
type Tool = { name: string; icon: IconName; hint: string; app?: string; web?: string; who: Who; mod?: string; admin?: boolean; ph?: PhName };
type Group = { name: string; tools: Tool[] };

const GROUPS: Group[] = [
  // 4.7: the departments added on oenod.com in November 2026, opened inside the app (one sign-in).
  { name: 'New on OENOD', tools: [
    { name: 'Markets', icon: 'chart', ph: 'trend-up', hint: 'Live stocks', web: '/markets', who: 'mgr' },
    { name: 'Bookkeeping', icon: 'chart', ph: 'receipt', hint: 'Books done for you', web: '/bookkeeping', who: 'mgr', admin: true },
    { name: 'Profit Pulse', icon: 'chart', ph: 'chart-line-up', hint: 'Live profit', web: '/pulse', who: 'mgr' },
    { name: 'Online booking', icon: 'calendar', ph: 'calendar-dots', hint: 'Customers book', web: '/booking', who: 'mgr' },
    { name: 'Customer messages', icon: 'chat', ph: 'chat-text', hint: 'Ava follows up', web: '/customer-messages', who: 'mgr' },
    { name: 'Marketing Autopilot', icon: 'send', ph: 'megaphone', hint: 'Ava plans it', web: '/marketing-autopilot', who: 'mgr' },
    { name: 'Warehouse', icon: 'box', ph: 'package', hint: 'Bins & trucks', web: '/warehouse', who: 'mgr' },
    { name: 'AI Team', icon: 'spark', ph: 'sparkle', hint: 'Agents per department', web: '/ai-team', who: 'mgr', admin: true },
    { name: 'App Marketplace', icon: 'grid', ph: 'squares-four', hint: 'Connect apps', web: '/marketplace', who: 'mgr', admin: true },
    { name: 'OENOD Nearby', icon: 'pin', ph: 'map-pin', hint: 'Show on the map', web: '/nearby', who: 'mgr' },
    { name: 'Tax & loans', icon: 'cash', ph: 'bank', hint: 'Corporate tax', web: '/acct-tools', who: 'mgr', admin: true },
  ] },
  { name: 'People', tools: [
    { name: 'Schedule', icon: 'calendar', hint: 'Shifts', app: '/schedule', who: 'team' },
    { name: 'Time clock', icon: 'clock', hint: "Who's in", app: '/timeclock', who: 'mgr' },
    { name: 'Team', icon: 'users', hint: 'Everyone', app: '/team', who: 'mgr' },
    { name: 'Time off', icon: 'sun', hint: 'Requests', app: '/timeoff', who: 'team' },
    { name: 'My hours', icon: 'clock', hint: 'Timesheet', app: '/timesheet', who: 'staff' },
    { name: 'My availability', icon: 'check', hint: 'When you can work', app: '/availability', who: 'staff' },
    { name: 'Kiosk', icon: 'device', hint: 'Staff clock in', app: '/kiosk', who: 'mgr' },
    { name: 'Hiring', icon: 'briefcase', hint: 'Jobs', app: '/hiring', who: 'mgr', mod: 'hiring' },
    { name: 'Paperwork', icon: 'doc', ph: 'file-text', hint: 'Forms & policies', web: '/paperwork', who: 'mgr' },
    { name: 'Onboarding', icon: 'check', hint: 'New people', app: '/onboarding', who: 'mgr', mod: 'onboarding' },
    { name: 'Performance', icon: 'chart', hint: 'Goals', app: '/performance', who: 'mgr', mod: 'performance' },
    { name: 'Forms & surveys', icon: 'doc', ph: 'check-square', hint: 'Ask your team', web: '/forms', who: 'mgr' },
    { name: 'Benefits & perks', icon: 'heart', ph: 'star', hint: 'For your team', web: '/perks', who: 'mgr' },
  ] },
  { name: 'Money', tools: [
    { name: 'Payroll', icon: 'cash', hint: 'Pay your team', app: '/payrun', who: 'mgr', mod: 'payroll' },
    { name: 'My pay', icon: 'cash', hint: 'Pay stubs', app: '/pay', who: 'staff', mod: 'payroll' },
    { name: 'Invoices', icon: 'doc', hint: 'Get paid', app: '/invoices', who: 'mgr' },
    { name: 'Sales & POS', icon: 'cart', hint: 'Register', app: '/sales', who: 'mgr' },
    { name: 'Wallet', icon: 'wallet', hint: 'Balance', app: '/wallet', who: 'all' },
    { name: 'Accounting', icon: 'chart', hint: 'Books', app: '/accounting', who: 'mgr', mod: 'accounting', admin: true },
    { name: 'Expenses', icon: 'briefcase', hint: 'Receipts', app: '/expenses', who: 'mgr', mod: 'expenses' },
    { name: 'Banking', icon: 'shield', hint: 'Accounts', app: '/banking', who: 'mgr', mod: 'accounting', admin: true },
    { name: 'Profit & labor', icon: 'chart', ph: 'trend-up', hint: 'Profit health', web: '/profit', who: 'mgr' },
    { name: 'Business value', icon: 'chart', ph: 'chart-bar', hint: 'Valuation Pro', web: '/value-report', who: 'mgr', admin: true },
    { name: 'Snap receipts', icon: 'scan', ph: 'scan', hint: 'Photo a receipt', web: '/receipts', who: 'mgr' },
  ] },
  { name: 'Talk', tools: [
    { name: 'Meet', icon: 'video', hint: 'Video meetings', app: '/meet', who: 'team', mod: 'meet' },
    { name: 'Business Phone', icon: 'phone', hint: 'Company line', app: '/phone', who: 'mgr' },
    { name: 'Team chat', icon: 'chat', hint: 'Messages', app: '/chat', who: 'team', mod: 'chat' },
    { name: 'Team news', icon: 'news', hint: 'Feed', app: '/feed', who: 'team', mod: 'feed' },
    { name: 'Customers', icon: 'heart', hint: 'People who buy', app: '/customers', who: 'mgr' },
    { name: 'Reviews', icon: 'spark', hint: 'Stars', app: '/reviews', who: 'mgr' },
    { name: 'Marketing', icon: 'send', hint: 'Campaigns', app: '/marketing', who: 'mgr', mod: 'marketing' },
    { name: 'Social AI', icon: 'spark', ph: 'share-network', hint: 'Posts for you', web: '/social', who: 'mgr' },
    { name: 'AI website', icon: 'globe', ph: 'globe', hint: 'Your site', web: '/my-website', who: 'mgr' },
    { name: 'Website orders', icon: 'cart', ph: 'package', hint: 'Online orders', web: '/web-orders', who: 'mgr' },
  ] },
  { name: 'Ava, mail & learning', tools: [
    { name: 'Ava AI', icon: 'spark', hint: 'Ask', app: '/ai', who: 'all' },
    { name: 'Mail', icon: 'mail', hint: 'Inbox', app: '/mail', who: 'mgr' },
    { name: 'Academy', icon: 'cap', hint: 'Courses', app: '/academy', who: 'team', mod: 'academy' },
    { name: 'Docs', icon: 'doc', hint: 'Sign and share', app: '/docs', who: 'mgr', mod: 'docs' },
    { name: 'Command wall', icon: 'device', ph: 'monitor', hint: 'Everything live', web: '/wall', who: 'mgr' },
    { name: 'Morning briefing', icon: 'sun', ph: 'sun-horizon', hint: 'Your day', web: '/briefing', who: 'mgr' },
  ] },
  { name: 'Career', tools: [
    { name: 'Business card', icon: 'qr', hint: 'Share with anyone', app: '/card', who: 'all' },
    { name: 'Résumé', icon: 'doc', hint: 'Ava writes it', app: '/resume', who: 'all' },
    { name: 'Find a job', icon: 'briefcase', hint: 'Jobs near you', app: '/jobs', who: 'all' },
  ] },
  { name: 'Operations', tools: [
    { name: 'Inventory', icon: 'box', hint: 'Stock', app: '/inventory', who: 'mgr' },
    { name: 'OENOD Scan', icon: 'scan', ph: 'scan', hint: 'Scan to PDF', web: '/scan', who: 'team' },
    { name: 'Storm Center', icon: 'cloud', hint: 'Weather', app: '/storm', who: 'mgr' },
    { name: 'Products', icon: 'grid', hint: 'Menu & items', app: '/products', who: 'mgr' },
    { name: 'Suppliers', icon: 'send', hint: 'Orders', app: '/suppliers', who: 'mgr', mod: 'suppliers' },
    { name: 'Reservations', icon: 'calendar', hint: 'Bookings', app: '/reservations', who: 'mgr', mod: 'reservations' },
    { name: 'Loyalty', icon: 'heart', hint: 'Rewards', app: '/loyalty', who: 'mgr', mod: 'loyalty' },
    { name: 'Projects', icon: 'check', hint: 'Tasks', app: '/projects', who: 'mgr', mod: 'projects' },
    { name: 'Cameras', icon: 'video', hint: 'Live view', app: '/cameras', who: 'mgr' },
    { name: 'Cars', icon: 'pin', ph: 'map-pin', hint: 'GPS & car controls', app: '/cars', who: 'mgr' },
    { name: 'Live map', icon: 'pin', ph: 'map-pin', hint: 'Who is where', web: '/live-map', who: 'mgr' },
    { name: 'Checklists', icon: 'check', ph: 'check-square', hint: 'Open & close', web: '/checklists', who: 'mgr' },
    { name: 'Maintenance', icon: 'box', ph: 'sliders-horizontal', hint: 'Assets & repairs', web: '/assets', who: 'mgr' },
    { name: 'CRM pipeline', icon: 'users', ph: 'kanban', hint: 'Deals', web: '/crm', who: 'mgr' },
    { name: 'Safety', icon: 'shield', ph: 'warning', hint: 'Incidents', web: '/safety', who: 'mgr' },
    { name: 'Visitors', icon: 'user', ph: 'door-open', hint: 'Sign-in', web: '/visitors', who: 'mgr' },
    { name: 'Smart pricing', icon: 'chart', ph: 'trend-up', hint: 'Better prices', web: '/smart-pricing', who: 'mgr' },
    { name: 'Locations', icon: 'pin', ph: 'buildings', hint: 'Shops & brands', web: '/locations', who: 'mgr' },
    { name: 'Reports', icon: 'chart', hint: 'Numbers', app: '/reports', who: 'mgr' },
  ] },
  { name: 'You & settings', tools: [
    { name: 'My profile', icon: 'user', hint: 'Card & badge', app: '/me', who: 'all' },
    { name: 'Notifications', icon: 'bell', hint: 'Alerts', app: '/notifications', who: 'all' },
    { name: 'Join a meeting', icon: 'link', hint: 'With a code', app: '/guest', who: 'all' },
    { name: 'Connect a watch', icon: 'clock', hint: 'Apple Watch', app: '/watch', who: 'all' },
    { name: 'Settings', icon: 'globe', hint: 'Company', app: '/settings', who: 'mgr', admin: true },
    { name: 'Security', icon: 'shield', hint: 'Sign-in', app: '/security', who: 'mgr', admin: true },
    { name: 'Help', icon: 'chat', hint: 'Support', app: '/support', who: 'all' },
  ] },
];
// 4.0: the same soft two-tone tiles as Home, coloured by meaning (People navy, Money sky blue, the rest grey).
const GTONE: Record<string, Tone> = { 'New on OENOD': 'blue', 'People': 'navy', 'Money': 'blue', 'Talk': 'navy', 'Ava, mail & learning': 'navy', 'Operations': 'ink', 'You & settings': 'ink' };
const PHI: Partial<Record<IconName, PhName>> = { calendar: 'calendar-dots', clock: 'clock', users: 'users-three', sun: 'sun-horizon', check: 'seal-check', device: 'monitor', briefcase: 'briefcase',
  chart: 'chart-line-up', cash: 'money', doc: 'receipt', cart: 'package', wallet: 'wallet', shield: 'shield-check', video: 'video-camera', phone: 'phone', chat: 'chat-circle-dots', news: 'megaphone',
  heart: 'star', spark: 'sparkle', send: 'megaphone', mail: 'envelope-simple', cap: 'graduation-cap', box: 'package', cloud: 'warning', grid: 'squares-four', user: 'user', bell: 'bell', link: 'arrow-up-right', globe: 'gear-six' };

export default function AllTools() {
  const { session, isManager, reload } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [q, setQ] = useState('');
  const staff = !!session?.employee;
  const role = String(session?.user?.role || '');
  const admin = role === 'owner' || role === 'admin';
  const off = session?.company?.modules_off || [];
  const ok = (x: Tool) => (x.who === 'all' || (x.who === 'mgr' && isManager) || (x.who === 'staff' && staff) || (x.who === 'team' && (staff || isManager))) && (!x.admin || admin);
  const isOff = (x: Tool) => !!x.mod && off.includes(x.mod);
  // Off tools: owners and admins see "Turn on"; everyone else simply doesn't see them.
  const shown = (x: Tool) => ok(x) && (!isOff(x) || (admin && !IOS_STORE));
  const s = q.trim().toLowerCase();
  const groups = useMemo(() => GROUPS.map((g) => ({ ...g, tools: g.tools.filter((x) => shown(x) && (!s || t(x.name).toLowerCase().includes(s) || t(x.hint).toLowerCase().includes(s))) })).filter((g) => g.tools.length),
    [s, isManager, staff, admin, off.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (x: Tool) => {
    if (isOff(x)) {
      sure(t('Turn on {n}?', { n: t(x.name) }), t('It shows up for your team right away.'), t('Turn on'), async () => {
        try {
          const r = await post<{ modules: { code: string; on: boolean }[] }>('/api/modules', { off: off.filter((m: string) => m !== x.mod) });
          await reload();
          if (r.modules?.find((m) => m.code === x.mod)?.on) { if (x.app) router.navigate(x.app as any); return; }
          sure(t('Not in your plan yet'), t('The OENOD team can add {n} for you.', { n: t(x.name) }), t('Ask the OENOD team'), () => router.push('/support' as any));
        } catch (e) { oops(e); }
      });
      return;
    }
    if (x.app) { router.navigate(x.app as any); return; }
    if (x.web) openTool(x.web, t(x.name));
  };
  const all = GROUPS.flatMap((g) => g.tools);
  const favs = (isManager ? ['Schedule', 'Payroll', 'Meet', 'Ava AI'] : ['Schedule', 'My pay', 'Meet', 'Ava AI']).map((n) => all.find((x) => x.name === n)!).filter((x) => x && shown(x));
  const cols = width >= 900 ? 6 : width >= 600 ? 4 : 3;
  const maxW = 760;
  const tileW = (Math.min(width, maxW) - 32 - (cols - 1) * 8) / cols;
  const cols4 = width >= 900 ? 6 : 4;
  const cellW = `${100 / cols4}%` as const;
  return (
    <View style={{ flex: 1, backgroundColor: V.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}>
        <PageTop title={t('Everything')} sub={t('Every part of OENOD, right inside the app. One sign-in.')} back={() => router.navigate('/')} search={false} />
        <PageBody lift>
          <View style={[card, { padding: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: H.line, paddingHorizontal: 14 }}>
              <Ph name="magnifying-glass" size={18} color={H.muted} duo={0} />
              <TextInput value={q} onChangeText={setQ} placeholder={t('Search tools, people, invoices')} placeholderTextColor={H.muted} autoCorrect={false} accessibilityLabel={t('Search tools')}
                style={{ flex: 1, minWidth: 0, color: H.ink, fontSize: 15, paddingVertical: 10 }} />
              {q ? <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel={t('Clear')}><Icon name="x" size={18} color={H.muted} duo={false} /></Pressable> : null}
            </View>
          </View>
          {groups.map((g) => (
            <View key={g.name} style={{ gap: 10 }}>
              <Text style={{ color: H.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginLeft: 4 }} accessibilityRole="header">{t(g.name).toUpperCase()}</Text>
              <View style={[card, { paddingVertical: 14, paddingHorizontal: 4, flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }]}>
                {g.tools.map((x) => {
                  const offNow = isOff(x);
                  return (
                    <View key={x.name} style={{ width: cellW, alignItems: 'center' }}>
                      <Pressy onPress={() => go(x)} accessibilityRole="button" accessibilityLabel={offNow ? `${t(x.name)}, ${t('Turn on')}` : t(x.name)} style={{ alignItems: 'center', gap: 6, paddingHorizontal: 2 }}>
                        <View style={{ opacity: offNow ? 0.55 : 1 }}><TileIcon icon={x.ph || PHI[x.icon] || 'squares-four'} tone={GTONE[g.name] || 'navy'} size={54} /></View>
                        <Text style={{ color: H.ink, fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 15 }} numberOfLines={2}>{t(x.name)}</Text>
                        {offNow ? <Text style={{ color: H.blue, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>{t('Turn on')}</Text> : null}
                      </Pressy>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
          {!groups.length ? <Text style={{ color: V.mute, textAlign: 'center', padding: 24 }}>{t('No tools match “{q}”.', { q })}</Text> : null}
          <PoweredBy />
        </PageBody>
      </ScrollView>
    </View>
  );
}

/** Favourites card background: 160deg #1A2FCF → #000C58 with a thin top highlight. */
function FavBg() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 10 10" preserveAspectRatio="none">
      <Defs><LinearGradient id="fav" x1="0.2" y1="0" x2="0.8" y2="1"><Stop offset="0" stopColor="#1A2FCF" /><Stop offset="1" stopColor="#000C58" /></LinearGradient></Defs>
      <Rect width={10} height={10} fill="url(#fav)" />
    </Svg>
  );
}
