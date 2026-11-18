// Onboarding, built into the app (managers): who starts soon and how ready they are, late steps with a nudge, offers waiting to be signed, and send a new hire offer.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date } from '../../lib/format';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Sheet, State, Tag, ToolPage, isYmd, plusDays, sure, useBusy } from '../../ui/T1';

type Row = { id: number; name: string; job_title: string | null; location: string | null; date: string | null; steps: number; done: number; late: number; pct: number; ready: number; has_account: boolean; buddy: string | null };
type Late = { task_id: number; flow_id: number; kind: string; person: string; title: string; due_on: string; owner_label?: string; owner_name?: string | null };
type Offer = { id: number; first_name: string; last_name: string; job_title: string; first_day: string; status: string; signed_at: string | null; flow_id: number | null };
type D = { starting: Row[]; leaving: Row[]; late: Late[]; late_total: number; ready_pct: number | null; offers?: Offer[] };
type Fl = { id: number; kind: string; status: string; first_name: string; last_name: string; job_title: string | null; total: number; done: number; overdue: number };
type Opt = { roles: { job_title: string; pay_type?: string; rate?: number }[]; locations: { id: number; name: string }[]; people: { id: number; name: string }[]; templates: { id: number; name: string }[] };
type H = { first_name: string; last_name: string; email: string; phone: string; job_title: string; pay_type: 'hourly' | 'salary'; pay_rate: string; first_day: string; start_time: string; buddy_emp_id: string; template_id: string; location_id: string };
const offerWord = (s: string) => ({ sent: t('Sent'), viewed: t('Opened'), signed: t('Signed'), declined: t('Declined'), cancelled: t('Cancelled'), expired: t('Expired') } as Record<string, string>)[s] || s;

export default function Onboarding() {
  const d = useLoad(() => get<D>('/api/ob7/board'));
  const fl = useLoad(() => get<{ flows: Fl[] }>('/api/flows').catch(() => ({ flows: [] as Fl[] })));
  const op = useLoad(() => get<Opt>('/api/ob7/hire/options').catch(() => null as Opt | null));
  const [tab, setTab] = useState<'starting' | 'all' | 'leaving'>('starting');
  const [h, setH] = useState<H | null>(null);
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const O: Opt = op.data || { roles: [], locations: [], people: [], templates: [] };
  const all = (fl.data?.flows || []).filter((f) => f.status === 'active');
  const nudge = (l: Late) => run('n' + l.task_id, async () => { const r = await post<{ sent: number }>(`/api/ob7/nudge/${l.task_id}`); sure(r.sent ? t('Reminder sent') : t('Nothing to send'), r.sent ? t('{p} got a reminder about "{s}".', { p: l.owner_name || l.person, s: l.title }) : t('That step is already done.'), t('OK'), () => {}); d.reload(); });
  const send = () => {
    if (!h) return;
    if (!h.first_name.trim() || !h.last_name.trim()) return setErr(t('Type their first and last name.'));
    if (!h.job_title.trim()) return setErr(t('Type the job.'));
    if (h.email.trim() && !/^\S+@\S+\.\S+$/.test(h.email.trim())) return setErr(t('That email does not look right.'));
    if (!isYmd(h.first_day)) return setErr(t('Type the first day like 2026-11-24.'));
    setErr('');
    run('hire', async () => {
      await post('/api/ob7/hire', { first_name: h.first_name.trim(), last_name: h.last_name.trim(), email: h.email.trim() || null, phone: h.phone.trim() || null, job_title: h.job_title.trim(), pay_type: h.pay_type,
        pay_rate: h.pay_rate.trim() ? Number(h.pay_rate.replace(',', '.')) : null, first_day: h.first_day, start_time: h.start_time.trim() || null, buddy_emp_id: Number(h.buddy_emp_id) || null, template_id: Number(h.template_id) || null, location_id: Number(h.location_id) || null });
      setH(null); d.reload(); fl.reload();
    });
  };
  const rowItem = (r: Row) => (
    <Item key={r.id} onPress={() => router.push(`/onboarding/${r.id}`)} left={<Dot icon="user" tone={r.late ? 'warn' : 'nv'} />} title={r.name}
      sub={[r.job_title, r.date ? date(r.date) : null, r.buddy ? t('Buddy: {b}', { b: r.buddy }) : null].filter(Boolean).join(' · ')}
      right={`${r.pct}%`} rightSub={r.late ? <Tag text={t('{n} late', { n: r.late })} tone="bad" /> : <Tag text={t('{d} of {n} done', { d: r.done, n: r.steps })} tone="good" />} />
  );
  return (
    <ToolPage title={t('Onboarding')} right="plus" rightLabel={t('New hire')} onRight={() => { setErr(''); setH({ first_name: '', last_name: '', email: '', phone: '', job_title: O.roles?.[0]?.job_title || '', pay_type: 'hourly', pay_rate: '', first_day: plusDays(7), start_time: '09:00', buddy_emp_id: '', template_id: String(O.templates?.[0]?.id || ''), location_id: String(O.locations?.[0]?.id || '') }); }}
      refreshing={d.refreshing} onRefresh={() => { d.refresh(); fl.reload(); }}>
      {x ? <Hero id="obh" label={t('Ready for day one')} value={x.ready_pct != null ? `${x.ready_pct}%` : '—'} note={x.late_total ? x.late_total === 1 ? t('1 step is late') : t('{n} steps are late', { n: x.late_total }) : t('Nothing is late')} noteGood={!x.late_total}
        stats={[[t('Starting soon'), String(x.starting.length)], [t('Leaving'), String(x.leaving.length)], [t('Offers out'), String((x.offers || []).filter((o) => ['sent', 'viewed'].includes(o.status)).length)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Btn text={t('Send a new hire offer')} icon="send" onPress={() => { setErr(''); setH({ first_name: '', last_name: '', email: '', phone: '', job_title: O.roles?.[0]?.job_title || '', pay_type: 'hourly', pay_rate: '', first_day: plusDays(7), start_time: '09:00', buddy_emp_id: '', template_id: String(O.templates?.[0]?.id || ''), location_id: String(O.locations?.[0]?.id || '') }); }} />
          {x.late.length ? (
            <Card title={t('Late steps')}>
              {x.late.map((l) => <Item key={l.task_id} left={<Dot icon="clock" tone="bad" />} title={l.title} sub={`${l.person} · ${t('due {d}', { d: date(l.due_on) })}${l.owner_name && l.owner_name !== l.person ? ' · ' + l.owner_name : ''}`} right={busy === 'n' + l.task_id ? '…' : undefined}
                rightSub={<Tag text={t('Nudge')} tone="warn" />} onPress={() => nudge(l)} />)}
            </Card>
          ) : null}
          <Chips value={tab} onChange={setTab} items={[['starting', t('Starting soon'), x.starting.length], ['all', t('Everyone in progress'), all.length], ['leaving', t('Leaving'), x.leaving.length]]} />
          <Card>
            {tab === 'starting' ? (x.starting.length ? x.starting.map(rowItem) : <None icon="user" title={t('Nobody starting soon')} sub={t('Tap + to send a new hire offer.')} />)
              : tab === 'leaving' ? (x.leaving.length ? x.leaving.map(rowItem) : <None icon="user" title={t('Nobody leaving')} />)
              : all.length ? all.map((f) => <Item key={f.id} onPress={() => router.push(`/onboarding/${f.id}`)} left={<Dot icon="user" tone={f.overdue ? 'warn' : 'dk'} />} title={`${f.first_name} ${f.last_name}`}
                  sub={[f.kind === 'offboarding' ? t('Leaving') : t('Joining'), f.job_title].filter(Boolean).join(' · ')} right={f.total ? `${Math.round((100 * f.done) / f.total)}%` : '—'} rightSub={f.overdue ? <Tag text={t('{n} late', { n: f.overdue })} tone="bad" /> : undefined} />)
              : <None icon="user" title={t('Nothing in progress')} />}
          </Card>
          {(x.offers || []).length ? (
            <Card title={t('Offers')}>
              {(x.offers || []).map((o) => <Item key={o.id} left={<Dot icon="doc" tone={o.status === 'signed' ? 'good' : 'dk'} />} title={`${o.first_name} ${o.last_name}`} sub={`${o.job_title} · ${t('starts {d}', { d: date(o.first_day) })}`}
                rightSub={<Tag text={offerWord(o.status)} tone={o.status === 'signed' ? 'good' : o.status === 'declined' ? 'bad' : 'info'} />} onPress={o.flow_id ? () => router.push(`/onboarding/${o.flow_id}`) : undefined} />)}
            </Card>
          ) : null}
        </>
      ) : null}
      <Sheet open={!!h} title={t('New hire offer')} onClose={() => setH(null)}>
        {h ? (
          <>
            <Text style={{ color: V.mute, fontSize: 13.5 }}>{t('They get an offer to sign on their phone. Once signed, their first-week checklist starts.')}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <In style={{ flex: 1 }} label={t('First name')} value={h.first_name} onChangeText={(v) => setH({ ...h, first_name: v })} />
              <In style={{ flex: 1 }} label={t('Last name')} value={h.last_name} onChangeText={(v) => setH({ ...h, last_name: v })} />
            </View>
            {err ? <Text style={{ color: '#E5484D', fontSize: 13 }}>{err}</Text> : null}
            <In label={t('Email')} value={h.email} onChangeText={(v) => setH({ ...h, email: v })} keyboardType="email-address" autoCapitalize="none" />
            <In label={t('Phone (optional)')} value={h.phone} onChangeText={(v) => setH({ ...h, phone: v })} keyboardType="phone-pad" />
            <In label={t('Job')} value={h.job_title} onChangeText={(v) => setH({ ...h, job_title: v })} />
            {O.roles?.length ? <Chips<string> value={h.job_title} onChange={(v) => { const r = O.roles.find((y) => y.job_title === v); setH({ ...h, job_title: v, pay_type: (r?.pay_type as any) || h.pay_type, pay_rate: r?.rate ? String(Math.round(r.rate * 100) / 100) : h.pay_rate }); }} items={O.roles.slice(0, 8).map((r) => [r.job_title, r.job_title] as [string, string])} /> : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Pick<'hourly' | 'salary'> label={t('Pay')} value={h.pay_type} onChange={(v) => setH({ ...h, pay_type: v })} items={[['hourly', t('Hourly')], ['salary', t('Salary')]]} /></View>
              <In style={{ flex: 1 }} label={h.pay_type === 'hourly' ? t('Per hour') : t('Per year')} value={h.pay_rate} onChangeText={(v) => setH({ ...h, pay_rate: v })} keyboardType="decimal-pad" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <In style={{ flex: 1 }} label={t('First day')} value={h.first_day} onChangeText={(v) => setH({ ...h, first_day: v })} placeholder="2026-11-24" />
              <In style={{ flex: 1 }} label={t('Start time')} value={h.start_time} onChangeText={(v) => setH({ ...h, start_time: v })} placeholder="09:00" />
            </View>
            {O.locations?.length > 1 ? <Pick<string> label={t('Location')} value={h.location_id} onChange={(v) => setH({ ...h, location_id: v })} items={O.locations.map((l) => [String(l.id), l.name] as [string, string])} /> : null}
            {O.people?.length ? <Pick<string> label={t('Buddy for the first week (optional)')} value={h.buddy_emp_id} onChange={(v) => setH({ ...h, buddy_emp_id: v === h.buddy_emp_id ? '' : v })} items={O.people.slice(0, 12).map((p) => [String(p.id), p.name] as [string, string])} /> : null}
            {O.templates?.length > 1 ? <Pick<string> label={t('Checklist')} value={h.template_id} onChange={(v) => setH({ ...h, template_id: v })} items={O.templates.map((p) => [String(p.id), p.name] as [string, string])} /> : null}
            <Btn text={t('Send offer')} icon="send" onPress={send} busy={busy === 'hire'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
