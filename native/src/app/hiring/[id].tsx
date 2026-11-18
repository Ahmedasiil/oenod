// One applicant: contact, resume, timeline, move them along, notes, interview invite, scorecard, and hire.
import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { get, post, put } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { day } from '../../lib/format';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Actions, Btn, Card, Hero, In, Item, None, Pick, Sheet, State, Tag, ToolPage, isYmd, plusDays, sure, useBusy } from '../../ui/T1';
import { STAGES, stageTone, stageWord, type Stage } from './index';

type Ev = { id: number; kind: string; body: string | null; subject: string | null; at: string | null; created_at: string; author: string | null; scores: Record<string, number> | null };
type A = { id: number; name: string; email: string | null; phone: string | null; note: string | null; stage: Stage; rating: number | null; source: string | null; created_at: string; employee_id: number | null;
  job: { id: number; title: string; pay: string | null } | null; resume: { data?: { summary?: string; skills?: string[]; experience?: { title?: string; company?: string; from?: string; to?: string }[] } } | null; match?: { score?: number } | null };
type D = { application: A; events: Ev[]; overall: number | null };
const KIND: Record<string, string> = { note: 'Note', email: 'Email sent', interview: 'Interview', score: 'Scorecard', offer: 'Offer', stage: 'Moved' };
type Rec = 'strong_yes' | 'yes' | 'no' | 'strong_no';

export default function Applicant() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => get<D>(`/api/applications/${id}`), [id]);
  const [sheet, setSheet] = useState<'' | 'note' | 'iv' | 'score' | 'move'>('');
  const [note, setNote] = useState('');
  const [ivDay, setIvDay] = useState(plusDays(1));
  const [ivTime, setIvTime] = useState('10:00');
  const [sc, setSc] = useState<Record<string, number>>({ Skills: 3, Attitude: 3, Experience: 3 });
  const [rec, setRec] = useState<Rec>('yes');
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const a = d.data?.application;
  const move = (s: Stage) => run('mv', async () => { await put(`/api/applications/${id}`, { name: a!.name, stage: s }); setSheet(''); d.reload(); });
  const hire = () => a && sure(t('Hire {n}?', { n: a.name }), t('They join your team and onboarding starts.'), t('Hire'), () => run('hire', async () => { const r = await post<{ employee_id: number }>(`/api/applications/${id}/hire`); d.reload(); router.push(`/employee/${r.employee_id}`); }));
  const saveNote = () => { if (note.trim().length < 2) return setErr(t('Type a note.')); setErr(''); run('note', async () => { await post(`/api/applications/${id}/events`, { kind: 'note', body: note.trim() }); setNote(''); setSheet(''); d.reload(); }); };
  const invite = () => {
    if (!isYmd(ivDay) || !/^\d{1,2}:\d{2}$/.test(ivTime)) return setErr(t('Pick a day like 2026-11-20 and a time like 14:30.'));
    setErr('');
    run('iv', async () => { await post(`/api/applications/${id}/events`, { kind: 'interview', at: `${ivDay}T${ivTime.padStart(5, '0')}`, duration_min: 45 }); if (a && ['applied', 'screen'].includes(a.stage)) await put(`/api/applications/${id}`, { name: a.name, stage: 'interview' }); setSheet(''); d.reload(); });
  };
  const score = () => run('sc', async () => { await post(`/api/applications/${id}/events`, { kind: 'score', scores: sc, recommend: rec }); setSheet(''); d.reload(); });
  const r = a?.resume?.data;
  return (
    <ToolPage title={a?.name || t('Applicant')} refreshing={d.refreshing} onRefresh={d.refresh}>
      <State loading={d.loading && !a} error={!a ? d.error : null} onRetry={d.reload} />
      {a ? (
        <>
          <Hero id="aph" label={a.job?.title || t('No job picked')} value={a.name} note={t('Applied {d}', { d: day(a.created_at) })} noteGood
            stats={[[t('Stage'), stageWord(a.stage)], [t('Score'), d.data?.overall != null ? `${d.data.overall} / 5` : '—'], [t('Match'), a.match?.score != null ? `${a.match.score}%` : '—']]} />
          <Actions items={[
            { icon: 'phone', label: t('Call'), go: () => a.phone && Linking.openURL(`tel:${a.phone}`), off: !a.phone },
            { icon: 'chat', label: t('Text'), go: () => a.phone && Linking.openURL(`sms:${a.phone}`), off: !a.phone },
            { icon: 'mail', label: t('Email'), go: () => a.email && Linking.openURL(`mailto:${a.email}`), off: !a.email },
            { icon: 'video', label: t('Interview'), go: () => { setErr(''); setSheet('iv'); } },
          ]} />
          {a.stage !== 'hired' && a.stage !== 'rejected' ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Btn text={t('Move along')} icon="arrow" kind="dark" onPress={() => setSheet('move')} /></View>
              <View style={{ flex: 1 }}><Btn text={t('Hire')} icon="check" onPress={hire} busy={busy === 'hire'} /></View>
            </View>
          ) : a.employee_id ? <Btn text={t('Open their team profile')} icon="user" kind="dark" onPress={() => router.push(`/employee/${a.employee_id}`)} /> : <Btn text={t('Move along')} icon="arrow" kind="dark" onPress={() => setSheet('move')} />}
          <Card title={t('Details')}>
            <Item title={t('Email')} sub={a.email || t('Not given')} />
            <Item title={t('Phone')} sub={a.phone || t('Not given')} />
            <Item title={t('Came from')} sub={a.source || t('Unknown')} />
            {a.note ? <Item title={t('Their note')} sub={a.note} /> : null}
          </Card>
          {r ? (
            <Card title={t('Résumé')}>
              {r.summary ? <View style={{ paddingVertical: 10 }}><Text style={{ color: V.ink, fontSize: 14, lineHeight: 20 }}>{r.summary}</Text></View> : null}
              {(r.experience || []).slice(0, 6).map((e, i) => <Item key={i} title={e.title || t('Job')} sub={[e.company, [e.from, e.to].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')} />)}
              {r.skills?.length ? <View style={{ paddingVertical: 10 }}><Text style={{ color: V.mute, fontSize: 13 }}>{r.skills.slice(0, 20).join(' · ')}</Text></View> : null}
            </Card>
          ) : null}
          <Card title={t('Timeline')} right={t('Add note')} onRight={() => { setErr(''); setSheet('note'); }}>
            {(d.data?.events || []).length ? d.data!.events.map((e) => (
              <Item key={e.id} title={e.subject || t(KIND[e.kind] || e.kind)} sub={[e.body, e.scores ? Object.entries(e.scores).map(([k, v]) => `${k} ${v}`).join(', ') : null].filter(Boolean).join(' · ') || undefined}
                rightSub={`${day(e.created_at)}${e.author ? '\n' + e.author : ''}`} />
            )) : <None icon="doc" title={t('Nothing yet')} sub={t('Notes, interviews and scorecards show here.')} />}
          </Card>
          <Btn text={t('Fill a scorecard')} icon="check" kind="dark" onPress={() => setSheet('score')} />
        </>
      ) : null}

      <Sheet open={sheet === 'move'} title={t('Move {n} to', { n: a?.name || '' })} onClose={() => setSheet('')}>
        <Card>
          {STAGES.map(([k]) => <Item key={k} title={stageWord(k)} onPress={() => move(k)} rightSub={a?.stage === k ? <Tag text={t('Now')} tone={stageTone(k)} /> : undefined} />)}
        </Card>
      </Sheet>
      <Sheet open={sheet === 'note'} title={t('Add note')} onClose={() => setSheet('')}>
        <In label={t('Note')} value={note} onChangeText={setNote} multiline style={{ minHeight: 110 }} error={err || undefined} placeholder={t('Great with customers, can start Monday')} />
        <Btn text={t('Save note')} icon="check" onPress={saveNote} busy={busy === 'note'} />
      </Sheet>
      <Sheet open={sheet === 'iv'} title={t('Invite to an interview')} onClose={() => setSheet('')}>
        <Text style={{ color: V.mute, fontSize: 13.5 }}>{a?.email ? t('They get an email with a video link. You get it in Meet.') : t('They have no email, so share the Meet link with them yourself.')}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <In style={{ flex: 1 }} label={t('Day')} value={ivDay} onChangeText={setIvDay} placeholder="2026-11-20" error={err || undefined} />
          <In style={{ flex: 1 }} label={t('Time')} value={ivTime} onChangeText={setIvTime} placeholder="14:30" />
        </View>
        <Btn text={t('Send invite')} icon="send" onPress={invite} busy={busy === 'iv'} />
      </Sheet>
      <Sheet open={sheet === 'score'} title={t('Scorecard')} onClose={() => setSheet('')}>
        {Object.keys(sc).map((k) => <Pick<string> key={k} label={t(k)} value={String(sc[k])} onChange={(v) => setSc({ ...sc, [k]: Number(v) })} items={['1', '2', '3', '4', '5'].map((n) => [n, n] as [string, string])} />)}
        <Pick<Rec> label={t('Would you hire them?')} value={rec} onChange={setRec} items={[['strong_yes', t('Yes, for sure')], ['yes', t('Yes')], ['no', t('No')], ['strong_no', t('Definitely not')]]} />
        <Btn text={t('Save scorecard')} icon="check" onPress={score} busy={busy === 'sc'} />
      </Sheet>
    </ToolPage>
  );
}
