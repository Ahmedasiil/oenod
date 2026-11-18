// Join with code (approved Meet design, 11-18): the 10 boxes, a big keypad, paste a link or scan the QR code from an
// invite, recent codes on this phone, and who you join as. The call opens in OENOD Meet inside the app.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { post } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { t } from '../../lib/i18n';
import { forgetCodes, recentCodes, rememberCode, type Recent } from '../../lib/meet';
import { meetingCode, meetingId, openMeeting } from '../guest';
import { Icon } from '../../ui/Icon';
import { BigBtn, ErrText, MBand, MInput, MK, MList, MRow, MSec, MSheet, Pill, RoundBtn, prettyCode } from '../../ui/MeetKit';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'del'];

export default function JoinWithCode() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const p = useLocalSearchParams<{ code?: string }>();
  const [d, setD] = useState(() => String(p.code || '').replace(/\D/g, '').slice(0, 10));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState<string | null>(null);
  const [scan, setScan] = useState(false);
  const [perm, askPerm] = useCameraPermissions();
  const [recent, setRecent] = useState<Recent[]>([]);
  const seen = useRef(false);
  useEffect(() => { recentCodes().then(setRecent); }, []);

  const tap = () => Haptics.selectionAsync().catch(() => {});
  const key = (k: string) => {
    tap(); setErr('');
    if (k === 'del') setD((v) => v.slice(0, -1));
    else if (k === 'clear') setD('');
    else setD((v) => (v.length < 10 ? v + k : v));
  };

  /** Join with 10 numbers, or straight from a meeting link. */
  const join = async (raw?: string) => {
    if (busy) return;
    const v = raw ?? d;
    const code = meetingCode(v);
    setErr('');
    if (!code) {
      const id = meetingId(v);
      if (id && raw) { openMeeting(id); return; }
      setErr(t('Type all 10 numbers of the meeting code, like 482 913 5067.'));
      return;
    }
    setD(code); setBusy(true);
    try {
      const r = await post<{ token?: string; title?: string }>('/api/public/mc1-find', { code });
      if (!r?.token) throw new Error(t('No meeting has that code. Check the numbers in your invite and try again.'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await rememberCode(code, r.title);
      recentCodes().then(setRecent);
      openMeeting(r.token);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setErr(e?.message || t('No meeting has that code. Check the numbers in your invite and try again.'));
    } finally { setBusy(false); }
  };

  const startScan = async () => {
    setErr('');
    if (!perm?.granted) { const r = await askPerm(); if (!r.granted) { setErr(t('Allow the camera in Settings to scan the QR code.')); return; } }
    seen.current = false; setScan(true);
  };
  const onCode = ({ data }: { data: string }) => {
    if (seen.current) return;
    if (!meetingCode(data) && !meetingId(data)) return;
    seen.current = true; setScan(false); join(String(data));
  };

  const groups = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)];
  const sizes = [3, 3, 4];
  let pos = 0;
  return (
    <View style={{ flex: 1, backgroundColor: MK.mist }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        <MBand top={insets.top} pad={96} title={t('Join with code')} sub={t('Type the 10 numbers from your invite, or scan its QR code.')}
          left={<RoundBtn ic="back" label={t('Back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/meet' as any))} />}
          right={<RoundBtn ic="qr" label={t('Scan the QR code')} onPress={startScan} />} />
        <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 16, marginTop: -72, gap: 14 }}>
          <View style={[{ backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: MK.line, padding: 16, gap: 14 }, MK.shadow]}>
            <View accessible accessibilityLabel={d ? t('Code {code}', { code: prettyCode(d) }) : t('No numbers typed yet')}
              style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
              {groups.map((g, gi) => (
                <View key={gi} style={{ flexDirection: 'row', gap: 5, flex: sizes[gi] }}>
                  {Array.from({ length: sizes[gi] }, (_, i) => {
                    const idx = pos++;
                    const ch = g[i] || '';
                    const cur = idx === d.length && !busy;
                    return (
                      <View key={i} style={{ flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: cur ? 2 : 1.5, borderColor: err ? '#F2B8BD' : cur ? MK.blue : ch ? MK.navy : MK.line, backgroundColor: ch ? '#F4F6FE' : '#FFFFFF' }}>
                        <Text style={{ color: MK.navy, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{ch}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
            <ErrText text={err} />
            <BigBtn text={busy ? t('Finding the meeting…') : t('Join')} ph="video-camera" busy={busy} disabled={d.length !== 10} onPress={() => join()} />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Pill small tone="light" ic="link" text={paste == null ? t('Paste a link') : t('Hide link box')} onPress={() => setPaste(paste == null ? '' : null)} />
              <Pill small tone="light" ic="qr" text={t('Scan QR code')} onPress={startScan} />
            </View>
            {paste != null ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <MInput value={paste} onChangeText={(v) => { setPaste(v); const c = meetingCode(v); if (c) setD(c); }} autoFocus autoCapitalize="none" autoCorrect={false}
                  placeholder={t('Paste the link from your invite')} onSubmitEditing={() => join(paste)} returnKeyType="go" style={{ flex: 1 }} accessibilityLabel={t('Meeting link')} />
                <Pill text={t('Go')} onPress={() => join(paste)} />
              </View>
            ) : null}
          </View>

          {/* Keypad: big keys, no phone keyboard needed. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {KEYS.map((k) => (
              <Pressable key={k} onPress={() => key(k)} accessibilityRole="button" accessibilityLabel={k === 'del' ? t('Delete') : k === 'clear' ? t('Clear') : k}
                style={({ pressed }) => ({ flexBasis: '30%', flexGrow: 1, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#E4E8F6' : '#FFFFFF', borderWidth: 1, borderColor: MK.line, borderBottomWidth: 3, borderBottomColor: '#D6DAE8' })}>
                {k === 'del' ? <Icon name="back" size={22} color={MK.navy} /> : <Text style={{ color: k === 'clear' ? MK.muted : MK.navy, fontSize: k === 'clear' ? 14 : 24, fontWeight: '800' }}>{k === 'clear' ? t('Clear') : k}</Text>}
              </Pressable>
            ))}
          </View>

          {recent.length ? (
            <>
              <MSec title={t('Recent codes')} right={t('Clear')} onRight={() => { forgetCodes(); setRecent([]); }} />
              <MList>
                {recent.map((r, i) => (
                  <MRow key={r.code} first={i === 0} time={prettyCode(r.code).slice(0, 7)} len={prettyCode(r.code).slice(8)} bar={MK.soft}
                    title={r.title || prettyCode(r.code)} sub={t('Tap to use this code')} onPress={() => { setErr(''); setD(r.code); }} />
                ))}
              </MList>
            </>
          ) : null}

          {session?.user?.name ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: MK.line }}>
              <Icon name="user" size={18} color={MK.navy} />
              <Text style={{ flex: 1, color: MK.muted, fontSize: 13.5 }}>{t('Joining as')} <Text style={{ color: MK.ink, fontWeight: '800' }}>{session.user.name}</Text></Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <MSheet open={scan} title={t('Scan the QR code')} sub={t('Point the camera at the code on the invite or screen.')} onClose={() => setScan(false)}>
        <View style={{ borderRadius: 24, overflow: 'hidden', aspectRatio: 1, backgroundColor: '#000' }}>
          {scan ? <CameraView style={{ flex: 1 }} facing="back" onBarcodeScanned={onCode} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} /> : null}
          <View pointerEvents="none" style={{ position: 'absolute', left: '18%', top: '18%', right: '18%', bottom: '18%', borderRadius: 24, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' }} />
        </View>
        <Text style={{ color: MK.muted, fontSize: 13, textAlign: 'center' }}>{t('It reads the code by itself and takes you in.')}</Text>
      </MSheet>
    </View>
  );
}
