// Tab bar (Midnight v6, approved 11-16): a white bar along the bottom edge with a deep curve in the middle,
// where Ava sits as a raised, glowing navy circle. Icons only. Centred and capped in width on tablets.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/tabs';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { C } from '../lib/theme';
import { Icon } from './Icon';

const native = Platform.OS !== 'web';

/** Ava's mark: a framed navy tile with the spark, softly breathing (same frame as the website's navy cards). */
export function AiOrb({ size = 56, still }: { size?: number; still?: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    a.start();
    return () => a.stop();
  }, [v, still]);
  const sc = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const glowO = v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] });
  const r = size * 0.31;
  const g = size * 2.1;
  const id = 'ava' + size;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width: g, height: g, opacity: glowO }}>
        <Svg width={g} height={g}>
          <Defs><RadialGradient id={id + 'g'} cx="50%" cy="50%" r="50%"><Stop offset="0.25" stopColor="#5468FF" stopOpacity={0.55} /><Stop offset="1" stopColor="#5468FF" stopOpacity={0} /></RadialGradient></Defs>
          <Circle cx={g / 2} cy={g / 2} r={g / 2} fill={`url(#${id}g)`} />
        </Svg>
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: sc }], width: size, height: size, borderRadius: r, padding: size * 0.07, backgroundColor: 'rgba(185,196,255,0.10)', borderWidth: 1, borderColor: 'rgba(185,196,255,0.35)' }}>
        <View style={{ flex: 1, borderRadius: r * 0.8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size} style={{ position: 'absolute' }}>
            <Defs><LinearGradient id={id + 'f'} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#1B2EB0" /><Stop offset="0.65" stopColor="#000C58" /><Stop offset="1" stopColor="#000738" /></LinearGradient></Defs>
            <Rect x={0} y={0} width={size} height={size} fill={`url(#${id}f)`} />
          </Svg>
          <View style={{ zIndex: 1 }}><Icon name="spark" size={Math.round(size * 0.42)} color="#FFFFFF" duo={false} /></View>
        </View>
      </Animated.View>
    </View>
  );
}

/** Ava's button (v6 .fab): a 70px navy circle with a 6px black ring, glowing softly, sitting in the bar's curve. */
function AiFab({ on }: { on: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(v, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ]));
    a.start();
    return () => a.stop();
  }, [v]);
  const glow = v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  const rad = v.interpolate({ inputRange: [0, 1], outputRange: [14, 22] });
  return (
    <Animated.View style={{ width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0B10',
      shadowColor: '#2B44E8', shadowOpacity: glow, shadowRadius: rad, shadowOffset: { width: 0, height: 14 }, elevation: 12, transform: [{ scale: on ? 1.04 : 1 }] }}>
      <View style={{ width: 70, height: 70, borderRadius: 35, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={70} height={70} style={{ position: 'absolute' }}>
          <Defs><LinearGradient id="fab" x1="0.15" y1="0" x2="0.85" y2="1"><Stop offset="0" stopColor="#4A63FF" /><Stop offset="1" stopColor="#000C58" /></LinearGradient></Defs>
          <Rect x={0} y={0} width={70} height={70} fill="url(#fab)" />
        </Svg>
        <View style={{ zIndex: 1 }}><Icon name="spark" size={28} color="#FFFFFF" duo={false} /></View>
      </View>
    </Animated.View>
  );
}

/** The white bar (v6): rounded top corners and a deep curve in the middle for Ava, flat to the bottom edge. */
function barPath(w: number, h: number) {
  const cx = w / 2;
  return `M0 22 Q0 0 22 0 H${cx - 56} C${cx - 42} 0 ${cx - 44} 40 ${cx} 40 C${cx + 44} 40 ${cx + 42} 0 ${cx + 56} 0 H${w - 22} Q${w} 0 ${w} 22 V${h} H0Z`;
}

// v6 order: Home, Meet, Ava (centre), All tools, Phone. Icons only; the names are read out by screen readers.
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const routes = state.routes.filter((r) => { const o = descriptors[r.key]?.options as any; return !o?.hidden && !o?.oeOffBar; });
  const activeKey = state.routes[state.index]?.key;
  const idx = routes.findIndex((r) => r.key === activeKey);
  const barW = Math.min(width, 620);
  const pad = Math.max(14, insets.bottom - 6);
  const H = 26 + 56 + pad;
  const aiAt = routes.findIndex((r) => r.name === 'ai');
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' }}>
      <View style={{ width: barW, height: H, shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: -10 }, elevation: 16 }}>
        <Svg pointerEvents="none" width={barW} height={H} style={{ position: 'absolute' }}>
          <Path d={barPath(barW, H)} fill="#FFFFFF" />
        </Svg>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: pad, height: 56, flexDirection: 'row' }}>
          {routes.map((r, i) => {
            const o: any = descriptors[r.key].options;
            const on = i === idx;
            const color = on ? '#0A0B10' : '#7B8099';
            const label = typeof o.tabBarLabel === 'string' ? o.tabBarLabel : o.title ?? r.name;
            const press = () => {
              const ev = emitter.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
              if (!on && !ev.defaultPrevented) { if (native) Haptics.selectionAsync().catch(() => {}); navigateToTab(r.key); }
            };
            if (r.name === 'ai') return <View key={r.key} style={{ flex: 1 }} />;
            return (
              <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={press}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                {o.tabBarIcon?.({ focused: on, color, size: 24 })}
              </Pressable>
            );
          })}
        </View>
        {aiAt >= 0 ? (() => {
          const r = routes[aiAt]; const o: any = descriptors[r.key].options; const on = aiAt === idx;
          const press = () => {
            const ev = emitter.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
            if (!on && !ev.defaultPrevented) { if (native) Haptics.selectionAsync().catch(() => {}); navigateToTab(r.key); }
          };
          return (
            <Pressable onPress={press} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={typeof o.title === 'string' ? o.title : 'Ava'}
              style={{ position: 'absolute', top: -36, left: barW / 2 - 41, width: 82, height: 82 }}>
              <AiFab on={on} />
            </Pressable>
          );
        })() : null}
      </View>
    </View>
  );
}
