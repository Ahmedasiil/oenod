// OENOD Meet in the app (approved by Ahmed 11-18, design kit app-meet-1/MEET-DESIGN-KIT.md): navy band, the 2x2
// action card that overlaps it, the black "up next" card, row lists with a time column and colour bar, the tinted
// code card and the bottom sheets. Light Navy Daylight look, Phosphor two-tone icons.
import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Grad, H, Ph } from './H';
import { Icon, type IconName } from './Icon';
import { Pressy } from './Motion';
import type { PhName } from './phPaths';
import { initials } from '../lib/format';

export const MK = {
  ...H, bright: '#4A63FF', ok: '#0B7A43', okBg: '#E8FBF1', bad: '#B3141F', badBg: '#FDECEE', live: '#7CF0B0',
  shadow: { shadowColor: '#000C58', shadowOpacity: 0.08, shadowRadius: 30, shadowOffset: { width: 0, height: 10 }, elevation: 4 } as ViewStyle,
};

/** "4829135067" -> "482 913 5067". */
export const prettyCode = (d: string) => String(d || '').replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{0,4}).*$/, '$1 $2 $3').trim();

type IconLike = { ph?: PhName; ic?: IconName };
function Glyph({ ph, ic, size = 20, color = MK.navy }: IconLike & { size?: number; color?: string }) {
  if (ph) return <Ph name={ph} size={size} color={color} duo={0.24} />;
  if (ic) return <Icon name={ic} size={size} color={color} />;
  return null;
}

/** Round 42px button on the navy band. */
export function RoundBtn({ ph, ic, label, onPress, dark }: IconLike & { label: string; onPress: () => void; dark?: boolean }) {
  return (
    <Pressy onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: dark ? MK.mist : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
      <Glyph ph={ph} ic={ic} size={19} color={dark ? MK.navy : '#FFFFFF'} />
    </Pressy>
  );
}

/** The navy band at the top of a Meet screen. The next card overlaps it by 80. */
export function MBand({ top, title, sub, left, right, pad = 104 }: { top: number; title: string; sub?: string; left?: React.ReactNode; right?: React.ReactNode; pad?: number }) {
  return (
    <View style={{ backgroundColor: MK.navy, paddingTop: top + 10, paddingHorizontal: 20, paddingBottom: pad, overflow: 'hidden' }}>
      <Grad id="mkband" x1={0.15} y1={0} x2={0.55} y2={1.25} stops={[[0, MK.navy], [0.7, MK.navy2], [1.5, MK.blue]]} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -80, top: -40, width: 260, height: 260, borderRadius: 130, borderWidth: 38, borderColor: 'rgba(255,255,255,0.05)' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 42 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{left}</View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{right}</View>
      </View>
      <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '800', letterSpacing: -1.2, marginTop: 18 }}>{title}</Text>
      {sub ? <Text style={{ color: MK.soft, fontSize: 14, lineHeight: 20, marginTop: 4, maxWidth: 300 }}>{sub}</Text> : null}
    </View>
  );
}

export type ActTile = { title: string; sub: string; ph?: PhName; ic?: IconName; main?: boolean; onPress: () => void };

/** White card with the 2x2 grid of big tiles. The first tile is the navy one. */
export function ActionCard({ tiles, style }: { tiles: ActTile[]; style?: ViewStyle }) {
  return (
    <View style={[{ backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: MK.line, padding: 10, flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, justifyContent: 'space-between' }, MK.shadow, style]}>
      {tiles.map((a, i) => (
        <View key={a.title} style={{ width: '48.6%' }}>
        <Pressy onPress={a.onPress} accessibilityRole="button" accessibilityLabel={`${a.title}. ${a.sub}`}
          style={{ height: 108, borderRadius: 20, padding: 14, justifyContent: 'space-between', overflow: 'hidden', backgroundColor: a.main ? MK.navy : '#F0F2FB' }}>
          {a.main ? <Grad id={'mkt' + i} x1={0.1} y1={0} x2={0.9} y2={1} stops={[[0, '#2B44E8'], [1, MK.navy]]} />
            : <Grad id={'mkt' + i} x1={0.3} y1={0} x2={0.7} y2={1} stops={[[0, '#F6F7FD'], [1, '#EBEEFA']]} />}
          {a.main ? <View pointerEvents="none" style={{ position: 'absolute', right: -34, bottom: -44, width: 120, height: 120, borderRadius: 60, borderWidth: 22, borderColor: 'rgba(255,255,255,0.07)' }} /> : null}
          <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: a.main ? 'rgba(255,255,255,0.16)' : '#FFFFFF' }}>
            <Glyph ph={a.ph} ic={a.ic} size={21} color={a.main ? '#FFFFFF' : MK.navy} />
          </View>
          <View>
            <Text style={{ color: a.main ? '#FFFFFF' : MK.ink, fontSize: 15, fontWeight: '800', letterSpacing: -0.2 }} numberOfLines={1}>{a.title}</Text>
            <Text style={{ color: a.main ? MK.soft : MK.muted, fontSize: 12, marginTop: 1 }} numberOfLines={1}>{a.sub}</Text>
          </View>
        </Pressy>
        </View>
      ))}
    </View>
  );
}

/** Round pill button. navy = main, white = on dark cards, glass = second choice on dark cards, light = second choice on white. */
export function Pill({ text, onPress, tone = 'navy', small, ph, ic, busy, disabled, style }: IconLike & { text: string; onPress?: () => void; tone?: 'navy' | 'white' | 'glass' | 'light' | 'red'; small?: boolean; busy?: boolean; disabled?: boolean; style?: ViewStyle }) {
  const bg = { navy: MK.navy, white: '#FFFFFF', glass: 'rgba(255,255,255,0.12)', light: MK.mist, red: '#E5484D' }[tone];
  const fg = tone === 'white' || tone === 'light' ? MK.navy : '#FFFFFF';
  return (
    <Pressy onPress={disabled || busy ? undefined : onPress} accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      style={[{ height: small ? 34 : 44, paddingHorizontal: small ? 14 : 18, borderRadius: 99, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: disabled ? 0.45 : 1, flexShrink: 0 },
        tone === 'glass' ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' } : null, style]}>
      {busy ? <ActivityIndicator size="small" color={fg} /> : <Glyph ph={ph} ic={ic} size={small ? 15 : 17} color={fg} />}
      <Text style={{ color: fg, fontSize: small ? 13 : 14.5, fontWeight: '800' }} numberOfLines={1}>{text}</Text>
    </Pressy>
  );
}

/** The big navy button at the bottom of a sheet or screen. */
export function BigBtn({ text, onPress, ph, ic, busy, disabled, ghost }: IconLike & { text: string; onPress: () => void; busy?: boolean; disabled?: boolean; ghost?: boolean }) {
  return (
    <Pressy onPress={disabled || busy ? undefined : onPress} accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      style={[{ height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, opacity: disabled ? 0.45 : 1, flexShrink: 0 },
        ghost ? { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: MK.line }
          : { backgroundColor: MK.navy, shadowColor: MK.navy, shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6 }]}>
      {busy ? <ActivityIndicator color={ghost ? MK.navy : '#FFFFFF'} /> : <Glyph ph={ph} ic={ic} size={19} color={ghost ? MK.navy : '#FFFFFF'} />}
      <Text style={{ color: ghost ? MK.navy : '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{text}</Text>
    </Pressy>
  );
}

/** Overlapping round initials. */
export function Faces({ names, size = 30, dark, max = 4 }: { names: string[]; size?: number; dark?: boolean; max?: number }) {
  const cols = ['#2B44E8', '#0B7A43', '#B4561A', '#6B3FD4', '#0A6E8A', '#9A2F5E'];
  const shown = names.slice(0, max);
  const more = names.length - shown.length;
  return (
    <View style={{ flexDirection: 'row' }}>
      {shown.map((n, i) => (
        <View key={n + i} style={{ width: size, height: size, borderRadius: size / 2, marginLeft: i ? -size / 3.2 : 0, backgroundColor: cols[(n.charCodeAt(0) || 0) % cols.length], borderWidth: 2, borderColor: dark ? '#14162A' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: size * 0.36, fontWeight: '800' }}>{initials(n)}</Text>
        </View>
      ))}
      {more > 0 ? (
        <View style={{ width: size, height: size, borderRadius: size / 2, marginLeft: -size / 3.2, backgroundColor: dark ? 'rgba(255,255,255,0.16)' : MK.mist, borderWidth: 2, borderColor: dark ? '#14162A' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: dark ? '#FFFFFF' : MK.navy, fontSize: size * 0.34, fontWeight: '800' }}>+{more}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Black "up next" card with the blue glow. */
export function NextCard({ chip, live, title, when, names, children, onPress }: { chip: string; live?: boolean; title: string; when: string; names: string[]; children?: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${chip}. ${title}. ${when}`}
      style={{ borderRadius: 24, padding: 18, overflow: 'hidden', backgroundColor: MK.ink, gap: 12 }}>
      <Grad id="mknext" x1={0.3} y1={0} x2={0.7} y2={1} stops={[[0, '#16182A'], [1, MK.ink]]} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -70, bottom: -90, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(74,99,255,0.30)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -30, bottom: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(74,99,255,0.22)' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ height: 26, paddingHorizontal: 10, borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: live ? 'rgba(124,240,176,0.14)' : 'rgba(255,255,255,0.1)' }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: live ? MK.live : MK.soft }} />
          <Text style={{ color: live ? MK.live : '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{chip}</Text>
        </View>
        <Faces names={names} size={28} dark />
      </View>
      <View>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.6 }} numberOfLines={2}>{title}</Text>
        <Text style={{ color: MK.soft, fontSize: 13.5, marginTop: 3 }} numberOfLines={1}>{when}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>{children}</View>
    </Pressable>
  );
}

/** Section title with a blue link on the right. */
export function MSec({ title, right, onRight }: { title: string; right?: string; onRight?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
      <Text accessibilityRole="header" style={{ color: MK.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>{title}</Text>
      {right ? <Text onPress={onRight} accessibilityRole="button" style={{ color: MK.blue, fontSize: 14, fontWeight: '700', paddingVertical: 6, paddingLeft: 12 }}>{right}</Text> : null}
    </View>
  );
}

export function MList({ children }: { children: React.ReactNode }) {
  return <View style={[{ backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: MK.line, overflow: 'hidden' }, MK.shadow]}>{children}</View>;
}

export function DayLine({ text }: { text: string }) {
  return <Text style={{ color: MK.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 }}>{text}</Text>;
}

/** One meeting row: time column, colour bar, title and subtitle, then a Join pill or a chevron. */
export function MRow({ time, len, bar = MK.navy, title, sub, btn, onBtn, onPress, first }: { time: string; len?: string; bar?: string; title: string; sub?: string; btn?: string; onBtn?: () => void; onPress?: () => void; first?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}, ${time}${sub ? ', ' + sub : ''}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: pressed ? '#F7F8FC' : '#FFFFFF', borderTopWidth: first ? 0 : 1, borderTopColor: '#EEF0F5' })}>
      <View style={{ width: 70 }}>
        <Text style={{ color: MK.ink, fontSize: 13, fontWeight: '800' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{time}</Text>
        {len ? <Text style={{ color: MK.muted, fontSize: 11.5, marginTop: 1 }} numberOfLines={1}>{len}</Text> : null}
      </View>
      <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: bar }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: MK.ink, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={{ color: MK.muted, fontSize: 12.5, marginTop: 2 }} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {btn ? <Pill text={btn} small onPress={onBtn} /> : <Icon name="chevron" size={18} color="#A3A8BD" />}
    </Pressable>
  );
}

/** Soft tinted card (your room, a code box). */
export function Tint({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ borderRadius: 24, padding: 18, overflow: 'hidden', gap: 12 }, style]}>
      <Grad id="mktint" x1={0.3} y1={0} x2={0.7} y2={1} stops={[[0, '#F1F3FE'], [1, '#E2E7FB']]} />
      {children}
    </View>
  );
}

export function CodeBig({ code, label }: { code: string; label: string }) {
  return (
    <View>
      <Text style={{ color: MK.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</Text>
      <Text selectable style={{ color: MK.navy, fontSize: 30, fontWeight: '800', letterSpacing: 1, fontVariant: ['tabular-nums'], marginTop: 2 }}>{code}</Text>
    </View>
  );
}

/** White link box with a navy button inside. */
export function LinkBox({ text, btn, onBtn }: { text: string; btn: string; onBtn: () => void }) {
  return (
    <View style={{ height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 4, gap: 8 }}>
      <Icon name="link" size={16} color={MK.muted} />
      <Text selectable style={{ flex: 1, color: MK.ink, fontSize: 13 }} numberOfLines={1}>{text.replace(/^https?:\/\//, '')}</Text>
      <Pill text={btn} small onPress={onBtn} style={{ height: 36 }} />
    </View>
  );
}

/** Bottom sheet: white, rounded top, grab handle, title and a round close button. Tap outside to close. */
export function MSheet({ open, title, sub, onClose, children, footer }: { open: boolean; title: string; sub?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} accessibilityLabel="Close" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(5,8,30,0.45)' }} />
        <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', width: '100%', maxWidth: 640, alignSelf: 'center', paddingBottom: insets.bottom + 14 }}>
          <View style={{ alignItems: 'center', paddingTop: 10 }}><View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#D5D9E6' }} /></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6, gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={{ color: MK.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 }}>{title}</Text>
              {sub ? <Text style={{ color: MK.muted, fontSize: 13, marginTop: 2 }}>{sub}</Text> : null}
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: MK.mist, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={16} color={MK.navy} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 10 }}>{children}</ScrollView>
          {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Choice row in a sheet: 1.5px border, 44px icon box, title and subtitle. */
export function Opt({ ph, ic, title, sub, onPress, busy, main }: IconLike & { title: string; sub?: string; onPress: () => void; busy?: boolean; main?: boolean }) {
  return (
    <Pressy onPress={busy ? undefined : onPress} accessibilityRole="button" accessibilityLabel={sub ? `${title}. ${sub}` : title}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 18, borderWidth: 1.5, borderColor: main ? MK.navy : MK.line, backgroundColor: '#FFFFFF' }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: main ? MK.navy : MK.tint }}>
        {busy ? <ActivityIndicator color={main ? '#FFFFFF' : MK.navy} /> : <Glyph ph={ph} ic={ic} size={21} color={main ? '#FFFFFF' : MK.navy} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: MK.ink, fontSize: 15.5, fontWeight: '800' }}>{title}</Text>
        {sub ? <Text style={{ color: MK.muted, fontSize: 12.5, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      <Icon name="chevron" size={18} color="#A3A8BD" />
    </Pressy>
  );
}

/** Small round choice chip (day, time, length, person). */
export function Chip({ text, on, onPress, sub }: { text: string; on: boolean; onPress: () => void; sub?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={sub ? `${text} ${sub}` : text}
      style={{ minHeight: 40, paddingHorizontal: 14, paddingVertical: sub ? 6 : 0, borderRadius: 14, borderWidth: 1.5, borderColor: on ? MK.navy : MK.line, backgroundColor: on ? MK.navy : '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {sub ? <Text style={{ color: on ? MK.soft : MK.muted, fontSize: 11, fontWeight: '700' }}>{sub}</Text> : null}
      <Text style={{ color: on ? '#FFFFFF' : MK.ink, fontSize: 14, fontWeight: '800' }}>{text}</Text>
    </Pressable>
  );
}

export function FieldLabel({ text }: { text: string }) {
  return <Text style={{ color: MK.ink, fontSize: 13, fontWeight: '800', marginTop: 6 }}>{text}</Text>;
}

export function MInput(p: TextInputProps) {
  return <TextInput placeholderTextColor="#9AA0B8" {...p} style={[{ height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: MK.line, paddingHorizontal: 14, color: MK.ink, fontSize: 15, backgroundColor: '#FFFFFF' }, p.style as any]} />;
}

export function ErrText({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: MK.badBg }}>
      <Ph name="warning" size={18} color={MK.bad} />
      <Text style={{ flex: 1, color: MK.bad, fontSize: 13.5, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}
