// 3.9 signature shape: three layered navy/blue rings with a thin connector line and square markers,
// turning very slowly. Used behind headers, the kiosk and the launch screen. Never blocks touches,
// and stays still when the phone asks for reduced motion.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

export function Bands({ size = 260, style, spin = true }: { size?: number; style?: StyleProp<ViewStyle>; spin?: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  const [still, setStill] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {}); }, []);
  useEffect(() => {
    if (!spin || still) return;
    const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 60000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' }));
    loop.start();
    return () => loop.stop();
  }, [spin, still]); // eslint-disable-line react-hooks/exhaustive-deps
  const rot = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const s = size, w = s * 0.11, c = s / 2;
  return (
    <View pointerEvents="none" style={[{ width: s, height: s }, style]}>
      <Animated.View style={{ width: s, height: s, transform: [{ rotate: rot }] }}>
        <Svg width={s} height={s}>
          <Circle cx={c} cy={c} r={c - w / 2} stroke="rgba(42,59,196,0.55)" strokeWidth={w} fill="none" />
          <Circle cx={c} cy={c} r={c - w * 1.8} stroke="rgba(61,91,245,0.45)" strokeWidth={w} fill="none" />
          <Circle cx={c} cy={c} r={c - w * 3.1} stroke="rgba(142,160,255,0.35)" strokeWidth={w} fill="none" />
          <Line x1={0} y1={s * 0.62} x2={s * 0.42} y2={s * 0.62} stroke="rgba(185,196,255,0.7)" strokeWidth={1} />
          <Rect x={s * 0.12 - 3.5} y={s * 0.62 - 3.5} width={7} height={7} rx={1.5} fill="#B9C4FF" />
          <Rect x={s * 0.42 - 3.5} y={s * 0.62 - 3.5} width={7} height={7} rx={1.5} fill="#B9C4FF" />
        </Svg>
      </Animated.View>
    </View>
  );
}
