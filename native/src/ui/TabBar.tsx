// Floating tab bar (Midnight, approved 11-16): a white bar with a soft notch in the middle, where Ava sits as
// a raised navy circle. Centred and capped in width on tablets.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
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

/** Ava's button: a raised navy circle that sits in the notch of the white bar. */
function AiFab({ on }: { on: boolean }) {
  return (
    <View style={{ width: 62, height: 62, borderRadius: 31, marginTop: -40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2238D8',
      borderWidth: 5, borderColor: '#0A0B10', shadowColor: '#2238D8', shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10,
      transform: [{ scale: on ? 1.06 : 1 }], overflow: 'hidden' }}>
      <Svg width={62} height={62} style={{ position: 'absolute' }}>
        <Defs><LinearGradient id="fab" x1="0.1" y1="0" x2="0.9" y2="1"><Stop offset="0" stopColor="#5B72FF" /><Stop offset="0.5" stopColor="#2238D8" /><Stop offset="1" stopColor="#0A1A9A" /></LinearGradient></Defs>
        <Rect x={0} y={0} width={62} height={62} fill="url(#fab)" />
      </Svg>
      <View style={{ zIndex: 1 }}><Icon name="spark" size={24} color="#FFFFFF" duo={false} /></View>
    </View>
  );
}

/** The white bar with a soft notch in the middle for Ava. */
function notchPath(w: number, h: number, cx: number) {
  const r = 28;
  return `M${r} 0 L${cx - 50} 0 C${cx - 36} 0 ${cx - 38} 30 ${cx} 30 C${cx + 38} 30 ${cx + 36} 0 ${cx + 50} 0 L${w - r} 0 Q${w} 0 ${w} ${r} L${w} ${h - r} Q${w} ${h} ${w - r} ${h} L${r} ${h} Q0 ${h} 0 ${h - r} L0 ${r} Q0 0 ${r} 0Z`;
}

export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const routes = state.routes.filter((r) => { const o = descriptors[r.key]?.options as any; return !o?.hidden && !o?.oeOffBar; });
  const activeKey = state.routes[state.index]?.key;
  const idx = routes.findIndex((r) => r.key === activeKey);
  const barW = Math.min(width - 24, 520);
  const H = 68;
  const aiAt = routes.findIndex((r) => r.name === 'ai');
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom - 8, 14), alignItems: 'center' }}>
      <View style={{ width: barW, height: H, shadowColor: '#000000', shadowOpacity: 0.45, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 14 }}>
        <Svg pointerEvents="none" width={barW} height={H} style={{ position: 'absolute' }}>
          <Path d={notchPath(barW, H, aiAt >= 0 ? (aiAt + 0.5) * barW / routes.length : barW / 2)} fill="#FFFFFF" />
        </Svg>
        <View style={{ flexDirection: 'row', flex: 1 }}>
          {routes.map((r, i) => {
            const o: any = descriptors[r.key].options;
            const on = i === idx;
            const color = on ? '#0A0B10' : '#8F95AD';
            const label = typeof o.tabBarLabel === 'string' ? o.tabBarLabel : o.title ?? r.name;
            const press = () => {
              const ev = emitter.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
              if (!on && !ev.defaultPrevented) { if (native) Haptics.selectionAsync().catch(() => {}); navigateToTab(r.key); }
            };
            return (
              <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={press}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                {r.name === 'ai' ? <AiFab on={on} /> : (
                  <>
                    <View style={{ height: 26, justifyContent: 'center' }}>{o.tabBarIcon?.({ focused: on, color, size: 23 })}</View>
                    <Text numberOfLines={1} style={{ fontSize: 10, lineHeight: 12, fontWeight: on ? '700' : '500', color }}>{label}</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
