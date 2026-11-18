// T1: building blocks for the built-in tool screens (Invoices, Customers, Expenses, Time clock, Inventory, ...).
// Same Midnight v6 look as Home and Meet: black page, navy hero card, white pills, dark list cards, bottom sheets.
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View, useWindowDimensions, type TextInputProps, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { FH, V, lift } from './M6';
import { Band, Grad, H } from './H';
import { Pressy } from './Motion';
import { PoweredBy } from './Brand';
import { t } from '../lib/i18n';

/** Whole tool page (4.1 Meet look): navy band with back + big white title, then the page on a white sheet that
 *  rises over the band with rounded corners. Pull to refresh. */
export function ToolPage({ title, sub, right, rightLabel, onRight, refreshing, onRefresh, children, foot = true }: {
  title: string; sub?: string; right?: IconName; rightLabel?: string; onRight?: () => void; refreshing?: boolean; onRefresh?: () => void; children: React.ReactNode; foot?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <View style={{ flex: 1, backgroundColor: V.bg }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: Math.round(height * 0.5), backgroundColor: H.navy }} />
      <ScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: 'transparent' }}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" colors={[H.navy]} /> : undefined}
        contentContainerStyle={{ paddingBottom: 0 }}>
        <Band pad={52} style={{ paddingTop: insets.top + 8 }}>
          <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center' }}>
            <BandTop right={right} rightLabel={rightLabel || title} onRight={onRight} />
            <Text style={{ color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -0.8, marginTop: 18 }} numberOfLines={2} adjustsFontSizeToFit accessibilityRole="header">{title}</Text>
            {sub ? <Text style={{ color: H.soft, fontSize: 14.5, marginTop: 4, lineHeight: 20 }} numberOfLines={2}>{sub}</Text> : null}
          </View>
        </Band>
        <View style={{ marginTop: -28, minHeight: height, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: V.bg }}>
          <View style={{ paddingTop: 20, paddingHorizontal: 16, paddingBottom: insets.bottom + 48, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
            {children}
            {foot ? <PoweredBy /> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** Top row inside a navy band: glass back button left, optional glass button right. */
export function BandTop({ right, rightLabel, onRight, onBack }: { right?: IconName; rightLabel?: string; onRight?: () => void; onBack?: () => void }) {
  const back = onBack || (() => (router.canGoBack() ? router.back() : router.replace('/')));
  const glass = { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' } as ViewStyle;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
      <Pressable onPress={back} style={glass} accessibilityRole="button" accessibilityLabel={t('Back')} hitSlop={6}><Icon name="back" size={18} color="#FFFFFF" duo={false} /></Pressable>
      {right ? <Pressable onPress={onRight} style={glass} accessibilityRole="button" accessibilityLabel={rightLabel} hitSlop={6}><Icon name={right} size={18} color="#FFFFFF" duo={false} /></Pressable> : null}
    </View>
  );
}

/** The black "now" card (4.1 Meet look): green live chip with the label, big number, a line under it, up to 3 small stats. */
export function Hero({ label, value, note, noteGood, stats, id = 'hero' }: { label: string; value: string; note?: string; noteGood?: boolean; stats?: [string, string][]; id?: string }) {
  return (
    <View style={{ borderRadius: 24, padding: 18, overflow: 'hidden', backgroundColor: '#0A0B10', shadowColor: '#1A2FCF', shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 14 }, elevation: 8 }}>
      <Grad id={id} x1={0.2} y1={0} x2={0.8} y2={1} stops={[[0, '#16182A'], [1, '#0A0B10']]} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -60, top: -70, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(74,99,255,0.12)' }} />
      <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99, backgroundColor: 'rgba(124,240,176,0.14)' }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#7CF0B0' }} />
        <Text style={{ color: '#7CF0B0', fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: -0.6, marginTop: 12 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {note ? <Text style={{ color: noteGood === false ? '#FFB4BC' : 'rgba(255,255,255,0.72)', fontSize: 13, marginTop: 4 }} numberOfLines={2}>{note}</Text> : null}
      {stats && stats.length ? (
        <View style={{ flexDirection: 'row', marginTop: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
          {stats.map(([k, v], i) => (
            <View key={k} style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 12, borderLeftWidth: i ? 1 : 0, borderLeftColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11.5, marginTop: 1 }} numberOfLines={1}>{k}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Filter chips in one sideways row. */
export function Chips<K extends string>({ items, value, onChange }: { items: [K, string, number?][]; value: K; onChange: (k: K) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
      {items.map(([k, label, n]) => {
        const on = k === value;
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ height: 38, paddingHorizontal: 14, borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? V.pill : V.surf, borderWidth: 1, borderColor: on ? V.pill : V.line }}>
            <Text style={{ color: on ? V.pillInk : V.ink, fontSize: 13.5, fontWeight: '600' }}>{label}</Text>
            {n !== undefined ? <Text style={{ color: on ? (V.dark ? V.blue : '#AEB8F0') : V.mute, fontSize: 12.5, fontWeight: '600' }}>{n}</Text> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Search box. */
export function Search({ value, onChange, placeholder }: { value: string; onChange: (s: string) => void; placeholder: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 99, paddingHorizontal: 16, backgroundColor: V.surf, borderWidth: 1, borderColor: V.line }}>
      <Icon name="search" size={18} color={V.mute} duo={false} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={V.faint} accessibilityLabel={placeholder}
        style={{ flex: 1, color: V.ink, fontSize: 15.5, minHeight: 44 }} autoCorrect={false} returnKeyType="search" />
      {value ? <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityLabel={t('Clear')}><Icon name="x" size={16} color={V.mute} duo={false} /></Pressable> : null}
    </View>
  );
}

/** Coloured status chip. */
export function Tag({ text, tone = 'plain' }: { text: string; tone?: 'good' | 'warn' | 'bad' | 'info' | 'plain' }) {
  const c = (V.dark
    ? { good: ['rgba(40,209,124,0.16)', '#6FF0AE'], warn: ['rgba(255,184,77,0.16)', '#FFC870'], bad: ['rgba(255,90,106,0.16)', '#FF8A96'], info: ['rgba(74,99,255,0.2)', '#AFC0FF'], plain: [V.surf2, V.mute] }
    : { good: ['#E4F3EB', '#0E7A4B'], warn: ['#FBF0E2', '#A35A00'], bad: ['#FBEAE8', '#B42318'], info: ['#EEF0FB', '#1A2FCF'], plain: [V.surf2, V.mute] })[tone];
  return <View style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 99, backgroundColor: c[0], alignSelf: 'flex-start' }}><Text style={{ color: c[1], fontSize: 11.5, fontWeight: '700' }} numberOfLines={1}>{text}</Text></View>;
}

/** One list row inside a Card: icon or avatar, title, sub line, right value, optional tag. */
export function Item({ left, title, sub, right, rightSub, tag, onPress }: { left?: React.ReactNode; title: string; sub?: string; right?: string; rightSub?: React.ReactNode; tag?: React.ReactNode; onPress?: () => void }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      {left}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ color: V.ink, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={{ color: V.mute, fontSize: 12.5 }} numberOfLines={2}>{sub}</Text> : null}
        {tag ? <View style={{ marginTop: 3 }}>{tag}</View> : null}
      </View>
      {right || rightSub ? (
        <View style={{ alignItems: 'flex-end', gap: 4, maxWidth: '42%' }}>
          {right ? <Text style={[FH, { color: V.ink, fontSize: 15.5 }]} numberOfLines={1}>{right}</Text> : null}
          {typeof rightSub === 'string' ? <Text style={{ color: V.mute, fontSize: 12 }} numberOfLines={1}>{rightSub}</Text> : rightSub}
        </View>
      ) : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}${right ? ', ' + right : ''}`} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>{body}</Pressable> : body;
}

/** Dark card holding Items, with thin lines between them. */
export function Card({ children, style, title, right, onRight }: { children: React.ReactNode; style?: ViewStyle; title?: string; right?: string; onRight?: () => void }) {
  const kids = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ borderRadius: 24, backgroundColor: V.surf, borderWidth: 1, borderColor: V.line, paddingHorizontal: 16, paddingVertical: title ? 14 : 4 }, lift(), style]}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 }}>
          <Text style={{ color: V.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 }} accessibilityRole="header">{title}</Text>
          {right ? <Pressable onPress={onRight} hitSlop={8} disabled={!onRight} accessibilityRole={onRight ? 'button' : undefined} accessibilityLabel={right}><Text style={{ color: V.link, fontSize: 13, fontWeight: '600' }}>{right}</Text></Pressable> : null}
        </View>
      ) : null}
      {kids.map((c, i) => <View key={i} style={i < kids.length - 1 ? { borderBottomWidth: 1, borderBottomColor: V.line } : null}>{c}</View>)}
    </View>
  );
}

/** Round icon square used at the left of a row. */
export const Dot = ({ icon, tone = 'dk' }: { icon: IconName; tone?: 'dk' | 'nv' | 'good' | 'bad' | 'warn' }) => {
  const bg = V.dark ? { dk: V.surf2, nv: '#2238D8', good: 'rgba(40,209,124,0.18)', bad: 'rgba(255,90,106,0.18)', warn: 'rgba(255,184,77,0.18)' }[tone]
    : { dk: '#EEF0FB', nv: '#2238D8', good: '#E4F3EB', bad: '#FBEAE8', warn: '#FBF0E2' }[tone];
  const fg = V.dark ? { dk: '#FFFFFF', nv: '#FFFFFF', good: '#6FF0AE', bad: '#FF8A96', warn: '#FFC870' }[tone]
    : { dk: '#000C58', nv: '#FFFFFF', good: '#0E7A4B', bad: '#B42318', warn: '#A35A00' }[tone];
  return <View style={{ width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}><Icon name={icon} size={18} color={fg} stroke={2.1} duo={false} /></View>;
};

/** Big white button (or blue / dark / red). */
export function Btn({ text, icon, onPress, busy, kind = 'white', style, disabled }: { text: string; icon?: IconName; onPress?: () => void; busy?: boolean; kind?: 'white' | 'blue' | 'dark' | 'red'; style?: ViewStyle; disabled?: boolean }) {
  const bg = { white: V.pill, blue: V.blue, dark: V.surf2, red: '#E5484D' }[kind];
  const fg = kind === 'dark' ? V.ink : '#FFFFFF';
  return (
    <Pressy onPress={busy || disabled ? undefined : onPress} accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ disabled: !!(busy || disabled), busy: !!busy }}
      style={[{ height: 52, borderRadius: 99, overflow: 'hidden', backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, opacity: disabled ? 0.45 : 1, borderWidth: kind === 'dark' ? 1 : 0, borderColor: V.line }, style]}>
      {kind === 'white' || kind === 'blue' ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 99, overflow: 'hidden' }}><Grad id={'btn' + kind} x1={0} y1={0} x2={1} y2={1} stops={kind === 'white' ? [[0, '#1A2FCF'], [1, '#000C58']] : [[0, '#4A63FF'], [1, '#1A2FCF']]} /></View> : null}
      {busy ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} duo={false} /> : null}
      <Text style={{ color: fg, fontSize: 15.5, fontWeight: '700' }} numberOfLines={1}>{text}</Text>
    </Pressy>
  );
}

/** Row of round action buttons with labels under them (Call, Text, Email, ...). */
export function Actions({ items }: { items: { icon: IconName; label: string; go: () => void; off?: boolean }[] }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: 6 }}>
      {items.map((a) => (
        <Pressy key={a.label} onPress={a.off ? undefined : a.go} accessibilityRole="button" accessibilityLabel={a.label} accessibilityState={{ disabled: !!a.off }}
          style={{ alignItems: 'center', gap: 6, flex: 1, opacity: a.off ? 0.35 : 1 }}>
          <View style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: V.pill }}>
            <Icon name={a.icon} size={21} color={V.pillInk} duo={false} />
          </View>
          <Text style={{ color: V.ink, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{a.label}</Text>
        </Pressy>
      ))}
    </View>
  );
}

/** Text field for sheets. */
export function In({ label, error, style, ...p }: TextInputProps & { label: string; error?: string; style?: ViewStyle }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <Text style={{ color: V.mute, fontSize: 12.5, fontWeight: '600' }}>{label}</Text>
      <TextInput placeholderTextColor={V.faint} accessibilityLabel={label} {...p}
        style={{ minHeight: 50, borderRadius: 16, paddingHorizontal: 14, paddingVertical: p.multiline ? 12 : 0, backgroundColor: V.surf2, color: V.ink, fontSize: 16, borderWidth: 1, borderColor: error ? '#FF5A6A' : V.line, textAlignVertical: p.multiline ? 'top' : 'center' }} />
      {error ? <Text style={{ color: '#FF8A96', fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}

/** Pick one of a few options (method, reason, category). */
export function Pick<K extends string>({ label, items, value, onChange }: { label: string; items: [K, string][]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: V.mute, fontSize: 12.5, fontWeight: '600' }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map(([k, l]) => {
          const on = k === value;
          return (
            <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={{ paddingVertical: 9, paddingHorizontal: 13, borderRadius: 99, backgroundColor: on ? V.pill : V.surf2, borderWidth: 1, borderColor: on ? V.pill : V.line }}>
              <Text style={{ color: on ? V.pillInk : V.ink, fontSize: 13.5, fontWeight: '600' }}>{l}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Bottom sheet over the screen, with a title and a close button. */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: V.dark ? 'rgba(0,0,0,0.6)' : 'rgba(0,7,47,0.45)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t('Close')} />
        <View style={{ maxHeight: '90%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: V.sheet, borderWidth: 1, borderColor: V.line, paddingBottom: insets.bottom + 12 }}>
          <View style={{ alignItems: 'center', paddingTop: 8 }}><View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: V.ring }} /></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
            <Text style={[FH, { flex: 1, color: V.ink, fontSize: 19 }]} accessibilityRole="header">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('Close')}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: V.surf2 }}>
              <Icon name="x" size={16} color={V.ink} duo={false} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 14 }}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Empty state inside a Card. */
export const None = ({ icon, title, sub }: { icon: IconName; title: string; sub?: string }) => (
  <View style={{ alignItems: 'center', paddingVertical: 26, gap: 8 }}>
    <Dot icon={icon} />
    <Text style={[FH, { color: V.ink, fontSize: 15.5 }]}>{title}</Text>
    {sub ? <Text style={{ color: V.mute, fontSize: 13, textAlign: 'center', maxWidth: 280 }}>{sub}</Text> : null}
  </View>
);

/** Loading and error states for a whole page. */
export function State({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  if (loading) return <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator color={V.ink} size="large" /></View>;
  if (!error) return null;
  return (
    <Card><View style={{ alignItems: 'center', paddingVertical: 22, gap: 10 }}>
      <Dot icon="cloud" tone="warn" />
      <Text style={{ color: V.ink, fontSize: 14.5, textAlign: 'center' }}>{error}</Text>
      <Btn text={t('Try again')} kind="dark" onPress={onRetry} style={{ height: 44 }} />
    </View></Card>
  );
}

/** Ask "are you sure?" before something that can't be undone. */
export const sure = (title: string, body: string, yes: string, run: () => void, danger = false) => {
  if (Platform.OS === 'web') { if (globalThis.confirm?.(`${title}\n\n${body}`)) run(); return; } // the web preview has no native alert
  Alert.alert(title, body, [{ text: t('Cancel'), style: 'cancel' }, { text: yes, style: danger ? 'destructive' : 'default', onPress: run }]);
};

/** Show an error from the server. */
export const oops = (e: any) => {
  const m = String(e?.message || e || t('Something went wrong. Please try again.'));
  if (Platform.OS === 'web') { globalThis.alert?.(m); return; }
  Alert.alert(t('Not done'), m);
};

/** A small "busy" helper: runs fn, shows errors, returns whether it worked. */
export function useBusy() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>) => {
    if (busy) return false;
    setBusy(key);
    try { await fn(); return true; } catch (e) { oops(e); return false; } finally { setBusy(null); }
  };
  return { busy, run };
}

/** Today as YYYY-MM-DD in the phone's time zone, and n days from today. */
export const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
export const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T12:00:00').getTime());
