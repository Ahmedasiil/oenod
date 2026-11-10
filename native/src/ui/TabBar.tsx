// Floating navy tab bar (3.7 Navy Frame): a rounded navy bar that hovers above the screen, a white marker
// that glides to the tab you pick, and Ava as a white button in the middle. Centred and capped in width on tablets.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/tabs';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
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

/** Ava's button in the middle of the tab bar: a white circle with the navy spark and a soft ring. */
function AiTile({ on }: { on: boolean }) {
  return (
    <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
      borderWidth: 4, borderColor: 'rgba(255,255,255,0.18)', shadowColor: '#000738', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6,
      transform: [{ scale: on ? 1.06 : 1 }] }}>
      <Icon name="spark" size={22} color="#000C58" duo={false} />
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
  const dk = C.dark;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom - 8, 12), alignItems: 'center' }}>
      <View style={{ width: barW, height: 66, borderRadius: 26, backgroundColor: dk ? 'rgba(13,20,64,0.97)' : '#000C58', borderWidth: 1, borderColor: dk ? 'rgba(150,168,255,0.22)' : 'rgba(255,255,255,0.08)',
        shadowColor: '#000738', shadowOpacity: dk ? 0.6 : 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 14, overflow: 'hidden' }}>
        <Svg pointerEvents="none" width={barW} height={66} style={{ position: 'absolute' }}>
          <Defs><LinearGradient id="tbg" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={dk ? '#121C55' : '#0B1C86'} /><Stop offset="1" stopColor={dk ? '#0D1440' : '#000C58'} /></LinearGradient></Defs>
          <Rect x={0} y={0} width={barW} height={66} fill="url(#tbg)" />
        </Svg>
        <View style={{ flexDirection: 'row', flex: 1 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {slot && idx >= 0 && !onAi ? (
            <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, width: slot, alignItems: 'center', transform: [{ translateX: x }] }}>
              <View style={{ width: 22, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: '#FFFFFF' }} />
            </Animated.View>
          ) : null}
          {routes.map((r, i) => {
            const o: any = descriptors[r.key].options;
            const on = i === idx;
            const color = on ? '#FFFFFF' : (dk ? '#7E88BE' : '#9AA6E6');
            const label = typeof o.tabBarLabel === 'string' ? o.tabBarLabel : o.title ?? r.name;
            const press = () => {
              const ev = emitter.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
              if (!on && !ev.defaultPrevented) { if (native) Haptics.selectionAsync().catch(() => {}); navigateToTab(r.key); }
            };
            return (
              <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={press}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                {r.name === 'ai' ? <AiTile on={on} /> : (
                  <>
                    <View style={{ height: 30, justifyContent: 'center' }}>{o.tabBarIcon?.({ focused: on, color, size: 22 })}</View>
                    <Text numberOfLines={1} style={{ fontSize: 10.5, lineHeight: 13, fontWeight: on ? '700' : '500', color }}>{label}</Text>
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
