// Arrival clock-in (4.6). Opened by the "You're at <shop>. Tap to clock in." alert, the shift-start reminder or a
// "Your shift has started" OENOD notification: it takes a fresh GPS reading and clocks in through /api/me/clock,
// with every normal check on the server. Opened with ?setup=1 (from Me) it only shows the Arrival alerts switch.
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { get, post } from '../lib/api';
import { currentFix, syncTracking, waitForConsent } from '../lib/geo';
import { arrivalOff, clockedIn, setArrival, syncArrival, type ArrivalState } from '../lib/arrival';
import { t } from '../lib/i18n';
import { time } from '../lib/format';
import { Btn, Card, Item, ToolPage } from '../ui/T1';
import { V } from '../ui/M6';
import { Ph } from '../ui/H';

type Stage = 'setup' | 'working' | 'done' | 'already' | 'failed';
const HELP: Record<ArrivalState, string> = {
  on: 'On. Your phone tells you when you arrive at work on a shift day.',
  off: 'Off. You can still clock in from the home screen.',
  need_always: 'Allow location "Always" for OENOD in your phone settings so the alert works when the app is closed.',
  need_location: 'Allow location for OENOD in your phone settings.',
  none: 'No upcoming shifts at a workplace with a map pin. It turns on by itself when you have one.',
  web: 'Works in the OENOD app on your phone.',
};

export default function ClockIn() {
  const p = useLocalSearchParams<{ loc?: string; shift?: string; setup?: string }>();
  const [stage, setStage] = useState<Stage>(p.setup ? 'setup' : 'working');
  const [msg, setMsg] = useState('');
  const [at, setAt] = useState<{ when: string; where: string } | null>(null);
  const [st, setSt] = useState<ArrivalState | null>(null);
  const [on, setOn] = useState(true);
  const ran = useRef(false);

  const clock = async (retried = false): Promise<void> => {
    setStage('working'); setMsg('');
    try {
      const now = await get<any>('/api/me/clock').catch(() => null);
      if (now?.open) { setAt({ when: now.open.clock_in, where: now.open.location_name || now.open.location || '' }); setStage('already'); return; }
      const f = await currentFix();
      const body: Record<string, unknown> = { action: 'in', ...f, via: 'arrival' };
      if (p.loc) body.location_id = Number(p.loc);
      if (p.shift) body.shift_id = Number(p.shift);
      const r = await post<any>('/api/me/clock', body);
      await clockedIn(p.shift ? Number(p.shift) : null);
      setAt({ when: r?.open?.clock_in || '', where: r?.open?.location_name || r?.open?.location || '' });
      setStage('done');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      syncTracking();
    } catch (e: any) {
      if (e?.data?.geo_consent && !retried) { router.push('/geo-consent'); if (await waitForConsent()) return clock(true); }
      const m = String(e?.message || t('OENOD could not clock you in. Try again.'));
      setMsg(e?.data?.geo_need_location ? m + '\n\n' + t('Turn on location for OENOD in your phone settings (precise location), then try again.') : m);
      setStage('failed');
    }
  };
  useEffect(() => {
    arrivalOff().then((x) => setOn(!x));
    syncArrival(false).then(setSt);
    if (!p.setup && !ran.current) { ran.current = true; clock(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const flip = async (v: boolean) => { setOn(v); setSt(await setArrival(v)); };
  const big = (ph: any, color: string, title: string, sub?: string) => (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 26, paddingHorizontal: 16 }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: V.surf2 }}><Ph name={ph} size={38} color={color} /></View>
      <Text style={{ color: V.ink, fontSize: 21, fontWeight: '800', textAlign: 'center' }} accessibilityRole="header">{title}</Text>
      {sub ? <Text style={{ color: V.mute, fontSize: 15, textAlign: 'center', lineHeight: 21 }}>{sub}</Text> : null}
    </View>
  );
  return (
    <ToolPage title={p.setup ? t('Arrival alerts') : t('Clock in')}>
      {stage !== 'setup' ? (
        <Card>
          {stage === 'working' ? big('clock', V.blue, t('Clocking you in…'), t('Checking your location'))
            : stage === 'done' ? big('seal-check', V.good, t('You are clocked in'), [at?.when ? time(at.when) : '', at?.where].filter(Boolean).join(' · ') || undefined)
            : stage === 'already' ? big('seal-check', V.good, t('You are already clocked in'), at?.when ? t('Since {time}', { time: time(at.when) }) : undefined)
            : big('warning', '#D9534F', t('Not clocked in yet'), msg)}
          <View style={{ gap: 10, padding: 12 }}>
            {stage === 'failed' ? <Btn text={t('Try again')} icon="clock" kind="blue" onPress={() => clock()} /> : null}
            {stage !== 'working' ? <Btn text={t('Go to home')} onPress={() => router.replace('/')} /> : null}
          </View>
        </Card>
      ) : null}
      <Card title={t('Arrival alerts')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: V.ink, fontSize: 15.5, fontWeight: '700' }}>{t('Tell me when I arrive at work')}</Text>
            <Text style={{ color: V.mute, fontSize: 13.5, marginTop: 3, lineHeight: 19 }}>{t(HELP[on ? st || 'on' : 'off'])}</Text>
          </View>
          <Switch value={on} onValueChange={flip} accessibilityLabel={t('Tell me when I arrive at work')} />
        </View>
        {on && st === 'need_always' ? <Item left={<Ph name="gear-six" size={20} color={V.blue} />} title={t('Open phone settings')} onPress={() => Linking.openSettings().catch(() => {})} /> : null}
        <Text style={{ color: V.faint, fontSize: 12.5, lineHeight: 18, paddingHorizontal: 14, paddingBottom: 14 }}>
          {t('Only on shift days. Your phone checks the spot by itself and sends nothing to OENOD until you tap to clock in.')}
        </Text>
      </Card>
    </ToolPage>
  );
}
