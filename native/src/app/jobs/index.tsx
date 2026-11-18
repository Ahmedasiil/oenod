// Find a job, inside the app: every open job on OENOD with search, job areas, work type, near me with a radius,
// pay shown, match score from your résumé. My applications with their status, saved jobs, and job alerts.
import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { del, get, post, put } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { day } from '../../lib/format';
import { t } from '../../lib/i18n';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Search, Sheet, State, Tag, ToolPage, sure, useBusy } from '../../ui/T1';
import { JobRow, TYPES, nearMe, plain, type JobCard } from '../../lib/jobs';

type Market = { jobs: JobCard[]; total: number; offset: number; categories: { key: string; name: string; n: number }[]; cities: { name: string; n: number }[]; me: { signed_in: boolean; has_resume: boolean } | null };
type App = { id: number; job_id: number | null; stage: string; status: string; step: number; title: string | null; company: string; city: string | null; pay: string | null; created_at: string; interview_at: string | null; match_score: number | null };
type Mine = { applications: App[]; saved: JobCard[]; apps_left: number | null; free_applies: number; has_resume: boolean; stats: { sent: number; active: number; interviews: number; saved: number } };
type Alert = { id: number; name: string; roles: string[]; cats: string[]; types: string[]; city: string | null; near: boolean; radius_km: number; remote_ok: boolean; min_pay: number | null; freq: string; app_on: boolean; email_on: boolean; status: string; hits: number; week?: number };
type Alerts = { alerts: Alert[]; limit: number; has_resume: boolean; suggest: { roles: string[]; city: string | null } | null; categories: { key: string; name: string }[] };
type AEd = { id?: number; roles: string; cat: string; type: string; city: string; near: boolean; radius: string; remote: string; min_pay: string; freq: string; email: string };

const RADII: [string, string][] = [['5', '5 km'], ['10', '10 km'], ['25', '25 km'], ['50', '50 km'], ['100', '100 km'], ['0', 'Anywhere']];

export default function Jobs() {
  const q0 = useLocalSearchParams<{ tab?: string; q?: string; sort?: string }>();
  const [tab, setTab] = useState<'find' | 'mine' | 'alerts'>(q0.tab === 'mine' || q0.tab === 'alerts' ? q0.tab : 'find');
  const [s, setS] = useState(String(q0.q || ''));
  const [q, setQ] = useState(String(q0.q || ''));
  const [cat, setCat] = useState('');
  const [type, setType] = useState('');
  const [near, setNear] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState('25');
  const [sort, setSort] = useState<'new' | 'match' | 'near'>(q0.sort === 'match' ? 'match' : 'new');
  const [pay, setPay] = useState(false);
  const [remote, setRemote] = useState(false);
  const [more, setMore] = useState<JobCard[]>([]);
  const qs = () => {
    const a = new URLSearchParams();
    if (q.trim()) a.set('q', q.trim()); if (cat) a.set('category', cat); if (type) a.set('type', type);
    if (pay) a.set('pay', '1'); if (remote) a.set('remote', '1');
    if (near) { a.set('near', `${near.lat},${near.lng}`); a.set('radius', radius); }
    a.set('sort', sort === 'near' && !near ? 'new' : sort);
    return a.toString();
  };
  const m = useLoad(() => { setMore([]); return get<Market>(`/api/market/jobs?${qs()}`); }, [q, cat, type, near?.lat, near?.lng, radius, sort, pay, remote]);
  const mine = useLoad(() => get<Mine>('/api/me/jobs'));
  const al = useLoad(() => get<Alerts>('/api/jm4/me'));
  const { busy, run } = useBusy();
  const [opts, setOpts] = useState(false);
  const [ed, setEd] = useState<AEd | null>(null);
  const [err, setErr] = useState('');
  const x = m.data;
  const jobs = [...(x?.jobs || []), ...more];
  const my = mine.data;
  const A = al.data;

  const goNear = () => run('nr', async () => {
    const p = await nearMe();
    if (!p) throw new Error(t('Turn on location for OENOD in your phone settings to see jobs near you.'));
    setNear(p); setSort('near');
  });
  const loadMore = () => run('more', async () => { const r = await get<Market>(`/api/market/jobs?${qs()}&offset=${jobs.length}`); setMore([...more, ...r.jobs]); });
  const open = (id: number) => router.push(`/jobs/${id}` as any);
  const withdraw = (a: App) => sure(t('Withdraw this application?'), t('{c} is told you are no longer interested.', { c: a.company }), t('Withdraw'), () => run('wd' + a.id, async () => { await post(`/api/me/applications/${a.id}/withdraw`); mine.reload(); m.reload(); }), true);

  const newAlert = (): AEd => ({ roles: A?.suggest?.roles?.join(', ') || q.trim(), cat: cat || '', type: type || '', city: A?.suggest?.city || '', near: !!near, radius, remote: 'yes', min_pay: '', freq: 'daily', email: 'yes' });
  const editAlert = (a: Alert) => { setErr(''); setEd({ id: a.id, roles: a.roles.join(', '), cat: a.cats[0] || '', type: a.types[0] || '', city: a.city || '', near: a.near && !a.city, radius: String(a.radius_km), remote: a.remote_ok ? 'yes' : 'no', min_pay: a.min_pay ? String(a.min_pay) : '', freq: a.freq, email: a.email_on ? 'yes' : 'no' }); };
  const saveAlert = () => {
    if (!ed) return;
    const roles = ed.roles.split(',').map((r) => r.trim()).filter(Boolean);
    if (!roles.length && !ed.cat && !ed.city.trim() && !ed.near) return setErr(t('Add a job, a job area or a place for the alert.'));
    if (ed.min_pay.trim() && !(Number(ed.min_pay) > 0)) return setErr(t('Type the lowest hourly pay as a number, like 18.'));
    setErr('');
    run('as', async () => {
      const b: any = { roles, cats: ed.cat ? [ed.cat] : [], types: ed.type ? [ed.type] : [], city: ed.near ? '' : ed.city.trim(), radius_km: Number(ed.radius), remote_ok: ed.remote === 'yes',
        min_pay: ed.min_pay.trim() ? Number(ed.min_pay) : null, freq: ed.freq, app_on: true, email_on: ed.email === 'yes', tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
      if (ed.near) { const p = near || (await nearMe()); if (!p) throw new Error(t('Turn on location for OENOD in your phone settings, or type a city.')); b.lat = p.lat; b.lng = p.lng; }
      try { if (ed.id) await put(`/api/jm4/alerts/${ed.id}`, b); else await post('/api/jm4/alerts', b); } catch (e) { throw plain(e, 'alert'); }
      setEd(null); al.reload(); mine.reload();
    });
  };
  const pause = (a: Alert) => run('ap' + a.id, async () => { await post(`/api/jm4/alerts/${a.id}/state`, { status: a.status === 'paused' ? 'active' : 'paused' }); al.reload(); });
  const dropAlert = () => ed?.id && sure(t('Delete this job alert?'), t('You stop getting jobs for it.'), t('Delete'), () => run('ad', async () => { await del(`/api/jm4/alerts/${ed.id}`); setEd(null); al.reload(); mine.reload(); }), true);

  const cats = x?.categories || [];
  return (
    <ToolPage title={t('Find a job')} right={tab === 'alerts' ? 'plus' : 'search'} rightLabel={tab === 'alerts' ? t('New job alert') : t('Search options')}
      onRight={() => (tab === 'alerts' ? (setErr(''), setEd(newAlert())) : setOpts(true))}
      refreshing={m.refreshing} onRefresh={() => { m.refresh(); mine.reload(); al.reload(); }}>
      <Hero id="jbh" label={t('Open jobs on OENOD')} value={x ? String(x.total) : '—'} note={near ? t('Near you, within {r}', { r: radius === '0' ? t('any distance') : `${radius} km` }) : my?.has_resume ? t('Match scores come from your résumé') : t('Make a résumé to see your match on every job')} noteGood
        stats={[[t('Applied'), my ? String(my.stats.sent) : '—'], [t('Interviews'), my ? String(my.stats.interviews) : '—'], [t('Saved'), my ? String(my.stats.saved) : '—']]} />
      <Chips value={tab} onChange={setTab} items={[['find', t('Find jobs')], ['mine', t('My applications'), my?.stats.active], ['alerts', t('Job alerts'), A?.alerts.length]]} />

      {tab === 'find' ? (
        <>
          <Search value={s} onChange={(v) => { setS(v); if (!v.trim()) setQ(''); }} placeholder={t('Job title, skill or company')} />
          {s.trim() !== q.trim() ? <Btn text={t('Search')} icon="search" kind="blue" onPress={() => setQ(s)} /> : null}
          <Chips<string> value={near ? 'near' : sort === 'match' ? 'match' : 'new'} onChange={(k) => (k === 'near' ? goNear() : (setNear(null), setSort(k as any)))}
            items={[['new', t('Newest')], ['near', t('Near me')], ...(my?.has_resume ? [['match', t('Best match')] as [string, string]] : [])]} />
          {near ? <Chips<string> value={radius} onChange={setRadius} items={RADII.map(([k, l]) => [k, t(l)] as [string, string])} /> : null}
          {cats.length ? <Chips<string> value={cat} onChange={setCat} items={[['', t('All'), x?.total], ...cats.map((c) => [c.key, t(c.name), c.n] as [string, string, number])]} /> : null}
          <State loading={(m.loading || busy === 'nr') && !x} error={!x ? m.error : null} onRetry={m.reload} />
          {x ? (
            <Card>
              {jobs.length ? jobs.map((j) => <JobRow key={j.id} j={j} onPress={() => open(j.id)} />)
                : <None icon="briefcase" title={t('No jobs match')} sub={near ? t('Try a bigger distance or another job area.') : t('Try another word or job area.')} />}
            </Card>
          ) : null}
          {x && jobs.length < x.total ? <Btn text={t('Show more jobs')} icon="plus" onPress={loadMore} busy={busy === 'more'} /> : null}
          {x ? <Btn text={t('Tell me when new jobs like these are posted')} icon="bell" onPress={() => { setErr(''); setEd(newAlert()); }} /> : null}
          {my && !my.has_resume ? <Btn text={t('Make my résumé')} icon="doc" kind="dark" onPress={() => router.push('/resume' as any)} /> : null}
        </>
      ) : null}

      {tab === 'mine' ? (
        <>
          <State loading={mine.loading && !my} error={!my ? mine.error : null} onRetry={mine.reload} />
          {my ? (
            <>
              {my.apps_left != null ? <Tag text={t('{n} of {m} applications left this month', { n: my.apps_left, m: my.free_applies })} tone={my.apps_left ? 'info' : 'warn'} /> : null}
              <Card title={t('My applications')}>
                {my.applications.length ? my.applications.map((a) => (
                  <Item key={a.id} onPress={a.job_id && a.stage !== 'withdrawn' ? () => open(a.job_id!) : undefined} left={<Dot icon="briefcase" tone={a.stage === 'hired' || a.stage === 'offer' ? 'good' : a.stage === 'rejected' || a.stage === 'withdrawn' ? 'dk' : a.stage === 'interview' ? 'warn' : 'nv'} />}
                    title={a.title || t('Job')} sub={[a.company, a.interview_at ? t('Interview {d}', { d: day(a.interview_at) }) : t('Sent {d}', { d: day(a.created_at) })].filter(Boolean).join(' · ')}
                    rightSub={<Tag text={t(a.status)} tone={a.stage === 'hired' || a.stage === 'offer' ? 'good' : a.stage === 'interview' ? 'warn' : a.stage === 'rejected' || a.stage === 'withdrawn' ? 'plain' : 'info'} />} />
                )) : <None icon="briefcase" title={t('No applications yet')} sub={t('Find a job and apply in one tap with your résumé.')} />}
              </Card>
              {my.applications.filter((a) => ['applied', 'screen', 'interview', 'offer'].includes(a.stage)).length ? (
                <Card title={t('Changed your mind?')}>
                  {my.applications.filter((a) => ['applied', 'screen', 'interview', 'offer'].includes(a.stage)).map((a) => <Item key={a.id} title={a.title || t('Job')} sub={a.company} right={t('Withdraw')} onPress={() => withdraw(a)} />)}
                </Card>
              ) : null}
              <Card title={t('Saved jobs')}>
                {my.saved.length ? my.saved.map((j) => <JobRow key={j.id} j={j} onPress={() => open(j.id)} />) : <None icon="heart" title={t('No saved jobs')} sub={t('Tap Save on a job to keep it here.')} />}
              </Card>
            </>
          ) : null}
        </>
      ) : null}

      {tab === 'alerts' ? (
        <>
          <State loading={al.loading && !A} error={!A ? al.error : null} onRetry={al.reload} />
          {A ? (
            <>
              <Btn text={t('New job alert')} icon="bell" kind="blue" onPress={() => { setErr(''); setEd(newAlert()); }} />
              <Card title={t('Job alerts')}>
                {A.alerts.length ? A.alerts.map((a) => (
                  <Item key={a.id} onPress={() => editAlert(a)} left={<Dot icon="bell" tone={a.status === 'paused' ? 'dk' : 'nv'} />} title={a.name}
                    sub={[t(a.freq === 'instant' ? 'Right away' : a.freq === 'weekly' ? 'Every Monday' : 'Every morning'), a.near || a.city ? (a.radius_km ? `${a.radius_km} km` : t('Anywhere')) : null, a.min_pay ? t('from ${p}/hr', { p: a.min_pay }) : null].filter(Boolean).join(' · ')}
                    right={a.week ? t('{n} this week', { n: a.week }) : undefined} rightSub={a.status === 'paused' ? <Tag text={t('Paused')} /> : undefined} />
                )) : <None icon="bell" title={t('No job alerts yet')} sub={t('Tell OENOD the jobs you want. You get new ones in the app and by email.')} />}
              </Card>
              {A.alerts.map((a) => <Btn key={a.id} text={a.status === 'paused' ? t('Turn on: {n}', { n: a.name }) : t('Pause: {n}', { n: a.name })} icon={a.status === 'paused' ? 'check' : 'clock'} onPress={() => pause(a)} busy={busy === 'ap' + a.id} />)}
            </>
          ) : null}
        </>
      ) : null}

      <Sheet open={opts} title={t('Search options')} onClose={() => setOpts(false)}>
        <Pick<string> label={t('Work type')} value={type} onChange={setType} items={TYPES.map(([k, l]) => [k, t(l)] as [string, string])} />
        <Pick<string> label={t('Pay')} value={pay ? 'yes' : 'no'} onChange={(v) => setPay(v === 'yes')} items={[['no', t('All jobs')], ['yes', t('Only jobs that show the pay')]]} />
        <Pick<string> label={t('Remote')} value={remote ? 'yes' : 'no'} onChange={(v) => setRemote(v === 'yes')} items={[['no', t('In person and remote')], ['yes', t('Only remote jobs')]]} />
        <Btn text={t('Show jobs')} icon="check" kind="blue" onPress={() => { setOpts(false); setTab('find'); }} />
      </Sheet>

      <Sheet open={!!ed} title={ed?.id ? t('Edit job alert') : t('New job alert')} onClose={() => setEd(null)}>
        {ed ? (
          <>
            <In label={t('Jobs you want (separate with commas)')} value={ed.roles} onChangeText={(v) => setEd({ ...ed, roles: v })} placeholder={t('Barista, Shift lead')} />
            <Pick<string> label={t('Job area')} value={ed.cat} onChange={(v) => setEd({ ...ed, cat: v })} items={[['', t('Any job area')], ...(A?.categories || cats).map((c) => [c.key, t(c.name)] as [string, string])]} />
            <Pick<string> label={t('Work type')} value={ed.type} onChange={(v) => setEd({ ...ed, type: v })} items={TYPES.map(([k, l]) => [k, t(l)] as [string, string])} />
            <Pick<string> label={t('Where')} value={ed.near ? 'near' : 'city'} onChange={(v) => setEd({ ...ed, near: v === 'near' })} items={[['near', t('Near where I am now')], ['city', t('In a city')]]} />
            {!ed.near ? <In label={t('City')} value={ed.city} onChangeText={(v) => setEd({ ...ed, city: v })} placeholder="Edmonton" /> : null}
            <Pick<string> label={t('Distance')} value={ed.radius} onChange={(v) => setEd({ ...ed, radius: v })} items={RADII.map(([k, l]) => [k, t(l)] as [string, string])} />
            <Pick<string> label={t('Remote jobs too')} value={ed.remote} onChange={(v) => setEd({ ...ed, remote: v })} items={[['yes', t('Yes')], ['no', t('No')]]} />
            <In label={t('Lowest hourly pay (optional)')} value={ed.min_pay} onChangeText={(v) => setEd({ ...ed, min_pay: v })} keyboardType="decimal-pad" placeholder="18" />
            <Pick<string> label={t('How often')} value={ed.freq} onChange={(v) => setEd({ ...ed, freq: v })} items={[['instant', t('Right away')], ['daily', t('Every morning')], ['weekly', t('Every Monday')]]} />
            <Pick<string> label={t('Also by email')} value={ed.email} onChange={(v) => setEd({ ...ed, email: v })} items={[['yes', t('Yes')], ['no', t('No, only in the app')]]} />
            {err ? <Tag text={err} tone="bad" /> : null}
            <Btn text={ed.id ? t('Save job alert') : t('Start job alert')} icon="check" kind="blue" onPress={saveAlert} busy={busy === 'as'} />
            {ed.id ? <Btn text={t('Delete job alert')} icon="x" kind="red" onPress={dropAlert} busy={busy === 'ad'} /> : null}
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
