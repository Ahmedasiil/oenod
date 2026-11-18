// Midnight v6 building blocks, drawn to match the approved preview 1:1
// (https://claude.ai/artifact/PH14VUxZ2Fvie7k4iBjZcF): top bar, Needs-you cards, bento, white action pills,
// team strip, activity cards, setup list, sub-screen header. Sizes and colours come straight from that file.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { router } from 'expo-router';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';
import { Pressy } from './Motion';
import { t } from '../lib/i18n';
import { onPalette, C } from '../lib/theme';

/** v6 tokens. */
// App look 4.0 ("Navy Daylight", approved 11-17, https://claude.ai/artifact/Jj2DsJyfZSMSmUfPLvDxYc): white pages, navy bands,
// black floating tab bar. Dark stays available in Me > Appearance; V follows the chosen mode.
const VD = {
  bg: '#0A0B10', surf: '#111219', surf2: '#1A1C26', line: 'rgba(255,255,255,0.08)', mute: '#9AA0B8', faint: '#6B7090',
  blue: '#2B44E8', blue2: '#4A63FF', navy: '#000C58', ice: '#DCE3FF', good: '#28D17C', mint: '#8EF0B8', bk: '#14151C', grey: '#2A2C36',
  ink: '#FFFFFF', pill: '#FFFFFF', pillInk: '#000C58', sheet: '#13141B', ring: '#3A3D4A', link: '#AFC0FF', progA: '#FFFFFF', shade: 0, dark: true,
  rL: 28, rM: 22, rS: 18,
};
const VL: typeof VD = {
  bg: '#FFFFFF', surf: '#FFFFFF', surf2: '#F3F4F8', line: '#E3E6EF', mute: '#5B6079', faint: '#8A90AE',
  blue: '#1A2FCF', blue2: '#4A63FF', navy: '#000C58', ice: '#DCE3FF', good: '#12A25B', mint: '#8EF0B8', bk: '#0A0B10', grey: '#E3E6EF',
  ink: '#0A0B10', pill: '#000C58', pillInk: '#FFFFFF', sheet: '#FFFFFF', ring: '#C9CEDD', link: '#1A2FCF', progA: '#AEB8F0', shade: 1, dark: false,
  rL: 28, rM: 22, rS: 18,
};
export const V = { ...VL };
onPalette(() => Object.assign(V, C.dark ? VD : VL));
/** Soft card shadow + border used on white cards in the light look. */
export const lift = () => (V.dark ? {} : { borderWidth: 1, borderColor: V.line, shadowColor: '#000C58', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 });
/** Heading font (Space Grotesk 600 / 700). */
// 4.1 Meet look: headings are the system's heavy face (SF on iPhone, Roboto on Android), tight like the preview's Inter 800.
export const FH = { fontWeight: '800', letterSpacing: -0.3 } as const;
export const FH7 = { fontWeight: '800', letterSpacing: -0.4 } as const;

type Tone = 'nv' | 'wh' | 'dk' | 'bk';

/** Navy gradient that fills its parent (155deg #3B55FF → #2238D8 → #0A1A9A). */
export function NavyFill({ id = 'nf', hero = false }: { id?: string; hero?: boolean }) {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={id} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={V.dark ? '#3B55FF' : '#1A2FCF'} />
          <Stop offset={hero ? '0.4' : '0.45'} stopColor={V.dark ? (hero ? '#1A2FCF' : '#2238D8') : '#04137A'} />
          <Stop offset="1" stopColor={V.dark ? (hero ? '#000C58' : '#0A1A9A') : '#000C58'} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={100} height={100} fill={`url(#${id})`} />
    </Svg>
  );
}

const initialsOf = (name: string) => (name || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

/** Gradient avatar circle with initials (v6 .av). */
export function Av({ name, size = 42, color, ring }: { name: string; size?: number; color?: string | null; ring?: boolean }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: color || V.blue2 },
      ring ? { borderWidth: 3, borderColor: V.bg, shadowColor: V.blue2, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } } : null]}>
      {color ? null : (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 10 10" preserveAspectRatio="none">
          <Defs><LinearGradient id="avg" x1="0.1" y1="0" x2="0.9" y2="1"><Stop offset="0" stopColor="#4A63FF" /><Stop offset="1" stopColor="#000C58" /></LinearGradient></Defs>
          <Rect width={10} height={10} fill="url(#avg)" />
        </Svg>
      )}
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: size * 0.34 }}>{initialsOf(name)}</Text>
    </View>
  );
}

/** Home top row: OENOD logo, bell with a white count badge, avatar. */
export function TopRow({ name, unread, avColor, onBell, onMe }: { name: string; unread: number; avColor?: string | null; onBell: () => void; onMe: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
      <Logo width={63} color={V.ink} />
      <View style={{ flex: 1 }} />
      <Pressable onPress={onBell} accessibilityRole="button" accessibilityLabel={`${t('Notifications')}${unread ? ` (${unread})` : ''}`}
        style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: V.surf, borderWidth: 1, borderColor: V.line }}>
        <Icon name="bell" size={18} color={V.ink} duo={false} />
        {unread ? <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}><Text style={{ color: V.navy, fontSize: 10.5, fontWeight: '700' }}>{unread > 9 ? '9+' : unread}</Text></View> : null}
      </Pressable>
      <Pressable onPress={onMe} accessibilityRole="button" accessibilityLabel={t('Me')}><Av name={name} size={44} color={avColor} /></Pressable>
    </View>
  );
}

/** Sub-screen header: round back button, centred title, optional round button on the right. */
export function SubTop({ title, onBack, right, rightLabel, onRight }: { title: string; onBack?: () => void; right?: IconName; rightLabel?: string; onRight?: () => void }) {
  const back = onBack || (() => (router.canGoBack() ? router.back() : router.replace('/')));
  const btn = { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: V.surf, borderWidth: 1, borderColor: V.line } as ViewStyle;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
      <Pressable onPress={back} style={btn} accessibilityRole="button" accessibilityLabel={t('Back')} hitSlop={6}><Icon name="back" size={18} color={V.ink} duo={false} /></Pressable>
      <Text style={[FH, { flex: 1, textAlign: 'center', color: V.ink, fontSize: 18 }]} numberOfLines={1} accessibilityRole="header">{title}</Text>
      {right ? <Pressable onPress={onRight} style={btn} accessibilityRole="button" accessibilityLabel={rightLabel || title} hitSlop={6}><Icon name={right} size={18} color={V.ink} duo={false} /></Pressable> : <View style={{ width: 42 }} />}
    </View>
  );
}

/** Section title row (v6 .sec): 16px heading font, small grey link on the right. */
export function Sec({ title, right, onRight }: { title: string; right?: string; onRight?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: -6 }}>
      <Text style={[FH, { color: V.ink, fontSize: 16 }]} accessibilityRole="header">{title}</Text>
      {right ? <Pressable onPress={onRight} hitSlop={10} accessibilityRole="button" disabled={!onRight}><Text style={{ color: V.mute, fontSize: 12.5 }}>{right}</Text></Pressable> : null}
    </View>
  );
}

/** Edge-to-edge horizontal scroller that keeps the 16px gutter (v6 .minis / .tx / .team). */
export function HRow({ children, gap = 10, pad = 16 }: { children: React.ReactNode; gap?: number; pad?: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -pad, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: pad, gap, paddingVertical: 2 }}>
      {children}
    </ScrollView>
  );
}

export type Mini = { tone: Tone; icon: IconName; kind: string; title: string; btn?: string; go: () => void; busy?: boolean; done?: boolean };

/** "Needs you" small cards: white, dark or navy, 148 wide, with one pill button. */
export function Minis({ items }: { items: Mini[] }) {
  return (
    <HRow>
      {items.map((m, i) => {
        const ink = m.tone === 'wh' ? '#0A0B10' : m.tone === 'dk' ? V.ink : '#FFFFFF';
        return (
          <View key={m.kind + i} style={{ width: 148, minHeight: 132, borderRadius: V.rM, padding: 14, overflow: 'hidden', justifyContent: 'space-between', opacity: m.done ? 0.55 : 1,
            backgroundColor: m.tone === 'wh' ? '#FFFFFF' : m.tone === 'nv' ? '#2238D8' : V.surf2, borderWidth: m.tone === 'dk' || (m.tone === 'wh' && !V.dark) ? 1 : 0, borderColor: V.line }}>
            {m.tone === 'nv' ? <NavyFill id={'mn' + i} /> : null}
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.7 }}>
                <Icon name={m.icon} size={15} color={ink} duo={false} />
                <Text style={{ color: ink, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6 }} numberOfLines={1}>{m.kind.toUpperCase()}</Text>
              </View>
              <Text style={[FH, { color: ink, fontSize: 14, lineHeight: 17, minHeight: 34 }]} numberOfLines={2}>{m.title}</Text>
            </View>
            {m.btn && !m.done ? (
              <Pressy onPress={m.go} accessibilityRole="button" accessibilityLabel={`${m.btn}: ${m.title}`}
                style={{ alignSelf: 'flex-start', marginTop: 8, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 99, backgroundColor: m.tone === 'wh' || (m.tone === 'dk' && !V.dark) ? V.navy : '#FFFFFF', opacity: m.busy ? 0.6 : 1 }}>
                <Text style={{ color: m.tone === 'wh' || (m.tone === 'dk' && !V.dark) ? '#FFFFFF' : V.navy, fontSize: 12.5, fontWeight: '600' }}>{m.btn}</Text>
              </Pressy>
            ) : null}
          </View>
        );
      })}
    </HRow>
  );
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <Svg width="100%" height={50} viewBox="0 0 140 50" preserveAspectRatio="none"><Path d="M0 44 C18 40 24 26 40 30 S62 12 80 18 S112 4 140 2" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2.5} fill="none" strokeLinecap="round" /></Svg>;
  }
  const max = Math.max(...values), min = Math.min(...values);
  const pts = values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * 140).toFixed(1)} ${(46 - ((v - min) / Math.max(1, max - min)) * 42).toFixed(1)}`).join(' ');
  return <Svg width="100%" height={50} viewBox="0 0 140 50" preserveAspectRatio="none"><Path d={pts} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

const Rings = ({ dark }: { dark?: boolean }) => (
  <View style={{ flexDirection: 'row' }}>
    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: dark ? V.navy : 'rgba(255,255,255,0.85)' }} />
    <View style={{ width: 24, height: 24, borderRadius: 12, marginLeft: -10, backgroundColor: dark ? V.blue2 : 'rgba(255,255,255,0.45)' }} />
  </View>
);

export type BigTile = { label: string; value: string; note?: string; noteColor?: string; series?: number[]; foot?: string; go: () => void; busy?: boolean };
export type SmallTile = { icon: IconName; label: string; value: string; note?: string; go: () => void; face?: string };

/** Money & meetings bento: tall navy card left, white and black cards stacked right. */
export function Bento({ tall, a, b, bigValue = 27 }: { tall: BigTile; a: SmallTile; b: SmallTile; bigValue?: number }) {
  const small = (x: SmallTile, white: boolean) => (
    <Pressy onPress={x.go} accessibilityRole="button" accessibilityLabel={`${x.label} ${x.value}${x.note ? ', ' + x.note : ''}`}
      style={{ minHeight: 100, borderRadius: V.rM, padding: 14, gap: 4, backgroundColor: white ? '#FFFFFF' : V.bk, borderWidth: white && V.dark ? 0 : 1, borderColor: V.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={x.icon} size={14} color={white ? V.navy : '#FFFFFF'} duo={false} />
        <Text style={{ color: white ? V.navy : '#FFFFFF', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{x.label}</Text>
      </View>
      <Text style={[FH, { color: white ? V.navy : '#FFFFFF', fontSize: white ? 22 : 20 }]} numberOfLines={1} adjustsFontSizeToFit>{x.value}</Text>
      {x.note ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {x.face ? <Av name={x.face} size={20} /> : null}
          <Text style={{ color: white ? V.navy : '#FFFFFF', opacity: 0.75, fontSize: 11.5, flexShrink: 1 }} numberOfLines={1}>{x.note}</Text>
        </View>
      ) : null}
    </Pressy>
  );
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Pressy onPress={tall.go} accessibilityRole="button" accessibilityLabel={`${tall.label} ${tall.value}`}
        style={{ flex: 1.1, borderRadius: V.rL, padding: 14, overflow: 'hidden', backgroundColor: '#2238D8',
          shadowColor: '#2B44E8', shadowOpacity: 0.6, shadowRadius: 18, shadowOffset: { width: 0, height: 14 }, elevation: 8, opacity: tall.busy ? 0.75 : 1 }}>
        <NavyFill id="bt" />
        <Text style={{ color: '#FFFFFF', opacity: 0.85, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{tall.label}</Text>
        <Text style={[FH, { color: '#FFFFFF', fontSize: bigValue, marginTop: 6 }]} numberOfLines={1} adjustsFontSizeToFit>{tall.value}</Text>
        {tall.note ? <Text style={{ color: tall.noteColor || V.mint, fontSize: 11.5, marginTop: 2 }} numberOfLines={1}>{tall.note}</Text> : null}
        <View style={{ flex: 1, justifyContent: 'center', marginHorizontal: -2 }}>{tall.series ? <Spark values={tall.series} /> : null}</View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#FFFFFF', opacity: 0.85, fontSize: 12, flexShrink: 1 }} numberOfLines={1}>{tall.foot || ''}</Text>
          <Rings />
        </View>
      </Pressy>
      <View style={{ flex: 1, gap: 10 }}>
        {small(a, true)}
        {small(b, false)}
      </View>
    </View>
  );
}

/** White action pills with a blue round icon, and the round "•••" button (v6 .acts). */
export function Pills({ items, more }: { items: { label: string; icon: IconName; go: () => void; busy?: boolean; danger?: boolean }[]; more?: { label: string; go: () => void } }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      {items.map((p) => (
        <Pressy key={p.label} onPress={p.go} accessibilityRole="button" accessibilityLabel={p.label}
          style={{ flex: 1, height: 52, borderRadius: 99, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 7, opacity: p.busy ? 0.6 : 1, ...lift() }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: p.danger ? '#E5484D' : V.blue }}>
            <Icon name={p.icon} size={19} color="#FFFFFF" duo={false} />
          </View>
          <Text style={{ color: '#0A0B10', fontSize: 15, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{p.label}</Text>
        </Pressy>
      ))}
      {more ? (
        <Pressy onPress={more.go} accessibilityRole="button" accessibilityLabel={more.label}
          style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: V.grey }}>
          <Icon name="dots" size={22} color={V.ink} duo={false} />
        </Pressy>
      ) : null}
    </View>
  );
}

export type Person = { id: number | string; name: string; color?: string | null; on?: boolean };

/** Your team: round avatars, green dot for people at work; tap one to see them bigger. */
export function TeamStrip({ people, onOpen }: { people: Person[]; onOpen: (p: Person) => void }) {
  const [sel, setSel] = React.useState<number>(people.length > 1 ? 1 : 0);
  return (
    <HRow gap={12}>
      {people.map((p, i) => {
        const on = i === sel;
        const sz = on ? 60 : 48;
        return (
          <Pressable key={p.id} onPress={() => (on ? onOpen(p) : setSel(i))} accessibilityRole="button" accessibilityLabel={`${p.name}${p.on ? ', ' + t('at work') : ''}`}
            style={{ alignItems: 'center', gap: 6, justifyContent: 'center', minHeight: 92 }}>
            <View style={on ? { padding: 3, borderRadius: 40, borderWidth: 2, borderColor: V.blue2 } : null}>
              <Av name={p.name} size={sz} color={p.color} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {p.on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: V.good }} /> : null}
              <Text style={{ color: on ? V.ink : V.mute, fontSize: 12, fontWeight: on ? '600' : '400' }} numberOfLines={1}>{p.name.split(' ')[0]}</Text>
            </View>
          </Pressable>
        );
      })}
    </HRow>
  );
}

export type Tx = { title: string; sub?: string; icon: IconName; left?: string; right?: string; navy?: boolean; go: () => void };

/** Recent activity / Grow cards (v6 .tc): white or navy, title, small line, round icon, footer. */
export function TxCards({ items }: { items: Tx[] }) {
  return (
    <HRow>
      {items.map((x, i) => {
        const ink = x.navy ? '#FFFFFF' : '#0A0B10';
        const soft = x.navy ? '#C9D2FF' : '#4B5070';
        return (
          <Pressy key={x.title + i} onPress={x.go} accessibilityRole="button" accessibilityLabel={`${x.title}${x.sub ? ', ' + x.sub : ''}`}
            style={{ width: 148, height: 132, borderRadius: V.rM, padding: 14, overflow: 'hidden', backgroundColor: x.navy ? '#2238D8' : '#FFFFFF', ...(x.navy ? {} : lift()) }}>
            {x.navy ? <NavyFill id={'tx' + i} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[FH, { color: ink, fontSize: 16, lineHeight: 18 }]} numberOfLines={2}>{x.title}</Text>
                {x.sub ? <Text style={{ color: soft, fontSize: 11.5 }} numberOfLines={2}>{x.sub}</Text> : null}
              </View>
              <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: x.navy ? '#FFFFFF' : '#0A0B10' }}>
                <Icon name={x.icon} size={13} color={x.navy ? V.navy : '#FFFFFF'} stroke={2.4} duo={false} />
              </View>
            </View>
            <View style={{ marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 6 }}>
              <Text style={{ color: ink, fontSize: 13, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{x.left || ''}</Text>
              <Text style={{ color: soft, fontSize: 11.5 }} numberOfLines={1}>{x.right || ''}</Text>
            </View>
          </Pressy>
        );
      })}
    </HRow>
  );
}

/** Dark list card (v6 .list) with rows separated by thin lines. */
export function List({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const kids = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ borderRadius: V.rM, backgroundColor: V.surf, borderWidth: 1, borderColor: V.line, paddingVertical: 6, paddingHorizontal: 16 }, style]}>
      {kids.map((c, i) => <View key={i} style={i < kids.length - 1 ? { borderBottomWidth: 1, borderBottomColor: V.line } : null}>{c}</View>)}
    </View>
  );
}

/** One row of a List. */
export function Li({ title, sub, left, btn, onBtn, onPress, muted }: { title: string; sub?: string; left?: React.ReactNode; btn?: string; onBtn?: () => void; onPress?: () => void; muted?: boolean }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: muted ? V.mute : V.ink, fontSize: 14.5, fontWeight: muted ? '500' : '600' }} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={{ color: V.mute, fontSize: 12, marginTop: 1 }} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {btn ? <SBtn text={btn} onPress={onBtn || onPress} /> : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button">{body}</Pressable> : body;
}

/** Small white pill button (v6 .sbtn). */
export function SBtn({ text, onPress, busy }: { text: string; onPress?: () => void; busy?: boolean }) {
  return (
    <Pressy onPress={onPress} accessibilityRole="button" accessibilityLabel={text}
      style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 99, backgroundColor: V.pill, opacity: busy ? 0.6 : 1 }}>
      <Text style={{ color: V.pillInk, fontSize: 13, fontWeight: '600' }}>{text}</Text>
    </Pressy>
  );
}

/** Round tick (done) or empty ring (to do). */
export const Tick = ({ done }: { done: boolean }) => (
  <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? V.pill : 'transparent', borderWidth: done ? 0 : 2, borderColor: V.ring }}>
    {done ? <Svg width={13} height={13} viewBox="0 0 24 24"><Path d="M5 12l5 5 9-10" stroke={V.pillInk} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg> : null}
  </View>
);

/** Progress bar, white to blue (v6 .prog). */
export function Prog({ pct }: { pct: number }) {
  return (
    <View style={{ height: 8, borderRadius: 9, backgroundColor: V.grey, overflow: 'hidden', marginVertical: 4 }}>
      <View style={{ width: `${Math.max(4, Math.min(100, pct))}%`, height: '100%', borderRadius: 9, overflow: 'hidden' }}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 10 10" preserveAspectRatio="none">
          <Defs><LinearGradient id="pg" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={V.progA} /><Stop offset="1" stopColor="#4A63FF" /></LinearGradient></Defs>
          <Rect width={10} height={10} fill="url(#pg)" />
        </Svg>
      </View>
    </View>
  );
}

/** Rounded tile with a blue icon square (v6 .ib inside lists). */
export const IB = ({ icon, color }: { icon: IconName; color?: string }) => (
  <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: V.surf2 }}>
    <Icon name={icon} size={16} color={color || V.ink} stroke={2.2} duo={false} />
  </View>
);

/** Glossy 3-D squircle icon (v6 .ti): navy, white or black. */
export function Ti({ icon, tone = 'nv', size = 52 }: { icon: IconName; tone?: 'nv' | 'wh' | 'bk'; size?: number }) {
  const r = size * 0.32;
  const c = tone === 'nv' ? ['#4A63FF', '#0A1A9A', '#FFFFFF'] : tone === 'wh' ? ['#FFFFFF', '#C9D3FF', '#000C58'] : ['#3A3D4A', '#07080C', '#FFFFFF'];
  const id = 'ti' + tone;
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: r, backgroundColor: c[0], opacity: 0.35, transform: [{ translateX: 5 }, { translateY: -5 }, { rotate: '8deg' }] }} />
      <View style={{ width: size, height: size, borderRadius: r, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
        shadowColor: tone === 'bk' ? '#000' : c[0], shadowOpacity: 0.7, shadowRadius: 9, shadowOffset: { width: 0, height: 8 }, elevation: 6, borderWidth: tone === 'bk' ? 1 : 0, borderColor: 'rgba(255,255,255,0.1)' }}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 10 10" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={id} x1="0.15" y1="0" x2="0.85" y2="1"><Stop offset="0" stopColor={c[0]} /><Stop offset="1" stopColor={c[1]} /></LinearGradient>
            <LinearGradient id={id + 'g'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} /><Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} /></LinearGradient>
          </Defs>
          <Rect width={10} height={10} fill={`url(#${id})`} />
          <Rect width={10} height={10} fill={`url(#${id}g)`} />
        </Svg>
        <View style={{ zIndex: 1 }}><Icon name={icon} size={Math.round(size * 0.44)} color={c[2]} stroke={2} duo={false} /></View>
      </View>
    </View>
  );
}
