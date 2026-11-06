// Floating glass tab bar: a rounded bar that hovers above the screen, a highlight that glides to the
// tab you pick, and OENOD AI as a glowing orb in the middle. Centred and capped in width on tablets.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/tabs';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { C } from '../lib/theme';
import { Icon } from './Icon';

const native = Platform.OS !== 'web';

/** The OENOD AI orb: a softly lit sphere that breathes, with a faint ring around it. */
export function AiOrb({ size = 56, still }: { size?: number; still?: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    a.start();
    return () => a.stop();
  }, [v, still]);
  const sc = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const ring = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const ringO = v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
  const g = size * 2;
  const id = 'orb' + size;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View pointerEvents="none" style={{ position: 'absolute', width: g, height: g }}>
        <Svg width={g} height={g}>
          <Defs><RadialGradient id={id + 'g'} cx="50%" cy="50%" r="50%"><Stop offset="0.3" stopColor="#3D5BF5" stopOpacity={0.55} /><Stop offset="1" stopColor="#3D5BF5" stopOpacity={0} /></RadialGradient></Defs>
          <Circle cx={g / 2} cy={g / 2} r={g / 2} fill={`url(#${id}g)`} />
        </Svg>
      </View>
      {still ? null : <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size + 20, height: size + 20, borderRadius: (size + 20) / 2, borderWidth: 1, borderColor: 'rgba(175,195,255,0.25)', opacity: ringO, transform: [{ scale: ring }] }} />}
      <Animated.View style={{ transform: [{ scale: sc }] }}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id={id + 'f'} cx="35%" cy="30%" r="75%">
              <Stop offset="0" stopColor="#FFFFFF" /><Stop offset="0.18" stopColor="#AFC3FF" /><Stop offset="0.52" stopColor="#3D5BF5" /><Stop offset="1" stopColor="#000C58" />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id}f)`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** The small AI tile in the tab bar: a rounded square, blue to violet, with the spark. */
function AiTile({ on }: { on: boolean }) {
  return (
    <View style={{ width: 40, height: 40, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      shadowColor: '#3D5BF5', shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6, transform: [{ scale: on ? 1.06 : 1 }] }}>
      <Svg width={40} height={40} style={{ position: 'absolute' }}>
        <Defs><LinearGradient id="aitile" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#3D5BF5" /><Stop offset="1" stopColor="#6B5CF6" /></LinearGradient></Defs>
        <Rect x={0} y={0} width={40} height={40} rx={14} fill="url(#aitile)" />
      </Svg>
      <View style={{ zIndex: 1 }}><Icon name="spark" size={21} color="#FFFFFF" duo={false} /></View>
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
      <View style={{ width: barW, height: 66, borderRadius: 24, backgroundColor: dk ? 'rgba(12,21,54,0.97)' : 'rgba(255,255,255,0.97)', borderWidth: 1, borderColor: dk ? 'rgba(175,195,255,0.12)' : 'rgba(10,18,48,0.07)',
        shadowColor: '#0A1230', shadowOpacity: dk ? 0.5 : 0.18, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 14 }}>
        <View style={{ flexDirection: 'row', flex: 1 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {slot && idx >= 0 && !onAi ? (
            <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 8, width: slot, alignItems: 'center', transform: [{ translateX: x }] }}>
              <View style={{ width: 46, height: 30, borderRadius: 12, backgroundColor: dk ? 'rgba(175,195,255,0.14)' : '#EEF1FF' }} />
            </Animated.View>
          ) : null}
          {routes.map((r, i) => {
            const o: any = descriptors[r.key].options;
            const on = i === idx;
            const color = on ? (dk ? '#FFFFFF' : '#000C58') : (dk ? '#7A829C' : '#7A829C');
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
                    <Text numberOfLines={1} style={{ fontSize: 10.5, lineHeight: 13, fontWeight: '600', color }}>{label}</Text>
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
