// Business Phone tab (Midnight v6, approved 11-16): your company line, a dial pad, one big call button and
// recent calls with Call back. Calls go out with the company number; settings open the Calls screen in the app.
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { get } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { day, time } from '../../lib/format';
import { t } from '../../lib/i18n';
import { dialOut } from '../../lib/phone';
import { Icon } from '../../ui/Icon';
import { FH, IB, Li, List, SBtn, Sec, V } from '../../ui/M6';
import { PageBody, PageTop } from '../../ui/PageTop';
import { card, GlassBtn } from '../../ui/H';
import { PoweredBy } from '../../ui/Brand';
import { oops } from '../../ui/T1';

type Me = { on?: boolean; ready?: boolean; allowed?: boolean; seat?: boolean; line?: string | null; can_manage?: boolean; status?: string };
type CallRow = { customer: string | null; number: string; dir: string; at: string; state: string; secs: number; note: string | null; agent: string | null };

export const pretty = (v: string) => {
  const d = v.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : d;
};
const calls = () => router.push('/calls' as any);

export default function PhoneTab() {
  const insets = useSafeAreaInsets();
  const me = useLoad(() => get<Me>('/api/pbx/me').catch(() => ({} as Me)));
  const hist = useLoad(() => get<{ calls: CallRow[] }>('/api/pbx/calls').catch(() => ({ calls: [] as CallRow[] })));
  const [num, setNum] = useState('');
  const on = !!me.data?.on;
  const press = (k: string) => {
    Haptics.selectionAsync().catch(() => {});
    if (k === '⌫') return setNum((n) => n.slice(0, -1));
    setNum((n) => (n.length < 15 ? n + k : n));
  };
  const call = async (to: string) => {
    if (to.replace(/\D/g, '').length < 10) { oops(t('Type a 10-digit phone number.')); return; }
    if (!(await dialOut(to))) oops(t('Calling works in the OENOD app on your phone. Number: {n}', { n: pretty(to) }));
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '⌫'];
  const rows = hist.data?.calls || [];
  return (
    <View style={{ flex: 1, backgroundColor: V.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}>
        <PageTop title={t('Business Phone')} sub={me.data?.line ? t('Your line {n}', { n: pretty(me.data.line) }) : t('Calls go out with your company number')}
          extra={<GlassBtn icon="gear-six" label={t('Who rings and opening hours')} onPress={calls} />} search={false} />
        <PageBody style={{ maxWidth: 520 }}>
        {me.loading && !me.data ? null : !on ? (
          <View style={[card, { padding: 18, gap: 10 }]}>
            <Text style={[FH, { color: V.navy, fontSize: 18 }]}>{t('Turn on Business Phone')}</Text>
            <Text style={{ color: '#4B5070', fontSize: 13.5, lineHeight: 19 }}>{t('Get a company number that rings on your team’s phones, with Ava answering when nobody can.')}</Text>
            <Pressable onPress={calls} accessibilityRole="button" style={{ alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 99, backgroundColor: V.navy }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>{me.data?.can_manage ? t('Set it up') : t('Learn more')}</Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={[FH, { textAlign: 'center', color: V.ink, fontSize: 30, minHeight: 40 }]} accessibilityLiveRegion="polite" numberOfLines={1} adjustsFontSizeToFit>{num ? pretty(num) || num : ' '}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
          {keys.map((k) => (
            <Pressable key={k} onPress={() => press(k)} onLongPress={k === '⌫' ? () => setNum('') : k === '0' ? () => setNum((n) => n + '+') : undefined}
              accessibilityRole="button" accessibilityLabel={k === '⌫' ? t('Delete') : k}
              style={({ pressed }) => ({ width: '31%', height: 56, borderRadius: V.rS, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? V.line : V.surf2 })}>
              <Text style={[FH, { color: V.ink, fontSize: 22 }]}>{k}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => call(num)} accessibilityRole="button" accessibilityLabel={t('Call')}
          style={({ pressed }) => ({ width: 70, height: 70, borderRadius: 35, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#12A25B', shadowColor: '#12A25B', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
          <Icon name="phone" size={28} color="#FFFFFF" stroke={2} duo={false} />
        </Pressable>
        <Sec title={t('Recent calls')} right={t('See all')} onRight={calls} />
        <List>
          {rows.length ? rows.slice(0, 8).map((r, i) => {
            const missed = r.state === 'missed' || r.state === 'no-answer' || r.state === 'voicemail';
            const when = `${day(r.at)} ${time(r.at)}`;
            return (
              <Li key={i} title={r.customer || pretty(r.number)} sub={missed ? `${t('Missed')}${r.note ? ` · “${r.note}”` : ''}` : `${when}${r.secs ? ' · ' + Math.max(1, Math.round(r.secs / 60)) + ' min' : ''}${r.note ? ' · ' + r.note : ''}`}
                left={<IB icon={r.dir === 'out' ? 'send' : 'recv'} color={missed ? '#FF5A6A' : V.good} />}
                btn={missed ? t('Call back') : undefined} onBtn={() => call(r.number)} />
            );
          }) : <Li title={hist.loading ? t('Loading…') : t('No calls yet')} sub={t('Calls to your company number show up here')} left={<IB icon="phone" />} />}
        </List>
        <PoweredBy />
        </PageBody>
      </ScrollView>
    </View>
  );
}
