// Opens any oenod.com tool inside the app, already signed in: the web view shares the app's
// session cookie, so owners reach all 40+ tools without signing in a second time.
// 3.9: nothing leaves the app (Meet runs here with camera and microphone), and pages always load
// fresh from oenod.com, never an old saved copy.
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, Platform, Pressable, Text, View } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';
// The package's class typings clash with React 19's; the component itself is fine.
const WebView = RNWebView as any;
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { IOS_STORE, IOS_WEB_GUARD, SALES_ROUTE } from '../lib/store';
import { BASE } from '../lib/api';
import { lang, t } from '../lib/i18n';
import { C } from '../lib/theme';
import { Icon } from '../ui/Icon';
import { Logo } from '../ui/Logo';

/** Open an oenod.com page (hash route like "/invoices") in the in-app web view. */
// Sections rebuilt as real app screens (wave 1): any link to them, from anywhere, opens the app screen, not a web page.
const NATIVE: [RegExp, (m: RegExpMatchArray) => string][] = [
  // 4.0: the app's own tabs and screens, so a notification or card link never opens the website for them.
  [/^\/(schedule|shifts|my-schedule)$/, () => '/schedule'],
  [/^\/(timeoff|time-off|leave)$/, () => '/timeoff'],
  [/^\/(team|employees|people)$/, () => '/team'],
  [/^\/phone$/, () => '/phone'],
  [/^\/(calls|business-phone|pbx)$/, () => '/calls'],
  [/^\/(cashflow|cash-flow)$/, () => '/accounting'],
  [/^\/(my-hr|hr|my-documents)$/, () => '/docs'],
  [/^\/(pay|paystubs|my-pay)$/, () => '/pay'],
  [/^\/payroll$/, () => '/payroll'],
  [/^\/(payroll|pay-runs)\/(\d+)$/, (m) => `/payrun/${m[2]}`],
  [/^\/(payroll-runs|pay-runs|payroll\/history)$/, () => '/payrun'],
  [/^\/(timesheet|my-hours)$/, () => '/timesheet'],
  [/^\/(notifications|inbox)$/, () => '/notifications'],
  [/^\/(wallet|card)$/, () => '/wallet'],
  [/^\/(me|account)$/, () => '/me'],
  [/^\/(profile|my-profile)$/, () => '/profile-edit'],
  [/^\/(my-card|business-card|cd6)$/, () => '/card'],
  [/^\/(find-jobs|job-market|jobs-market|market\/jobs)$/, () => '/jobs'],
  [/^\/(find-jobs|market\/jobs|job)\/(\d+)$/, (m) => `/jobs/${m[2]}`],
  [/^\/(my-jobs|my-applications)$/, () => '/jobs?tab=mine'],
  [/^\/(job-alerts|job-radar)$/, () => '/jobs?tab=alerts'],
  [/^\/invoices\/new$/, () => '/invoices/new'],
  [/^\/invoices\/(\d+)$/, (m) => `/invoices/${m[1]}`],
  [/^\/(invoices|quotes)$/, () => '/invoices'],
  [/^\/customers\/(\d+)$/, (m) => `/customers/${m[1]}`],
  [/^\/customers$/, () => '/customers'],
  [/^\/expenses(\/.*)?$/, () => '/expenses'],
  [/^\/(time|timeclock|time-clock)$/, () => '/timeclock'],
  [/^\/(inventory|stock)$/, () => '/inventory'],
  [/^\/sales\/(\d+)$/, (m) => `/sales/${m[1]}`],
  [/^\/sales$/, () => '/sales'],
  [/^\/(pos|register|pos\/register)$/, () => '/register'],
  [/^\/(products|menu|items)$/, () => '/products'],
  [/^\/reports(\/.*)?$/, () => '/reports'],
  [/^\/chat\/(\d+)$/, (m) => `/chat/${m[1]}`],
  [/^\/(chat|messages)$/, () => '/chat'],
  [/^\/reviews$/, () => '/reviews'],
  [/^\/(support|help)\/(\d+)$/, (m) => `/support/${m[2]}`],
  [/^\/(support|help)$/, () => '/support'],
  [/^\/(hiring|jobs|applicants)$/, () => '/hiring'],
  [/^\/(hiring|applicants|applications)\/(\d+)$/, (m) => `/hiring/${m[2]}`],
  [/^\/onboarding$/, () => '/onboarding'],
  [/^\/(onboarding|flows)\/(\d+)$/, (m) => `/onboarding/${m[2]}`],
  [/^\/(performance|goals)$/, () => '/performance'],
  [/^\/performance\/(\d+)$/, (m) => `/performance/${m[1]}`],
  [/^\/(resume|resumes|me\/resumes)$/, () => '/resume'],
  [/^\/(resume|resumes)\/(\d+)$/, (m) => `/resume/${m[2]}`],
  [/^\/(accounting|acct|books|bills)$/, () => '/accounting'],
  [/^\/(banking|bank|bank-feed)$/, () => '/banking'],
  [/^\/(marketing|campaigns)$/, () => '/marketing'],
  [/^\/(projects|tasks)$/, () => '/projects'],
  [/^\/projects\/(\d+)$/, (m) => `/projects/${m[1]}`],
  [/^\/(academy|learn|courses|training)$/, () => '/academy'],
  [/^\/(academy|learn|courses)\/(\d+)$/, (m) => `/academy/${m[2]}`],
  [/^\/(docs|documents|esign|my-docs)$/, () => '/docs'],
  [/^\/(docs|documents)\/(\d+)$/, (m) => `/docs/${m[2]}`],
  [/^\/(storm|storm-center|closures)$/, () => '/storm'],
  [/^\/(cameras|cams|cctv)$/, () => '/cameras'],
  [/^\/(settings|company|company-settings)$/, () => '/settings'],
  [/^\/(company-security|security)$/, () => '/security'],
  [/^\/(loyalty|rewards|gift-cards)$/, () => '/loyalty'],
  [/^\/(reservations|bookings)$/, () => '/reservations'],
  [/^\/(suppliers|purchase-orders|supply)$/, () => '/suppliers'],
  [/^\/(mail|inbox)$/, () => '/mail'],
  [/^\/mail\/(\d+)$/, (m) => `/mail/${m[1]}`],
];
export const nativeFor = (path: string): string | null => {
  const p = ('/' + String(path || '').replace(/^#?\/*/, '')).split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const qs = String(path || '').split('?')[1] || '';
  const job = qs.match(/(?:^|&)job=(\d+)/);
  if (job && /^\/(find-jobs|my-jobs)$/.test(p)) return `/jobs/${job[1]}`;
  if (p === '/my-jobs' && /(?:^|&)tab=alerts/.test(qs)) return '/jobs?tab=alerts';
  for (const [re, to] of NATIVE) { const m = p.match(re); if (m) return to(m); }
  return null;
};
export const openTool = (path: string, title: string) => {
  const n = nativeFor(path);
  if (n) return router.push(n as any);
  router.push({ pathname: '/web', params: { path, title } });
};

// ap1 (oenod.com 3.8.494+): tells every OENOD page it is inside the phone app, so the page drops the website's own
// top bar, tabs, menu and rail and shows only the tool, in the app's Midnight look. Runs before the page's own code.
const APP_MODE = `(function(){try{window.OENOD_APP='${Platform.OS}';sessionStorage.setItem('ap1','1');}catch(e){}})();true;`;
const BEFORE = IOS_STORE ? APP_MODE + IOS_WEB_GUARD : APP_MODE;
// Other websites (a bank, a carrier, a map) open in a sheet over the app with a Done button: you never leave OENOD.
export const openSheet = (u: string) => WebBrowser.openBrowserAsync(u, {
  presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  controlsColor: '#FFFFFF', toolbarColor: '#000C58', secondaryToolbarColor: '#000C58',
  enableBarCollapsing: true, showTitle: true, createTask: false,
}).catch(() => {});

export default function Web() {
  const { path = '/', title = 'OENOD' } = useLocalSearchParams<{ path: string; title: string }>();
  const insets = useSafeAreaInsets();
  const ref = useRef<any>(null);
  const [canBack, setCanBack] = useState(false);
  const [busy, setBusy] = useState(true);
  const p = useRef(new Animated.Value(0)).current;
  let route = String(path).startsWith('/') ? String(path) : '/' + path;
  if (IOS_STORE && SALES_ROUTE.test(route)) route = '/';
  // A new stamp each time the screen opens, so the phone never shows a stale copy of the site.
  const stamp = useRef(String(Date.now())).current;
  const url = `${BASE}/?lang=${lang()}&app=1&look=day&v=${stamp}#${route}`;
  if (Platform.OS === 'web') { WebBrowser.openBrowserAsync(url); router.back(); return null; }
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* 4.0 Navy Daylight: a navy header that says you are still inside OENOD and signed in. */}
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#000C58', borderBottomWidth: 1, borderColor: '#04137A' }}>
        <Pressable onPress={() => (canBack ? ref.current?.goBack() : router.back())} accessibilityRole="button" accessibilityLabel={t('Back')} hitSlop={8}
          style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' })}>
          <Icon name="back" size={20} color="#FFFFFF" duo={false} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 16.5, fontWeight: '700', letterSpacing: -0.2 }}>{String(title)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <Icon name="shield" size={11} color="#3BD884" duo={false} />
            <Text numberOfLines={1} style={{ color: '#8EF0B8', fontSize: 11.5, fontWeight: '600' }}>{t('Inside OENOD · signed in')}</Text>
          </View>
        </View>
        {busy ? <ActivityIndicator color="#B9C4FF" /> : <Logo width={46} color="#FFFFFF" />}
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('Close')} hitSlop={8}
          style={{ width: 36, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={20} color="#8B90A8" duo={false} />
        </Pressable>
      </View>
      <Animated.View style={{ height: 2, backgroundColor: '#3D5BF5', transform: [{ scaleX: p }], opacity: busy ? 1 : 0, alignSelf: 'stretch' }} />
      <WebView
        ref={ref}
        source={{ uri: url }}
        injectedJavaScriptBeforeContentLoaded={BEFORE}
        injectedJavaScript={IOS_STORE ? IOS_WEB_GUARD : undefined}
        sharedCookiesEnabled
        cacheEnabled={false}
        cacheMode="LOAD_NO_CACHE"
        allowsFullscreenVideo
        javaScriptCanOpenWindowsAutomatically={false}
        thirdPartyCookiesEnabled
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        style={{ flex: 1, backgroundColor: C.bg }}
        onLoadStart={() => setBusy(true)}
        onLoadEnd={() => setBusy(false)}
        onLoadProgress={(e: any) => p.setValue(e.nativeEvent.progress)}
        onNavigationStateChange={(s: any) => setCanBack(s.canGoBack)}
        onShouldStartLoadWithRequest={(r: any) => {
          // Stay inside OENOD; send other sites (and mail/phone links) to the phone's own apps.
          if (r.url.startsWith(BASE) || r.url.startsWith('about:') || r.url.startsWith('blob:') || r.url.startsWith('data:')) return true;
          if (IOS_STORE && /^https:\/\/(www\.)?oenod\.com\/(pricing|plans|signup|start|checkout)/i.test(r.url)) return false;
          // Links back to the website's own sign-in never leave the app either.
          if (/^https:\/\/(www\.)?oenod\.com/.test(r.url)) return true;
          if (/^https?:/.test(r.url)) { openSheet(r.url); return false; }
          Linking.openURL(r.url).catch(() => {});
          return false;
        }}
      />
    </View>
  );
}
