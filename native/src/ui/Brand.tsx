// Brand pieces in the oenod.com website style: navy-to-violet gradient, a faint constellation
// network, soft drifting lights, the OENOD wordmark and the gradient call-to-action button.
import React, { useEffect, useId, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { C } from '../lib/theme';
import { Icon, IconName } from './Icon';
import { Logo } from './Logo';
import Svg2, { Path as P2 } from 'react-native-svg';

const native = Platform.OS !== 'web';
// Unique gradient ids, so two screens on the stack never share one.
const useSvgId = (p: string) => p + useId().replace(/[^a-zA-Z0-9]/g, '');

export function Wordmark({ width = 200, color = '#FFFFFF' }: { width?: number; color?: string }) {
  return <View accessibilityRole="header" accessibilityLabel="OENOD"><Logo width={width} color={color} /></View>;
}

function useLoop(ms: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    a.start();
    return () => a.stop();
  }, [v, ms, delay]);
  return v;
}

// Same points every time, so the network does not jump between renders.
function rand(seed: number) { let x = seed; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }

/** The faint dots-and-lines network from the website hero. */
export function Constellation({ width, height, density = 1, seed = 7, opacity = 1 }: { width: number; height: number; density?: number; seed?: number; opacity?: number }) {
  const { pts, lines } = useMemo(() => {
    const r = rand(seed);
    const n = Math.round(((width * height) / 9000) * density);
    const pts = Array.from({ length: n }, () => ({ x: r() * width, y: r() * height, s: 0.8 + r() * 1.6, o: 0.25 + r() * 0.55 }));
    const lines: [number, number, number][] = [];
    const max = 90;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d < max && lines.length < n * 1.2) lines.push([i, j, 1 - d / max]);
    }
    return { pts, lines };
  }, [width, height, density, seed]);
  return (
    <Svg pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]} width={width} height={height}>
      {lines.map(([a, b, k], i) => <Line key={`l${i}`} x1={pts[a].x} y1={pts[a].y} x2={pts[b].x} y2={pts[b].y} stroke="#B8C6FF" strokeOpacity={0.16 * k} strokeWidth={0.8} />)}
      {pts.map((p, i) => <Circle key={`p${i}`} cx={p.x} cy={p.y} r={p.s} fill="#DDE4FF" fillOpacity={p.o} />)}
    </Svg>
  );
}

function Glow({ size, color, opacity }: { size: number; color: string; opacity: number; id?: string }) {
  const id = useSvgId('gl');
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Deep OENOD navy panel: royal navy at the top-right easing into midnight, with soft light. */
export function HeroGradient({ width, height, fade = true }: { width: number; height: number; id?: string; fade?: boolean }) {
  const id = useSvgId('hg');
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={width} height={height}>
      <Defs>
        <LinearGradient id={`${id}a`} x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0B1B3F" />
          <Stop offset="0.55" stopColor="#071030" />
          <Stop offset="1" stopColor="#050B24" />
        </LinearGradient>
        <RadialGradient id={`${id}g`} cx="88%" cy="0%" r="70%">
          <Stop offset="0" stopColor="#3D5BF5" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#3D5BF5" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}v`} cx="0%" cy="100%" r="60%">
          <Stop offset="0" stopColor="#6B5CF6" stopOpacity={0.32} />
          <Stop offset="1" stopColor="#6B5CF6" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.5" stopColor="#050B24" stopOpacity={0} />
          <Stop offset="1" stopColor="#050B24" stopOpacity={fade ? 1 : 0} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${id}a)`} />
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${id}g)`} />
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${id}v)`} />
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${id}b)`} />
    </Svg>
  );
}

/** A soft corner light used behind headers and inside summary cards. */
export function CornerGlow({ width, height, color = '#3D5BFF', opacity = 0.35, at = 'tr' }: { width: number; height: number; color?: string; opacity?: number; at?: 'tr' | 'tl' | 'br' | 'bl' }) {
  const id = useSvgId('cg');
  const cx = at.includes('r') ? '100%' : '0%';
  const cy = at.includes('t') ? '0%' : '100%';
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={width} height={height}>
      <Defs>
        <RadialGradient id={id} cx={cx} cy={cy} r="75%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Full-screen backdrop for the splash, welcome and sign-in screens: near-black with a slow navy light. */
export function Backdrop({ children }: { children?: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const a = useLoop(9000);
  const b = useLoop(12000, 1500);
  const big = Math.max(width, height) * 1.1;
  const ax = a.interpolate({ inputRange: [0, 1], outputRange: [-big * 0.45, -big * 0.3] });
  const by = b.interpolate({ inputRange: [0, 1], outputRange: [height - big * 0.45, height - big * 0.55] });
  return (
    <View style={{ flex: 1, backgroundColor: '#050B24', overflow: 'hidden' }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', transform: [{ translateX: ax }, { translateY: by }] }}>
        <Glow size={big} color="#3D5BF5" opacity={0.5} id="ga" />
      </Animated.View>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -big * 0.55, left: width - big * 0.4 }}>
        <Glow size={big} color="#6B5CF6" opacity={0.26} id="gb" />
      </Animated.View>
      {children}
    </View>
  );
}

/** Primary call to action: a solid pill. White on dark, OENOD navy on light. `light` forces white (on dark backdrops). */
export function GradientButton({ title, onPress, icon, busy, disabled, style, iconRight, light }: {
  title: string; onPress: () => void; icon?: IconName; iconRight?: IconName; busy?: boolean; disabled?: boolean; style?: ViewStyle; light?: boolean;
}) {
  const bg = light ? '#FFFFFF' : C.btn;
  const fg = light ? '#0A1230' : C.btnInk;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!(disabled || busy) }} onPress={onPress} disabled={disabled || busy}
      style={({ pressed }) => [{ minHeight: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 22,
        backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>
      {busy ? <ActivityIndicator color={fg} /> : (
        <>
          {icon ? <Icon name={icon} size={20} color={fg} /> : null}
          <Text style={{ color: fg, fontSize: 16, fontWeight: '800', letterSpacing: 0.2 }}>{title}</Text>
          {iconRight ? <Icon name={iconRight} size={20} color={fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

/** Glass outline button ("Get the apps" on the website). */
export function GlassButton({ title, onPress, icon, style, disabled }: { title: string; onPress: () => void; icon?: IconName; style?: ViewStyle; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => [{ minHeight: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18,
        backgroundColor: pressed ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', opacity: disabled ? 0.5 : 1 }, style]}>
      {icon ? <Icon name={icon} size={20} color={C.white} /> : null}
      <Text style={{ color: C.white, fontSize: 16, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}

/** The opening screen while the app checks the saved sign-in. */
export function Splash() {
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useLoop(1200);
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [fade]);
  const scale = fade.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const bar = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  return (
    <Backdrop>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 30 }}>
        <Animated.View style={{ opacity: fade, transform: [{ scale }] }}><Wordmark width={220} /></Animated.View>
        <View style={{ width: 110, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
          <Animated.View style={{ width: 110, height: 3, backgroundColor: C.sky, transform: [{ scaleX: bar }] }} />
        </View>
      </View>
    </Backdrop>
  );
}

/** The navy feature card (time clock, sales today, every screen's summary). White text in both modes. */
export function HeroCard({ children, style, seed = 3 }: { children: React.ReactNode; style?: ViewStyle; seed?: number }) {
  const [sz, setSz] = React.useState({ w: 340, h: 220 });
  return (
    <View onLayout={(e) => setSz({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[{ borderRadius: 28, padding: 22, gap: 14, overflow: 'hidden', backgroundColor: '#050B24',
        shadowColor: '#050B24', shadowOpacity: C.dark ? 0.0 : 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: C.dark ? 0 : 6 }, style]}>
      <HeroGradient width={sz.w} height={sz.h} id={`hc${seed}`} fade={false} />
      {children}
    </View>
  );
}

/** The red maple leaf for the Proudly Canadian mark. */
export function MapleLeaf({ size = 12 }: { size?: number }) {
  return (
    <Svg2 width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      <P2 fill="#E0362A" d="M12 1.8l1.7 3.4 2-.8-.7 4.6 2.7-2.6.7 1.7 2.9-.5-1 2.9 1.3.6-4.6 3.7.6 1.7-4.5-.8V22h-2.2v-4.3l-4.5.8.6-1.7-4.6-3.7 1.3-.6-1-2.9 2.9.5.7-1.7 2.7 2.6-.7-4.6 2 .8z" />
    </Svg2>
  );
}

/** Brand line at the bottom of every screen: POWERED BY [OENOD logo] | [maple leaf] PROUDLY CANADIAN. */
export function PoweredBy({ dark, rule = true }: { dark?: boolean; rule?: boolean }) {
  const onDark = dark ?? C.dark;
  const mute = onDark ? '#9AA5C8' : '#7A829C';
  const strong = onDark ? '#FFFFFF' : '#0A1230';
  const lab = { color: mute, fontSize: 10, fontWeight: '600' as const, letterSpacing: 1.5 };
  return (
    <View accessible accessibilityLabel="Powered by OENOD. Proudly Canadian."
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14, paddingTop: 16, paddingBottom: 6,
        borderTopWidth: rule ? StyleSheet.hairlineWidth : 0, borderTopColor: onDark ? 'rgba(255,255,255,0.12)' : '#E4E7F0', alignSelf: 'stretch' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={lab}>POWERED BY</Text>
        <Logo width={46} color={strong} />
      </View>
      <View style={{ width: 1, height: 12, backgroundColor: onDark ? 'rgba(255,255,255,0.2)' : '#D5D9E5' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MapleLeaf size={12} />
        <Text style={lab}>PROUDLY <Text style={{ color: strong, fontWeight: '800' }}>CANADIAN</Text></Text>
      </View>
    </View>
  );
}
