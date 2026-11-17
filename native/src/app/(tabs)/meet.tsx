// Meet tab (4.0 Navy Daylight, approved 11-17): the navy meeting room with the OENOD Meet characters and the raised
// 3-D keys, then the Meet features and what's coming up. Every button opens Meet inside the app (same sign-in).
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { get } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { day, time } from '../../lib/format';
import { t } from '../../lib/i18n';
import { openSheet, openTool } from '../web';
import { meetingId, openMeeting } from '../guest';
import { Icon, type IconName } from '../../ui/Icon';
import { Av, FH, Li, List, NavyFill, Pills, SBtn, Sec, SubTop, V } from '../../ui/M6';
import { PoweredBy } from '../../ui/Brand';
import { card, Grad, Key, Ph, Pulse, TileIcon } from '../../ui/H';
import type { PhName } from '../../ui/phPaths';
import { Logo } from '../../ui/Logo';

type Meeting = { id: number; title: string; starts_at: string; duration_min?: number; url?: string; status?: string; people?: { name?: string; email?: string }[] };

const LENA = require('../../../assets/meet/lena.jpg');
const FACES = [require('../../../assets/meet/lena.jpg'), require('../../../assets/meet/hassan.jpg'), require('../../../assets/meet/amaka.jpg'), require('../../../assets/meet/nadia.jpg')];
const at = (s: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s.replace(' ', 'T') : s.replace(' ', 'T') + 'Z');
const meetHome = () => openTool('/meet', 'OENOD Meet');

export function joinMeeting(m: { url?: string }) {
  const id = meetingId(String(m.url || ''));
  if (id) return openMeeting(id);
  // An OENOD page opens in the app's OENOD screen; a meeting on another service opens in a sheet over the app.
  const own = String(m.url || '').match(/^https:\/\/(?:www\.)?oenod\.com\/?#?(\/.*)?$/i);
  if (own) return openTool(own[1] || '/meet', 'OENOD Meet');
  if (m.url && /^https:\/\//.test(m.url)) return openSheet(m.url);
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
  const feats: [string, string, PhName][] = [[t('Live captions'), t('20 languages'), 'chat-circle-dots'], [t('Ava notes'), t('To-dos sent after'), 'sparkle'], [t('Backgrounds'), t('Your company name'), 'squares-four'], [t('Presenter'), t('Share and talk'), 'monitor']];
  const names = top ? [...people.slice(0, 3)] : [];
  const tags = [names[0] || 'Hassan', t('You'), names[1] || 'Amaka', names[2] || 'Nadia'];
  const tile = (img: any, name: string, opts: { big?: boolean; host?: boolean; talk?: boolean } = {}) => (
    <View style={{ flex: 1, borderRadius: 22, overflow: 'hidden', backgroundColor: '#0A1450', borderWidth: opts.talk ? 3 : 1, borderColor: opts.talk ? '#4A63FF' : 'rgba(255,255,255,0.1)' }}>
      <Image source={img} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
      {opts.host ? <View style={{ position: 'absolute', left: 8, top: 8, height: 22, paddingHorizontal: 9, borderRadius: 99, backgroundColor: '#FFFFFF', justifyContent: 'center' }}><Text style={{ color: '#000C58', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 }}>{t('HOST')}</Text></View> : null}
      <View style={{ position: 'absolute', left: 8, bottom: 8, height: 26, paddingLeft: 6, paddingRight: 10, borderRadius: 99, backgroundColor: 'rgba(0,7,47,0.72)', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}><Ph name="microphone" size={10} color="#000C58" /></View>
        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }} numberOfLines={1}>{name}{opts.talk ? ' · ' + t('speaking') : ''}</Text>
      </View>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 130, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
        {/* The room: same navy room, character tiles and raised keys as OENOD Meet. */}
        <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden', backgroundColor: '#000C58', gap: 14 }}>
          <Grad id="room" x1={0.5} y1={0} x2={0.5} y2={1} stops={[[0, '#0B1A8F'], [0.45, '#000C58'], [1, '#00072F']]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Logo width={64} color="#FFFFFF" />
            <View style={{ height: 30, paddingHorizontal: 12, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              {live ? <Pulse color="#FF5A5F" /> : null}
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }} numberOfLines={1}>{live ? t('Live now') : top ? `${t('Next up')} · ${day(top.starts_at)} ${time(top.starts_at)}` : t('OENOD Meet')}</Text>
            </View>
            <Pressable onPress={meetHome} accessibilityRole="button" accessibilityLabel={t('Schedule a meeting')}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Ph name="plus" size={18} color="#FFFFFF" duo={0.3} />
            </Pressable>
          </View>
          <View style={{ height: 300, gap: 10 }}>
            <View style={{ flex: 1.7, flexDirection: 'row' }}>{tile(FACES[1], tags[0], { host: true, talk: true })}</View>
            <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
              {tile(LENA, tags[1])}{tile(FACES[2], tags[2])}{tile(FACES[3], tags[3])}
            </View>
          </View>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }} numberOfLines={1}>{top ? top.title : t('Your meeting room')}</Text>
            <Text style={{ color: '#AEB8F0', fontSize: 12.5 }} numberOfLines={1}>{top ? (people.length ? t('{n} people', { n: people.length + 1 }) : t('Just you so far')) + ' · ' + t('captions on') : t('Your camera off? Lena talks for you.')}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 30, backgroundColor: 'rgba(0,4,30,0.55)' }}>
            <Key icon="video-camera" label={t('New meeting')} onPress={meetHome} />
            <Key icon="plus" label={t('Join code')} tone="white" onPress={() => setCode(code == null ? '' : null)} />
            <Key icon="users-three" label={t('Invite')} onPress={meetHome} />
            <Key icon="sparkle" label={t('Ava notes')} onPress={meetHome} />
            <Key label={top ? t('Join') : t('Start')} tone={top ? 'red' : 'navy'} wide onPress={() => (top ? joinMeeting(top) : meetHome())} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
        {code != null ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput value={code} onChangeText={setCode} autoFocus autoCapitalize="none" autoCorrect={false} placeholder={t('Meeting code or link')} placeholderTextColor={V.faint}
              onSubmitEditing={join} returnKeyType="go"
              style={{ flex: 1, height: 52, borderRadius: V.rM, backgroundColor: V.surf, borderWidth: 1, borderColor: V.line, paddingHorizontal: 16, color: V.ink, fontSize: 15 }} />
            <SBtn text={t('Join')} onPress={join} />
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
          {feats.map(([a, b, ic]) => (
            <Pressable key={a} onPress={meetHome} accessibilityRole="button" accessibilityLabel={`${a}, ${b}`}
              style={[card, { width: '48.5%', borderRadius: 20, padding: 12, gap: 4 }]}>
              <View style={{ marginBottom: 4 }}><TileIcon icon={ic} tone="navy" size={40} /></View>
              <Text style={{ color: V.ink, fontSize: 14, fontWeight: '700' }}>{a}</Text>
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
        </View>
      </ScrollView>
    </View>
  );
}
