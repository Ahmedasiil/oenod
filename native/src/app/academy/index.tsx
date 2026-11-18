// Academy, built into the app: my courses and progress, required training first, the team's progress (managers), and certificates.
import React, { useState } from 'react';
import { router } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date } from '../../lib/format';
import { t } from '../../lib/i18n';
import { Card, Chips, Dot, Hero, Item, None, State, Tag, ToolPage, useBusy } from '../../ui/T1';

type Course = { id: number; title: string; summary: string | null; lessons: number; minutes: number; enrolled: number | null; required: number; progress: number; cert: string | null; company_id: number | null; company: string | null; price: number; category: string | null };
type L = { courses: Course[]; team: { id: number; first_name: string; last_name: string | null; courses: Record<string, number> }[] | null; certificates: { code: string; course_title: string; issuer: string; issued_at: string }[] };

export default function Academy() {
  const d = useLoad(() => get<L>('/api/academy'));
  const [tab, setTab] = useState<'mine' | 'all' | 'team' | 'certs'>('mine');
  const { busy, run } = useBusy();
  const x = d.data;
  const free = (x?.courses || []).filter((c) => !(c.price > 0) || c.enrolled);
  const mine = free.filter((c) => c.enrolled || c.required || c.progress > 0);
  const doneN = mine.filter((c) => c.progress >= 100).length;
  const req = free.filter((c) => c.required && c.progress < 100).length;
  const open = (c: Course) => run('c' + c.id, async () => { if (!c.enrolled) await post(`/api/learn/${c.id}/enroll`, {}); router.push(`/academy/${c.id}` as any); });
  const row = (c: Course) => <Item key={c.id} onPress={() => open(c)} left={<Dot icon="cap" tone={c.progress >= 100 ? 'good' : c.required ? 'warn' : 'nv'} />} title={c.title}
    sub={[c.company || t('OENOD Academy'), t('{n} lessons', { n: c.lessons }), c.minutes ? t('{m} min', { m: c.minutes }) : null].filter(Boolean).join(' · ')}
    right={c.progress ? `${c.progress}%` : undefined} rightSub={busy === 'c' + c.id ? <Tag text="…" /> : c.progress >= 100 ? <Tag text={t('Done')} tone="good" /> : c.required ? <Tag text={t('Required')} tone="warn" /> : c.enrolled ? <Tag text={t('Continue')} tone="info" /> : <Tag text={t('Start')} />} />;
  return (
    <ToolPage title={t('Academy')} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x ? <Hero id="aca" label={t('My training')} value={`${doneN} / ${mine.length || 0}`} note={req ? t('{n} required courses to finish', { n: req }) : t('All required training is done')} noteGood={!req}
        stats={[[t('Courses'), String(free.length)], [t('Certificates'), String(x.certificates.length)], [t('In progress'), String(mine.filter((c) => c.progress > 0 && c.progress < 100).length)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Chips value={tab} onChange={setTab} items={[['mine', t('My courses'), mine.length], ['all', t('All courses')], ...(x.team ? [['team', t('Team')] as ['team', string]] : []), ['certs', t('Certificates'), x.certificates.length]]} />
          {tab === 'mine' ? <Card>{mine.length ? mine.map(row) : <None icon="cap" title={t('No courses yet')} sub={t('Open All courses and start one.')} />}</Card>
            : tab === 'all' ? <Card>{free.map(row)}</Card>
            : tab === 'team' ? (
              <Card title={t('Required training done')}>
                {(x.team || []).map((p) => { const rq = free.filter((c) => c.required); const ok = rq.filter((c) => (p.courses[String(c.id)] || 0) >= 100).length;
                  return <Item key={p.id} left={<Dot icon="user" tone={rq.length && ok < rq.length ? 'warn' : 'good'} />} title={`${p.first_name} ${p.last_name || ''}`.trim()} right={rq.length ? `${ok} / ${rq.length}` : '—'} />; })}
              </Card>)
            : <Card>{x.certificates.length ? x.certificates.map((c) => <Item key={c.code} left={<Dot icon="check" tone="good" />} title={c.course_title} sub={`${c.issuer} · ${date(c.issued_at.slice(0, 10))}`} right={c.code} />) : <None icon="cap" title={t('No certificates yet')} sub={t('Finish a course to earn one.')} />}</Card>}
        </>
      ) : null}
    </ToolPage>
  );
}
