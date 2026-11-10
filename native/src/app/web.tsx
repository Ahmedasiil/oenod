// Opens any oenod.com tool inside the app, already signed in: the web view shares the app's
// session cookie, so owners reach all 40+ tools without signing in a second time.
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, Platform, Pressable, Text, View } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';
// The package's class typings clash with React 19's; the component itself is fine.
const WebView = RNWebView as any;
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { BASE } from '../lib/api';
import { lang, t } from '../lib/i18n';
import { C } from '../lib/theme';
import { Icon } from '../ui/Icon';

/** Open an oenod.com page (hash route like "/invoices") in the in-app web view. */
export const openTool = (path: string, title: string) => router.push({ pathname: '/web', params: { path, title } });

export default function Web() {
  const { path = '/', title = 'OENOD' } = useLocalSearchParams<{ path: string; title: string }>();
  const insets = useSafeAreaInsets();
  const ref = useRef<any>(null);
  const [canBack, setCanBack] = useState(false);
  const [busy, setBusy] = useState(true);
  const p = useRef(new Animated.Value(0)).current;
  const route = String(path).startsWith('/') ? String(path) : '/' + path;
  const url = `${BASE}/?lang=${lang()}&app=1#${route}`;
  if (Platform.OS === 'web') { WebBrowser.openBrowserAsync(url); router.back(); return null; }
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderBottomWidth: 1, borderColor: C.line }}>
        <Pressable onPress={() => (canBack ? ref.current?.goBack() : router.back())} accessibilityRole="button" accessibilityLabel={t('Back')} hitSlop={8}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
          <Icon name="back" size={20} color={C.ink} />
        </Pressable>
        <Text numberOfLines={1} style={{ flex: 1, color: C.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>{String(title)}</Text>
        {busy ? <ActivityIndicator color={C.link} /> : null}
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('Close')} hitSlop={8}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={20} color={C.sub} />
        </Pressable>
      </View>
      <Animated.View style={{ height: 2, backgroundColor: '#2A3BC4', transform: [{ scaleX: p }], opacity: busy ? 1 : 0, alignSelf: 'stretch' }} />
      <WebView
        ref={ref}
        source={{ uri: url }}
        sharedCookiesEnabled
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
          if (/^https?:/.test(r.url)) { WebBrowser.openBrowserAsync(r.url); return false; }
          Linking.openURL(r.url).catch(() => {});
          return false;
        }}
      />
    </View>
  );
}
