// Tab bar (4.0 Navy Daylight, approved 11-17): a black floating pill. The open tab turns into a white pill with
// its name; Meet sits in the middle as a raised navy circle with a white ring. Centred and capped on tablets.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/tabs';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { C } from '../lib/theme';
import { Icon } from './Icon';
import { Grad, Ph } from './H';
import type { PhName } from './phPaths';

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

const TAB_IC: Record<string, PhName> = { index: 'house', schedule: 'calendar-dots', team: 'users-three', meet: 'video-camera', phone: 'phone', ai: 'sparkle', me: 'user', all: 'squares-four' };

export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const routes = state.routes.filter((r) => { const o = descriptors[r.key]?.options as any; return !o?.hidden && !o?.oeOffBar; });
  const activeKey = state.routes[state.index]?.key;
  const barW = Math.min(width - 28, 560);
  const bottom = Math.max(14, insets.bottom);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom, alignItems: 'center' }}>
      <View style={{ width: barW, height: 68, borderRadius: 26, shadowColor: '#000C58', shadowOpacity: 0.35, shadowRadius: 17, shadowOffset: { width: 0, height: 14 }, elevation: 16 }}>
        <View style={{ flex: 1, borderRadius: 26, overflow: 'hidden', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
          <Grad id="tabbar" x1={0.5} y1={0} x2={0.5} y2={1} stops={[[0, '#1B1E2B'], [1, '#0A0B10']]} />
        </View>
        <View style={{ position: 'absolute', left: 8, right: 8, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {routes.map((r) => {
            const o: any = descriptors[r.key].options;
            const on = r.key === activeKey;
            const label = typeof o.tabBarLabel === 'string' ? o.tabBarLabel : o.title ?? r.name;
            const press = () => {
              const ev = emitter.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
              if (!on && !ev.defaultPrevented) { if (native) Haptics.selectionAsync().catch(() => {}); navigateToTab(r.key); }
            };
            const ic = TAB_IC[r.name] || 'squares-four';
            if (r.name === 'meet') {
              return (
                <Pressable key={r.key} onPress={press} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}
                  style={{ width: 64, height: 64, marginTop: -34, borderRadius: 32, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
                    shadowColor: '#000C58', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 10 }, elevation: 12 }}>
                  <View style={{ width: 54, height: 54, borderRadius: 27, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                    <Grad id="tabmeet" x1={0.1} y1={0} x2={0.9} y2={1} stops={[[0, '#2B44E8'], [1, '#000C58']]} />
                    <View style={{ zIndex: 1 }}><Ph name={ic} size={28} color="#FFFFFF" duo={on ? 1 : 0.3} /></View>
                  </View>
                </Pressable>
              );
            }
            return (
              <Pressable key={r.key} onPress={press} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}
                style={{ height: 50, minWidth: 50, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  paddingLeft: on ? 14 : 12, paddingRight: on ? 16 : 12, backgroundColor: on ? '#FFFFFF' : 'transparent',
                  shadowColor: '#000', shadowOpacity: on ? 0.25 : 0, shadowRadius: 7, shadowOffset: { width: 0, height: 6 } }}>
                <Ph name={ic} size={24} color={on ? '#000C58' : 'rgba(255,255,255,0.72)'} duo={on ? 1 : 0.22} />
                {on ? <Text style={{ color: '#000C58', fontSize: 13, fontWeight: '800' }} numberOfLines={1}>{label}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
