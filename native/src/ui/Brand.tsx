// Brand pieces shared by the splash, welcome and sign-in screens:
// the OENOD wordmark and a calm, slowly moving navy backdrop.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop, Circle, LinearGradient } from 'react-native-svg';
import { C } from '../lib/theme';

export function Wordmark({ width = 200 }: { width?: number }) {
  return (
    <Image source={require('../../assets/wordmark.png')} style={{ width, height: width * 0.27 }} resizeMode="contain"
      accessibilityRole="header" accessibilityLabel="OENOD" />
  );
}

const native = Platform.OS !== 'web';

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

function Glow({ size, color, opacity = 0.55 }: { size: number; color: string; opacity?: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={`g${color.slice(1)}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#g${color.slice(1)})`} />
    </Svg>
  );
}

/** Full-screen navy backdrop with two soft lights drifting slowly and a faint grid. */
export function Backdrop({ children }: { children?: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const a = useLoop(7000);
  const b = useLoop(9000, 1200);
  const big = Math.max(width, height) * 0.95;
  const ax = a.interpolate({ inputRange: [0, 1], outputRange: [-big * 0.35, -big * 0.2] });
  const ay = a.interpolate({ inputRange: [0, 1], outputRange: [-big * 0.35, -big * 0.25] });
  const bx = b.interpolate({ inputRange: [0, 1], outputRange: [width - big * 0.55, width - big * 0.7] });
  const by = b.interpolate({ inputRange: [0, 1], outputRange: [height - big * 0.55, height - big * 0.65] });
  return (
    <View style={{ flex: 1, backgroundColor: C.navy, overflow: 'hidden' }}>
      <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
        <Defs>
          <LinearGradient id="bd" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000C58" />
            <Stop offset="1" stopColor="#00062E" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#bd)" />
      </Svg>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', transform: [{ translateX: ax }, { translateY: ay }] }}>
        <Glow size={big} color="#3D63FF" opacity={0.45} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', transform: [{ translateX: bx }, { translateY: by }] }}>
        <Glow size={big} color="#7B9BFF" opacity={0.28} />
      </Animated.View>
      {children}
    </View>
  );
}

/** The opening screen while the app checks the saved sign-in. */
export function Splash() {
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useLoop(1400);
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [fade]);
  const scale = fade.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const bar = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });
  return (
    <Backdrop>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        <Animated.View style={{ opacity: fade, transform: [{ scale }] }}><Wordmark width={220} /></Animated.View>
        <View style={{ width: 120, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
          <Animated.View style={{ width: 120, height: 3, backgroundColor: C.white, transform: [{ scaleX: bar }] }} />
        </View>
      </View>
    </Backdrop>
  );
}
