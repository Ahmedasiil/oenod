// 3.9.1: the approved "OENOD App 3.9 Look" building blocks, the same as the new Today and HQ pages on
// oenod.com: glass chips and Ask Ava bar in the navy header, a swipeable numbers strip, Quick access
// tiles, cards with a navy header band, status lights, "At a glance" tiles and the one black money card.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { C } from '../lib/theme';
import { Icon, IconName } from './Icon';
import { Pressy } from './Motion';

const native = Platform.OS !== 'web';
export const LAV = '#B9C4FF';

/** Small glass label in the navy header (company, date, weather). */
export function Chip({ text, icon }: { text: string; icon?: IconName }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
      {icon ? <Icon name={icon} size={12} color="#DCE1FF" duo={false} /> : null}
      <Text style={{ color: '#DCE1FF', fontSize: 11.5, fontWeight: '500' }} numberOfLines={1}>{text}</Text>
    </View>
  );
}

/** White "Ask Ava anything…" bar with a shining gradient Ask button. */
export function AskBar({ label, button, onPress }: { label: string; button: string; onPress: () => void }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([Animated.timing(x, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: native }), Animated.delay(1400)]));
    l.start(); return () => l.stop();
  }, [x]);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 6, paddingRight: 6, paddingLeft: 14, opacity: pressed ? 0.92 : 1,
        shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 })}>
      <Text style={{ flex: 1, color: '#5A6286', fontSize: 13.5 }} numberOfLines={1}>{label}</Text>
      <View style={{ borderRadius: 12, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 }}>
        <Svg style={{ position: 'absolute', left: 0, top: 0 }} width={120} height={40}>
          <Defs><LinearGradient id="askg" x1="0" y1="0" x2="1" y2="0.4"><Stop offset="0" stopColor="#000C58" /><Stop offset="0.6" stopColor="#2A3BC4" /><Stop offset="1" stopColor="#8EA0FF" /></LinearGradient></Defs>
          <Rect width={120} height={40} fill="url(#askg)" />
        </Svg>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, width: 30, backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-40, 110] }) }, { skewX: '-20deg' }] }} />
        <Icon name="spark" size={14} color="#FFFFFF" duo={false} />
        <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>{button}</Text>
      </View>
    </Pressable>
  );
}

export function Suggest({ items, onPick }: { items: [string, string][]; onPick: (q: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginTop: -8 }}>
      {items.map(([label, q]) => (
        <Pressable key={label} onPress={() => onPick(q)} accessibilityRole="button"
          style={({ pressed }) => ({ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: pressed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)' })}>
          <Text style={{ color: '#FFFFFF', fontSize: 12 }}>{label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Spark({ values, color, w = 104, h = 22 }: { values: number[]; color: string; w?: number; h?: number }) {
  if (values.length < 2) return <View style={{ height: h }} />;
  const max = Math.max(...values), min = Math.min(...values);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * w).toFixed(1)} ${(h - 2 - ((v - min) / Math.max(1e-6, max - min)) * (h - 4)).toFixed(1)}`).join(' ');
  return <Svg width={w} height={h}><Path d={d} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export type Kpi = { label: string; value: string; delta?: string; up?: boolean; series?: number[]; go?: () => void };
/** Swipeable strip of live numbers with tiny sparklines. */
export function KpiStrip({ items, side }: { items: Kpi[]; side: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={136}
      style={{ marginHorizontal: -side }} contentContainerStyle={{ paddingHorizontal: side, gap: 8 }}>
      {items.map((k) => (
        <Pressy key={k.label} onPress={k.go} accessibilityRole="button" accessibilityLabel={`${k.label}: ${k.value}`}
          style={{ width: 128, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 11, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
          <Text style={{ color: LAV, fontSize: 11 }} numberOfLines={1}>{k.label}</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] }} numberOfLines={1}>{k.value}</Text>
          {k.delta ? <Text style={{ color: k.up === false ? '#FFB4A9' : '#5EEAA8', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>{k.delta}</Text> : <Text style={{ fontSize: 11 }}> </Text>}
          <View style={{ marginTop: 6 }}><Spark values={k.series || []} color={k.up === false ? '#FFB4A9' : '#5EEAA8'} /></View>
        </Pressy>
      ))}
    </ScrollView>
  );
}

export type QA = { label: string; sub: string; icon: IconName; go: () => void };
/** Quick access: three across, the first tile white. */
export function QuickAccess({ title, items }: { title: string; items: QA[] }) {
  const [w, setW] = useState(0);
  const tw = w ? Math.floor((w - 16) / 3) : 100;
  return (
    <View style={{ gap: 8 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Text style={{ color: LAV, fontSize: 11, letterSpacing: 1.3, fontWeight: '600' }}>{title.toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map((q, i) => (
          <Pressy key={q.label} onPress={q.go} accessibilityRole="button" accessibilityLabel={q.label}
            style={{ width: tw, borderRadius: 14, paddingTop: 9, paddingHorizontal: 9, paddingBottom: 8, borderWidth: 1,
              backgroundColor: i ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderColor: i ? 'rgba(255,255,255,0.13)' : '#FFFFFF' }}>
            <View style={{ width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: i ? 'rgba(255,255,255,0.14)' : '#000C58' }}>
              <Icon name={q.icon} size={16} color="#FFFFFF" duo={false} />
            </View>
            <Text style={{ color: i ? '#FFFFFF' : '#000C58', fontSize: 12.5, fontWeight: '600' }} numberOfLines={1}>{q.label}</Text>
            <Text style={{ color: i ? LAV : '#5A6286', fontSize: 10.5 }} numberOfLines={1}>{q.sub}</Text>
          </Pressy>
        ))}
      </View>
    </View>
  );
}

/** Card with the website's navy header band: glass icon tile, title, one-line hint and a white pill link. */
export function NavyCard({ icon, title, sub, link, onLink, children, style }: { icon: IconName; title: string; sub?: string; link?: string; onLink?: () => void; children?: React.ReactNode; style?: any }) {
  const [w, setW] = useState(360);
  return (
    <View style={[{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 22, overflow: 'hidden',
      shadowColor: '#000C58', shadowOpacity: C.dark ? 0 : 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 }, style]}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, overflow: 'hidden' }}>
        <Svg style={{ position: 'absolute', left: 0, top: 0 }} width={w} height={70}>
          <Defs><LinearGradient id={'nc' + title.length} x1="0" y1="0" x2="1" y2="0.5"><Stop offset="0" stopColor="#000C58" /><Stop offset="0.55" stopColor="#0B1C86" /><Stop offset="1" stopColor="#1B2A9E" /></LinearGradient></Defs>
          <Rect width={w} height={70} fill={`url(#nc${title.length})`} />
        </Svg>
        <View style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <Icon name={icon} size={18} color="#FFFFFF" duo={false} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' }} numberOfLines={1} accessibilityRole="header">{title}</Text>
          {sub ? <Text style={{ color: LAV, fontSize: 11.5 }} numberOfLines={1}>{sub}</Text> : null}
        </View>
        {link ? (
          <Pressable onPress={onLink} accessibilityRole="button" hitSlop={8} style={({ pressed }) => ({ borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11, backgroundColor: pressed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)' })}>
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>{link}</Text>
          </Pressable>
        ) : null}
      </View>
      {children ? <View style={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 12 }}>{children}</View> : null}
    </View>
  );
}

/** Status light: green ok, amber needs a look, red needs action now (pulses). */
export function Light({ kind = 'g' }: { kind?: 'g' | 'a' | 'r' }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (kind !== 'r') return;
    const l = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: native }));
    l.start(); return () => l.stop();
  }, [kind, v]);
  const col = kind === 'r' ? '#E5484D' : kind === 'a' ? '#F5A524' : '#12C163';
  const halo = kind === 'r' ? 'rgba(229,72,77,0.18)' : kind === 'a' ? 'rgba(245,165,36,0.2)' : 'rgba(18,193,99,0.18)';
  return (
    <View style={{ width: 17, height: 17, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 17, height: 17, borderRadius: 9, backgroundColor: halo }} />
      {kind === 'r' ? <Animated.View style={{ position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: col, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }] }} /> : null}
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: col }} />
    </View>
  );
}

/** One row inside a navy card: light, title, hint and up to two small buttons. */
export function LightRow({ kind, title, sub, first, a, b, right, onPress }: { kind?: 'g' | 'a' | 'r'; title: string; sub?: string; first?: boolean;
  a?: { label: string; go: () => void; busy?: boolean }; b?: { label: string; go: () => void }; right?: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: first ? 0 : 1, borderColor: C.line }}>
      <Light kind={kind} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: C.ink, fontSize: 13.5, fontWeight: '600' }} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={{ color: C.sub, fontSize: 12 }} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right}
      {b ? <SmallBtn label={b.label} onPress={b.go} /> : null}
      {a ? <SmallBtn label={a.label} onPress={a.go} primary busy={a.busy} /> : null}
    </Pressable>
  );
}

export function SmallBtn({ label, onPress, primary, busy }: { label: string; onPress: () => void; primary?: boolean; busy?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" hitSlop={4}
      style={({ pressed }) => ({ borderRadius: 10, paddingVertical: 7, paddingHorizontal: 11, opacity: pressed || busy ? 0.7 : 1,
        backgroundColor: primary ? (C.dark ? '#FFFFFF' : '#000C58') : C.card2, borderWidth: primary ? 0 : 1, borderColor: C.line })}>
      <Text style={{ color: primary ? (C.dark ? '#000C58' : '#FFFFFF') : C.ink, fontSize: 12.5, fontWeight: '600' }}>{busy ? '…' : label}</Text>
    </Pressable>
  );
}

export type Glance = { label: string; value: string; hint: string; icon: IconName; kind?: 'g' | 'a' | 'r' | 'ava'; go: () => void };
/** "At a glance": two across, each area's live number, a hint and a light. Red tiles turn soft red; Ava is navy. */
export function GlanceGrid({ items }: { items: Glance[] }) {
  const [w, setW] = useState(0);
  const tw = w ? Math.floor((w - 8) / 2) : 150;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {items.map((g) => {
        const ava = g.kind === 'ava', red = g.kind === 'r';
        return (
          <Pressy key={g.label} onPress={g.go} accessibilityRole="button" accessibilityLabel={`${g.label}: ${g.value}, ${g.hint}`}
            style={{ width: tw, borderRadius: 16, padding: 10, borderWidth: 1, overflow: 'hidden',
              backgroundColor: ava ? '#000C58' : red ? (C.dark ? '#3D1220' : '#FDE8EC') : C.card2, borderColor: ava ? '#000C58' : red ? (C.dark ? '#5A2030' : '#F4C7CF') : C.line }}>
            <View style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: ava ? 'rgba(255,255,255,0.14)' : '#000C58' }}>
              <Icon name={g.icon} size={16} color="#FFFFFF" duo={false} />
            </View>
            {!ava ? <View style={{ position: 'absolute', top: 10, right: 10 }}><Light kind={(g.kind as any) || 'g'} /></View> : null}
            <Text style={{ color: ava ? '#FFFFFF' : C.ink, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] }} numberOfLines={1}>{g.value}</Text>
            <Text style={{ color: ava ? '#FFFFFF' : C.ink, fontSize: 12.5, fontWeight: '600' }} numberOfLines={1}>{g.label}</Text>
            <Text style={{ color: ava ? LAV : C.sub, fontSize: 11 }} numberOfLines={1}>{g.hint}</Text>
          </Pressy>
        );
      })}
    </View>
  );
}

/** Health bar: green / amber / red share of all areas. */
export function HealthBar({ g, a, r }: { g: number; a: number; r: number }) {
  return (
    <View style={{ flexDirection: 'row', height: 9, borderRadius: 99, overflow: 'hidden', gap: 2, marginBottom: 10 }}>
      {g ? <View style={{ flex: g, backgroundColor: '#12C163' }} /> : null}
      {a ? <View style={{ flex: a, backgroundColor: '#F5A524' }} /> : null}
      {r ? <View style={{ flex: r, backgroundColor: '#E5484D' }} /> : null}
    </View>
  );
}

/** The one black card (money), with a royal glow in the corner. */
export function BlackCard({ eyebrow, value, sub, a, b }: { eyebrow: string; value: string; sub?: string; a: { label: string; go: () => void }; b?: { label: string; go: () => void } }) {
  const [w, setW] = useState(360);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: '#0A0B14', padding: 14, borderWidth: 1, borderColor: '#0A0B14' }}>
      <Svg style={{ position: 'absolute', left: 0, top: 0 }} width={w} height={200}>
        <Defs><LinearGradient id="bkg" x1="1" y1="0" x2="0.3" y2="0.8"><Stop offset="0" stopColor="#1B2A9E" stopOpacity={0.9} /><Stop offset="0.55" stopColor="#1B2A9E" stopOpacity={0} /></LinearGradient></Defs>
        <Rect width={w} height={200} fill="url(#bkg)" />
      </Svg>
      <Text style={{ color: LAV, fontSize: 12 }}>{eyebrow}</Text>
      <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '700', marginVertical: 4, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {sub ? <Text style={{ color: LAV, fontSize: 12 }}>{sub}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Pressable onPress={a.go} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: '#FFFFFF', opacity: pressed ? 0.85 : 1 })}>
          <Text style={{ color: '#000C58', fontWeight: '700', fontSize: 13 }}>{a.label}</Text>
        </Pressable>
        {b ? (
          <Pressable onPress={b.go} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)' })}>
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>{b.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Section title between cards. */
export function Sec({ title, right }: { title: string; right?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2, marginBottom: -4 }}>
      <Text style={{ color: C.ink, fontSize: 15, fontWeight: '700' }} accessibilityRole="header">{title}</Text>
      {right ? <Text style={{ color: C.faint, fontSize: 12 }}>{right}</Text> : null}
    </View>
  );
}
