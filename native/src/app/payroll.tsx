// Run payroll (Midnight v6, approved 11-16): the payroll card, who's getting paid, the amount, where it's paid
// from, and one button. The final pay step (checks, CRA, bank) runs in the full Payroll tool inside the app.
import React from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { get } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date, money } from '../lib/format';
import { t } from '../lib/i18n';
import { Av, V } from '../ui/M6';
import { ToolPage } from '../ui/T1';
import { ActCard, LCard, LRow, NowCard } from '../ui/H';

type Run = { id: number; period_start: string; period_end: string; pay_date: string | null; people: number; hours?: number; gross: number; net: number; status: string };
type Emp = { id: number; name: string; color: string | null; status: string };
const soft = <T,>(p: Promise<T>) => p.catch(() => null);
const full = () => router.push('/payrun' as any);

export default function RunPayroll() {
  const runs = useLoad(() => soft(get<{ runs: Run[] }>('/api/payroll')));
  const emps = useLoad(() => soft(get<{ employees: Emp[] }>('/api/employees')));
  const wal = useLoad(() => soft(get<any>('/api/wallet')));
  const home = useLoad(() => soft(get<any>('/api/dsh1/home?dept=home')));
  const list = runs.data?.runs || [];
  const open = list.find((r) => !['paid', 'completed', 'sent', 'void', 'cancelled'].includes(String(r.status)));
  const last = list[0];
  const ev = home.data?.forecast?.events?.find((e: any) => e.type === 'payroll');
  const amount = open ? Number(open.gross || 0) : ev ? Number(ev.amount || 0) : last ? Number(last.gross || 0) : 0;
  const people = (emps.data?.employees || []).filter((e) => e.status !== 'terminated');
  const period = open ? `${date(open.period_start)} – ${date(open.period_end)}` : last ? t('Last run {d}', { d: date(last.pay_date || last.period_end) }) : t('No pay runs yet');
  const bal = wal.data?.balance;
  const ini = (n: string) => (n || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const count = open?.people || people.length;
  // 4.1 Meet look: navy band, black "next payday" card, quick actions, then who gets paid.
  return (
    <ToolPage title={t('Payroll')} sub={t('Every two weeks · CPP, EI and taxes done for you')} right="plus" rightLabel={t('Add a one-time bonus')} onRight={full}
      refreshing={runs.refreshing} onRefresh={() => { runs.refresh(); emps.refresh(); wal.refresh(); home.refresh(); }}>
      <NowCard id="prn" chip={open ? t('This pay run') : t('Next payday')} right={open?.pay_date ? date(open.pay_date) : ev?.day ? date(ev.day) : undefined}
        title={amount ? money(amount, 2) : '—'}
        sub={[count ? t('{n} people', { n: count }) : '', open?.hours ? t('{h} hours', { h: Math.round(Number(open.hours) * 10) / 10 }) : '', period].filter(Boolean).join(' · ')}
        faces={people.slice(0, 4).map((e) => ini(e.name))} more={Math.max(0, people.length - 4) || undefined}
        btns={[{ text: t('Review'), go: full }, { text: open ? t('Pay team') : t('Run'), main: true, go: full }]} />
      <ActCard items={[
        { icon: 'play', title: t('Run payroll'), sub: open ? period : t('Start a pay run'), go: full },
        { icon: 'file-text', title: t('Pay stubs'), sub: t('Sent to everyone'), go: full },
        { icon: 'receipt', title: t('Tax forms'), sub: t('T4, ROE, remittance'), go: full },
        { icon: 'gear-six', title: t('Settings'), sub: t('Pay dates, deposits'), go: full },
      ]} />
      <LCard>
        <LRow icon="bank" title={bal ? t('OENOD wallet') : t('Your business bank')} sub={bal ? t('Balance {m}', { m: money(bal.available, 2) }) : t('Pay from')} onPress={full} />
        {people.slice(0, 6).map((e) => <LRow key={e.id} left={<Av name={e.name} size={42} color={e.color} />} title={e.name} sub={t('Getting paid')} onPress={() => router.push(`/employee/${e.id}`)} />)}
      </LCard>
      <Text style={{ textAlign: 'center', color: V.faint, fontSize: 12, lineHeight: 17 }}>{t('You check every pay and confirm on the next screen before money moves.')}</Text>
    </ToolPage>
  );
}
