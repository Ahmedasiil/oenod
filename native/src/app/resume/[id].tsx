// One résumé: edit your details, jobs, school and skills; pick a look; Ava writes it from notes; check its score with
// Ava's tips; find jobs that match it; share a link.
import React, { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { get, post, put, del } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Btn, Card, Dot, Hero, In, Item, None, Pick, Sheet, State, Tag, ToolPage, oops, sure, useBusy } from '../../ui/T1';
import { plain } from '../../lib/jobs';

type Job = { title: string; company: string; location: string; start: string; end: string; current: boolean; bullets: string[] };
type Edu = { school: string; degree: string; field?: string; start?: string; end: string; details?: string };
type Data = { name: string; headline: string; email: string; phone: string; location: string; website: string; summary: string; experience: Job[]; education: Edu[]; skills: string[]; languages?: string[]; [k: string]: any };
type R = { id: number; title: string; template: string; data: Data; share_url: string | null };
type Rev = { score: number; grade: string; checks: { label: string; ok: boolean; tip: string | null }[]; tips?: string[] };

export default function Resume() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => get<R>(`/api/me/resumes/${id}`), [id]);
  const [me, setMe] = useState<Data | null>(null);
  const [job, setJob] = useState<{ i: number; j: Job; b: string } | null>(null);
  const [sk, setSk] = useState<string | null>(null);
  const [ai, setAi] = useState<{ target: string; experience: string; education: string; skills: string } | null>(null);
  const [rev, setRev] = useState<Rev | null>(null);
  const [edu, setEdu] = useState<{ i: number; e: Edu } | null>(null);
  const [lk, setLk] = useState<string | null>(null);
  const [lang, setLang] = useState<string | null>(null);
  const tl = useLoad(() => get<{ templates: string[]; limits: { templates: string[] } }>('/api/me/resumes').catch(() => null));
  const { busy, run } = useBusy();
  const r = d.data;
  const data = r?.data;
  // The server replaces the whole résumé on save, so always send all of it.
  const save = (next: Data) => run('save', async () => { const out = await put<R>(`/api/me/resumes/${id}`, { title: r!.title, template: r!.template, data: next }); d.setData(out); });
  const saveMe = () => me && save(me).then((ok) => ok && setMe(null));
  const saveJob = () => {
    if (!job || !data) return;
    const j = { ...job.j, bullets: job.b.split('\n').map((s) => s.replace(/^[-•*\s]+/, '').trim()).filter(Boolean) };
    if (!j.title.trim()) return oops(t('Type the job title.'));
    const list = [...(data.experience || [])];
    if (job.i < 0) list.unshift(j); else list[job.i] = j;
    save({ ...data, experience: list }).then((ok) => ok && setJob(null));
  };
  const dropJob = () => job && data && job.i >= 0 && save({ ...data, experience: data.experience.filter((_, i) => i !== job.i) }).then((ok) => ok && setJob(null));
  const saveEdu = () => {
    if (!edu || !data) return;
    if (!edu.e.school.trim()) return oops(t('Type the school name.'));
    const list = [...(data.education || [])];
    if (edu.i < 0) list.unshift(edu.e); else list[edu.i] = edu.e;
    save({ ...data, education: list }).then((ok) => ok && setEdu(null));
  };
  const dropEdu = () => edu && data && edu.i >= 0 && save({ ...data, education: data.education.filter((_, i) => i !== edu.i) }).then((ok) => ok && setEdu(null));
  const saveLang = () => lang != null && data && save({ ...data, languages: lang.split(',').map((s) => s.trim()).filter(Boolean) }).then((ok) => ok && setLang(null));
  const saveLook = () => lk && r && run('save', async () => {
    try { d.setData(await put<R>(`/api/me/resumes/${id}`, { title: r.title, template: lk, data })); } catch (e: any) { throw e?.status === 402 ? new Error(t('This look is not on your account yet. Pick another one.')) : e; }
    setLk(null);
  });
  const looks = (tl.data?.limits?.templates || ['classic', 'modern', 'minimal', 'clean', 'simple', 'student', 'timeline', 'fresh']);
  const saveSkills = () => sk != null && data && save({ ...data, skills: sk.split(',').map((s) => s.trim()).filter(Boolean) }).then((ok) => ok && setSk(null));
  const build = () => {
    if (!ai) return;
    if (ai.target.trim().length < 2) return oops(t('Type the job you want.'));
    run('ai', async () => { await post(`/api/me/resumes/${id}/ai-build`, { target: ai.target.trim(), experience: ai.experience, education: ai.education, skills: ai.skills }); setAi(null); d.reload(); });
  };
  const check = () => run('rev', async () => setRev(await post<Rev>(`/api/me/resumes/${id}/review`)));
  const share = () => run('sh', async () => {
    let out: R;
    try { out = r?.share_url ? r : await post<R>(`/api/me/resumes/${id}/share`, { on: true }); } catch (e) { throw plain(e, 'share'); }
    d.setData(out);
    if (out.share_url) await Share.share({ message: out.share_url }).catch(() => oops(t('Your link: {u}', { u: out.share_url || '' })));
  });
  const remove = () => sure(t('Delete this résumé?'), t('This cannot be undone.'), t('Delete'), () => run('del', async () => { await del(`/api/me/resumes/${id}`); router.back(); }), true);
  return (
    <ToolPage title={r?.title || t('Résumé')} refreshing={d.refreshing} onRefresh={d.refresh}>
      <State loading={d.loading && !r} error={!r ? d.error : null} onRetry={d.reload} />
      {r && data ? (
        <>
          <Hero id="r1h" label={data.headline || t('Add a headline')} value={data.name || t('Your name')} note={[data.email, data.phone].filter(Boolean).join(' · ') || t('Add your email and phone')} noteGood
            stats={[[t('Jobs'), String(data.experience?.length || 0)], [t('Skills'), String(data.skills?.length || 0)], [t('Link'), r.share_url ? t('On') : t('Off')]]} />
          <Btn text={t('Ava writes it for me')} icon="spark" onPress={() => setAi({ target: data.headline || '', experience: '', education: '', skills: (data.skills || []).join(', ') })} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Btn text={t('Check score')} icon="check" kind="dark" onPress={check} busy={busy === 'rev'} /></View>
            <View style={{ flex: 1 }}><Btn text={t('Share link')} icon="send" kind="dark" onPress={share} busy={busy === 'sh'} /></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Btn text={t('Jobs that match')} icon="briefcase" onPress={() => router.push({ pathname: '/jobs', params: { sort: 'match' } } as any)} /></View>
            <View style={{ flex: 1 }}><Btn text={t('Change look')} icon="grid" onPress={() => setLk(r.template || 'classic')} /></View>
          </View>
          <Card title={t('About you')} right={t('Edit')} onRight={() => setMe({ ...data })}>
            <Item title={t('Summary')} sub={data.summary || t('Not written yet')} />
            <Item title={t('Location')} sub={data.location || '—'} />
          </Card>
          <Card title={t('Work')} right={t('Add job')} onRight={() => setJob({ i: -1, j: { title: '', company: '', location: '', start: '', end: '', current: false, bullets: [] }, b: '' })}>
            {(data.experience || []).length ? data.experience.map((j, i) => <Item key={i} onPress={() => setJob({ i, j: { ...j }, b: (j.bullets || []).join('\n') })} left={<Dot icon="briefcase" />} title={j.title || t('Job')} sub={[j.company, [j.start, j.current ? t('now') : j.end].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')} />)
              : <None icon="briefcase" title={t('No jobs yet')} />}
          </Card>
          <Card title={t('School')} right={t('Add school')} onRight={() => setEdu({ i: -1, e: { school: '', degree: '', field: '', start: '', end: '', details: '' } })}>
            {(data.education || []).length ? data.education.map((e, i) => <Item key={i} onPress={() => setEdu({ i, e: { ...e } })} left={<Dot icon="cap" />} title={e.school || t('School')} sub={[e.degree, e.field, [e.start, e.end].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')} />)
              : <None icon="cap" title={t('No school yet')} sub={t('Add your school, program or diploma, even if you did not finish.')} />}
          </Card>
          <Card title={t('Languages')} right={t('Edit')} onRight={() => setLang((data.languages || []).join(', '))}>
            <View style={{ paddingVertical: 10 }}><Text style={{ color: (data.languages || []).length ? V.ink : V.mute, fontSize: 14 }}>{(data.languages || []).join(' · ') || t('No languages yet')}</Text></View>
          </Card>
          <Card title={t('Skills')} right={t('Edit')} onRight={() => setSk((data.skills || []).join(', '))}>
            <View style={{ paddingVertical: 10 }}><Text style={{ color: (data.skills || []).length ? V.ink : V.mute, fontSize: 14 }}>{(data.skills || []).join(' · ') || t('No skills yet')}</Text></View>
          </Card>
          <Btn text={t('Delete résumé')} icon="x" kind="dark" onPress={remove} busy={busy === 'del'} />
        </>
      ) : null}
      <Sheet open={!!me} title={t('About you')} onClose={() => setMe(null)}>
        {me ? (
          <>
            <In label={t('Name')} value={me.name} onChangeText={(v) => setMe({ ...me, name: v })} />
            <In label={t('Headline')} value={me.headline} onChangeText={(v) => setMe({ ...me, headline: v })} placeholder={t('Barista and shift lead')} />
            <In label={t('Email')} value={me.email} onChangeText={(v) => setMe({ ...me, email: v })} keyboardType="email-address" autoCapitalize="none" />
            <In label={t('Phone')} value={me.phone} onChangeText={(v) => setMe({ ...me, phone: v })} keyboardType="phone-pad" />
            <In label={t('Location')} value={me.location} onChangeText={(v) => setMe({ ...me, location: v })} />
            <In label={t('Summary')} value={me.summary} onChangeText={(v) => setMe({ ...me, summary: v })} multiline style={{ minHeight: 110 }} />
            <Btn text={t('Save')} icon="check" onPress={saveMe} busy={busy === 'save'} />
          </>
        ) : null}
      </Sheet>
      <Sheet open={!!job} title={job && job.i >= 0 ? t('Edit job') : t('Add job')} onClose={() => setJob(null)}>
        {job ? (
          <>
            <In label={t('Job title')} value={job.j.title} onChangeText={(v) => setJob({ ...job, j: { ...job.j, title: v } })} />
            <In label={t('Company')} value={job.j.company} onChangeText={(v) => setJob({ ...job, j: { ...job.j, company: v } })} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <In style={{ flex: 1 }} label={t('Start')} value={job.j.start} onChangeText={(v) => setJob({ ...job, j: { ...job.j, start: v } })} placeholder="2023-05" />
              <In style={{ flex: 1 }} label={t('End (empty = now)')} value={job.j.end} onChangeText={(v) => setJob({ ...job, j: { ...job.j, end: v, current: !v.trim() } })} placeholder="2025-08" />
            </View>
            <In label={t('What you did, one per line')} value={job.b} onChangeText={(v) => setJob({ ...job, b: v })} multiline style={{ minHeight: 120 }} />
            <Btn text={t('Save job')} icon="check" onPress={saveJob} busy={busy === 'save'} />
            {job.i >= 0 ? <Btn text={t('Remove job')} icon="x" kind="dark" onPress={dropJob} /> : null}
          </>
        ) : null}
      </Sheet>
      <Sheet open={sk != null} title={t('Skills')} onClose={() => setSk(null)}>
        <In label={t('Skills, separated by commas')} value={sk || ''} onChangeText={setSk} multiline style={{ minHeight: 100 }} placeholder={t('Latte art, Cash handling, Opening and closing')} />
        <Btn text={t('Save')} icon="check" onPress={saveSkills} busy={busy === 'save'} />
      </Sheet>
      <Sheet open={!!ai} title={t('Ava writes it for me')} onClose={() => setAi(null)}>
        {ai ? (
          <>
            <Text style={{ color: V.mute, fontSize: 13.5 }}>{t('Write short notes. Ava turns them into a full résumé. Your old version is kept in history.')}</Text>
            <In label={t('Job you want')} value={ai.target} onChangeText={(v) => setAi({ ...ai, target: v })} placeholder={t('Shift supervisor')} />
            <In label={t('Past jobs, one per line')} value={ai.experience} onChangeText={(v) => setAi({ ...ai, experience: v })} multiline style={{ minHeight: 110 }} placeholder={t('Barista at Northside Café 2023 - now')} />
            <In label={t('School (optional)')} value={ai.education} onChangeText={(v) => setAi({ ...ai, education: v })} multiline />
            <In label={t('Skills (optional)')} value={ai.skills} onChangeText={(v) => setAi({ ...ai, skills: v })} />
            <Btn text={t('Write my résumé')} icon="spark" onPress={build} busy={busy === 'ai'} />
          </>
        ) : null}
      </Sheet>
      <Sheet open={!!rev} title={rev ? t('Score {s} / 100 · {g}', { s: rev.score, g: rev.grade }) : ''} onClose={() => setRev(null)}>
        {rev ? (
          <>
            {rev.tips?.length ? <Card title={t('Ava’s tips')}>{rev.tips.map((x, i) => <Item key={i} left={<Dot icon="spark" tone="nv" />} title={x} />)}</Card> : null}
            <Card title={t('What we checked')}>{rev.checks.map((c, i) => <Item key={i} left={<Dot icon={c.ok ? 'check' : 'spark'} tone={c.ok ? 'good' : 'warn'} />} title={c.label} sub={c.tip || undefined} rightSub={<Tag text={c.ok ? t('Good') : t('Fix')} tone={c.ok ? 'good' : 'warn'} />} />)}</Card>
            {rev.score < 85 && data ? <Btn text={t('Ava improves it for me')} icon="spark" kind="blue" onPress={() => { setRev(null); setAi({ target: data.headline || '', experience: (data.experience || []).map((j) => [j.title, j.company, [j.start, j.current ? 'now' : j.end].filter(Boolean).join(' - ')].filter(Boolean).join(', ')).join('\n'), education: (data.education || []).map((e) => [e.degree, e.school].filter(Boolean).join(', ')).join('\n'), skills: (data.skills || []).join(', ') }); }} /> : null}
            <Btn text={t('Jobs that match')} icon="briefcase" onPress={() => { setRev(null); router.push({ pathname: '/jobs', params: { sort: 'match' } } as any); }} />
          </>
        ) : null}
      </Sheet>
      <Sheet open={!!edu} title={edu && edu.i >= 0 ? t('Edit school') : t('Add school')} onClose={() => setEdu(null)}>
        {edu ? (
          <>
            <In label={t('School')} value={edu.e.school} onChangeText={(v) => setEdu({ ...edu, e: { ...edu.e, school: v } })} />
            <In label={t('Diploma or degree')} value={edu.e.degree} onChangeText={(v) => setEdu({ ...edu, e: { ...edu.e, degree: v } })} placeholder={t('High school diploma')} />
            <In label={t('Program (optional)')} value={edu.e.field || ''} onChangeText={(v) => setEdu({ ...edu, e: { ...edu.e, field: v } })} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <In style={{ flex: 1 }} label={t('Start')} value={edu.e.start || ''} onChangeText={(v) => setEdu({ ...edu, e: { ...edu.e, start: v } })} placeholder="2019" />
              <In style={{ flex: 1 }} label={t('End')} value={edu.e.end || ''} onChangeText={(v) => setEdu({ ...edu, e: { ...edu.e, end: v } })} placeholder="2023" />
            </View>
            <Btn text={t('Save school')} icon="check" onPress={saveEdu} busy={busy === 'save'} />
            {edu.i >= 0 ? <Btn text={t('Remove school')} icon="x" kind="dark" onPress={dropEdu} /> : null}
          </>
        ) : null}
      </Sheet>
      <Sheet open={lang != null} title={t('Languages')} onClose={() => setLang(null)}>
        <In label={t('Languages, separated by commas')} value={lang || ''} onChangeText={setLang} placeholder={t('English, French')} />
        <Btn text={t('Save')} icon="check" onPress={saveLang} busy={busy === 'save'} />
      </Sheet>
      <Sheet open={lk != null} title={t('Change look')} onClose={() => setLk(null)}>
        {lk != null ? (
          <>
            <Pick<string> label={t('Résumé look')} value={lk} onChange={setLk} items={looks.map((k) => [k, t(k.charAt(0).toUpperCase() + k.slice(1))] as [string, string])} />
            <Btn text={t('Use this look')} icon="check" kind="blue" onPress={saveLook} busy={busy === 'save'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
