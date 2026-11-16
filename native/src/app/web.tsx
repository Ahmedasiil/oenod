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
export const openTool = (path: string, title: string) => router.push({ pathname: '/web', params: { path, title } });

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
  const url = `${BASE}/?lang=${lang()}&app=1&v=${stamp}#${route}`;
  if (Platform.OS === 'web') { WebBrowser.openBrowserAsync(url); router.back(); return null; }
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* 3.9.1 Navy Glass Pro: a black header that says you are still inside OENOD and signed in. */}
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#05060D', borderBottomWidth: 1, borderColor: '#1A1D2B' }}>
        <Pressable onPress={() => (canBack ? ref.current?.goBack() : router.back())} accessibilityRole="button" accessibilityLabel={t('Back')} hitSlop={8}
          style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#1A1D2B' : '#0D0F18', borderWidth: 1, borderColor: '#1F2233' })}>
          <Icon name="back" size={20} color="#FFFFFF" duo={false} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 16.5, fontWeight: '700', letterSpacing: -0.2 }}>{String(title)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <Icon name="shield" size={11} color="#3BD884" duo={false} />
            <Text numberOfLines={1} style={{ color: '#3BD884', fontSize: 11.5, fontWeight: '600' }}>{t('Inside OENOD · signed in')}</Text>
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
        injectedJavaScriptBeforeContentLoaded={IOS_STORE ? IOS_WEB_GUARD : undefined}
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
          if (/^https?:/.test(r.url)) { WebBrowser.openBrowserAsync(r.url); return false; }
          Linking.openURL(r.url).catch(() => {});
          return false;
        }}
      />
    </View>
  );
}
