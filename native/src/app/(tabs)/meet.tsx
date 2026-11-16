// Meet tab (Midnight v6, approved 11-16): next or live meeting with who's in it, your Meet character,
// New meeting / Join code, the four Meet features, and today's list. Every button opens Meet inside the app.
import React, { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { get } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { day, time } from '../../lib/format';
import { t } from '../../lib/i18n';
import { openTool } from '../web';
import { meetingId, openMeeting } from '../guest';
import { Icon, type IconName } from '../../ui/Icon';
import { Av, FH, Li, List, NavyFill, Pills, SBtn, Sec, SubTop, V } from '../../ui/M6';
import { PoweredBy } from '../../ui/Brand';

type Meeting = { id: number; title: string; starts_at: string; duration_min?: number; url?: string; status?: string; people?: { name?: string; email?: string }[] };

const LENA = require('../../../assets/meet/lena.jpg');
const FACES = [require('../../../assets/meet/lena.jpg'), require('../../../assets/meet/hassan.jpg'), require('../../../assets/meet/amaka.jpg'), require('../../../assets/meet/nadia.jpg')];
const at = (s: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s.replace(' ', 'T') : s.replace(' ', 'T') + 'Z');
const meetHome = () => openTool('/meet', 'OENOD Meet');

export function joinMeeting(m: { url?: string }) {
  const id = meetingId(String(m.url || ''));
  if (id) return openMeeting(id);
  if (m.url && /^https:\/\//.test(m.url)) return Linking.openURL(m.url);
  return meetHome();
}

export default function MeetTab() {
  const insets = useSafeAreaInsets();
  const d = useLoad(() => get<{ meetings: Meeting[] }>('/api/meetings'));
  const [code, setCode] = useState<string | null>(null);
  const now = Date.now();
  const list = (d.data?.meetings || []).filter((m) => at(m.starts_at).getTime() + (m.duration_min || 30) * 60000 > now).sort((a, b) => at(a.starts_at).getTime() - at(b.starts_at).getTime());
  const live = list.find((m) => at(m.starts_at).getTime() <= now);
  const top = live || list[0];
  const people = (top?.people || []).map((p) => p.name || p.email || '').filter(Boolean);
  const join = () => { const id = meetingId(code || ''); if (id) { setCode(null); openMeeting(id); } };
  const feats: [string, string, IconName][] = [[t('Live captions'), t('20 languages'), 'chat'], [t('Ava notes'), t('To-dos sent after'), 'spark'], [t('Backgrounds'), t('Your company name'), 'grid'], [t('Presenter'), t('Share and talk'), 'user']];
  return (
    <View style={{ flex: 1, backgroundColor: V.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 130, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
        <SubTop title={t('Meet')} onBack={() => router.navigate('/')} right="plus" rightLabel={t('Schedule a meeting')} onRight={meetHome} />

        {top ? (
          <View style={{ borderRadius: V.rL, backgroundColor: '#13141B', borderWidth: 1, borderColor: V.line, padding: 12, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
              {live ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 99, backgroundColor: 'rgba(255,90,106,0.15)' }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF5A6A' }} />
                  <Text style={{ color: '#FF8A96', fontSize: 12.5, fontWeight: '600' }}>{t('Live now')}</Text>
                </View>
              ) : (
                <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 99, backgroundColor: V.surf2 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '600' }}>{t('Next up')}</Text>
                </View>
              )}
              <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{day(top.starts_at)} · {time(top.starts_at)}</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {[...people.slice(0, 3), ''].map((n, i) => (
                <View key={i} style={{ width: '48.5%', aspectRatio: 1, borderRadius: V.rS, overflow: 'hidden', backgroundColor: V.surf2, alignItems: 'center', justifyContent: 'center' }}>
                  {n ? <><NavyFill id={'mt' + i} /><Av name={n} size={64} /></> : <Image source={LENA} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
                  <View style={{ position: 'absolute', left: 8, bottom: 8, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.55)' }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '600' }} numberOfLines={1}>{n ? n.split(' ')[0] : t('You')}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={[FH, { color: '#FFFFFF', fontSize: 16 }]} numberOfLines={1}>{top.title}</Text>
                <Text style={{ color: V.mute, fontSize: 12 }} numberOfLines={1}>{people.length ? t('{n} people', { n: people.length + 1 }) : t('Just you so far')} · {t('captions on')}</Text>
              </View>
              <SBtn text={t('Join')} onPress={() => joinMeeting(top)} />
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 12, borderRadius: V.rL, padding: 12, overflow: 'hidden', backgroundColor: '#2238D8' }}>
          <NavyFill id="me2" />
          <Image source={LENA} style={{ width: 92, height: 140, borderRadius: V.rS }} resizeMode="cover" accessibilityLabel={t('Lena, your Meet character')} />
          <View style={{ flex: 1, gap: 4, justifyContent: 'center' }}>
            <Text style={{ color: '#C9D2FF', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>{t('Your Meet character').toUpperCase()}</Text>
            <Text style={[FH, { color: '#FFFFFF', fontSize: 20 }]}>Lena</Text>
            <Text style={{ color: '#D5DCFF', fontSize: 12, lineHeight: 16 }}>{t('She talks and blinks with your voice when your camera is off.')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <SBtn text={t('Change')} onPress={meetHome} />
              <Pressable onPress={meetHome} accessibilityRole="button" style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{t('Preview')}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Pills items={[{ label: t('New meeting'), icon: 'video', go: meetHome }, { label: t('Join code'), icon: 'plus', go: () => setCode(code == null ? '' : null) }]} />
        {code != null ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput value={code} onChangeText={setCode} autoFocus autoCapitalize="none" autoCorrect={false} placeholder={t('Meeting code or link')} placeholderTextColor={V.faint}
              onSubmitEditing={join} returnKeyType="go"
              style={{ flex: 1, height: 52, borderRadius: V.rM, backgroundColor: V.surf, borderWidth: 1, borderColor: V.line, paddingHorizontal: 16, color: '#FFFFFF', fontSize: 15 }} />
            <SBtn text={t('Join')} onPress={join} />
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {feats.map(([a, b, ic]) => (
            <Pressable key={a} onPress={meetHome} accessibilityRole="button" accessibilityLabel={`${a}, ${b}`}
              style={{ width: '48.5%', borderRadius: V.rM, backgroundColor: V.surf, borderWidth: 1, borderColor: V.line, padding: 12, gap: 4 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: V.blue, marginBottom: 4 }}><Icon name={ic} size={18} color="#FFFFFF" duo={false} /></View>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>{a}</Text>
              <Text style={{ color: V.mute, fontSize: 11.5 }}>{b}</Text>
            </Pressable>
          ))}
        </View>

        <Sec title={t('Coming up')} right={t('Calendar')} onRight={meetHome} />
        <List>
          {list.length ? list.slice(0, 6).map((m, i) => (
            <Li key={m.id} title={m.title} sub={`${day(m.starts_at)} ${time(m.starts_at)}${m.people?.length ? ' · ' + t('{n} people', { n: m.people.length + 1 }) : ''}`}
              left={<Image source={FACES[i % FACES.length]} style={{ width: 40, height: 40, borderRadius: 14 }} />}
              btn={t('Join')} onBtn={() => joinMeeting(m)} />
          )) : <Li title={d.loading ? t('Loading…') : t('No meetings coming up')} sub={t('Tap + to schedule one')} left={<Image source={LENA} style={{ width: 40, height: 40, borderRadius: 14 }} />} />}
        </List>
        <PoweredBy />
      </ScrollView>
    </View>
  );
}
