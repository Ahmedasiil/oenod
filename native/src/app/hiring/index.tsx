// Hiring, built into the app (managers): open jobs, every applicant by stage, add an applicant, post or close a job.
import React, { useMemo, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { router } from 'expo-router';
import { get, post, put, del } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { day } from '../../lib/format';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Search, Sheet, State, Tag, ToolPage, oops, sure, useBusy } from '../../ui/T1';

export type Job = { id: number; title: string; type: string; pay: string | null; description: string | null; status: 'open' | 'closed' | 'draft'; location: string | null; applicants: number; created_at?: string };
export type App = { id: number; job_id: number | null; name: string; email: string | null; phone: string | null; note: string | null; stage: Stage; rating: number | null; source: string | null; created_at: string; job: string | null; match_score?: number | null; has_resume?: number };
export type Stage = 'applied' | 'screen' | 'interview' | 'offer' | 'hired' | 'rejected';
type D = { jobs: Job[]; applications: App[]; public_url: string };
export const STAGES: [Stage, string][] = [['applied', 'New'], ['screen', 'Phone screen'], ['interview', 'Interview'], ['offer', 'Offer'], ['hired', 'Hired'], ['rejected', 'Not a fit']];
export const stageWord = (s: string) => t((STAGES.find((x) => x[0] === s) || [s, s])[1]);
export const stageTone = (s: string) => (s === 'hired' ? 'good' : s === 'rejected' ? 'bad' : s === 'offer' ? 'info' : s === 'interview' ? 'warn' : 'plain') as 'good' | 'bad' | 'info' | 'warn' | 'plain';
type JT = 'full_time' | 'part_time' | 'contract' | 'seasonal';
type JF = { id?: number; title: string; type: JT; pay: string; description: string };

export default function Hiring() {
  const d = useLoad(() => get<D>('/api/jobs'));
  const [st, setSt] = useState<Stage | 'active'>('active');
  const [q, setQ] = useState('');
  const [jobPick, setJobPick] = useState<number | 0>(0);
  const [nf, setNf] = useState<{ name: string; email: string; phone: string; job_id: number | null } | null>(null);
  const [jf, setJf] = useState<JF | null>(null);
  const [jobs, setJobs] = useState(false);
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const openJobs = (x?.jobs || []).filter((j) => j.status === 'open');
  const count = (s: Stage) => (x?.applications || []).filter((a) => a.stage === s && (!jobPick || a.job_id === jobPick)).length;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (x?.applications || []).filter((a) => (st === 'active' ? !['hired', 'rejected'].includes(a.stage) : a.stage === st) && (!jobPick || a.job_id === jobPick) && (!s || `${a.name} ${a.email || ''} ${a.job || ''}`.toLowerCase().includes(s)));
  }, [x, st, q, jobPick]);
  const fresh = (x?.applications || []).filter((a) => a.stage === 'applied').length;
  const addApp = () => {
    if (!nf) return;
    if (nf.name.trim().length < 2) return setErr(t('Type their name.'));
    if (nf.email.trim() && !/^\S+@\S+\.\S+$/.test(nf.email.trim())) return setErr(t('That email does not look right.'));
    setErr('');
    run('app', async () => { const r = await post<{ id: number }>('/api/applications', { name: nf.name.trim(), email: nf.email.trim() || null, phone: nf.phone.trim() || null, job_id: nf.job_id, source: 'app' }); setNf(null); d.reload(); router.push(`/hiring/${r.id}`); });
  };
  const saveJob = () => {
    if (!jf) return;
    if (jf.title.trim().length < 2) return setErr(t('Type the job title.'));
    setErr('');
    const body = { title: jf.title.trim(), type: jf.type, pay: jf.pay.trim() || null, description: jf.description.trim() || null, status: 'open' };
    run('job', async () => { if (jf.id) await put(`/api/jobs/${jf.id}`, body); else await post('/api/jobs', body); setJf(null); d.reload(); });
  };
  const closeJob = (j: Job) => sure(t('Close {n}?', { n: j.title }), t('It comes off your job page. Applicants stay.'), t('Close job'), () => run('close' + j.id, async () => { await del(`/api/jobs/${j.id}`); d.reload(); }), true);
  const reopen = (j: Job) => run('open' + j.id, async () => { await put(`/api/jobs/${j.id}`, { title: j.title, status: 'open' }); d.reload(); });
  const share = async () => {
    if (!x?.public_url) return;
    try { await Share.share({ message: t('We are hiring! See our open jobs and apply: {u}', { u: x.public_url }) }); } catch { (globalThis as any).navigator?.clipboard?.writeText?.(x.public_url)?.catch?.(() => {}); oops(t('Your job page: {u}', { u: x.public_url })); }
  };
  return (
    <ToolPage title={t('Hiring')} right="plus" rightLabel={t('Add an applicant')} onRight={() => { setErr(''); setNf({ name: '', email: '', phone: '', job_id: jobPick || openJobs[0]?.id || null }); }} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x ? <Hero id="hrh" label={t('Applicants in progress')} value={String(x.applications.filter((a) => !['hired', 'rejected'].includes(a.stage)).length)}
        note={fresh ? t('{n} new to look at', { n: fresh }) : t('Nobody waiting on you')} noteGood={!fresh}
        stats={[[t('Open jobs'), String(openJobs.length)], [t('Interviews'), String(count('interview'))], [t('Hired'), String(x.applications.filter((a) => a.stage === 'hired').length)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Btn text={t('Jobs')} icon="briefcase" kind="dark" onPress={() => setJobs(true)} /></View>
            <View style={{ flex: 1 }}><Btn text={t('Share jobs')} icon="send" kind="dark" onPress={share} /></View>
          </View>
          {openJobs.length > 1 ? <Chips<string> value={String(jobPick)} onChange={(v) => setJobPick(Number(v))} items={[['0', t('All jobs')], ...openJobs.map((j) => [String(j.id), j.title, j.applicants] as [string, string, number])]} /> : null}
          <Search value={q} onChange={setQ} placeholder={t('Search applicants')} />
          <Chips<string> value={st} onChange={(v) => setSt(v as any)} items={[['active', t('In progress')], ...STAGES.map(([k, l]) => [k, t(l), count(k)] as [string, string, number])]} />
          <Card>
            {list.length ? list.map((a) => (
              <Item key={a.id} onPress={() => router.push(`/hiring/${a.id}`)} left={<Dot icon="user" tone={a.stage === 'applied' ? 'nv' : 'dk'} />} title={a.name}
                sub={[a.job || t('No job picked'), day(a.created_at)].join(' · ')} right={a.rating ? '★'.repeat(Math.max(0, Math.min(5, a.rating))) : undefined}
                rightSub={<Tag text={stageWord(a.stage)} tone={stageTone(a.stage)} />} />
            )) : <None icon="users" title={x.applications.length ? t('Nobody here') : t('No applicants yet')} sub={x.applications.length ? t('Try another stage.') : t('Share your job page, or tap + to add someone.')} />}
          </Card>
        </>
      ) : null}

      <Sheet open={jobs} title={t('Jobs')} onClose={() => setJobs(false)}>
        <Btn text={t('Post a new job')} icon="plus" onPress={() => { setJobs(false); setErr(''); setJf({ title: '', type: 'part_time', pay: '', description: '' }); }} />
        <Card>
          {(x?.jobs || []).length ? (x?.jobs || []).map((j) => (
            <Item key={j.id} title={j.title} sub={[t(j.type.replace('_', ' ')), j.pay, t('{n} applied', { n: j.applicants })].filter(Boolean).join(' · ')}
              onPress={() => { setJobs(false); setErr(''); setJf({ id: j.id, title: j.title, type: (j.type as JT) || 'part_time', pay: j.pay || '', description: j.description || '' }); }}
              rightSub={<Tag text={j.status === 'open' ? t('Open') : j.status === 'draft' ? t('Draft') : t('Closed')} tone={j.status === 'open' ? 'good' : 'plain'} />} />
          )) : <None icon="briefcase" title={t('No jobs yet')} />}
        </Card>
      </Sheet>
      <Sheet open={!!jf} title={jf?.id ? t('Edit job') : t('Post a new job')} onClose={() => setJf(null)}>
        {jf ? (
          <>
            <In label={t('Job title')} value={jf.title} onChangeText={(v) => setJf({ ...jf, title: v })} placeholder={t('Barista')} error={err || undefined} />
            <Pick<JT> label={t('Type')} value={jf.type} onChange={(v) => setJf({ ...jf, type: v })} items={[['part_time', t('Part time')], ['full_time', t('Full time')], ['contract', t('Contract')], ['seasonal', t('Seasonal')]]} />
            <In label={t('Pay (optional)')} value={jf.pay} onChangeText={(v) => setJf({ ...jf, pay: v })} placeholder={t('$18 to $21 an hour')} />
            <In label={t('About the job')} value={jf.description} onChangeText={(v) => setJf({ ...jf, description: v })} multiline style={{ minHeight: 110 }} placeholder={t('What they do, the hours, what you look for')} />
            <Btn text={jf.id ? t('Save') : t('Post job')} icon="check" onPress={saveJob} busy={busy === 'job'} />
            {jf.id ? (() => { const j = x?.jobs.find((y) => y.id === jf.id); return j ? (j.status === 'open' ? <Btn text={t('Close job')} icon="x" kind="dark" onPress={() => { setJf(null); closeJob(j); }} /> : <Btn text={t('Open it again')} icon="check" kind="dark" onPress={() => { setJf(null); reopen(j); }} />) : null; })() : null}
          </>
        ) : null}
      </Sheet>
      <Sheet open={!!nf} title={t('Add an applicant')} onClose={() => setNf(null)}>
        {nf ? (
          <>
            <In label={t('Name')} value={nf.name} onChangeText={(v) => setNf({ ...nf, name: v })} error={err || undefined} />
            <In label={t('Email (optional)')} value={nf.email} onChangeText={(v) => setNf({ ...nf, email: v })} keyboardType="email-address" autoCapitalize="none" />
            <In label={t('Phone (optional)')} value={nf.phone} onChangeText={(v) => setNf({ ...nf, phone: v })} keyboardType="phone-pad" />
            {openJobs.length ? <Pick<string> label={t('For which job?')} value={String(nf.job_id || '')} onChange={(v) => setNf({ ...nf, job_id: Number(v) || null })} items={openJobs.map((j) => [String(j.id), j.title] as [string, string])} /> : <Text style={{ color: V.mute, fontSize: 13 }}>{t('Tip: post a job first so you can match people to it.')}</Text>}
            <Btn text={t('Add applicant')} icon="check" onPress={addApp} busy={busy === 'app'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
