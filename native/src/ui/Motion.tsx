// Motion: cards rise in one after another, buttons press in with a spring, numbers count up.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

const native = Platform.OS !== 'web';
let reduce = false;
AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { reduce = !!v; }).catch(() => {});

/** Fades and slides its children up into place. Use a growing `delay` for a staggered list. */
export function Rise({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.timing(v, { toValue: 1, duration: 520, delay, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [v, delay]);
  const y = v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  return <Animated.View style={[{ opacity: v, transform: [{ translateY: y }] }, style]}>{children}</Animated.View>;
}

/** A pressable that sinks slightly with a spring and gives a light tap on the phone. */
export function Pressy({ children, style, onPress, haptic = true, ...rest }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; haptic?: boolean; children: React.ReactNode }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (x: number) => Animated.spring(s, { toValue: x, speed: 40, bounciness: x === 1 ? 8 : 0, useNativeDriver: native }).start();
  return (
    <Pressable {...rest} onPressIn={() => to(0.96)} onPressOut={() => to(1)}
      onPress={(e) => { if (haptic && native) Haptics.selectionAsync().catch(() => {}); onPress?.(e); }}>
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Counts a number up from zero when it first appears. */
export function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce || !isFinite(target)) { setV(target); return; }
    let raf = 0; const t0 = Date.now();
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      setV(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
