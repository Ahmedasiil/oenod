// 4.0 "Navy Daylight" building blocks, drawn to match the approved live preview 1:1
// (https://claude.ai/artifact/Jj2DsJyfZSMSmUfPLvDxYc, 11-17): navy band with rings, white cards that overlap it,
// soft two-tone icon tiles coloured by meaning (People navy, Money sky blue, Time grey), Needs-you cards,
// the offerings strip and the raised Meet keys.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { PH, type PhName } from './phPaths';
import { Pressy } from './Motion';

export const H = {
  navy: '#000C58', navy2: '#04137A', blue: '#1A2FCF', ink: '#0A0B10', white: '#FFFFFF',
  mist: '#F3F4F8', line: '#E3E6EF', muted: '#5B6079', soft: '#AEB8F0', tint: '#EEF0FB',
};
const native = Platform.OS !== 'web';

/** Phosphor two-tone icon (same set as oenod.com). */
export function Ph({ name, size = 22, color = H.navy, duo = 0.22 }: { name: PhName; size?: number; color?: string; duo?: number }) {
  const p = PH[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256">
      <Path d={p[0]} fill={color} opacity={duo} />
      <Path d={p[1]} fill={color} />
    </Svg>
  );
}

/** Fills its parent with a gradient (angle given as start/end points). */
export function Grad({ id, stops, x1 = 0.2, y1 = 0, x2 = 0.8, y2 = 1, r = 0 }: { id: string; stops: [number, string, number?][]; x1?: number; y1?: number; x2?: number; y2?: number; r?: number }) {
  return (
    <Svg pointerEvents="none" style={[StyleSheet.absoluteFill, r ? { borderRadius: r } : null]} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
          {stops.map(([o, c, a], i) => <Stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />)}
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={100} height={100} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Navy band behind the top of a screen: navy to deep navy, with the big soft ring top-right. */
export function Band({ children, pad = 92, style }: { children?: React.ReactNode; pad?: number; style?: ViewStyle }) {
  return (
    <View style={[{ backgroundColor: H.navy, paddingHorizontal: 20, paddingBottom: pad, overflow: 'hidden' }, style]}>
      <Grad id="band" x1={0.1} y1={0} x2={0.6} y2={1.2} stops={[[0, H.navy], [0.7, H.navy2], [1.4, H.blue]]} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -80, top: -40, width: 260, height: 260, borderRadius: 130, borderWidth: 38, borderColor: 'rgba(255,255,255,0.05)' }} />
      {children}
    </View>
  );
}

/** White card with the soft navy shadow (the preview's .card). */
export const card: ViewStyle = {
  backgroundColor: H.white, borderRadius: 24, borderWidth: 1, borderColor: H.line,
  shadowColor: H.navy, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 4,
};

/** Section title: bold title left, blue link right. */
export function HSec({ title, right, onRight, children }: { title: string; right?: string; onRight?: () => void; children?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, paddingHorizontal: 4 }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: H.ink, letterSpacing: -0.2 }} accessibilityRole="header">{title}</Text>
      {children}
      {right ? <Pressable onPress={onRight} hitSlop={10} accessibilityRole="button" disabled={!onRight}><Text style={{ color: H.blue, fontSize: 13, fontWeight: '700' }}>{right}</Text></Pressable> : null}
    </View>
  );
}

export type Tone = 'navy' | 'blue' | 'ink' | 'light';
const TONE: Record<Tone, { a: string; b: string; fg: string; sh: string }> = {
  navy: { a: '#F1F3FE', b: '#E2E7FB', fg: '#000C58', sh: '#000C58' },
  blue: { a: '#EDF6FF', b: '#D2E5FF', fg: '#1A2FCF', sh: '#1A2FCF' },
  ink: { a: '#F5F6F9', b: '#E8EAF0', fg: '#0A0B10', sh: '#0A0B10' },
  light: { a: '#FFFFFF', b: '#F0F2FA', fg: '#1A2FCF', sh: '#1A2FCF' },
};

/** Soft squircle with a two-tone icon (58px, radius 22) and a top sheen. */
export function TileIcon({ icon, tone, size = 58, badge }: { icon: PhName; tone: Tone; size?: number; badge?: number }) {
  const c = TONE[tone];
  const r = Math.round(size * 0.38);
  return (
    <View style={{ width: size, height: size, borderRadius: r, shadowColor: c.sh, shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}>
      <View style={{ flex: 1, borderRadius: r, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tone === 'light' ? '#E6E9F5' : 'rgba(0,12,88,0.05)' }}>
        <Grad id={'ti' + tone + size} x1={0.25} y1={0} x2={0.6} y2={1} stops={[[0, c.a], [1, c.b]]} />
        <Grad id={'ts' + tone + size} x1={0.5} y1={0} x2={0.5} y2={1} stops={[[0, '#FFFFFF', 0.7], [0.45, '#FFFFFF', 0]]} />
        <View style={{ zIndex: 1 }}><Ph name={icon} size={Math.round(size * 0.48)} color={c.fg} duo={tone === 'light' ? 0.3 : 0.22} /></View>
      </View>
      {badge ? (
        <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 3, backgroundColor: '#4A63FF', borderWidth: 2, borderColor: H.white, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: H.white, fontSize: 10, fontWeight: '800' }}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export type TileItem = { label: string; icon: PhName; tone: Tone; badge?: number; go: () => void };

/** The Everything grid: 4 per row, soft tiles with the name under them. */
export function TileGrid({ items }: { items: TileItem[] }) {
  return (
    <View style={[card, { paddingVertical: 16, paddingHorizontal: 6, flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }]}>
      {items.map((x) => (
        <View key={x.label} style={{ width: '25%', alignItems: 'center' }}>
          <Pressy onPress={x.go} accessibilityRole="button" accessibilityLabel={x.badge ? `${x.label}, ${x.badge}` : x.label} style={{ alignItems: 'center', gap: 7 }}>
            <TileIcon icon={x.icon} tone={x.tone} badge={x.badge} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: H.ink }} numberOfLines={1}>{x.label}</Text>
          </Pressy>
        </View>
      ))}
    </View>
  );
}

/** Colour key next to "Everything": People, Money, Time. */
export function Legend({ items }: { items: [string, string][] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {items.map(([c, l]) => (
        <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: c }} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: H.muted }}>{l}</Text>
        </View>
      ))}
    </View>
  );
}
export const LEGEND: [string, string][] = [['#000C58', 'People'], ['#1A2FCF', 'Money'], ['#8A90A6', 'Time']];

export type Need = { key: string; icon: PhName; title: string; sub?: string; tone: 'navy' | 'blue' | 'ink'; go: () => void };
const NEED_BG = { navy: ['#E6EAFB', '#000C58'], blue: ['#E9F0FF', '#1A2FCF'], ink: ['#EEF0F4', '#0A0B10'] } as const;

/** One "Needs you" card (150 x 118). */
export function NeedCard({ n }: { n: Need }) {
  const [bg, fg] = NEED_BG[n.tone];
  return (
    <Pressy onPress={n.go} accessibilityRole="button" accessibilityLabel={`${n.title}${n.sub ? ', ' + n.sub : ''}`}
      style={{ width: 150, height: 118, borderRadius: 20, borderWidth: 1, borderColor: H.line, backgroundColor: H.white, padding: 12, justifyContent: 'space-between' }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Ph name={n.icon} size={22} color={fg} /></View>
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: H.ink, lineHeight: 17 }} numberOfLines={2}>{n.title}</Text>
        {n.sub ? <Text style={{ fontSize: 12, color: H.muted }} numberOfLines={1}>{n.sub}</Text> : null}
      </View>
    </Pressy>
  );
}

/** Small rounded chip (status, "On site", "Live"). */
export function HChip({ text, bg = H.mist, fg = H.muted, live, h = 26 }: { text: string; bg?: string; fg?: string; live?: boolean; h?: number }) {
  return (
    <View style={{ height: h, paddingHorizontal: 10, borderRadius: 999, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
      {live ? <Pulse color={fg} /> : null}
      <Text style={{ fontSize: h < 26 ? 11 : 12, fontWeight: '700', color: fg }} numberOfLines={1}>{text}</Text>
    </View>
  );
}

/** Blinking dot (1.6s). */
export function Pulse({ color, size = 8 }: { color: string; size?: number }) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 0.3, duration: 800, useNativeDriver: native }),
      Animated.timing(v, { toValue: 1, duration: 800, useNativeDriver: native }),
    ]));
    l.start(); return () => l.stop();
  }, [v]);
  return <Animated.View style={{ width: size, height: size, borderRadius: size, backgroundColor: color, opacity: v }} />;
}

/** Big navy button (58 high), or black when `ink`. */
export function Primary({ text, icon, onPress, ink, busy, style }: { text: string; icon?: PhName; onPress?: () => void; ink?: boolean; busy?: boolean; style?: ViewStyle }) {
  return (
    <Pressable onPress={busy ? undefined : onPress} accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ busy: !!busy }}
      style={({ pressed }) => [{ height: 58, borderRadius: 18, backgroundColor: ink ? H.ink : H.navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: busy ? 0.7 : 1,
        shadowColor: H.navy, shadowOpacity: ink ? 0 : 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: ink ? 0 : 6, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}>
      {icon ? <Ph name={icon} size={20} color={H.white} duo={0.3} /> : null}
      <Text style={{ color: H.white, fontWeight: '800', fontSize: 17 }}>{text}</Text>
    </Pressable>
  );
}

/** White outlined button (48 high). */
export function Ghost({ text, icon, onPress, busy, style }: { text: string; icon?: PhName; onPress?: () => void; busy?: boolean; style?: ViewStyle }) {
  return (
    <Pressable onPress={busy ? undefined : onPress} accessibilityRole="button" accessibilityLabel={text}
      style={({ pressed }) => [{ flex: 1, height: 48, borderRadius: 16, borderWidth: 1.5, borderColor: H.line, backgroundColor: pressed ? H.mist : H.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: busy ? 0.6 : 1 }, style]}>
      {icon ? <Ph name={icon} size={17} color={H.ink} /> : null}
      <Text style={{ color: H.ink, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{text}</Text>
    </Pressable>
  );
}

/** Two rows of offering chips sliding in opposite directions (welcome page). */
export function OfferStrip({ rows }: { rows: [PhName, string][][] }) {
  return (
    <View style={{ marginHorizontal: -26, gap: 8, overflow: 'hidden' }} accessibilityLabel={rows.flat().map((r) => r[1]).join(', ')}>
      {rows.map((r, i) => <Lane key={i} items={r} reverse={i % 2 === 1} />)}
      <Grad id="ofl" x1={0} y1={0.5} x2={0.14} y2={0.5} stops={[[0, H.navy], [1, H.navy, 0]]} />
      <Grad id="ofr" x1={1} y1={0.5} x2={0.86} y2={0.5} stops={[[0, H.navy2], [1, H.navy2, 0]]} />
    </View>
  );
}

function Lane({ items, reverse }: { items: [PhName, string][]; reverse?: boolean }) {
  const [w, setW] = React.useState(0);
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!w) return;
    x.setValue(reverse ? -w : 0);
    const a = Animated.loop(Animated.timing(x, { toValue: reverse ? 0 : -w, duration: w * 38, easing: Easing.linear, useNativeDriver: native }));
    a.start(); return () => a.stop();
  }, [w, reverse, x]);
  const chips = (k: string) => items.map(([ic, l]) => (
    <View key={k + l} style={{ height: 34, paddingLeft: 6, paddingRight: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: H.white, alignItems: 'center', justifyContent: 'center' }}><Ph name={ic} size={14} color={H.navy} /></View>
      <Text style={{ color: H.white, fontSize: 13, fontWeight: '700' }}>{l}</Text>
    </View>
  ));
  return (
    <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>{chips('a')}</View>
      <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>{chips('b')}</View>
    </Animated.View>
  );
}

/** Raised 3-D Meet key (navy; white when "off"; red for Leave or muted). */
export function Key({ icon, label, onPress, tone = 'navy', wide }: { icon?: PhName; label: string; onPress: () => void; tone?: 'navy' | 'white' | 'red'; wide?: boolean }) {
  const s = { navy: ['#2B44E8', '#1A2FCF', '#0E1C8F', '#050E4F', H.white], white: ['#FFFFFF', '#F1F3FB', '#E3E7F7', '#9AA3CC', H.navy], red: ['#FF6B70', '#D61F2C', '#A4121D', '#6E0A12', H.white] }[tone];
  return (
    <Pressy onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: wide ? 76 : 52, height: 56, borderRadius: 18, backgroundColor: s[3], shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 7, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
      <View style={{ height: 52, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.35)' }}>
        <Grad id={'k' + tone} x1={0.5} y1={0} x2={0.5} y2={1} stops={[[0, s[0]], [0.45, s[1]], [1, s[2]]]} />
        <View style={{ zIndex: 1 }}>{icon ? <Ph name={icon} size={24} color={s[4]} duo={0.3} /> : <Text style={{ color: s[4], fontWeight: '900', fontSize: 14 }}>{label}</Text>}</View>
      </View>
    </Pressy>
  );
}
