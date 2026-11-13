// In-app call screen for Business Phone calls (3.8, iPhone). The ringing, answering and lock-screen
// controls are Apple's own CallKit screens; this is what the person sees inside OENOD during the call.
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
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
          backgroundColor: danger ? '#E5484D' : on ? '#FFFFFF' : 'rgba(255,255,255,0.12)', borderWidth: danger || on ? 0 : 1, borderColor: 'rgba(221,227,255,0.25)' }}>
          <Icon name={icon} size={26} color={danger ? '#FFFFFF' : on ? '#000C58' : '#FFFFFF'} duo={false} />
        </View>
        <Text style={{ color: 'rgba(221,227,255,0.9)', fontSize: 13, fontWeight: '600' }}>{label}</Text>
      </>)}
    </Pressable>
  );
}

export default function CallScreen() {
  const c = useCall();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  useEffect(() => { if (!c) { const tm = setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/')), 300); return () => clearTimeout(tm); } }, [c]);
  const status = !c ? t('Call ended') : c.state === 'live' ? (c.held ? t('On hold') : mmss(now - (c.since || now)))
    : c.state === 'reconnecting' ? t('Reconnecting…') : c.state === 'ended' ? t('Call ended') : t('Connecting…');
  return (
    <View style={{ flex: 1, backgroundColor: '#000C58', paddingTop: insets.top + 48, paddingBottom: insets.bottom + 36, paddingHorizontal: 24, justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', gap: 10 }}>
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
