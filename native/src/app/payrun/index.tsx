// Full Payroll, built into the app (owners and admins): what is ready for the next pay run, start it, the year so far, and every past run.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date, money } from '../../lib/format';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Sheet, State, Tag, ToolPage, isYmd, useBusy } from '../../ui/T1';

export type Run = { id: number; period_start: string; period_end: string; pay_date: string | null; status: string; gross: number; net: number; deductions?: number; employer_taxes?: number; approved_by_name?: string | null; deposited_at?: string | null };
export type Ready = { unapproved: number; open_punches: number; no_bank: { id: number; name: string }[]; bank_review: number; pending_time_off: number; scheduled_h: number; worked_h: number };
type L = { runs: Run[]; next_from: string; next_to: string; next_pay_date?: string; ready?: Ready; ytd?: { gross: number; net: number; deductions: number; employer_taxes: number; runs: number }; trend?: { period_end: string; gross: number }[] };
export const runWord = (s: string) => (s === 'draft' ? t('Draft') : s === 'approved' ? t('Approved') : s === 'paid' ? t('Paid') : t(s));
export const runTone = (s: string) => (s === 'paid' ? 'good' : s === 'approved' ? 'info' : 'warn') as 'good' | 'info' | 'warn';

export default function Payroll() {
  const d = useLoad(() => get<L>('/api/payroll'));
  const [tab, setTab] = useState<'next' | 'past'>('next');
  const [nw, setNw] = useState<{ from: string; to: string; pay: string } | null>(null);
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const draft = x?.runs.find((r) => r.status === 'draft');
  const r = x?.ready;
  const issues = r ? [
    r.unapproved ? { k: 'time', n: r.unapproved, title: t('{n} time cards not approved', { n: r.unapproved }), go: '/timeclock', tone: 'warn' as const } : null,
    r.open_punches ? { k: 'open', n: r.open_punches, title: t('{n} people still clocked in', { n: r.open_punches }), go: '/timeclock', tone: 'warn' as const } : null,
    r.no_bank.length ? { k: 'bank', n: r.no_bank.length, title: t('{n} without a bank account', { n: r.no_bank.length }), sub: r.no_bank.map((y) => y.name).join(', '), go: '/team', tone: 'bad' as const } : null,
    r.pending_time_off ? { k: 'off', n: r.pending_time_off, title: t('{n} time off requests waiting', { n: r.pending_time_off }), go: '/timeoff', tone: 'warn' as const } : null,
  ].filter(Boolean) as { k: string; n: number; title: string; sub?: string; go: string; tone: 'warn' | 'bad' }[] : [];
  const start = () => {
    if (!nw) return;
    if (!isYmd(nw.from) || !isYmd(nw.to)) return setErr(t('Type the dates like 2026-12-01.'));
    if (nw.pay && !isYmd(nw.pay)) return setErr(t('Type the pay day like 2026-12-05.'));
    setErr('');
    run('new', async () => { const res = await post<{ id: number }>('/api/payroll', { period_start: nw.from, period_end: nw.to, pay_date: nw.pay || null }); setNw(null); d.reload(); router.push(`/payrun/${res.id}` as any); });
  };
  const maxG = Math.max(1, ...(x?.trend || []).map((y) => Number(y.gross)));
  return (
    <ToolPage title={t('Payroll')} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x ? <Hero id="prh" label={t('Paid this year')} value={money(x.ytd?.gross || 0)} note={t('{n} pay runs · take-home {m}', { n: x.ytd?.runs || 0, m: money(x.ytd?.net || 0) })} noteGood
        stats={[[t('Next period'), `${date(x.next_from)} – ${date(x.next_to)}`], [t('Taxes held'), money(x.ytd?.deductions || 0)], [t('Your share'), money(x.ytd?.employer_taxes || 0)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          {draft ? <Btn text={t('Finish the draft pay run')} icon="cash" kind="blue" onPress={() => router.push(`/payrun/${draft.id}` as any)} />
            : <Btn text={t('Start pay run')} icon="cash" kind="blue" onPress={() => { setErr(''); setNw({ from: x.next_from, to: x.next_to, pay: x.next_pay_date || '' }); }} />}
          <Chips value={tab} onChange={setTab} items={[['next', t('Before you pay'), issues.length], ['past', t('Past pay runs'), x.runs.length]]} />
          {tab === 'next' ? (
            <>
              <Card title={t('Ready to pay?')}>
                {issues.length ? issues.map((i) => <Item key={i.k} onPress={() => router.push(i.go as any)} left={<Dot icon={i.k === 'bank' ? 'wallet' : i.k === 'off' ? 'calendar' : 'clock'} tone={i.tone} />} title={i.title} sub={i.sub} rightSub={<Tag text={t('Fix')} tone={i.tone} />} />)
                  : <None icon="check" title={t('Everything is ready')} sub={t('Time cards are approved and everyone has a bank account.')} />}
                {r ? <Item title={t('Hours worked vs scheduled')} right={`${r.worked_h} / ${r.scheduled_h}`} /> : null}
              </Card>
              {x.trend?.length ? (
                <Card title={t('Last pay runs')}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 90, paddingVertical: 8 }}>
                    {x.trend.map((y, i) => <View key={i} style={{ flex: 1, height: `${Math.max(4, (Number(y.gross) / maxG) * 100)}%`, backgroundColor: i === x.trend!.length - 1 ? '#1A2FCF' : V.surf2, borderRadius: 4 }} />)}
                  </View>
                  <Text style={{ color: V.mute, fontSize: 12, paddingBottom: 8 }}>{t('Gross pay per run, oldest to newest')}</Text>
                </Card>
              ) : null}
            </>
          ) : (
            <Card>
              {x.runs.length ? x.runs.map((y) => <Item key={y.id} onPress={() => router.push(`/payrun/${y.id}` as any)} left={<Dot icon="cash" tone={y.status === 'paid' ? 'good' : 'nv'} />} title={`${date(y.period_start)} – ${date(y.period_end)}`}
                sub={y.pay_date ? t('Pay day {d}', { d: date(y.pay_date) }) : undefined} right={money(y.gross, 2)} rightSub={<Tag text={runWord(y.status)} tone={runTone(y.status)} />} />) : <None icon="cash" title={t('No pay runs yet')} sub={t('Tap Start pay run.')} />}
            </Card>
          )}
        </>
      ) : null}
      <Sheet open={!!nw} title={t('Start pay run')} onClose={() => setNw(null)}>
        {nw ? (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <In style={{ flex: 1 }} label={t('From')} value={nw.from} onChangeText={(v) => setNw({ ...nw, from: v })} error={err || undefined} />
              <In style={{ flex: 1 }} label={t('To')} value={nw.to} onChangeText={(v) => setNw({ ...nw, to: v })} />
            </View>
            <In label={t('Pay day')} value={nw.pay} onChangeText={(v) => setNw({ ...nw, pay: v })} placeholder="2026-12-05" />
            <Text style={{ color: V.mute, fontSize: 13 }}>{t('OENOD adds up approved hours, tips and taxes. You check every pay before anything is final.')}</Text>
            <Btn text={t('Add up the pay')} icon="check" onPress={start} busy={busy === 'new'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
