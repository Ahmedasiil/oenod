// First screen for anyone signed out (3.7 "Constellation"): deep navy night, points of light
// gather into the OENOD logo, then one clear promise and two buttons. Language at the top right.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Icon } from '../ui/Icon';
import { LogoBurst } from '../ui/LogoBurst';
import { MapleLeaf } from '../ui/Brand';
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
      {blob('#5B4BD6', width * 0.9, 220, width * 0.35, -110, -width * 0.16, 8, 0.55, 'au2')}
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
        <View style={{ marginHorizontal: -side }}>
          <LogoBurst height={stage} logoWidth={Math.round(Math.min(150, width * 0.34))} still={still} />
        </View>
        <Rise delay={d} still={still}>
          <Text style={{ textAlign: 'center', color: 'rgba(185,196,255,0.85)', fontSize: 11.5, fontWeight: '600', letterSpacing: 2.6, marginTop: -stage * 0.16 }}>
            {t('ALL-IN-ONE BUSINESS PLATFORM')}
          </Text>
        </Rise>
        <View style={{ flex: 1, minHeight: 24 }} />
        <Rise delay={d + 300} still={still}>
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: width < 380 ? 28 : 30, fontWeight: '700', letterSpacing: -0.8, lineHeight: width < 380 ? 33 : 36 }}>
              {t('Run your whole company from one app.')}
            </Text>
            <Text style={{ color: 'rgba(221,227,255,0.74)', fontSize: 16, lineHeight: 24 }}>
              {t('Team, schedules, payroll, invoices and Ava, together in one secure place.')}
            </Text>
          </View>
        </Rise>
        <Rise delay={d + 600} still={still}>
          <View style={{ gap: 12, marginTop: 28 }}>
            <Pressable onPress={() => router.push('/signup')} accessibilityRole="button"
              style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
                shadowColor: '#8EA0FF', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 })}>
              <Text style={{ color: '#000C58', fontSize: 16.5, fontWeight: '700' }}>{t('Create free account')}</Text>
              <Icon name="arrow" size={19} color="#000C58" duo={false} />
            </Pressable>
            <Pressable onPress={() => router.push('/login')} accessibilityRole="button"
              style={({ pressed }) => ({ minHeight: 54, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(221,227,255,0.3)', alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)' })}>
              <Text style={{ color: '#FFFFFF', fontSize: 16.5, fontWeight: '600' }}>{t('Sign in')}</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/guest')} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 }}>
              <Icon name="video" size={17} color="rgba(221,227,255,0.8)" duo={false} />
              <Text style={{ color: 'rgba(221,227,255,0.85)', fontWeight: '600', fontSize: 14.5 }}>{t('Join a meeting as a guest')}</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 }}>
            <Text style={{ color: 'rgba(185,196,255,0.55)', fontSize: 11.5, letterSpacing: 0.6 }}>OENOD Inc. · {t('Proudly Canadian')}</Text>
            <MapleLeaf size={11} />
          </View>
        </Rise>
      </ScrollView>
    </View>
  );
}
