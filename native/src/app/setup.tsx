// Shown once, right after a new business account is created: the workspace "comes alive" step by
// step, then the owner can invite up to three teammates by email before landing on Today.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { post } from '../lib/api';
import { t } from '../lib/i18n';
import { Backdrop, GradientButton, PoweredBy } from '../ui/Brand';
import { Icon } from '../ui/Icon';
import { A, ErrorLine, In } from '../ui/AuthKit';

type Mate = { first: string; last: string; email: string; role: 'employee' | 'manager' };

function Tick({ label, delay }: { label: string; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  const [done, setDone] = useState(false);
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 900, delay, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(() => setDone(true));
  }, [v, delay]);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? A.ok : 'rgba(255,255,255,0.08)' }}>
          {done ? <Icon name="check" size={16} color="#FFFFFF" duo={false} /> : null}
        </View>
        <Text style={{ color: done ? A.ink : A.sub, fontSize: 15, fontWeight: '600' }}>{label}</Text>
      </View>
      <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginLeft: 32 }}>
        <Animated.View style={{ height: 3, backgroundColor: '#8EA0FF', width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      </View>
    </View>
  );
}

export default function Setup() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [mates, setMates] = useState<Mate[]>([{ first: '', last: '', email: '', role: 'employee' }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState<string[]>([]);
  const first = (session?.user?.name || '').split(' ')[0];
  const set = (i: number, k: keyof Mate, v: string) => setMates(mates.map((m, n) => (n === i ? { ...m, [k]: v } : m)));
  const done = () => router.replace('/');

  const invite = async () => {
    const list = mates.filter((m) => m.email.trim());
    if (!list.length) { done(); return; }
    setErr(''); setBusy(true);
    const ok: string[] = [];
    try {
      for (const m of list) {
        const [fn, ...rest] = (m.first.trim() || m.email.split('@')[0]).split(' ');
        const e = await post('/api/employees', { first_name: fn, last_name: m.last.trim() || rest.join(' ') || '-', email: m.email.trim() });
        await post(`/api/employees/${e.id}/invite`, { email: m.email.trim(), role: m.role });
        ok.push(m.email.trim());
      }
      setSent(ok);
      setTimeout(done, 1400);
    } catch (e: any) {
      setSent(ok);
      setErr(e?.message || t('Could not send the invite.'));
    } finally { setBusy(false); }
  };

  return (
    <Backdrop>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', padding: 24, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 16, gap: 22 }}>
        <In style={{ gap: 8 }}>
          <Text style={{ color: A.sky, fontSize: 11, fontWeight: '700', letterSpacing: 1.8 }}>{t('YOUR WORKSPACE')}</Text>
          <Text accessibilityRole="header" style={{ color: A.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.9 }}>{first ? t('Welcome, {n}.', { n: first }) : t('Welcome.')}</Text>
          <Text style={{ color: A.sub, fontSize: 15, lineHeight: 22 }}>{t('{c} is ready. Your free trial has started.', { c: session?.company?.name || 'OENOD' })}</Text>
        </In>
        <View style={{ gap: 14, padding: 18, borderRadius: 22, backgroundColor: A.glass, borderWidth: 1, borderColor: A.line }}>
          <Tick label={t('Creating your workspace')} delay={150} />
          <Tick label={t('Setting up your suites')} delay={900} />
          <Tick label={t('Adding industry templates')} delay={1650} />
          <Tick label={t('Connecting OENOD AI')} delay={2400} />
        </View>
        <In delay={400} style={{ gap: 12 }}>
          <Text style={{ color: A.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 }}>{t('Invite your team')}</Text>
          <Text style={{ color: A.sub, fontSize: 14, lineHeight: 20 }}>{t('They get an email to set up their account, then clock in and see shifts from their phone.')}</Text>
          {mates.map((m, i) => (
            <View key={i} style={{ gap: 8, padding: 14, borderRadius: 18, backgroundColor: A.glass, borderWidth: 1, borderColor: A.line }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput value={m.first} onChangeText={(v) => set(i, 'first', v)} placeholder={t('First name')} placeholderTextColor={A.faint} style={inp} accessibilityLabel={t('First name')} />
                <TextInput value={m.last} onChangeText={(v) => set(i, 'last', v)} placeholder={t('Last name')} placeholderTextColor={A.faint} style={inp} accessibilityLabel={t('Last name')} />
              </View>
              <TextInput value={m.email} onChangeText={(v) => set(i, 'email', v)} placeholder={t('Email')} placeholderTextColor={A.faint} autoCapitalize="none" keyboardType="email-address" style={inp} accessibilityLabel={t('Email')} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['employee', 'manager'] as const).map((r) => (
                  <Pressable key={r} onPress={() => set(i, 'role', r)} accessibilityRole="radio" accessibilityState={{ selected: m.role === r }}
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: m.role === r ? '#FFFFFF' : 'transparent', borderWidth: 1, borderColor: m.role === r ? '#FFFFFF' : A.line }}>
                    <Text style={{ color: m.role === r ? '#0A1230' : A.sub, fontWeight: '700', fontSize: 13 }}>{r === 'employee' ? t('Employee') : t('Manager')}</Text>
                  </Pressable>
                ))}
                {sent.includes(m.email.trim()) ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}><Icon name="check" size={16} color={A.ok} /><Text style={{ color: A.ok, fontWeight: '700', fontSize: 13 }}>{t('Invited')}</Text></View> : null}
              </View>
            </View>
          ))}
          {mates.length < 3 ? (
            <Pressable onPress={() => setMates([...mates, { first: '', last: '', email: '', role: 'employee' }])} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', padding: 4 }}>
              <Icon name="plus" size={18} color={A.sky} /><Text style={{ color: A.sky, fontWeight: '700' }}>{t('Add another person')}</Text>
            </Pressable>
          ) : null}
        </In>
        <ErrorLine text={err} />
        <View style={{ flex: 1 }} />
        <View style={{ gap: 10 }}>
          <GradientButton light busy={busy} title={mates.some((m) => m.email.trim()) ? t('Send invites and open OENOD') : t('Open OENOD')} iconRight="arrow" onPress={invite} />
          <Pressable onPress={done} accessibilityRole="button" style={{ alignItems: 'center', padding: 8 }}><Text style={{ color: A.sub, fontWeight: '600' }}>{t('Skip for now')}</Text></Pressable>
        </View>
        <PoweredBy dark />
      </ScrollView>
    </Backdrop>
  );
}

const inp = { flex: 1, minHeight: 46, borderRadius: 12, paddingHorizontal: 12, color: '#FFFFFF', fontSize: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(175,195,255,0.16)' } as const;
