import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R, S, onPalette } from '../lib/theme';
import { initials } from '../lib/format';
import { Icon, IconName } from './Icon';
import { t } from '../lib/i18n';
import { Constellation, GradientButton, HeroGradient } from './Brand';
import { Pressy } from './Motion';

export function Screen({ title, eyebrow, subtitle, right, children, refreshing, onRefresh, scroll = true }: {
  title?: string; eyebrow?: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void; scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [hh, setHh] = React.useState(140);
  const head = title ? (
    <View style={[st.head, { paddingTop: insets.top + S.md }]} onLayout={(e) => setHh(e.nativeEvent.layout.height)}>
      <HeroGradient width={width} height={hh} id="sh" fade={false} />
      <Constellation width={width} height={hh} density={1.1} seed={11} />
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={{ color: C.sky, fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginBottom: 6 }}>{eyebrow}</Text> : null}
        <Text style={st.h1} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={st.headSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  ) : null;
  if (!scroll) return <View style={st.screen}>{head}{children}</View>;
  return (
    <View style={st.screen}>
      {head}
      <ScrollView
        contentContainerStyle={{ padding: S.lg, paddingBottom: 130, gap: S.md }}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.link} /> : undefined}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export const Card = ({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void }) =>
  onPress ? (
    <Pressy onPress={onPress} accessibilityRole="button" style={[st.card, style] as any}>{children}</Pressy>
  ) : <View style={[st.card, style]}>{children}</View>;

export const H2 = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <View style={st.h2Row}><Text style={st.h2} accessibilityRole="header">{children}</Text>{right}</View>
);
export const Muted = ({ children, style }: { children: React.ReactNode; style?: any }) => <Text style={[st.muted, style]}>{children}</Text>;
export const B = ({ children, style }: { children: React.ReactNode; style?: any }) => <Text style={[st.b, style]}>{children}</Text>;

export function Button({ title, onPress, kind = 'primary', icon, busy, disabled, style }: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger' | 'light' | 'ghost'; icon?: IconName; busy?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  if (kind === 'primary') return <GradientButton title={title} onPress={onPress} icon={icon} busy={busy} disabled={disabled} style={style} />;
  const bg = { primary: C.blue, secondary: C.field, danger: '#E5484D', light: C.white, ghost: 'transparent' }[kind];
  const fg = { primary: C.white, secondary: C.ink, danger: C.white, light: C.navy, ghost: C.link }[kind];
  const border = kind === 'secondary' ? C.line : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || busy) }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [st.btn, { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, style]}
    >
      {busy ? <ActivityIndicator color={fg} /> : (
        <>
          {icon ? <Icon name={icon} size={20} color={fg} /> : null}
          <Text style={[st.btnT, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, error, ...p }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={st.label}>{label}</Text>
      <TextInput placeholderTextColor={C.faint} style={[st.input, error ? { borderColor: C.bad } : null]} accessibilityLabel={label} {...p} />
      {error ? <Text style={{ color: C.bad, fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}

export const Pill = ({ text, kind = 'info' }: { text: string; kind?: 'good' | 'warn' | 'bad' | 'info' | 'plain' }) => {
  const m = { good: [C.goodSoft, C.good], warn: [C.warnSoft, C.warn], bad: [C.badSoft, C.bad], info: [C.blueSoft, C.blue], plain: [C.seg, C.sub] }[kind];
  return <View style={[st.pill, { backgroundColor: m[0] }]}><Text style={[st.pillT, { color: m[1] }]}>{text}</Text></View>;
};

export const Avatar = ({ name, color, size = 40 }: { name: string; color?: string | null; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: /^#[0-9a-f]{6}$/i.test(color || '') ? color! : C.blue, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color: C.white, fontWeight: '700', fontSize: size * 0.38 }}>{initials(name)}</Text>
  </View>
);

export const Row = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => <View style={[{ flexDirection: 'row', alignItems: 'center', gap: S.md }, style]}>{children}</View>;

export const ListRow = ({ title, sub, left, right, onPress }: { title: string; sub?: string; left?: React.ReactNode; right?: React.ReactNode; onPress?: () => void }) => (
  <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} style={({ pressed }) => [st.lrow, pressed && onPress ? { backgroundColor: C.card2 } : null]}>
    {left}
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={st.b} numberOfLines={1}>{title}</Text>
      {sub ? <Text style={st.muted} numberOfLines={2}>{sub}</Text> : null}
    </View>
    {right ?? (onPress ? <Icon name="chevron" size={18} color={C.faint} /> : null)}
  </Pressable>
);

export const Divider = () => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line }} />;

export const Empty = ({ icon = 'check', title, sub }: { icon?: IconName; title: string; sub?: string }) => (
  <View style={{ alignItems: 'center', padding: S.xl, gap: 8 }}>
    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} color={C.blue} /></View>
    <B>{title}</B>
    {sub ? <Muted style={{ textAlign: 'center' }}>{sub}</Muted> : null}
  </View>
);

export const Loading = () => <View style={{ padding: S.xl * 2, alignItems: 'center' }}><ActivityIndicator color={C.blue} size="large" /></View>;

export const ErrorBox = ({ text, onRetry }: { text: string; onRetry?: () => void }) => (
  <Card style={{ borderColor: C.badLine, backgroundColor: C.badSoft }}>
    <Text style={{ color: C.bad, fontWeight: '600' }}>{text}</Text>
    {onRetry ? <Button title={t('Try again')} kind="secondary" onPress={onRetry} style={{ marginTop: S.md }} /> : null}
  </Card>
);

export const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card style={{ flex: 1, minWidth: 140 }}>
    <Muted>{label}</Muted>
    <Text style={{ fontSize: 24, fontWeight: '800', color: C.ink, marginTop: 4 }}>{value}</Text>
    {sub ? <Muted style={{ marginTop: 2, fontSize: 12 }}>{sub}</Muted> : null}
  </Card>
);

export const st: Record<string, any> = {};
onPalette(() => { Object.assign(st, StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  head: { backgroundColor: C.navy, overflow: 'hidden', paddingHorizontal: S.lg, paddingBottom: S.xl, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, flexDirection: 'row', alignItems: 'flex-end', gap: S.md },
  h1: { color: C.white, fontSize: 26, fontWeight: '800', letterSpacing: -0.7 },
  headSub: { color: C.mist, fontSize: 14, marginTop: 4, fontWeight: '500' },
  h2Row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.sm },
  h2: { fontSize: 13, fontWeight: '800', color: C.sub, letterSpacing: 1.2, textTransform: 'uppercase' },
  card: { backgroundColor: C.card, borderRadius: 20, padding: S.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, },
  muted: { color: C.sub, fontSize: 14, lineHeight: 20 },
  b: { color: C.ink, fontSize: 16, fontWeight: '600' },
  btn: { minHeight: 54, borderRadius: 16, paddingHorizontal: S.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  btnT: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: C.ink },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.field, paddingHorizontal: 14, fontSize: 16, color: C.ink },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  pillT: { fontSize: 12, fontWeight: '700' },
  lrow: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, minHeight: 56 },
})); });
