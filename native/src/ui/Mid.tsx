// Midnight building blocks (approved preview 11-16, https://claude.ai/artifact/PH14VUxZ2Fvie7k4iBjZcF):
// glossy 3-D squircle icons, the hero's stat trio, Ava's white brief bar, the Money & meetings bento.
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Icon, type IconName } from './Icon';
import { Pressy } from './Motion';
import { C, MID } from '../lib/theme';

type Tone = 'nv' | 'wh' | 'bk';

/** Glossy squircle icon: gradient face, top gloss, offset back plate and a soft glyph shadow. */
export function GlossIcon({ icon, tone = 'nv', size = 52 }: { icon: IconName; tone?: Tone; size?: number }) {
  const r = size * 0.3;
  const id = 'gi' + tone + size;
  const face = tone === 'nv' ? ['#5B72FF', '#2238D8', '#0A1A9A'] : tone === 'wh' ? ['#FFFFFF', '#EEF1FA', '#D5DBEC'] : ['#3A3D4C', '#1A1C26', '#0B0C12'];
  const glyph = tone === 'wh' ? '#1B2EB0' : '#FFFFFF';
  const plate = tone === 'nv' ? '#06104F' : tone === 'wh' ? '#9AA3C2' : '#000000';
  return (
    <View style={{ width: size, height: size + 3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', top: 3, width: size, height: size, borderRadius: r, backgroundColor: plate, opacity: 0.85 }} />
      <View style={{ width: size, height: size, borderRadius: r, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
        shadowColor: tone === 'nv' ? '#2238D8' : '#000', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id={id + 'f'} x1="0.1" y1="0" x2="0.9" y2="1"><Stop offset="0" stopColor={face[0]} /><Stop offset="0.55" stopColor={face[1]} /><Stop offset="1" stopColor={face[2]} /></LinearGradient>
            <LinearGradient id={id + 'g'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={tone === 'wh' ? 0.9 : 0.42} /><Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} /></LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size} height={size} fill={`url(#${id}f)`} />
          <Path d={`M0 0H${size}V${size * 0.42}C${size * 0.7} ${size * 0.52} ${size * 0.3} ${size * 0.52} 0 ${size * 0.42}Z`} fill={`url(#${id}g)`} />
        </Svg>
        <View style={{ shadowColor: '#000', shadowOpacity: tone === 'wh' ? 0.12 : 0.35, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } }}>
          <Icon name={icon} size={Math.round(size * 0.46)} color={glyph} duo={false} />
        </View>
      </View>
    </View>
  );
}

export type Tile = { icon: IconName; label: string; sub?: string; go: () => void; tone?: Tone; badge?: string };

/** Tool grid: three across, glossy icons, label under. Every tile opens inside the app. */
export function ToolGrid({ items, cols = 3 }: { items: Tile[]; cols?: number }) {
  const [w, setW] = useState(0);
  const tw = w ? Math.floor((w - (cols - 1) * 10) / cols) : 100;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {items.map((q, i) => (
        <Pressy key={q.label + i} onPress={q.go} accessibilityRole="button" accessibilityLabel={q.sub ? `${q.label}, ${q.sub}` : q.label}
          style={{ width: tw, borderRadius: MID.rS, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
          <GlossIcon icon={q.icon} tone={q.tone || (['nv', 'wh', 'bk'] as Tone[])[i % 3]} size={50} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: C.ink, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{q.label}</Text>
            {q.sub ? <Text style={{ color: C.sub, fontSize: 11 }} numberOfLines={1}>{q.sub}</Text> : null}
          </View>
          {q.badge ? <View style={{ position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, height: 18, borderRadius: 9, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }}><Text style={{ color: C.sub, fontSize: 10, fontWeight: '700' }}>{q.badge}</Text></View> : null}
        </Pressy>
      ))}
    </View>
  );
}

export type Stat3 = { label: string; value: string; note?: string; good?: boolean; go?: () => void };

/** Three glass number tiles inside the navy hero card. */
export function StatTrio({ items }: { items: Stat3[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map((s) => (
        <View key={s.label} style={{ flex: 1, minWidth: 0 }}>
        <Pressy onPress={s.go} accessibilityRole="button" accessibilityLabel={`${s.label} ${s.value}${s.note ? ', ' + s.note : ''}`}
          style={{ borderRadius: 16, paddingVertical: 9, paddingHorizontal: 11, gap: 2, backgroundColor: 'rgba(0,6,40,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
          <Text style={{ color: '#C9D2FF', fontSize: 11 }} numberOfLines={1}>{s.label}</Text>
          <Text style={{ fontFamily: 'SG6', color: '#FFFFFF', fontSize: 18, marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
          {s.note ? <Text style={{ color: s.good ? '#8EF0B8' : '#C9D2FF', fontSize: 11, marginTop: 1 }} numberOfLines={1}>{s.note}</Text> : null}
        </Pressy>
        </View>
      ))}
    </View>
  );
}

/** White bar at the bottom of the hero: Ava's 30-second brief. */
export function BriefBar({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <Pressy onPress={onPress} accessibilityRole="button" accessibilityLabel={title}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingVertical: 8, paddingLeft: 10, paddingRight: 8, backgroundColor: '#FFFFFF' }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, overflow: 'hidden' }}>
        <Svg width={34} height={34}>
          <Defs><RadialGradient id="orb" cx="35%" cy="30%" r="75%"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="0.45" stopColor="#4A63FF" /><Stop offset="1" stopColor="#000C58" /></RadialGradient></Defs>
          <Rect x={0} y={0} width={34} height={34} fill="url(#orb)" />
        </Svg>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: '#000C58', fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{title}</Text>
        <Text style={{ color: '#4B5070', fontSize: 12 }} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000C58' }}>
        <Icon name="spark" size={17} color="#FFFFFF" duo={false} />
      </View>
    </Pressy>
  );
}

/** Small chip on the navy hero. */
export function HeroChip({ text }: { text: string }) {
  return (
    <View style={{ height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '600' }} numberOfLines={1}>{text}</Text>
    </View>
  );
}

/** Section title row on the black page. */
export function MidSec({ title, right, onRight }: { title: string; right?: string; onRight?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 2 }}>
      <Text style={{ color: C.ink, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 }} accessibilityRole="header">{title}</Text>
      {right ? (onRight ? <Pressable onPress={onRight} hitSlop={10} accessibilityRole="button"><Text style={{ color: C.sub, fontSize: 13 }}>{right}</Text></Pressable> : <Text style={{ color: C.sub, fontSize: 13 }}>{right}</Text>) : null}
    </View>
  );
}

export type Bento = {
  cash: { label: string; value: string; note?: string; up?: boolean; series?: number[]; go: () => void };
  pay: { label: string; value: string; note: string; go: () => void };
  meet: { label: string; title: string; note: string; go: () => void };
};

function SparkLine({ values, w, h }: { values: number[]; w: number; h: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values), min = Math.min(...values);
  const pts = values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * w).toFixed(1)} ${(h - 3 - ((v - min) / Math.max(1, max - min)) * (h - 6)).toFixed(1)}`).join(' ');
  return <Svg width={w} height={h}><Path d={pts} stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** Money & meetings: a tall navy cash card, a white payroll card and a black meeting card. */
export function MoneyBento({ b }: { b: Bento }) {
  const [w, setW] = useState(0);
  const half = w ? (w - 10) / 2 : 160;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', gap: 10 }}>
      <Pressy onPress={b.cash.go} accessibilityRole="button" accessibilityLabel={`${b.cash.label} ${b.cash.value}`}
        style={{ width: half, height: 214, borderRadius: MID.rM, padding: 14, overflow: 'hidden', justifyContent: 'space-between', backgroundColor: MID.g2 }}>
        <Svg width={half} height={214} style={{ position: 'absolute' }}>
          <Defs><LinearGradient id="bc" x1="0.1" y1="0" x2="0.9" y2="1"><Stop offset="0" stopColor={MID.g1} /><Stop offset="0.5" stopColor={MID.g2} /><Stop offset="1" stopColor={MID.g3} /></LinearGradient></Defs>
          <Rect x={0} y={0} width={half} height={214} fill="url(#bc)" />
        </Svg>
        <View>
          <Text style={{ color: MID.ice, fontSize: 12 }}>{b.cash.label}</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>{b.cash.value}</Text>
          {b.cash.note ? <Text style={{ color: b.cash.up ? '#5CF0A6' : MID.ice, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{b.cash.note}</Text> : null}
        </View>
        <SparkLine values={b.cash.series || []} w={half - 28} h={44} />
        <Text style={{ color: MID.ice, fontSize: 12, letterSpacing: 2 }}>•••• OENOD</Text>
      </Pressy>
      <View style={{ width: half, gap: 10 }}>
        <Pressy onPress={b.pay.go} accessibilityRole="button" accessibilityLabel={`${b.pay.label} ${b.pay.value}`}
          style={{ height: 102, borderRadius: MID.rM, padding: 13, backgroundColor: '#FFFFFF', justifyContent: 'space-between' }}>
          <Text style={{ color: '#3B4466', fontSize: 12 }} numberOfLines={1}>{b.pay.label}</Text>
          <Text style={{ color: '#0A1A9A', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }} numberOfLines={1} adjustsFontSizeToFit>{b.pay.value}</Text>
          <Text style={{ color: '#5A6286', fontSize: 11.5 }} numberOfLines={1}>{b.pay.note}</Text>
        </Pressy>
        <Pressy onPress={b.meet.go} accessibilityRole="button" accessibilityLabel={`${b.meet.label} ${b.meet.title}`}
          style={{ height: 102, borderRadius: MID.rM, padding: 13, backgroundColor: '#050608', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="video" size={14} color={C.sub} duo={false} />
            <Text style={{ color: C.sub, fontSize: 12 }} numberOfLines={1}>{b.meet.label}</Text>
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }} numberOfLines={1}>{b.meet.title}</Text>
          <Text style={{ color: '#5CF0A6', fontSize: 11.5, fontWeight: '600' }} numberOfLines={1}>{b.meet.note}</Text>
        </Pressy>
      </View>
    </View>
  );
}

/** Horizontal pill buttons under the bento. */
export function PillRow({ items }: { items: { label: string; icon?: IconName; go: () => void; primary?: boolean }[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {items.map((p) => (
        <Pressy key={p.label} onPress={p.go} accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 7, height: 42, paddingHorizontal: 16, borderRadius: 21, backgroundColor: p.primary ? '#FFFFFF' : C.card2, borderWidth: 1, borderColor: p.primary ? '#FFFFFF' : C.line }}>
          {p.icon ? <Icon name={p.icon} size={16} color={p.primary ? '#0A1A9A' : C.ink} duo={false} /> : null}
          <Text style={{ color: p.primary ? '#0A1A9A' : C.ink, fontSize: 14, fontWeight: '700' }}>{p.label}</Text>
        </Pressy>
      ))}
    </ScrollView>
  );
}
