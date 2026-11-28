// 4.7: the live stock market line, the same one as the oenod.com dashboard (stk1). A navy pill with a LIVE chip,
// TradingView's moving ticker in the middle (prices come from TradingView, who hold the exchange licences; their
// attribution stays on the Markets page) and a "by OENOD" button that opens the full Markets page.
// Height is fixed (44) so nothing on the home screen moves when it loads. Turned off with Me > Stock market line,
// or for everyone when oenod.com's Markets is switched off (the server answers 404 and the line hides).
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';
import Svg, { Defs, LinearGradient, Rect, Stop, Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import { get } from '../lib/api';
import { secure } from '../lib/secure';
import { t } from '../lib/i18n';
import { Logo } from './Logo';
import { openTool } from '../app/web';

const WebView = RNWebView as any;
const KEY = 'oenod.mkt1.tape';
const NAVY = '#000C58';
const TAPE: [string, string][] = [['TSX:TSX', 'S&P/TSX'], ['FOREXCOM:SPXUSD', 'S&P 500'], ['FOREXCOM:NSXUSD', 'Nasdaq 100'], ['FOREXCOM:DJI', 'Dow 30'], ['FX_IDC:CADUSD', 'CAD/USD'],
  ['TVC:USOIL', 'Oil (WTI)'], ['TVC:GOLD', 'Gold'], ['TSX:SHOP', 'Shopify'], ['TSX:RY', 'RBC'], ['TSX:TD', 'TD'], ['TSX:ENB', 'Enbridge'], ['NASDAQ:NVDA', 'NVIDIA'], ['NASDAQ:AAPL', 'Apple'], ['BITSTAMP:BTCUSD', 'Bitcoin']];
export const TAPE_URL = 'https://www.tradingview-widget.com/embed-widget/ticker-tape/?locale=en#' + encodeURIComponent(JSON.stringify({
  symbols: TAPE.map(([proName, title]) => ({ proName, title })), showSymbolLogo: true, colorTheme: 'dark', isTransparent: true, displayMode: 'regular', width: '100%',
}));

// Shared on/off so the Me switch updates the home screen at once.
let on: boolean | null = null; const subs = new Set<(v: boolean) => void>();
export async function marketLineOn(): Promise<boolean> { if (on === null) on = (await secure.get(KEY).catch(() => null)) !== '0'; return on; }
export async function setMarketLineOn(v: boolean) { on = v; subs.forEach((f) => f(v)); await secure.set(KEY, v ? '1' : '0').catch(() => {}); }
function useOn() {
  const [v, setV] = useState<boolean | null>(on);
  useEffect(() => { marketLineOn().then(setV); subs.add(setV); return () => { subs.delete(setV); }; }, []);
  return v;
}

let serverOff: boolean | null = null;

function Fade({ side }: { side: 'l' | 'r' }) {
  const id = 'mkt1f' + side;
  return (
    <Svg width={22} height={44} style={{ position: 'absolute', top: 0, [side === 'l' ? 'left' : 'right']: 0 } as any} pointerEvents="none">
      <Defs><LinearGradient id={id} x1={side === 'l' ? 0 : 1} y1={0} x2={side === 'l' ? 1 : 0} y2={0}><Stop offset={0} stopColor="#06155F" stopOpacity={1} /><Stop offset={1} stopColor="#06155F" stopOpacity={0} /></LinearGradient></Defs>
      <Rect x={0} y={0} width={22} height={44} fill={`url(#${id})`} />
    </Svg>
  );
}

function Dot() {
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 0.35, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true })]));
    l.start(); return () => l.stop();
  }, [a]);
  return <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#2BD67B', opacity: a }} />;
}

export function MarketLine() {
  const v = useOn();
  const [off, setOff] = useState<boolean>(!!serverOff);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (serverOff !== null || Platform.OS === 'web') return;
    get('/api/markets/watchlist').then(() => { serverOff = false; }).catch((e: any) => { if (e?.status === 404 || e?.status === 403) { serverOff = true; setOff(true); } });
  }, []);
  if (!v || off) return null;
  return (
    <View style={{ height: 44, borderRadius: 14, overflow: 'hidden', backgroundColor: NAVY, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', flexDirection: 'row', alignItems: 'center' }}
      accessibilityRole="summary" accessibilityLabel={t('Live market line')}>
      <Svg width="100%" height={44} style={{ position: 'absolute' }} pointerEvents="none">
        <Defs><LinearGradient id="mkt1bg" x1={0} y1={0} x2={1} y2={0}><Stop offset={0} stopColor="#000C58" /><Stop offset={0.55} stopColor="#0B1C86" /><Stop offset={1} stopColor="#000C58" /></LinearGradient></Defs>
        <Rect x={0} y={0} width="100%" height={44} fill="url(#mkt1bg)" />
      </Svg>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 22, marginLeft: 8, marginRight: 4, paddingHorizontal: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.09)' }}>
        <Dot />
        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }}>{t('LIVE')}</Text>
      </View>
      <View style={{ flex: 1, height: 44, overflow: 'hidden' }}>
        {Platform.OS === 'web' ? null : (
          <WebView
            source={{ uri: TAPE_URL }}
            style={{ height: 58, marginTop: -1, backgroundColor: 'transparent', opacity: ready ? 1 : 0 }}
            containerStyle={{ backgroundColor: 'transparent' }}
            onLoadEnd={() => setTimeout(() => setReady(true), 400)}
            scrollEnabled={false} bounces={false} overScrollMode="never" showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}
            javaScriptEnabled domStorageEnabled={false} cacheEnabled incognito={false} setSupportMultipleWindows={false}
            originWhitelist={['https://*']}
            onShouldStartLoadWithRequest={(r: any) => {
              if (r.url.startsWith('https://www.tradingview-widget.com/') || r.url === 'about:blank' || r.isTopFrame === false) return true;
              WebBrowser.openBrowserAsync(r.url).catch(() => {}); // a tapped price opens TradingView's page in the in-app browser
              return false;
            }}
            accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          />
        )}
        <Fade side="l" /><Fade side="r" />
      </View>
      <Pressable onPress={() => openTool('/markets', t('Markets'))} accessibilityRole="button" accessibilityLabel={t('Open Markets by OENOD')} hitSlop={6}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, marginLeft: 4, marginRight: 7, paddingLeft: 10, paddingRight: 6, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: pressed ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)' })}>
        <Logo width={42} color="#FFFFFF" plain />
        <Svg width={13} height={13} viewBox="0 0 24 24"><Path d="M9 6l6 6-6 6" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </Pressable>
    </View>
  );
}
