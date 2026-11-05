// Brand pieces in the oenod.com website style: navy-to-violet gradient, a faint constellation
// network, soft drifting lights, the OENOD wordmark and the gradient call-to-action button.
import React, { useEffect, useId, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { C } from '../lib/theme';
import { Icon, IconName } from './Icon';

const native = Platform.OS !== 'web';
// Unique gradient ids, so two screens on the stack never share one.
const useSvgId = (p: string) => p + useId().replace(/[^a-zA-Z0-9]/g, '');

export function Wordmark({ width = 200 }: { width?: number }) {
  return (
    <Image source={require('../../assets/wordmark.png')} style={{ width, height: width * 0.27 }} resizeMode="contain"
      accessibilityRole="header" accessibilityLabel="OENOD" />
  );
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

/** The website hero gradient: royal navy at the top fading into violet, then midnight. */
export function HeroGradient({ width, height, fade = true }: { width: number; height: number; id?: string; fade?: boolean }) {
  const id = useSvgId('hg');
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={width} height={height}>
      <Defs>
        <LinearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1A2A9E" />
          <Stop offset="0.55" stopColor="#2B238F" />
          <Stop offset="1" stopColor="#141062" />
        </LinearGradient>
        <LinearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.45" stopColor="#070B22" stopOpacity={0} />
          <Stop offset="1" stopColor="#070B22" stopOpacity={fade ? 1 : 0} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${id}a)`} />
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${id}b)`} />
    </Svg>
  );
}

/** Full-screen backdrop for the splash, welcome and sign-in screens. */
export function Backdrop({ children }: { children?: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const a = useLoop(8000);
  const b = useLoop(10000, 1500);
  const big = Math.max(width, height) * 0.9;
  const ax = a.interpolate({ inputRange: [0, 1], outputRange: [-big * 0.4, -big * 0.25] });
  const bx = b.interpolate({ inputRange: [0, 1], outputRange: [width - big * 0.5, width - big * 0.65] });
  const by = b.interpolate({ inputRange: [0, 1], outputRange: [height * 0.15, height * 0.05] });
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, overflow: 'hidden' }}>
      <HeroGradient width={width} height={height} id="bd" />
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -big * 0.35, transform: [{ translateX: ax }] }}>
        <Glow size={big} color="#4F6BFF" opacity={0.42} id="ga" />
      </Animated.View>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', transform: [{ translateX: bx }, { translateY: by }] }}>
        <Glow size={big} color="#8B5CFF" opacity={0.3} id="gb" />
      </Animated.View>
      <Constellation width={width} height={height} density={0.9} />
      {children}
    </View>
  );
}

/** Primary call to action, blue to violet like the website's "Start your 14-day free trial". */
export function GradientButton({ title, onPress, icon, busy, disabled, style, iconRight }: {
  title: string; onPress: () => void; icon?: IconName; iconRight?: IconName; busy?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  const gid = useSvgId('gb');
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!(disabled || busy) }} onPress={onPress} disabled={disabled || busy}
      style={({ pressed }) => [{ minHeight: 56, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
        shadowColor: '#5B5CFF', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 }, style]}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#3D5BFF" />
            <Stop offset="1" stopColor="#7A4DFF" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} fill={`url(#${gid})`} />
      </Svg>
      {busy ? <ActivityIndicator color={C.white} /> : (
        <>
          {icon ? <Icon name={icon} size={20} color={C.white} /> : null}
          <Text style={{ color: C.white, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 }}>{title}</Text>
          {iconRight ? <Icon name={iconRight} size={20} color={C.white} /> : null}
        </>
      )}
    </Pressable>
  );
}

/** Glass outline button ("Get the apps" on the website). */
export function GlassButton({ title, onPress, icon, style, disabled }: { title: string; onPress: () => void; icon?: IconName; style?: ViewStyle; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => [{ minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18,
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

/** A card with the website hero gradient and network inside it (time clock, sales today). */
export function HeroCard({ children, style, seed = 3 }: { children: React.ReactNode; style?: ViewStyle; seed?: number }) {
  const [sz, setSz] = React.useState({ w: 340, h: 220 });
  return (
    <View onLayout={(e) => setSz({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[{ borderRadius: 26, padding: 22, gap: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: '#1A2A9E' }, style]}>
      <HeroGradient width={sz.w} height={sz.h} id={`hc${seed}`} fade={false} />
      <Constellation width={sz.w} height={sz.h} density={1.3} seed={seed} opacity={0.9} />
      {children}
    </View>
  );
}
