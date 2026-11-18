// First screen for anyone signed out. Midnight (approved 11-16, preview v6): black page with a faint grid and a
// navy glow, the (seasonal) OENOD logo, a floating 3-D stack that shows the app working (cash, payroll sent,
// a live Meet tile with Lena, an incoming call, Ava), a headline with a turning word, then Get started free,
// Sign in and Face ID. Language and Join a meeting at the top. Still when the phone asks for less motion.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Icon } from '../ui/Icon';
import { Logo } from '../ui/Logo';
import { useAuth } from '../lib/auth';
import { MapleLeaf } from '../ui/Brand';
import { LANGS, t, useLang } from '../lib/i18n';
import { secure } from '../lib/secure';
import { IOS_STORE } from '../lib/store';
import { Ghost, Grad, HChip, OfferStrip, Primary } from '../ui/H';
import type { PhName } from '../ui/phPaths';

export const SEEN = 'oenod.welcomed';
const native = Platform.OS !== 'web';

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
    <Animated.View style={[{ borderRadius: 18, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'rgba(17,18,25,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
      shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
      transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) }] }, style]}>
      {children}
    </Animated.View>
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
        <View style={{ position: 'absolute', top: 36, right: 0, minWidth: 170, borderRadius: 16, paddingVertical: 6, backgroundColor: 'rgba(17,18,25,0.98)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', maxHeight: 420 }}>
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

/** Black page with a faint grid and a soft navy glow behind the stack. */
function Grid({ width, height }: { width: number; height: number }) {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x < width; x += 32) lines.push(<Rect key={'v' + x} x={x} y={0} width={1} height={height} fill="#FFFFFF" fillOpacity={0.035} />);
  for (let y = 0; y < height; y += 32) lines.push(<Rect key={'h' + y} x={0} y={y} width={width} height={1} fill="#FFFFFF" fillOpacity={0.035} />);
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={width} height={height}>
      <Defs>
        <RadialGradient id="wg" cx="60%" cy="30%" r="55%"><Stop offset="0" stopColor="#2238D8" stopOpacity={0.55} /><Stop offset="1" stopColor="#2238D8" stopOpacity={0} /></RadialGradient>
        <LinearGradient id="wf" x1="0" y1="0" x2="0" y2="1"><Stop offset="0.45" stopColor="#050608" stopOpacity={0} /><Stop offset="1" stopColor="#050608" stopOpacity={1} /></LinearGradient>
      </Defs>
      <Rect width={width} height={height} fill="#050608" />
      {lines}
      <Rect width={width} height={height} fill="url(#wg)" />
      <Rect width={width} height={height} fill="url(#wf)" />
    </Svg>
  );
}

const LENA = require('../../assets/meet/lena.jpg');

/** The floating, tilted stack of live cards. */
function Stack({ still, width }: { still: boolean; width: number }) {
  const w = Math.min(width - 48, 360);
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const l = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: native }));
    l.start(); return () => l.stop();
  }, [ring, still]);
  return (
    <View style={{ width: w, height: 324, alignSelf: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* cash card */}
      <Float delay={0} dy={-6} still={still} style={{ position: 'absolute', left: 0, top: 18, width: w * 0.62, padding: 0, borderWidth: 0, transform: [{ rotate: '-6deg' }], overflow: 'hidden', backgroundColor: '#2238D8' }}>
        <Svg width={w * 0.62} height={150} style={{ position: 'absolute' }}>
          <Defs><LinearGradient id="wc" x1="0.1" y1="0" x2="0.9" y2="1"><Stop offset="0" stopColor="#3B55FF" /><Stop offset="0.5" stopColor="#2238D8" /><Stop offset="1" stopColor="#0A1A9A" /></LinearGradient></Defs>
          <Rect width={w * 0.62} height={150} fill="url(#wc)" />
        </Svg>
        <View style={{ padding: 14, height: 150, justifyContent: 'space-between' }}>
          <Text style={{ color: '#DCE3FF', fontSize: 12 }}>{t('Cash this week')}</Text>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.8 }}>$17,269</Text>
            <Text style={{ color: '#5CF0A6', fontSize: 12, fontWeight: '700' }}>▲ 12%</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 22 }}>
            {[7, 10, 8, 13, 11, 16, 20, 18, 22].map((h, i) => <View key={i} style={{ flex: 1, height: h, borderRadius: 2, backgroundColor: i === 8 ? '#FFFFFF' : 'rgba(255,255,255,0.35)' }} />)}
          </View>
        </View>
      </Float>
      {/* live Meet tile */}
      <Float delay={600} dy={7} still={still} style={{ position: 'absolute', right: 0, top: 0, width: w * 0.42, padding: 0, overflow: 'hidden', transform: [{ rotate: '5deg' }] }}>
        <Image source={LENA} style={{ width: '100%', height: 128 }} resizeMode="cover" />
        <View style={{ position: 'absolute', left: 8, top: 8, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#28D17C' }} />
          <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' }}>{t('Live')}</Text>
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', padding: 8 }}>Lena · OENOD Meet</Text>
      </Float>
      {/* payroll sent */}
      <Float delay={300} dy={5} still={still} style={{ position: 'absolute', left: 0, top: 236, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4F8EE' }}><Icon name="check" size={16} color="#0E7A4B" duo={false} /></View>
        <Text style={{ color: '#0A1A9A', fontSize: 13, fontWeight: '800' }}>{t('Payroll sent')} · $8,420</Text>
      </Float>
      {/* incoming call */}
      <Float delay={900} dy={-5} still={still} style={{ position: 'absolute', right: 0, top: 178, width: w * 0.5, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: '#28D17C', opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }] }} />
          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#28D17C' }}><Icon name="phone" size={15} color="#FFFFFF" duo={false} /></View>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: '#9AA0B8', fontSize: 10.5 }} numberOfLines={1}>{t('Incoming call')}</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>Fresh Farms</Text>
        </View>
      </Float>
      {/* Ava */}
      <Float delay={1200} dy={4} still={still} style={{ position: 'absolute', right: w * 0.04, top: 284, flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, backgroundColor: 'rgba(34,56,216,0.35)', borderColor: 'rgba(185,196,255,0.35)' }}>
        <Icon name="spark" size={14} color="#FFFFFF" duo={false} />
        <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '600' }} numberOfLines={1}>{t('Ava: Friday is covered')}</Text>
      </Float>
    </View>
  );
}

const WORDS = ['whole business', 'team & schedules', 'payroll'];

/** The headline's turning word, with its dots. */
function Turning({ still, big }: { still: boolean; big: number }) {
  const [i, setI] = useState(0);
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (still) return;
    const id = setInterval(() => {
      Animated.timing(v, { toValue: 0, duration: 220, useNativeDriver: native }).start(() => {
        setI((x) => (x + 1) % WORDS.length);
        Animated.timing(v, { toValue: 1, duration: 320, useNativeDriver: native }).start();
      });
    }, 2600);
    return () => clearInterval(id);
  }, [still, v]);
  return (
    <View>
      <Animated.Text style={{ color: '#8EA0FF', fontSize: big, fontWeight: '800', letterSpacing: -1, lineHeight: big * 1.15, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>{t(WORDS[i])}</Animated.Text>
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 6 }}>
        {WORDS.map((w, k) => <View key={w} style={{ width: k === i ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: k === i ? '#8EA0FF' : 'rgba(255,255,255,0.2)' }} />)}
      </View>
    </View>
  );
}

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { quick, signInQuick } = useAuth();
  const [still, setStill] = useState(false);
  useEffect(() => { secure.set(SEEN, '1').catch(() => {}); }, []);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then((r) => setStill(!!r)).catch(() => {}); }, []);
  const { height } = useWindowDimensions();
  const side = Math.max(22, (width - 520) / 2);
  const big = width < 380 ? 31 : 35;
  const faceId = () => { if (quick.on) signInQuick().catch(() => router.push('/login')); else router.push('/login'); };

  const floatY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const l = Animated.loop(Animated.sequence([
      Animated.timing(floatY, { toValue: -10, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(floatY, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    l.start(); return () => l.stop();
  }, [still, floatY]);
  const now = new Date();
  const offers: [PhName, string][][] = [
    [['clock', t('Time clock')], ['calendar-dots', t('Scheduling')], ['money', t('Payroll')], ['video-camera', t('OENOD Meet')], ['phone', t('Business phone')], ['receipt', t('Invoices')]],
    [['user-plus', t('Hiring')], ['graduation-cap', t('Training')], ['package', t('Inventory')], ['chart-line-up', t('Reports')], ['chat-circle-dots', t('Team chat')], ['seal-check', t('E-signatures')]],
  ];
  // 4.0 Navy Daylight welcome (approved 11-17): navy top with rings, the offerings strip and a floating clock-in card,
  // then Sign in on white.
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flexGrow: 1, minHeight: Math.max(560, height - 250), paddingTop: insets.top + 8, paddingHorizontal: Math.max(26, (width - 520) / 2), overflow: 'hidden', backgroundColor: '#000C58' }}>
          <Grad id="wtop" x1={0.1} y1={0} x2={0.7} y2={1.3} stops={[[0, '#000C58'], [0.6, '#04137A'], [1.4, '#1A2FCF']]} />
          <View pointerEvents="none" style={{ position: 'absolute', width: 520, height: 520, borderRadius: 260, left: -80, top: 120, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }} />
          <View pointerEvents="none" style={{ position: 'absolute', width: 360, height: 360, borderRadius: 180, left: 0, top: 200, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10, marginTop: 10 }}>
            <Logo width={90} color="#FFFFFF" />
            <View style={{ flex: 1 }} />
            <LangPick />
          </View>
          <Rise delay={still ? 0 : 150} still={still}>
            <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: big + 7, fontWeight: '800', letterSpacing: -1.4, lineHeight: (big + 7) * 1.05, marginTop: 28 }}>{t('Work,')}{'\n'}{t('made simple.')}</Text>
            <Text style={{ color: '#AEB8F0', fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 300 }}>{t('Clock in, see your shifts, get paid and meet your team. All in one app.')}</Text>
          </Rise>
          <View style={{ marginTop: 22 }}><OfferStrip rows={offers} /></View>
          <View style={{ flex: 1, minHeight: 230, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}>
            <Animated.View style={{ width: '82%', maxWidth: 300, transform: [{ translateY: floatY }, { rotate: '-4deg' }], backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16,
              shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 30 }, elevation: 14 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#5B6079', fontWeight: '600' }}>{t('Today')} · {t('Front desk')}</Text>
                <HChip text={t('On site')} bg="#EEF0FB" fg="#1A2FCF" live={!still} h={22} />
              </View>
              <Text style={{ fontSize: 34, fontWeight: '800', letterSpacing: -1, color: '#0A0B10', marginTop: 6, fontVariant: ['tabular-nums'] }}>{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text>
              <Text style={{ fontSize: 12, color: '#5B6079', marginTop: 2 }}>{t('Your workplace')} · {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
              <View style={{ marginTop: 12, height: 42, borderRadius: 13, backgroundColor: '#000C58', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>{t('Clock in')}</Text>
              </View>
            </Animated.View>
          </View>
        </View>
        <View style={{ paddingTop: 22, paddingBottom: insets.bottom + 18, paddingHorizontal: Math.max(22, (width - 520) / 2), gap: 10, backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Primary text={t('Sign in')} ink onPress={() => router.push('/login')} style={{ flex: 1 }} />
            <Pressable onPress={faceId} accessibilityRole="button" accessibilityLabel={quick.on ? t('Sign in with {m}', { m: quick.name || t('Face ID') }) : t('Sign in')}
              style={({ pressed }) => ({ width: 58, height: 58, borderRadius: 18, backgroundColor: pressed ? '#E3E6EF' : '#F3F4F8', alignItems: 'center', justifyContent: 'center' })}>
              <Icon name="face" size={24} color="#0A0B10" duo={false} />
            </Pressable>
          </View>
          <Ghost text={t('Join a meeting with a code')} icon="video-camera" onPress={() => router.push('/guest')} style={{ flexGrow: 0, flexShrink: 0, flexBasis: 'auto', height: 54, borderRadius: 18 }} />
          {IOS_STORE ? (
            <Text style={{ textAlign: 'center', color: '#5B6079', fontSize: 13, marginTop: 4 }}>{t('For teams that already use OENOD. Ask your manager for an invite.')}</Text>
          ) : (
            <Pressable onPress={() => router.push('/signup')} accessibilityRole="button" style={{ alignItems: 'center', marginTop: 4 }}>
              <Text style={{ color: '#5B6079', fontSize: 13 }}>{t('New business?')} <Text style={{ color: '#1A2FCF', fontWeight: '800' }}>{t('Start free for 14 days')}</Text></Text>
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
            <Text style={{ color: '#8A90AE', fontSize: 11.5, textAlign: 'center' }}>{t('{n} languages', { n: LANGS.length })} · {t('Proudly Canadian')}</Text>
            <MapleLeaf size={11} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
