// Floating tab bar: a rounded glass bar with a highlight that glides to the tab you pick.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { C } from '../lib/theme';

const native = Platform.OS !== 'web';

export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const routes = state.routes.filter((r) => !(descriptors[r.key]?.options as any)?.hidden);
  const activeKey = state.routes[state.index]?.key;
  const idx = Math.max(0, routes.findIndex((r) => r.key === activeKey));
  const [w, setW] = useState(0);
  const slot = routes.length ? w / routes.length : 0;
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: idx * slot, speed: 18, bounciness: 7, useNativeDriver: native }).start();
  }, [idx, slot, x]);
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, 10), paddingTop: 8, paddingHorizontal: 10,
      backgroundColor: C.tabBg, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: C.dark ? 0 : 1, borderColor: C.line,
      shadowColor: '#000', shadowOpacity: C.dark ? 0.6 : 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 16 }}>
      <View style={{ flexDirection: 'row' }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {slot ? (
          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 2, width: slot, height: 34, alignItems: 'center', transform: [{ translateX: x }] }}>
            <View style={{ width: 56, height: 34, borderRadius: 17, backgroundColor: C.dark ? 'rgba(255,255,255,0.10)' : '#E9ECFB' }} />
          </Animated.View>
        ) : null}
        {routes.map((r, i) => {
          const o: any = descriptors[r.key].options;
          const on = i === idx;
          const color = on ? C.tabOn : C.faint;
          const label = typeof o.tabBarLabel === 'string' ? o.tabBarLabel : o.title ?? r.name;
          return (
            <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}
              onPress={() => {
                const ev = emitter.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
                if (!on && !ev.defaultPrevented) { if (native) Haptics.selectionAsync().catch(() => {}); navigateToTab(r.key); }
              }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 7, paddingBottom: 2, gap: 6 }}>
              {o.tabBarIcon?.({ focused: on, color, size: 22 })}
              <Text numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, fontWeight: on ? '800' : '600', color }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
