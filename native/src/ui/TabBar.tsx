// Floating glass tab bar: a rounded bar that hovers above the screen, a highlight that glides to the
// tab you pick, and OENOD AI as a glowing orb in the middle. Centred and capped in width on tablets.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/tabs';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { C } from '../lib/theme';
import { Icon } from './Icon';

const native = Platform.OS !== 'web';

/** The OENOD AI orb: blue to violet with a soft breathing glow. */
export function AiOrb({ size = 56, still }: { size?: number; still?: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    a.start();
    return () => a.stop();
  }, [v, still]);
  const glow = v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  const sc = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const g = size * 1.7;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width: g, height: g, opacity: glow, transform: [{ scale: sc }] }}>
        <Svg width={g} height={g}>
          <Defs><RadialGradient id="orbg" cx="50%" cy="50%" r="50%"><Stop offset="0.35" stopColor="#6B5CF6" stopOpacity={0.7} /><Stop offset="1" stopColor="#3D5BF5" stopOpacity={0} /></RadialGradient></Defs>
          <Circle cx={g / 2} cy={g / 2} r={g / 2} fill="url(#orbg)" />
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="orbf" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#5B7BFF" /><Stop offset="0.55" stopColor="#3D5BF5" /><Stop offset="1" stopColor="#6B5CF6" /></LinearGradient>
          <RadialGradient id="orbh" cx="32%" cy="26%" r="45%"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} /><Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} /></RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#orbf)" />
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#orbh)" />
      </Svg>
      <View style={{ position: 'absolute', zIndex: 2 }} pointerEvents="none"><Icon name="spark" size={size * 0.44} color="#FFFFFF" duo={false} /></View>
    </View>
  );
}

export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const routes = state.routes.filter((r) => !(descriptors[r.key]?.options as any)?.hidden);
  const activeKey = state.routes[state.index]?.key;
  const idx = routes.findIndex((r) => r.key === activeKey);
  const [w, setW] = useState(0);
  const slot = routes.length ? w / routes.length : 0;
  const x = useRef(new Animated.Value(0)).current;
  const onAi = routes[idx]?.name === 'ai';
  useEffect(() => {
    if (idx >= 0) Animated.spring(x, { toValue: idx * slot, speed: 18, bounciness: 7, useNativeDriver: native }).start();
  }, [idx, slot, x]);
  const barW = Math.min(width - 24, 520);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom - 6, 10), alignItems: 'center' }}>
      <View style={{ width: barW, borderRadius: 30, paddingHorizontal: 6, paddingVertical: 6,
        backgroundColor: C.tabBg, borderWidth: 1, borderColor: C.dark ? 'rgba(175,195,255,0.12)' : 'rgba(10,18,48,0.06)',
        shadowColor: '#0A1230', shadowOpacity: C.dark ? 0.5 : 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 14 }}>
        <View style={{ flexDirection: 'row' }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {slot && idx >= 0 && !onAi ? (
            <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, width: slot, padding: 1, transform: [{ translateX: x }] }}>
              <View style={{ flex: 1, borderRadius: 24, backgroundColor: C.dark ? 'rgba(175,195,255,0.12)' : '#ECEFFE' }} />
            </Animated.View>
          ) : null}
          {routes.map((r, i) => {
            const o: any = descriptors[r.key].options;
            const on = i === idx;
            const color = on ? (C.dark ? '#FFFFFF' : '#3D5BF5') : C.faint;
            const label = typeof o.tabBarLabel === 'string' ? o.tabBarLabel : o.title ?? r.name;
            const press = () => {
              const ev = emitter.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
              if (!on && !ev.defaultPrevented) { if (native) Haptics.selectionAsync().catch(() => {}); navigateToTab(r.key); }
            };
            if (r.name === 'ai') {
              return (
                <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={press}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ marginTop: -22 }}><AiOrb size={54} /></View>
                  <Text numberOfLines={1} style={{ fontSize: 10.5, lineHeight: 13, marginTop: 2, fontWeight: on ? '800' : '600', color: on ? (C.dark ? '#FFFFFF' : '#3D5BF5') : C.faint }}>{label}</Text>
                </Pressable>
              );
            }
            return (
              <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={press}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, gap: 3 }}>
                {o.tabBarIcon?.({ focused: on, color, size: 22 })}
                <Text numberOfLines={1} style={{ fontSize: 10.5, lineHeight: 13, fontWeight: on ? '800' : '600', color }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
