// Run payroll (Midnight v6, approved 11-16): the payroll card, who's getting paid, the amount, where it's paid
// from, and one button. The final pay step (checks, CRA, bank) runs in the full Payroll tool inside the app.
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { get } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date, money } from '../lib/format';
import { t } from '../lib/i18n';
import { openTool } from './web';
import { Icon } from '../ui/Icon';
import { FH, NavyFill, Sec, SubTop, TeamStrip, V } from '../ui/M6';
import { Pressy } from '../ui/Motion';
import { PoweredBy } from '../ui/Brand';

type Run = { id: number; period_start: string; period_end: string; pay_date: string | null; people: number; hours?: number; gross: number; net: number; status: string };
type Emp = { id: number; name: string; color: string | null; status: string };
const soft = <T,>(p: Promise<T>) => p.catch(() => null);
const full = () => openTool('/payroll', t('Payroll'));

export default function RunPayroll() {
  const insets = useSafeAreaInsets();
  const runs = useLoad(() => soft(get<{ runs: Run[] }>('/api/payroll')));
  const emps = useLoad(() => soft(get<{ employees: Emp[] }>('/api/employees')));
  const wal = useLoad(() => soft(get<any>('/api/wallet')));
  const home = useLoad(() => soft(get<any>('/api/dsh1/home?dept=home')));
  const [, setSel] = useState(0);
  const list = runs.data?.runs || [];
  const open = list.find((r) => !['paid', 'completed', 'sent', 'void', 'cancelled'].includes(String(r.status)));
  const last = list[0];
  const ev = home.data?.forecast?.events?.find((e: any) => e.type === 'payroll');
  const amount = open ? Number(open.gross || 0) : ev ? Number(ev.amount || 0) : last ? Number(last.gross || 0) : 0;
  const people = (emps.data?.employees || []).filter((e) => e.status !== 'terminated');
  const period = open ? `${date(open.period_start)} – ${date(open.period_end)}` : last ? t('Last run {d}', { d: date(last.pay_date || last.period_end) }) : t('No pay runs yet');
  const bal = wal.data?.balance;
  return (
    <View style={{ flex: 1, backgroundColor: V.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <SubTop title={t('Run payroll')} right="plus" rightLabel={t('Add a one-time bonus')} onRight={full} />
        <View style={{ borderRadius: V.rL, padding: 20, paddingHorizontal: 22, overflow: 'hidden', backgroundColor: '#2238D8', transform: [{ rotate: '-2deg' }], marginHorizontal: 4, marginTop: 4 }}>
          <NavyFill id="bal" />
          <Text style={{ color: '#FFFFFF', opacity: 0.85, fontSize: 13.5 }}>{bal ? t('Payroll account balance') : t('This pay run')}</Text>
          <Text style={[FH, { color: '#FFFFFF', fontSize: 32, marginTop: 8 }]} numberOfLines={1} adjustsFontSizeToFit>{bal ? money(bal.available, 2) : money(amount, 2)}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={{ color: '#FFFFFF', opacity: 0.85, fontSize: 12.5 }}>{period}</Text>
            <Text style={{ color: '#FFFFFF', opacity: 0.85, fontSize: 12.5 }}>{open ? t('{n} people', { n: open.people }) : ''}</Text>
          </View>
        </View>
        {people.length ? (
          <>
            <Sec title={t("Who's getting paid")} right={t('{n} people', { n: open?.people || people.length })} onRight={full} />
            <TeamStrip people={people.slice(0, 12).map((e) => ({ id: e.id, name: e.name, color: e.color }))} onOpen={(p) => router.push(`/employee/${p.id}`)} />
          </>
        ) : null}
        <View style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 26, borderRadius: 99, backgroundColor: V.surf2, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[FH, { color: V.ink, fontSize: 34 }]} numberOfLines={1} adjustsFontSizeToFit>{amount ? money(amount, 2) : '—'}</Text>
        </View>
        <Text style={{ textAlign: 'center', color: V.mute, fontSize: 13, marginTop: -6 }}>{open ? t('Gross pay · {h} hours', { h: Math.round(Number(open.hours || 0) * 10) / 10 }) : ev ? t('Estimate from your last 3 pay runs') : t('Start a pay run in Payroll')}</Text>
        <Pressy onPress={full} accessibilityRole="button" style={{ borderRadius: V.rM, backgroundColor: V.ice, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: V.navy, opacity: 0.7, fontSize: 12 }}>{t('Pay from')}</Text>
            <Text style={[FH, { color: V.navy, fontSize: 19 }]}>{bal ? t('OENOD wallet') : t('Your business bank')}</Text>
          </View>
          <Icon name="chevron" size={18} color={V.navy} duo={false} />
        </Pressy>
        <Pressy onPress={full} accessibilityRole="button" style={{ height: 54, borderRadius: 99, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[FH, { color: V.navy, fontSize: 16 }]}>{open ? t('Review and pay team') : t('Start pay run')}</Text>
        </Pressy>
        <Text style={{ textAlign: 'center', color: V.faint, fontSize: 12, lineHeight: 17 }}>{t('You check every pay and confirm on the next screen before money moves.')}</Text>
        <PoweredBy />
      </ScrollView>
    </View>
  );
}
