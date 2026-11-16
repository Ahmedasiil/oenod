// T1: building blocks for the built-in tool screens (Invoices, Customers, Expenses, Time clock, Inventory, ...).
// Same Midnight v6 look as Home and Meet: black page, navy hero card, white pills, dark list cards, bottom sheets.
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { FH, NavyFill, SubTop, V } from './M6';
import { Pressy } from './Motion';
import { PoweredBy } from './Brand';
import { t } from '../lib/i18n';

/** Whole tool page: black background, header with back + optional right button, pull to refresh. */
export function ToolPage({ title, right, rightLabel, onRight, refreshing, onRefresh, children, foot = true }: {
  title: string; right?: IconName; rightLabel?: string; onRight?: () => void; refreshing?: boolean; onRefresh?: () => void; children: React.ReactNode; foot?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: V.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" /> : undefined}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 48, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
        <SubTop title={title} right={right} rightLabel={rightLabel} onRight={onRight} />
        {children}
        {foot ? <PoweredBy /> : null}
      </ScrollView>
    </View>
  );
}

/** Navy hero card: small label, big number, a line under it, and up to 3 small stats. */
export function Hero({ label, value, note, noteGood, stats, id = 'hero' }: { label: string; value: string; note?: string; noteGood?: boolean; stats?: [string, string][]; id?: string }) {
  return (
    <View style={{ borderRadius: V.rL, padding: 20, overflow: 'hidden', backgroundColor: '#2238D8', shadowColor: '#2B44E8', shadowOpacity: 0.55, shadowRadius: 20, shadowOffset: { width: 0, height: 14 }, elevation: 8 }}>
      <NavyFill id={id} hero />
      <Text style={{ color: '#FFFFFF', opacity: 0.85, fontSize: 13.5, fontWeight: '600' }}>{label}</Text>
      <Text style={[FH, { color: '#FFFFFF', fontSize: 36, marginTop: 6 }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {note ? <Text style={{ color: noteGood === false ? '#FFC2C8' : V.mint, fontSize: 12.5, marginTop: 2 }} numberOfLines={2}>{note}</Text> : null}
      {stats && stats.length ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {stats.map(([k, v]) => (
            <View key={k} style={{ flex: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }}>
              <Text style={{ color: '#FFFFFF', opacity: 0.8, fontSize: 11 }} numberOfLines={1}>{k}</Text>
              <Text style={[FH, { color: '#FFFFFF', fontSize: 16, marginTop: 2 }]} numberOfLines={1} adjustsFontSizeToFit>{v}</Text>
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
            style={{ height: 38, paddingHorizontal: 14, borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? '#FFFFFF' : V.surf, borderWidth: 1, borderColor: on ? '#FFFFFF' : V.line }}>
            <Text style={{ color: on ? V.navy : '#FFFFFF', fontSize: 13.5, fontWeight: '600' }}>{label}</Text>
            {n !== undefined ? <Text style={{ color: on ? V.blue : V.mute, fontSize: 12.5, fontWeight: '600' }}>{n}</Text> : null}
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
        style={{ flex: 1, color: '#FFFFFF', fontSize: 15.5, minHeight: 44 }} autoCorrect={false} returnKeyType="search" />
      {value ? <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityLabel={t('Clear')}><Icon name="x" size={16} color={V.mute} duo={false} /></Pressable> : null}
    </View>
  );
}

/** Coloured status chip. */
export function Tag({ text, tone = 'plain' }: { text: string; tone?: 'good' | 'warn' | 'bad' | 'info' | 'plain' }) {
  const c = { good: ['rgba(40,209,124,0.16)', '#6FF0AE'], warn: ['rgba(255,184,77,0.16)', '#FFC870'], bad: ['rgba(255,90,106,0.16)', '#FF8A96'], info: ['rgba(74,99,255,0.2)', '#AFC0FF'], plain: [V.surf2, V.mute] }[tone];
  return <View style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 99, backgroundColor: c[0], alignSelf: 'flex-start' }}><Text style={{ color: c[1], fontSize: 11.5, fontWeight: '700' }} numberOfLines={1}>{text}</Text></View>;
}

/** One list row inside a Card: icon or avatar, title, sub line, right value, optional tag. */
export function Item({ left, title, sub, right, rightSub, tag, onPress }: { left?: React.ReactNode; title: string; sub?: string; right?: string; rightSub?: React.ReactNode; tag?: React.ReactNode; onPress?: () => void }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      {left}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={{ color: V.mute, fontSize: 12.5 }} numberOfLines={2}>{sub}</Text> : null}
        {tag ? <View style={{ marginTop: 3 }}>{tag}</View> : null}
      </View>
      {right || rightSub ? (
        <View style={{ alignItems: 'flex-end', gap: 4, maxWidth: '42%' }}>
          {right ? <Text style={[FH, { color: '#FFFFFF', fontSize: 15.5 }]} numberOfLines={1}>{right}</Text> : null}
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
    <View style={[{ borderRadius: V.rM, backgroundColor: V.surf, borderWidth: 1, borderColor: V.line, paddingHorizontal: 16, paddingVertical: title ? 12 : 4 }, style]}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 }}>
          <Text style={[FH, { color: '#FFFFFF', fontSize: 15.5 }]} accessibilityRole="header">{title}</Text>
          {right ? <Pressable onPress={onRight} hitSlop={8} disabled={!onRight} accessibilityRole={onRight ? 'button' : undefined} accessibilityLabel={right}><Text style={{ color: '#AFC0FF', fontSize: 13, fontWeight: '600' }}>{right}</Text></Pressable> : null}
        </View>
      ) : null}
      {kids.map((c, i) => <View key={i} style={i < kids.length - 1 ? { borderBottomWidth: 1, borderBottomColor: V.line } : null}>{c}</View>)}
    </View>
  );
}

/** Round icon square used at the left of a row. */
export const Dot = ({ icon, tone = 'dk' }: { icon: IconName; tone?: 'dk' | 'nv' | 'good' | 'bad' | 'warn' }) => {
  const bg = { dk: V.surf2, nv: '#2238D8', good: 'rgba(40,209,124,0.18)', bad: 'rgba(255,90,106,0.18)', warn: 'rgba(255,184,77,0.18)' }[tone];
  const fg = { dk: '#FFFFFF', nv: '#FFFFFF', good: '#6FF0AE', bad: '#FF8A96', warn: '#FFC870' }[tone];
  return <View style={{ width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}><Icon name={icon} size={18} color={fg} stroke={2.1} duo={false} /></View>;
};

/** Big white button (or blue / dark / red). */
export function Btn({ text, icon, onPress, busy, kind = 'white', style, disabled }: { text: string; icon?: IconName; onPress?: () => void; busy?: boolean; kind?: 'white' | 'blue' | 'dark' | 'red'; style?: ViewStyle; disabled?: boolean }) {
  const bg = { white: '#FFFFFF', blue: V.blue, dark: V.surf2, red: '#E5484D' }[kind];
  const fg = kind === 'white' ? V.navy : '#FFFFFF';
  return (
    <Pressy onPress={busy || disabled ? undefined : onPress} accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ disabled: !!(busy || disabled), busy: !!busy }}
      style={[{ height: 52, borderRadius: 99, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, opacity: disabled ? 0.45 : 1, borderWidth: kind === 'dark' ? 1 : 0, borderColor: V.line }, style]}>
      {busy ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} duo={false} /> : null}
      <Text style={[FH, { color: fg, fontSize: 15.5 }]} numberOfLines={1}>{text}</Text>
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
          <View style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
            <Icon name={a.icon} size={21} color={V.navy} duo={false} />
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{a.label}</Text>
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
        style={{ minHeight: 50, borderRadius: 16, paddingHorizontal: 14, paddingVertical: p.multiline ? 12 : 0, backgroundColor: V.surf2, color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: error ? '#FF5A6A' : V.line, textAlignVertical: p.multiline ? 'top' : 'center' }} />
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
              style={{ paddingVertical: 9, paddingHorizontal: 13, borderRadius: 99, backgroundColor: on ? '#FFFFFF' : V.surf2, borderWidth: 1, borderColor: on ? '#FFFFFF' : V.line }}>
              <Text style={{ color: on ? V.navy : '#FFFFFF', fontSize: 13.5, fontWeight: '600' }}>{l}</Text>
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t('Close')} />
        <View style={{ maxHeight: '90%', borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#13141B', borderWidth: 1, borderColor: V.line, paddingBottom: insets.bottom + 12 }}>
          <View style={{ alignItems: 'center', paddingTop: 8 }}><View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#3A3D4A' }} /></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
            <Text style={[FH, { flex: 1, color: '#FFFFFF', fontSize: 19 }]} accessibilityRole="header">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('Close')}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: V.surf2 }}>
              <Icon name="x" size={16} color="#FFFFFF" duo={false} />
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
    <Text style={[FH, { color: '#FFFFFF', fontSize: 15.5 }]}>{title}</Text>
    {sub ? <Text style={{ color: V.mute, fontSize: 13, textAlign: 'center', maxWidth: 280 }}>{sub}</Text> : null}
  </View>
);

/** Loading and error states for a whole page. */
export function State({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  if (loading) return <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator color="#FFFFFF" size="large" /></View>;
  if (!error) return null;
  return (
    <Card><View style={{ alignItems: 'center', paddingVertical: 22, gap: 10 }}>
      <Dot icon="cloud" tone="warn" />
      <Text style={{ color: '#FFFFFF', fontSize: 14.5, textAlign: 'center' }}>{error}</Text>
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
