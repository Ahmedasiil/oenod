// In-app call screen for Business Phone calls (3.8, iPhone). The ringing, answering and lock-screen
// controls are Apple's own CallKit screens; this is what the person sees inside OENOD during the call.
// 3.9.1 Navy Glass Pro: deep navy with the turning OENOD rings, caller initials, black round buttons.
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Bands } from '../ui/Bands';
import { HeroGradient } from '../ui/Brand';
import { Logo } from '../ui/Logo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../ui/Icon';
import { t } from '../lib/i18n';
import { hangUp, speakerPicker, toggleHold, toggleMute, useCall } from '../lib/phone';

const mmss = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function Round({ label, icon, on, onPress, danger }: { label: string; icon: IconName; on?: boolean; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!on }} style={{ alignItems: 'center', gap: 8, width: 84 }}>
      {({ pressed }) => (<>
        <View style={{ width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1,
          backgroundColor: danger ? '#E5484D' : on ? '#FFFFFF' : 'rgba(5,6,13,0.6)', borderWidth: danger || on ? 0 : 1, borderColor: 'rgba(185,196,255,0.2)' }}>
          <Icon name={icon} size={26} color={danger ? '#FFFFFF' : on ? '#000C58' : '#FFFFFF'} duo={false} />
        </View>
        <Text style={{ color: 'rgba(221,227,255,0.9)', fontSize: 13, fontWeight: '600' }}>{label}</Text>
      </>)}
    </Pressable>
  );
}

export default function CallScreen() {
  const live = useCall();
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  // Web preview only (screenshots): a sample call, since real calls exist only on the phone.
  const [demoAt] = useState(Date.now() - 83000);
  const c = live || (Platform.OS === 'web' && demo ? ({ state: 'live', from: '(587) 555-0142', since: demoAt, muted: false, held: false } as any) : null);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const ini = (c?.from || '').replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  useEffect(() => { if (!c) { const tm = setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/')), 300); return () => clearTimeout(tm); } }, [c]);
  const status = !c ? t('Call ended') : c.state === 'live' ? (c.held ? t('On hold') : mmss(now - (c.since || now)))
    : c.state === 'reconnecting' ? t('Reconnecting…') : c.state === 'ended' ? t('Call ended') : t('Connecting…');
  return (
    <View style={{ flex: 1, backgroundColor: '#000C58', paddingTop: insets.top + 28, paddingBottom: insets.bottom + 36, paddingHorizontal: 24, justifyContent: 'space-between' }}>
      <HeroGradient width={width} height={height} fade={false} />
      <Bands size={Math.min(width, 520) * 0.95} style={{ position: 'absolute', alignSelf: 'center', top: insets.top + 40, left: (width - Math.min(width, 520) * 0.95) / 2, opacity: 0.55 }} />
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Logo width={64} color="#FFFFFF" />
        <View style={{ width: 104, height: 104, borderRadius: 52, marginTop: 28, marginBottom: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D0F18', borderWidth: 1, borderColor: 'rgba(185,196,255,0.25)' }}>
          {ini ? <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '700' }}>{ini}</Text> : <Icon name="phone" size={40} color="#FFFFFF" duo={false} />}
        </View>
        <Text style={{ color: 'rgba(185,196,255,0.85)', fontSize: 12, fontWeight: '700', letterSpacing: 2 }}>{t('OENOD BUSINESS PHONE')}</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>{c?.from || ''}</Text>
        <Text style={{ color: 'rgba(221,227,255,0.8)', fontSize: 17, fontVariant: ['tabular-nums'] }}>{status}</Text>
      </View>
      <View style={{ gap: 28, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
          <Round label={c?.muted ? t('Unmute') : t('Mute')} icon="x" on={!!c?.muted} onPress={toggleMute} />
          <Round label={c?.held ? t('Resume') : t('Hold')} icon="clock" on={!!c?.held} onPress={toggleHold} />
          <Round label={t('Speaker')} icon="device" onPress={speakerPicker} />
        </View>
        <Round label={t('End call')} icon="phone" danger onPress={hangUp} />
      </View>
    </View>
  );
}
