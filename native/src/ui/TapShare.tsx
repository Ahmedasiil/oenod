// Tap to share (Android): while the business card is on screen, this phone acts as an NFC tag
// that holds only the public card link. Tapping another phone opens the card there.
// It stops as soon as the card leaves the screen or the app goes to the background.
import React, { useCallback, useState } from 'react';
import { AppState, Linking, Platform, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { tapStart, tapStatus, tapStop } from '../../modules/oenod-tap/src';
import { C } from '../lib/theme';
import { t } from '../lib/i18n';
import { Icon } from './Icon';

export function TapShare({ url }: { url?: string }) {
  const [st, setSt] = useState<'none' | 'off' | 'ready'>('none');
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android' || !url) return;
    const go = () => { const s = tapStatus(); setSt(s); if (s === 'ready') tapStart(url); };
    go();
    const sub = AppState.addEventListener('change', (a) => { if (a === 'active') go(); else tapStop(); });
    return () => { sub.remove(); tapStop(); };
  }, [url]));
  if (Platform.OS !== 'android' || !url || st === 'none') return null;
  const on = st === 'ready';
  return (
    <Pressable disabled={on} accessibilityRole={on ? 'text' : 'button'}
      onPress={() => Linking.sendIntent('android.settings.NFC_SETTINGS').catch(() => {})}
      style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: on ? '#000C58' : C.card2, borderWidth: 1, borderColor: on ? 'rgba(185,196,255,0.3)' : C.line }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? '#FFFFFF' : '#000C58' }}>
        <Icon name="device" size={20} color={on ? '#000C58' : '#FFFFFF'} duo={false} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: on ? '#FFFFFF' : C.ink, fontWeight: '700', fontSize: 15 }}>{t(on ? 'Tap to share is on' : 'Turn on NFC to tap to share')}</Text>
        <Text style={{ color: on ? '#B9C4FF' : C.sub, fontSize: 13 }}>{t(on ? 'Hold the back of your phone to another phone to open your card there.' : 'Open settings and turn on NFC, then come back to this screen.')}</Text>
      </View>
    </Pressable>
  );
}
