// Employee kiosk (3.9): a shared tablet or phone at the door. Staff scan their OENOD badge QR or
// pick their name and type their PIN to clock in or out. Same server punch as the website kiosk
// (POST /api/kiosk/punch), so it needs a manager signed in. Leaving the kiosk asks for Face ID or
// the device passcode, so staff cannot wander into the manager's app.
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { get, post } from '../lib/api';
import { hm } from '../lib/format';
import { t } from '../lib/i18n';
import { HeroGradient } from '../ui/Brand';
import { Bands } from '../ui/Bands';
import { Icon } from '../ui/Icon';
import { Logo } from '../ui/Logo';

type Emp = { id: number; name: string };
type Punch = { name: string; action: 'in' | 'out' | 'break' | 'resume'; minutes?: number };

const WORD: Record<Punch['action'], string> = { in: 'clocked in', out: 'clocked out', break: 'on break', resume: 'back from break' };

export default function Kiosk() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [now, setNow] = useState(new Date());
  const [mode, setMode] = useState<'qr' | 'pin'>('pin');
  const [emps, setEmps] = useState<Emp[]>([]);
  const [who, setWho] = useState<Emp | null>(null);
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [perm, askPerm] = useCameraPermissions();
  const busy = useRef(false);

  useEffect(() => { const i = setInterval(() => setNow(new Date()), 10000); return () => clearInterval(i); }, []);
  useEffect(() => { get<{ employees: Emp[] }>('/api/employees?status=active').then((r) => setEmps(r.employees || [])).catch((e) => say(e.message, false)); }, []);

  const tm = useRef<any>(null);
  function say(text: string, ok = true) {
    setMsg({ text, ok });
    clearTimeout(tm.current);
    tm.current = setTimeout(() => setMsg(null), 4500);
    if (Platform.OS !== 'web') Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
  }
  const done = (r: Punch) => {
    const at = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    say(`${r.name}: ${t(WORD[r.action])} ${t('at {t}', { t: at })}${r.action === 'out' && r.minutes != null ? ' · ' + t('{h} today', { h: hm(r.minutes) }) : ''}`);
  };
  const punch = async (body: Record<string, unknown>) => {
    if (busy.current) return;
    busy.current = true;
    try { done(await post<Punch>('/api/kiosk/punch', body)); }
    catch (e: any) { say(e.message, false); }
    finally { busy.current = false; setPin(''); setWho(null); }
  };
  const key = (k: string) => {
    if (k === 'c') return setPin(pin.slice(0, -1));
    if (k === 'ok') {
      if (!who || pin.length < 4) return say(t('Choose your name and type your PIN'), false);
      return punch({ employee_id: who.id, pin });
    }
    if (pin.length < 8) setPin(pin + k);
  };
  const exit = async () => {
    if (Platform.OS !== 'web' && (await LocalAuthentication.isEnrolledAsync().catch(() => false))) {
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: t('Leave the kiosk') });
      if (!r.success) return;
    }
    router.canGoBack() ? router.back() : router.replace('/');
  };

  const pad = Math.min(300, width - 48);
  const k = (pad - 20) / 3;
  return (
    <View style={{ flex: 1, backgroundColor: '#000C58' }}>
      <HeroGradient width={width} height={height} fade={false} />
      <Bands size={Math.min(width, 520) * 0.8} style={{ position: 'absolute', right: -width * 0.25, top: -width * 0.2 }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, alignItems: 'center', gap: 14 }}>
        <Logo width={78} color="#FFFFFF" />
        <Text style={{ color: '#B9C4FF', fontSize: 12, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase' }}>{t('Employee kiosk')}</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 64, fontWeight: '800', letterSpacing: -2 }} accessibilityRole="header">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
        <Text style={{ color: '#B9C4FF', fontSize: 15, marginTop: -8 }}>{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</Text>

        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, padding: 4, marginTop: 6 }}>
          {(['pin', 'qr'] as const).map((m) => (
            <Pressable key={m} onPress={() => { setMode(m); if (m === 'qr' && !perm?.granted) askPerm(); }} accessibilityRole="tab" accessibilityState={{ selected: mode === m }}
              style={{ paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, backgroundColor: mode === m ? '#FFFFFF' : 'transparent' }}>
              <Text style={{ color: mode === m ? '#000C58' : '#FFFFFF', fontWeight: '700' }}>{t(m === 'pin' ? 'PIN' : 'Scan badge')}</Text>
            </Pressable>
          ))}
        </View>

        {msg ? (
          <View accessibilityLiveRegion="polite" style={{ borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: msg.ok ? 'rgba(18,193,99,0.18)' : 'rgba(229,72,77,0.2)', maxWidth: 420 }}>
            <Text style={{ color: msg.ok ? '#7EE2A8' : '#FFB4AE', fontWeight: '700', fontSize: 16, textAlign: 'center' }}>{msg.text}</Text>
          </View>
        ) : null}

        {mode === 'qr' ? (
          <View style={{ width: pad, height: pad, borderRadius: 26, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            {perm?.granted ? (
              <CameraView style={{ width: pad, height: pad }} facing="front" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={(e) => { if (!busy.current && e.data) punch({ qr: e.data }); }} />
            ) : (
              <Pressable onPress={() => askPerm()} accessibilityRole="button" style={{ padding: 20, alignItems: 'center', gap: 10 }}>
                <Icon name="qr" size={40} color="#FFFFFF" duo={false} />
                <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>{t('Allow the camera to scan OENOD badges')}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            <Text style={{ color: '#B9C4FF' }}>{who ? who.name : t('Tap your name')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: Math.min(width - 24, 640), flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
              {emps.map((e) => (
                <Pressable key={e.id} onPress={() => { setWho(e); setPin(''); }} accessibilityRole="button" accessibilityState={{ selected: who?.id === e.id }}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: who?.id === e.id ? '#FFFFFF' : 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }}>
                  <Text style={{ color: who?.id === e.id ? '#000C58' : '#FFFFFF', fontWeight: '600' }}>{e.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 12, height: 18, alignItems: 'center' }} accessibilityLabel={t('{n} digits typed', { n: pin.length })}>
              {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                <View key={i} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: i < pin.length ? '#FFFFFF' : '#B9C4FF', backgroundColor: i < pin.length ? '#FFFFFF' : 'transparent' }} />
              ))}
            </View>
            <View style={{ width: pad, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'c', '0', 'ok'].map((d) => (
                <Pressable key={d} onPress={() => key(d)} accessibilityRole="button" accessibilityLabel={d === 'c' ? t('Delete') : d === 'ok' ? t('Clock in or out') : d}
                  style={({ pressed }) => ({ width: k, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: d === 'ok' ? '#FFFFFF' : 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', transform: [{ scale: pressed ? 0.96 : 1 }] })}>
                  {d === 'c' ? <Icon name="back" size={22} color="#FFFFFF" duo={false} />
                    : <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: d === 'ok' ? '#000C58' : '#FFFFFF', fontSize: d === 'ok' ? 13 : 24, fontWeight: '700', paddingHorizontal: 4 }}>{d === 'ok' ? t('Clock in/out') : d}</Text>}
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Pressable onPress={exit} accessibilityRole="button" hitSlop={10} style={{ marginTop: 8 }}>
          <Text style={{ color: '#B9C4FF', textDecorationLine: 'underline' }}>{t('Exit kiosk')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
