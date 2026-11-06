// Pieces for the signed-out screens (welcome, sign in, sign up, guest join): night backdrop,
// glass inputs, step dots and selectable chips, in the oenod.com look.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Backdrop, PoweredBy, Wordmark } from './Brand';
import { Icon, IconName } from './Icon';
import { t } from '../lib/i18n';

const native = Platform.OS !== 'web';
export const A = { ink: '#FFFFFF', sub: '#9AA5C8', faint: '#66708F', sky: '#AFC3FF', line: 'rgba(175,195,255,0.16)', glass: 'rgba(255,255,255,0.05)', bad: '#FF8A8A', ok: '#3DD39A' };

/** Fades and lifts its children in, one after another by `delay`. */
export function In({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: ViewStyle }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 520, delay, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start(); }, [v, delay]);
  return <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>{children}</Animated.View>;
}

/** Full signed-out page: night backdrop, top bar with back + logo, centred column, brand line at the bottom. */
export function AuthPage({ children, back = true, right, footer }: { children: React.ReactNode; back?: boolean; right?: React.ReactNode; footer?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Backdrop>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 18, height: insets.top + 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {back ? (
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} accessibilityRole="button" accessibilityLabel={t('Back')} hitSlop={8}
              style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: A.glass, borderWidth: 1, borderColor: A.line }}>
              <Icon name="back" color="#FFFFFF" size={20} />
            </Pressable>
          ) : <View style={{ width: 42 }} />}
          <Wordmark width={92} />
          {right ?? <View style={{ width: 42 }} />}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 18, paddingBottom: insets.bottom + 16 }}>
          <View style={{ flex: 1, gap: 18 }}>{children}</View>
          {footer}
          <PoweredBy dark />
        </ScrollView>
      </KeyboardAvoidingView>
    </Backdrop>
  );
}

export function Heading({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <View style={{ gap: 8 }}>
      {eyebrow ? <Text style={{ color: A.sky, fontSize: 11, fontWeight: '700', letterSpacing: 1.8 }}>{eyebrow.toUpperCase()}</Text> : null}
      <Text accessibilityRole="header" style={{ color: A.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.9, lineHeight: 35 }}>{title}</Text>
      {sub ? <Text style={{ color: A.sub, fontSize: 15, lineHeight: 22 }}>{sub}</Text> : null}
    </View>
  );
}

/** Glass text field with a floating label, focus ring and optional show/hide for passwords. */
export function GField({ label, icon, error, secure, ...p }: TextInputProps & { label: string; icon?: IconName; error?: string; secure?: boolean }) {
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: A.sub, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, borderRadius: 16, paddingHorizontal: 14, backgroundColor: focus ? 'rgba(61,91,245,0.10)' : A.glass,
        borderWidth: 1, borderColor: error ? A.bad : focus ? '#5B76FF' : A.line }}>
        {icon ? <View style={{ flexShrink: 0 }}><Icon name={icon} size={19} color={focus ? A.sky : A.faint} /></View> : null}
        <TextInput placeholderTextColor={A.faint} accessibilityLabel={label} secureTextEntry={secure && !show}
          onFocus={(e) => { setFocus(true); p.onFocus?.(e); }} onBlur={(e) => { setFocus(false); p.onBlur?.(e); }}
          style={{ flex: 1, minWidth: 0, color: A.ink, fontSize: 16, paddingVertical: 14 }} {...p} />
        {secure ? (
          <Pressable onPress={() => setShow(!show)} accessibilityRole="button" accessibilityLabel={show ? t('Hide password') : t('Show password')} hitSlop={8}>
            <Text style={{ color: A.sky, fontWeight: '700', fontSize: 13 }}>{show ? t('Hide') : t('Show')}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={{ color: A.bad, fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}

/** Progress for multi-step forms: a thin bar per step. */
export function Steps({ n, of }: { n: number; of: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={t('Step {n} of {m}', { n, m: of })}>
      {Array.from({ length: of }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < n ? '#5B76FF' : 'rgba(255,255,255,0.12)' }} />
      ))}
    </View>
  );
}

/** Selectable glass chip (industries, suites). */
export function Chip({ label, on, onPress, icon, sub }: { label: string; on: boolean; onPress: () => void; icon?: IconName; sub?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingVertical: sub ? 14 : 11, paddingHorizontal: 14,
        backgroundColor: on ? 'rgba(61,91,245,0.18)' : A.glass, borderWidth: 1, borderColor: on ? '#5B76FF' : A.line, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      {icon ? <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? '#3D5BF5' : 'rgba(255,255,255,0.06)' }}><Icon name={icon} size={19} color="#FFFFFF" /></View> : null}
      <View style={{ flex: sub ? 1 : 0 }}>
        <Text style={{ color: A.ink, fontWeight: '700', fontSize: 15 }}>{label}</Text>
        {sub ? <Text style={{ color: A.sub, fontSize: 13, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {sub ? <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: on ? '#5B76FF' : A.line, backgroundColor: on ? '#3D5BF5' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {on ? <Icon name="check" size={16} color="#FFFFFF" duo={false} /> : null}
      </View> : null}
    </Pressable>
  );
}

/** Secondary glass button. */
export function GlassBtn({ title, onPress, icon, disabled }: { title: string; onPress: () => void; icon?: IconName; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => ({ minHeight: 54, borderRadius: 999, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18,
        backgroundColor: pressed ? 'rgba(255,255,255,0.10)' : A.glass, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', opacity: disabled ? 0.5 : 1 })}>
      {icon ? <Icon name={icon} size={19} color="#FFFFFF" /> : null}
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}

export function ErrorLine({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,138,138,0.10)', borderWidth: 1, borderColor: 'rgba(255,138,138,0.3)' }}>
      <Icon name="shield" size={16} color={A.bad} />
      <Text style={{ flex: 1, color: '#FFD0D0', fontSize: 14 }}>{text}</Text>
    </View>
  );
}
