// One job, inside the app: pay, place, what the job is, your match from your résumé (skills you have and the ones
// to add), save it, and apply in one tap with one of your résumés and a cover letter Ava can write.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { day } from '../../lib/format';
import { t } from '../../lib/i18n';
import { dialOut } from '../../lib/phone';
import { V } from '../../ui/M6';
import { Btn, Card, Dot, Hero, In, Item, None, Pick, Sheet, State, Tag, ToolPage, oops, sure, useBusy } from '../../ui/T1';
import { JobRow, plain, typeName, type JobCard } from '../../lib/jobs';

type Match = { score: number; have: string[]; missing: string[]; title: boolean } | null;
type Me = { apps_left: number | null; application: { id: number; stage: string; created_at: string } | null; match: Match; resumes: { id: number; title: string; updated_at: string }[]; name: string; email: string; phone: string };
type Job = { job: JobCard & { description: string; pay_raw?: string | null }; company: { name: string; industry: string | null; address: string | null; phone: string | null; open_jobs: number }; more: JobCard[]; similar: JobCard[]; me: Me | null; free_applies: number };
type Ap = { rid: string; phone: string; cover: string };

/** Job posts are written in simple Markdown: show them as clean text. */
const clean = (s: string) => s.replace(/\r/g, '').replace(/^#{1,6}\s*/gm, '').replace(/^\s*[-*]\s+/gm, '• ').replace(/[*_`>]+/g, '').replace(/\n{3,}/g, '\n\n').trim();

export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => get<Job>(`/api/market/jobs/${id}`), [id]);
  const { busy, run } = useBusy();
  const [ap, setAp] = useState<Ap | null>(null);
  const [err, setErr] = useState('');
  const x = d.data;
  const j = x?.job;
  const me = x?.me;
  const app = me?.application && me.application.stage !== 'withdrawn' ? me.application : null;
  const m = me?.match || null;

  const save = () => run('sv', async () => { const r = await post<{ saved: boolean }>(`/api/me/jobs/${id}/save`); d.setData({ ...x!, job: { ...j!, saved: r.saved } }); });
  const start = () => {
    if (!me) return;
    if (!me.resumes.length) return sure(t('Make a résumé first'), t('You apply with your OENOD résumé. It takes a few minutes, and Ava can write it for you.'), t('Make my résumé'), () => router.push('/resume' as any));
    if (me.apps_left === 0) return oops(t('You used all your applications for this month. You can apply again on the 1st.'));
    setErr(''); setAp({ rid: String(me.resumes[0].id), phone: me.phone || '', cover: '' });
  };
  const cover = () => ap && run('cv', async () => {
    try { const r = await post<{ text: string }>(`/api/me/jobs/${id}/cover`, { resume_id: Number(ap.rid) }); setAp({ ...ap, cover: r.text }); } catch (e) { throw plain(e, 'cover'); }
  });
  const send = () => {
    if (!ap) return;
    if (ap.phone.trim() && ap.phone.replace(/\D/g, '').length < 7) return setErr(t('Check the phone number.'));
    setErr('');
    run('ap', async () => {
      let r: { match: number | null; apps_left: number | null };
      try { r = await post(`/api/me/jobs/${id}/apply`, { resume_id: Number(ap.rid), phone: ap.phone.trim(), cover: ap.cover.trim() }); } catch (e) { throw plain(e, 'apply'); }
      setAp(null); d.reload();
      sure(t('Application sent'), t('{c} got your résumé. You will get a notification when they look at it.', { c: j?.company || '' }), t('See my applications'), () => router.push({ pathname: '/jobs', params: { tab: 'mine' } } as any));
      return r;
    });
  };
  const call = async (n: string) => { const r = await dialOut(n); if (r !== true) oops(r + ' ' + t('Number: {n}', { n })); };

  return (
    <ToolPage title={j?.title || t('Job')} right={me ? 'heart' : undefined} rightLabel={j?.saved ? t('Saved') : t('Save job')} onRight={save} refreshing={d.refreshing} onRefresh={d.refresh}>
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x && j ? (
        <>
          <Hero id="jdh" label={j.company} value={j.pay || t('Pay not listed')} note={[j.remote ? t('Remote') : j.city, typeName(j.type), j.km != null ? t('{k} km', { k: j.km }) : null].filter(Boolean).join(' · ')} noteGood
            stats={[[t('Match'), m ? `${m.score}%` : '—'], [t('Posted'), day(j.created_at)], [t('Open jobs here'), String(x.company.open_jobs)]]} />
          {!me ? <Tag text={t('Sign in to apply')} tone="info" />
            : app ? <Tag text={t('You applied {d}. Status: {s}', { d: day(app.created_at), s: t(app.stage === 'applied' ? 'Sent' : app.stage === 'screen' ? 'In review' : app.stage === 'interview' ? 'Interview' : app.stage === 'offer' ? 'Offer' : app.stage === 'hired' ? 'Hired' : 'Not selected') })} tone="good" />
            : <Btn text={t('Apply with my résumé')} icon="send" kind="blue" onPress={start} />}
          {me ? <Btn text={j.saved ? t('Saved. Tap to remove') : t('Save job')} icon="heart" onPress={save} busy={busy === 'sv'} /> : null}
          {me?.apps_left != null && !app ? <Tag text={t('{n} of {m} applications left this month', { n: me.apps_left, m: x.free_applies })} tone={me.apps_left ? 'info' : 'warn'} /> : null}
          {m ? (
            <Card title={t('Your match: {n}%', { n: m.score })}>
              {m.have.length ? <Item left={<Dot icon="check" tone="good" />} title={t('Skills you have')} sub={m.have.join(' · ')} /> : null}
              {m.missing.length ? <Item left={<Dot icon="spark" tone="warn" />} title={t('Add these to your résumé if you have them')} sub={m.missing.join(' · ')} onPress={() => me?.resumes[0] && router.push(`/resume/${me.resumes[0].id}` as any)} /> : null}
              {!m.have.length && !m.missing.length ? <Item left={<Dot icon="doc" />} title={m.title ? t('Your past jobs fit this title') : t('Add more detail to your résumé for a better match')} /> : null}
            </Card>
          ) : me && !me.resumes.length ? <Btn text={t('Make my résumé to see my match')} icon="doc" onPress={() => router.push('/resume' as any)} /> : null}
          <Card title={t('About the job')}>
            <View style={{ paddingVertical: 10 }}><Text style={{ color: V.ink, fontSize: 14.5, lineHeight: 21 }}>{clean(j.description || j.snippet || '')}</Text></View>
          </Card>
          <Card title={x.company.name}>
            {x.company.industry ? <Item left={<Dot icon="briefcase" />} title={x.company.industry} /> : null}
            {x.company.address ? <Item left={<Dot icon="pin" />} title={x.company.address} /> : null}
            {x.company.phone ? <Item left={<Dot icon="phone" tone="nv" />} title={x.company.phone} right={t('Call')} onPress={() => call(x.company.phone!)} /> : null}
          </Card>
          {x.more.length ? <Card title={t('More jobs at {c}', { c: x.company.name })}>{x.more.map((y) => <JobRow key={y.id} j={y} onPress={() => router.push(`/jobs/${y.id}` as any)} />)}</Card> : null}
          {x.similar.length ? <Card title={t('Similar jobs')}>{x.similar.map((y) => <JobRow key={y.id} j={y} onPress={() => router.push(`/jobs/${y.id}` as any)} />)}</Card> : null}
          {!x.more.length && !x.similar.length ? <None icon="briefcase" title={t('Looking for more?')} sub={t('Go back to see every open job.')} /> : null}
        </>
      ) : null}

      <Sheet open={!!ap} title={t('Apply: {j}', { j: j?.title || '' })} onClose={() => setAp(null)}>
        {ap && me ? (
          <>
            <Pick<string> label={t('Send this résumé')} value={ap.rid} onChange={(v) => setAp({ ...ap, rid: v })} items={me.resumes.map((r) => [String(r.id), `${r.title} · ${day(r.updated_at)}`] as [string, string])} />
            <Item title={me.name} sub={me.email} />
            <In label={t('Phone (optional)')} value={ap.phone} onChangeText={(v) => setAp({ ...ap, phone: v })} keyboardType="phone-pad" />
            <In label={t('Cover letter (optional)')} value={ap.cover} onChangeText={(v) => setAp({ ...ap, cover: v })} multiline style={{ minHeight: 140 }} placeholder={t('A few lines about why you want this job')} />
            <Btn text={ap.cover.trim() ? t('Ava writes it again') : t('Ava writes my cover letter')} icon="spark" onPress={cover} busy={busy === 'cv'} />
            {err ? <Tag text={err} tone="bad" /> : null}
            <Btn text={t('Send my application')} icon="send" kind="blue" onPress={send} busy={busy === 'ap'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
