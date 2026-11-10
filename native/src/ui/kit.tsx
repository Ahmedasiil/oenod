import React from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { C, R, S, onPalette } from '../lib/theme';
import { initials } from '../lib/format';
import { Icon, IconName } from './Icon';
import { t } from '../lib/i18n';
import { GradientButton, HeroGradient, PoweredBy } from './Brand';
import { Pressy } from './Motion';
import { Logo } from './Logo';
import Svg, { Circle } from 'react-native-svg';

/** Faint dot grid that fades out downward, like the website's night bands. */
function DotGrid({ width, height }: { width: number; height: number }) {
  const dots = React.useMemo(() => {
    const out: { x: number; y: number; o: number }[] = [];
    for (let y = 11; y < height; y += 22) for (let x = 11; x < width; x += 22) out.push({ x, y, o: Math.max(0, 0.13 * (1 - y / height)) });
    return out;
  }, [width, height]);
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={width} height={height}>
      {dots.map((d, i) => (d.o > 0.01 ? <Circle key={i} cx={d.x} cy={d.y} r={1} fill="#B9C4FF" fillOpacity={d.o} /> : null))}
    </Svg>
  );
}

export function Screen({ title, eyebrow, subtitle, right, children, refreshing, onRefresh, scroll = true, hero, back, top, below, fab }: {
  title?: string; eyebrow?: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void; scroll?: boolean;
  /** Content shown inside the full-width night top panel, under the title. */
  hero?: React.ReactNode;
  /** Show a back button (screens opened on top of the tabs). */
  back?: boolean;
  /** Row shown above the title inside the header (Today: logo, bell, avatar). */
  top?: React.ReactNode;
  /** Full-width strip under a light header (Schedule: the week strip). */
  below?: React.ReactNode;
  /** Floating action button above the tab bar. */
  fab?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [hh, setHh] = React.useState(160);
  const y = React.useRef(new Animated.Value(0)).current;
  const isHero = !!hero;
  const padH = Math.max(S.lg + 4, (width - 760) / 2 + S.lg);
  useFocusEffect(React.useCallback(() => { setStatusBarStyle(isHero || C.dark ? 'light' : 'dark'); return () => setStatusBarStyle(C.dark ? 'light' : 'dark'); }, [isHero]));
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const backBtn = back ? (
    <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel={t('Back')} hitSlop={8}
      style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginBottom: 4, backgroundColor: isHero ? 'rgba(255,255,255,0.12)' : (C.dark ? C.card2 : '#F5F7FB') }}>
      <Icon name="back" size={20} color={isHero ? '#FFFFFF' : C.ink} duo={false} />
    </Pressable>
  ) : null;
  const titleRow = title ? (
    <View style={{ gap: S.sm }}>
      {backBtn}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: S.md }}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={[st.eyebrow, hero ? { color: '#B9C4FF' } : null]}>{eyebrow}</Text> : null}
          <Text style={[st.h1, hero ? { color: '#FFFFFF', fontSize: 28 } : null]} accessibilityRole="header">{title}</Text>
          {subtitle ? <Text style={[st.headSub, hero ? { color: '#9AA5C8' } : null]}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  ) : null;
  const head = hero ? (
    <View style={[st.panel, { paddingTop: insets.top + (top ? S.sm : S.lg), paddingHorizontal: padH }]} onLayout={(e) => setHh(e.nativeEvent.layout.height)}>
      <HeroGradient width={width} height={hh} id="sp" fade={false} />
      <DotGrid width={width} height={Math.min(hh, 260)} />
      {top}
      {titleRow}
      {hero}
    </View>
  ) : title ? (
    <View onLayout={(e) => setHh(e.nativeEvent.layout.height)}>
      <View style={[st.head, { paddingTop: insets.top + S.lg, paddingHorizontal: padH }]}>
        {top}
        {titleRow}
      </View>
      {below}
    </View>
  ) : null;
  // The big header steps down into a slim floating bar once it scrolls away.
  const at = Math.max(40, hh - insets.top - 40);
  const slimO = y.interpolate({ inputRange: [at - 30, at], outputRange: [0, 1], extrapolate: 'clamp' });
  const slimY = y.interpolate({ inputRange: [at - 30, at], outputRange: [-14, 0], extrapolate: 'clamp' });
  const dark = isHero || C.dark;
  const slim = title ? (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 6, left: 0, right: 0, alignItems: 'center', opacity: slimO, transform: [{ translateY: slimY }], zIndex: 5 }}>
      <View style={[st.slim, { width: Math.min(width - 24, 736) }, dark ? { backgroundColor: 'rgba(8,15,44,0.95)', borderColor: 'rgba(255,255,255,0.09)' } : { backgroundColor: 'rgba(255,255,255,0.97)', borderColor: 'rgba(10,18,48,0.08)' }]}>
        {back ? <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel={t('Back')} hitSlop={8}><Icon name="back" size={20} color={dark ? '#FFFFFF' : C.ink} /></Pressable> : <Logo width={48} color={dark ? '#FFFFFF' : '#0A1230'} />}
        <View style={{ width: 1, height: 16, backgroundColor: dark ? 'rgba(255,255,255,0.2)' : 'rgba(10,18,48,0.15)' }} />
        <Text style={{ flex: 1, color: dark ? '#FFFFFF' : C.ink, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{title}</Text>
      </View>
    </Animated.View>
  ) : null;
  if (!scroll) return <View style={st.screen}>{head}{children}</View>;
  return (
    <View style={st.screen}>
      <Animated.ScrollView
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: Platform.OS !== 'web' })}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={hero ? '#FFFFFF' : C.link} progressViewOffset={insets.top} /> : undefined}
      >
        {head}
        <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: S.lg, paddingTop: 18, gap: 14 }}>
          {children}
          <PoweredBy />
        </View>
      </Animated.ScrollView>
      {slim}
      {fab ? <View pointerEvents="box-none" style={{ position: 'absolute', right: Math.max(20, (width - 760) / 2 + 20), bottom: insets.bottom + 96 }}>{fab}</View> : null}
    </View>
  );
}

export const Card = ({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void }) =>
  onPress ? (
    <Pressy onPress={onPress} accessibilityRole="button" style={[st.card, style] as any}>{children}</Pressy>
  ) : <View style={[st.card, style]}>{children}</View>;

export const H2 = ({ children, right, action, onAction }: { children: React.ReactNode; right?: React.ReactNode; action?: string; onAction?: () => void }) => (
  <View style={st.h2Row}>
    <Text style={st.h2} accessibilityRole="header">{children}</Text>
    {right}
    {action && onAction ? <Pressable onPress={onAction} accessibilityRole="link" hitSlop={10}><Text style={{ color: C.link, fontWeight: '700', fontSize: 14 }}>{action}</Text></Pressable> : null}
  </View>
);
export const Muted = ({ children, style }: { children: React.ReactNode; style?: any }) => <Text style={[st.muted, style]}>{children}</Text>;
export const B = ({ children, style }: { children: React.ReactNode; style?: any }) => <Text style={[st.b, style]}>{children}</Text>;

export function Button({ title, onPress, kind = 'primary', icon, busy, disabled, style }: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger' | 'light' | 'ghost' | 'glass'; icon?: IconName; busy?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  if (kind === 'primary') return <GradientButton title={title} onPress={onPress} icon={icon} busy={busy} disabled={disabled} style={style} />;
  const bg = { primary: C.blue, secondary: C.card2, danger: '#E5484D', light: '#FFFFFF', ghost: 'transparent', glass: 'rgba(255,255,255,0.12)' }[kind];
  const fg = { primary: C.white, secondary: C.ink, danger: '#FFFFFF', light: '#0A1230', ghost: C.link, glass: '#FFFFFF' }[kind];
  const border = 'transparent';
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
  const m = { good: [C.goodSoft, C.good], warn: [C.warnSoft, C.warn], bad: [C.badSoft, C.bad], info: [C.blueSoft, C.link], plain: [C.seg, C.sub] }[kind];
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
  <Card style={{ flex: 1, minWidth: 0, padding: S.md + 2 }}>
    <Muted style={{ fontSize: 13 }}>{label}</Muted>
    <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink, marginTop: 4 }} numberOfLines={1}>{value}</Text>
    {sub ? <Muted style={{ marginTop: 2, fontSize: 12 }}>{sub}</Muted> : null}
  </Card>
);

export const st: Record<string, any> = {};
onPalette(() => { Object.assign(st, StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  head: { overflow: 'hidden', paddingHorizontal: S.lg, paddingBottom: 14, backgroundColor: C.dark ? C.bg : '#FFFFFF' },
  panel: { overflow: 'hidden', paddingHorizontal: S.lg, paddingBottom: 24, gap: 18, backgroundColor: '#050B24' },
  slim: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.dark ? 'rgba(12,21,54,0.94)' : 'rgba(255,255,255,0.96)', borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, shadowColor: '#0A1230', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  eyebrow: { color: C.faint, fontSize: 13, fontWeight: '500', marginBottom: 2 },
  h1: { color: C.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.9 },
  headSub: { color: C.sub, fontSize: 15, marginTop: 4, fontWeight: '500' },
  h2Row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.sm, gap: S.sm, paddingHorizontal: 2 },
  h2: { fontSize: 16, fontWeight: '700', color: C.ink, letterSpacing: -0.2, flexShrink: 1 },
  card: { backgroundColor: C.card, borderRadius: 20, padding: S.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, shadowColor: '#0A1230', shadowOpacity: C.dark ? 0 : 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  muted: { color: C.sub, fontSize: 14, lineHeight: 20 },
  b: { color: C.ink, fontSize: 16, fontWeight: '700' },
  btn: { minHeight: 54, borderRadius: 999, paddingHorizontal: S.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  btnT: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: C.sub },
  input: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.field, paddingHorizontal: 16, fontSize: 16, color: C.ink },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  pillT: { fontSize: 12, fontWeight: '700' },
  lrow: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, minHeight: 58 },
})); });
