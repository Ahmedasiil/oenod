// Cameras, built into the app (managers): every camera with a live picture that refreshes, save a moment as evidence, and saved moments.
import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BASE, get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date } from '../lib/format';
import { t } from '../lib/i18n';
import { V } from '../ui/M6';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Sheet, State, Tag, ToolPage, useBusy } from '../ui/T1';

type Dev = { id: number; type: string; name: string; area: string | null; status: string; last_ok_at: string | null; last_error: string | null; has_snapshot: boolean; has_live: boolean; location_id: number | null };
type H = { active: boolean; need_terms?: boolean; perms: { live: boolean; saved: boolean; manage: boolean }; devices?: Dev[]; retention_days?: number; counts?: { cameras: number; speakers: number; saves: number }; locations?: { id: number; name: string }[] };
type Save = { id: number; camera_name: string; note: string | null; taken_at: string; expires_at: string; taken_by: string | null };

export default function Cameras() {
  const d = useLoad(() => get<H>('/api/cams'));
  const s = useLoad(() => (d.data?.active && d.data.perms.saved ? get<{ saves: Save[] }>('/api/cams/saves') : Promise.resolve({ saves: [] as Save[] })), [d.data?.active]);
  const [tab, setTab] = useState<'live' | 'saved'>('live');
  const [cam, setCam] = useState<Dev | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [note, setNote] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const cams = (x?.devices || []).filter((y) => y.type === 'camera');
  const ok = cams.filter((y) => y.status === 'ok' || y.status === 'online').length;
  useEffect(() => { if (!cam) return; const i = setInterval(() => setTick(Date.now()), 3000); return () => clearInterval(i); }, [cam]);
  const snap = (y: Dev) => `${BASE}/api/cams/devices/${y.id}/snapshot?t=${tick}`;
  const keep = () => cam && run('sv', async () => { const r = await post<{ expires_in_days: number }>(`/api/cams/devices/${cam.id}/save`, { note: note.trim() }); setNote(''); s.reload(); setCam(null); setTab('saved'); void r; });
  if (x && !x.active) {
    return (
      <ToolPage title={t('Cameras')}>
        <Card><None icon="video" title={t('Cameras is not turned on yet')} sub={t('Ask OENOD to turn on Cameras for your company. We set it up with you.')} /></Card>
        <Btn text={t('Ask the OENOD team')} icon="chat" kind="blue" onPress={() => router.push('/support' as any)} />
      </ToolPage>
    );
  }
  return (
    <ToolPage title={t('Cameras')} refreshing={d.refreshing} onRefresh={() => { d.refresh(); s.reload(); }}>
      {x ? <Hero id="cam" label={t('Cameras online')} value={`${ok} / ${cams.length}`} note={ok < cams.length ? t('{n} cameras need a look', { n: cams.length - ok }) : t('Every camera is working')} noteGood={ok === cams.length}
        stats={[[t('Saved moments'), String(x.counts?.saves || 0)], [t('Kept for'), t('{n} days', { n: x.retention_days || 0 })], [t('Speakers'), String(x.counts?.speakers || 0)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Chips value={tab} onChange={setTab} items={[['live', t('Live'), cams.length], ['saved', t('Saved'), s.data?.saves.length]]} />
          {tab === 'live' ? (
            <Card>
              {cams.length ? cams.map((y) => <Item key={y.id} onPress={y.has_snapshot ? () => { setTick(Date.now()); setCam(y); } : undefined} left={<Dot icon="video" tone={y.status === 'ok' || y.status === 'online' ? 'good' : 'bad'} />} title={y.name}
                sub={[y.area, y.last_error && y.status !== 'ok' ? y.last_error : null].filter(Boolean).join(' · ') || undefined} rightSub={<Tag text={y.status === 'ok' || y.status === 'online' ? t('Watch') : t('Offline')} tone={y.status === 'ok' || y.status === 'online' ? 'info' : 'bad'} />} />)
                : <None icon="video" title={t('No cameras added yet')} sub={t('The OENOD team adds your cameras with you.')} />}
            </Card>
          ) : (
            <Card>
              {s.data?.saves.length ? s.data.saves.map((y) => <Item key={y.id} left={<Dot icon="doc" />} title={y.camera_name} sub={[y.note, y.taken_by, t('kept until {d}', { d: date(y.expires_at.slice(0, 10)) })].filter(Boolean).join(' · ')} right={date(y.taken_at.slice(0, 10))} />)
                : <None icon="doc" title={t('No saved moments')} sub={t('Open a camera and tap Save this moment.')} />}
            </Card>
          )}
        </>
      ) : null}
      <Sheet open={!!cam} title={cam?.name || ''} onClose={() => setCam(null)}>
        {cam ? (
          <>
            <View style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: '#0A0B10', aspectRatio: 16 / 9, width: '100%' }}>
              <Image source={{ uri: snap(cam) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={t('Live picture from {c}', { c: cam.name })} />
            </View>
            <Text style={{ color: V.mute, fontSize: 12.5, textAlign: 'center' }}>{t('Refreshes every 3 seconds')}</Text>
            {x?.perms.saved ? (
              <>
                <In label={t('Note (optional)')} value={note} onChangeText={setNote} placeholder={t('e.g. Delivery dropped at back door')} />
                <Btn text={t('Save this moment')} icon="check" kind="blue" onPress={keep} busy={busy === 'sv'} />
              </>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
