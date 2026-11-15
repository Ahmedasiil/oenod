// First screen for anyone signed out. 3.9.1 "Navy Glass Pro": deep navy night with the turning OENOD
// rings, points of light gather into the logo, two live glass cards float beside it (a shift timer and
// today's sales), a strip of everything inside the app glides by, then Sign in, Create account and
// Join a meeting. Language at the top right. Everything stays still when the phone asks for less motion.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Icon } from '../ui/Icon';
import { LogoBurst } from '../ui/LogoBurst';
import { MapleLeaf } from '../ui/Brand';
import { Bands } from '../ui/Bands';
import { LANGS, t, useLang } from '../lib/i18n';
import { secure } from '../lib/secure';

export const SEEN = 'oenod.welcomed';
const native = Platform.OS !== 'web';

/** The night sky: deep navy, a royal glow rising from the bottom. */
function Night({ width, height }: { width: number; height: number }) {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={width} height={height}>
      <Defs>
        <LinearGradient id="wn" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#00041E" /><Stop offset="0.55" stopColor="#000A44" /><Stop offset="1" stopColor="#000C58" />
        </LinearGradient>
        <RadialGradient id="wb" cx="50%" cy="100%" rx="70%" ry="45%">
          <Stop offset="0" stopColor="#0E1A7A" stopOpacity={1} /><Stop offset="1" stopColor="#0E1A7A" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill="url(#wn)" />
      <Rect width={width} height={height} fill="url(#wb)" />
    </Svg>
  );
}

/** Three soft lights drifting slowly along the bottom (aurora). */
function Aurora({ width, still }: { width: number; still: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const l = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(a, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    l.start(); return () => l.stop();
  }, [a, still]);
  const blob = (color: string, w: number, h: number, left: number, bottom: number, dx: number, dy: number, o: number, id: string) => (
    <Animated.View key={id} pointerEvents="none" style={{ position: 'absolute', left, bottom, width: w, height: h, opacity: o,
      transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) }, { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) }] }}>
      <Svg width={w} height={h}>
        <Defs><RadialGradient id={id} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor={color} stopOpacity={0.55} /><Stop offset="1" stopColor={color} stopOpacity={0} /></RadialGradient></Defs>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, overflow: 'hidden' }}>
      {blob('#2A3BC4', width * 1.1, 260, -width * 0.35, -90, width * 0.18, -10, 0.9, 'au1')}
      {blob('#0B1C86', width * 0.9, 220, width * 0.35, -110, -width * 0.16, 8, 0.55, 'au2')}
      {blob('#1B6FD8', width * 0.8, 200, width * 0.05, -140, width * 0.1, -14, 0.5, 'au3')}
    </View>
  );
}

/** Blur-rise in: fades, lifts and sharpens in after the logo lands. */
function Rise({ children, delay, still }: { children: React.ReactNode; delay: number; still: boolean }) {
  const v = useRef(new Animated.Value(still ? 1 : 0)).current;
  useEffect(() => {
    if (still) { v.setValue(1); return; }
    Animated.timing(v, { toValue: 1, duration: 700, delay, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [v, delay, still]);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>{children}</Animated.View>;
}

/** A small glass card that bobs gently: shows what the app does, live, before anyone signs in. */
function Float({ children, delay, dy, still, style }: { children: React.ReactNode; delay: number; dy: number; still: boolean; style?: any }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const l = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 2600, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    l.start(); return () => l.stop();
  }, [v, still, delay]);
  return (
    <Animated.View style={[{ borderRadius: 18, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'rgba(13,15,24,0.78)', borderWidth: 1, borderColor: 'rgba(185,196,255,0.2)',
      shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
      transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

function Dot() {
  return <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#12C163' }} />;
}

/** "On shift" timer that really ticks, and a sales card with a tiny bar chart. */
function LiveCards({ still, width }: { still: boolean; width: number }) {
  const [sec, setSec] = useState(4 * 3600 + 12 * 60 + 33);
  useEffect(() => { if (still) return; const i = setInterval(() => setSec((x) => x + 1), 1000); return () => clearInterval(i); }, [still]);
  const p2 = (n: number) => String(n).padStart(2, '0');
  const clock = `${p2(Math.floor(sec / 3600))}:${p2(Math.floor(sec / 60) % 60)}:${p2(sec % 60)}`;
  const w = Math.min(158, (width - 64) / 2);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Float delay={0} dy={-6} still={still} style={{ width: w }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Dot /><Text style={{ color: '#8B90A8', fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2 }}>{t('ON SHIFT')}</Text></View>
        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginTop: 4, fontVariant: ['tabular-nums'] }}>{clock}</Text>
        <Text style={{ color: '#8B90A8', fontSize: 11 }} numberOfLines={1}>{t('Front counter')}</Text>
      </Float>
      <Float delay={900} dy={6} still={still} style={{ width: w, marginTop: 18 }}>
        <Text style={{ color: '#8B90A8', fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2 }}>{t('SALES TODAY')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 4 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>$4,820</Text>
          <Text style={{ color: '#3BD884', fontSize: 11, fontWeight: '700', marginBottom: 3 }}>+13%</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 16, marginTop: 4 }}>
          {[5, 8, 6, 10, 9, 13, 16].map((h, i) => <View key={i} style={{ flex: 1, height: h, borderRadius: 2, backgroundColor: i === 6 ? '#FFFFFF' : 'rgba(185,196,255,0.35)' }} />)}
        </View>
      </Float>
    </View>
  );
}

const FEATURES = ['Schedules', 'Time clock', 'Payroll', 'OENOD Meet', 'Business Phone', 'Kiosk', 'Invoices', 'Ava AI', 'Inventory', 'Point of sale', 'Hiring', 'Training'];

/** A strip of everything inside the app, gliding slowly sideways. */
function Marquee({ still, width }: { still: boolean; width: number }) {
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still || !w) return;
    x.setValue(0);
    const l = Animated.loop(Animated.timing(x, { toValue: -w, duration: w * 28, easing: Easing.linear, useNativeDriver: native }));
    l.start(); return () => l.stop();
  }, [w, still, x]);
  const chip = (f: string, k: string) => (
    <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 999, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(185,196,255,0.18)' }}>
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#B9C4FF' }} />
      <Text style={{ color: '#DDE3FF', fontSize: 12.5, fontWeight: '600' }}>{t(f)}</Text>
    </View>
  );
  return (
    <View style={{ width, overflow: 'hidden' }} accessibilityLabel={FEATURES.map((f) => t(f)).join(', ')}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
        <View style={{ flexDirection: 'row' }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>{FEATURES.map((f) => chip(f, 'a' + f))}</View>
        <View style={{ flexDirection: 'row' }}>{FEATURES.map((f) => chip(f, 'b' + f))}</View>
      </Animated.View>
    </View>
  );
}

function LangPick() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const name = LANGS.find((x) => x.code === lang)?.name || 'English';
  return (
    <View style={{ alignItems: 'flex-end', zIndex: 10 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={t('Language')} hitSlop={10}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 4 }}>
        <Icon name="globe" size={15} color="rgba(221,227,255,0.75)" duo={false} />
        <Text style={{ color: 'rgba(221,227,255,0.8)', fontSize: 13, fontWeight: '500' }}>{name}</Text>
      </Pressable>
      {open ? (
        <View style={{ position: 'absolute', top: 36, right: 0, minWidth: 170, borderRadius: 16, paddingVertical: 6, backgroundColor: 'rgba(6,12,52,0.97)', borderWidth: 1, borderColor: 'rgba(185,196,255,0.22)' }}>
          {LANGS.map((x) => (
            <Pressable key={x.code} onPress={() => { setOpen(false); setLang(x.code).catch(() => {}); }} accessibilityRole="button"
              style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent', flexDirection: 'row', justifyContent: 'space-between', gap: 12 })}>
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: x.code === lang ? '700' : '500' }}>{x.name}</Text>
              {x.code === lang ? <Icon name="check" size={16} color="#B9C4FF" duo={false} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [still, setStill] = useState(false);
  useEffect(() => { secure.set(SEEN, '1').catch(() => {}); }, []);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then((r) => setStill(!!r)).catch(() => {}); }, []);
  const side = Math.max(24, (width - 520) / 2);
  const stage = Math.min(300, Math.max(220, height * 0.34));
  const d = still ? 0 : 2300;

  return (
    <View style={{ flex: 1, backgroundColor: '#00041E' }}>
      <Night width={width} height={height} />
      <Aurora width={width} still={still} />
      <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 14, paddingHorizontal: side }}>
        <LangPick />
        <View style={{ marginHorizontal: -side, alignItems: 'center', justifyContent: 'center' }}>
          <Bands size={Math.min(width * 0.9, 380)} style={{ position: 'absolute', opacity: 0.45 }} />
          <LogoBurst height={stage} logoWidth={Math.round(Math.min(150, width * 0.34))} still={still} />
        </View>
        <Rise delay={d} still={still}>
          <Text style={{ textAlign: 'center', color: 'rgba(185,196,255,0.85)', fontSize: 11.5, fontWeight: '600', letterSpacing: 2.6, marginTop: -stage * 0.16 }}>
            {t('ALL-IN-ONE BUSINESS PLATFORM')}
          </Text>
        </Rise>
        <Rise delay={d + 200} still={still}>
          <View style={{ marginTop: 22 }}><LiveCards still={still} width={Math.min(width, 520)} /></View>
        </Rise>
        <View style={{ flex: 1, minHeight: 22 }} />
        <Rise delay={d + 400} still={still}>
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: width < 380 ? 30 : 34, fontWeight: '800', letterSpacing: -1, lineHeight: width < 380 ? 35 : 39 }}>
              {t('Your whole business, in one app.')}
            </Text>
            <Text style={{ color: 'rgba(221,227,255,0.74)', fontSize: 15.5, lineHeight: 23 }}>
              {t('Team, schedules, payroll, calls, meetings and Ava, together in one secure place.')}
            </Text>
          </View>
        </Rise>
        <Rise delay={d + 550} still={still}>
          <View style={{ marginHorizontal: -side, marginTop: 18 }}><Marquee still={still} width={width} /></View>
        </Rise>
        <Rise delay={d + 700} still={still}>
          <View style={{ gap: 10, marginTop: 22 }}>
            <Pressable onPress={() => router.push('/login')} accessibilityRole="button"
              style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
                shadowColor: '#8EA0FF', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 })}>
              <Text style={{ color: '#000C58', fontSize: 16.5, fontWeight: '700' }}>{t('Sign in')}</Text>
              <Icon name="arrow" size={19} color="#000C58" duo={false} />
            </Pressable>
            <Pressable onPress={() => router.push('/signup')} accessibilityRole="button"
              style={({ pressed }) => ({ minHeight: 54, borderRadius: 18, backgroundColor: pressed ? '#1A1D2B' : '#05060D', borderWidth: 1, borderColor: '#1F2233', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
              <Text style={{ color: '#FFFFFF', fontSize: 16.5, fontWeight: '700' }}>{t('Create free account')}</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/guest')} accessibilityRole="button"
              style={({ pressed }) => ({ minHeight: 48, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(221,227,255,0.28)', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? 'rgba(255,255,255,0.08)' : 'transparent' })}>
              <Icon name="video" size={17} color="#DDE3FF" duo={false} />
              <Text style={{ color: '#DDE3FF', fontWeight: '600', fontSize: 15 }}>{t('Join a meeting')}</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 }}>
            <Text style={{ color: 'rgba(185,196,255,0.6)', fontSize: 11.5, letterSpacing: 0.4, textAlign: 'center' }}>{t('Free for up to 3 people')} · {t('Proudly Canadian')}</Text>
            <MapleLeaf size={11} />
            <Text style={{ color: 'rgba(185,196,255,0.6)', fontSize: 11.5, letterSpacing: 0.4 }}>· OENOD Inc.</Text>
          </View>
        </Rise>
      </ScrollView>
    </View>
  );
}
