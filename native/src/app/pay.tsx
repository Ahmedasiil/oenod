import React from 'react';
import { ScrollView, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { BASE, get } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date, money } from '../lib/format';
import { C, S } from '../lib/theme';
import { lang, t } from '../lib/i18n';
import { B, Card, Divider, Empty, ErrorBox, H2, ListRow, Loading, Muted, Pill, Row } from '../ui/kit';
import { IconTile, Section, Summary, shortDay, tint } from '../ui/Summary';
import { Icon } from '../ui/Icon';

type Line = { id: number; period_start: string; period_end: string; pay_date: string | null; status: string; regular_h: number; overtime_h: number; tips: number; gross: number; net: number; deductions: number; deposit_status: string | null; deposit_last4: string | null };
type Pay = {
  lines: Line[]; ytd: { gross: number; net: number; deductions: number; hours: number } | null;
  bank: { bank_status: string; last4: string; kind: string; institution: string | null } | null;
  next_pay_date: string | null; frequency: string | null;
};
const n = (v: unknown) => Number(v || 0);

export default function PayScreen() {
  const d = useLoad(() => get<Pay>('/api/me/pay'));
  const x = d.data;
  const open = () => WebBrowser.openBrowserAsync(`${BASE}/?lang=${lang()}#/my-pay`);
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }}>
      {d.loading && !x ? <Loading /> : d.error && !x ? <ErrorBox text={d.error} onRetry={d.reload} /> : (
        <>
          <Summary seed={13} label={t('Last pay')} value={x?.lines[0] ? money(n(x.lines[0].net) || n(x.lines[0].gross), 2) : '—'}
            badge={x?.lines[0]?.pay_date ? <Pill text={date(x.lines[0].pay_date)} kind="info" /> : undefined}
            minis={[[t('Next pay day'), shortDay(x?.next_pay_date)], [t('Take-home pay'), x?.ytd ? money(x.ytd.net) : '—'], [t('Hours paid'), x?.ytd ? String(Math.round(n(x.ytd.hours) * 10) / 10) : '—']]}
            foot={x?.frequency ? t(x.frequency === 'weekly' ? 'Weekly' : x.frequency === 'biweekly' ? 'Every two weeks' : x.frequency === 'semimonthly' ? 'Twice a month' : 'Monthly') : undefined} />
          {x?.ytd ? (
            <Card style={{ gap: 4 }}>
              <H2>{t('This year')}</H2>
              <ListRow title={t('Gross pay')} right={<B>{money(x.ytd.gross, 2)}</B>} />
              <ListRow title={t('Taxes and deductions')} right={<B>{money(x.ytd.deductions, 2)}</B>} />
              <ListRow title={t('Take-home pay')} right={<B>{money(x.ytd.net, 2)}</B>} />
              <ListRow title={t('Hours paid')} right={<B>{String(Math.round(n(x.ytd.hours) * 10) / 10)}</B>} />
            </Card>
          ) : null}

          <Card onPress={open}>
            <Row>
              <IconTile name="cash" color={tint(0)} />
              <View style={{ flex: 1 }}>
                <B>{t('Direct deposit')}</B>
                <Muted>{x?.bank ? `${x.bank.institution ? x.bank.institution + ' · ' : ''}•••• ${x.bank.last4}` : t('No bank account yet. Add one so you get paid by deposit.')}</Muted>
              </View>
              {x?.bank ? <Pill text={t(x.bank.bank_status === 'approved' ? 'Approved' : 'Waiting for approval')} kind={x.bank.bank_status === 'approved' ? 'good' : 'warn'} /> : <Icon name="chevron" color={C.faint} size={18} />}
            </Row>
          </Card>

          {x?.lines.length ? x.lines.map((l) => (
            <Card key={l.id} style={{ gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <B style={{ flex: 1 }}>{date(l.period_start)} – {date(l.period_end)}</B>
                <Pill text={t(l.status === 'paid' ? 'Paid' : 'Approved')} kind={l.status === 'paid' ? 'good' : 'info'} />
              </Row>
              {l.pay_date ? <Muted>{t('Pay date: {d}', { d: date(l.pay_date) })}{l.deposit_last4 ? ` · •••• ${l.deposit_last4}` : ''}</Muted> : null}
              <Divider />
              <ListRow title={t('Hours')} sub={n(l.overtime_h) ? t('{o} h overtime', { o: n(l.overtime_h) }) : undefined} right={<B>{String(n(l.regular_h) + n(l.overtime_h))}</B>} />
              {n(l.tips) ? <ListRow title={t('Tips')} right={<B>{money(n(l.tips), 2)}</B>} /> : null}
              <ListRow title={t('Gross pay')} right={<B>{money(n(l.gross), 2)}</B>} />
              {n(l.deductions) ? <ListRow title={t('Taxes and deductions')} right={<B>−{money(n(l.deductions), 2)}</B>} /> : null}
              <Divider />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 }}>
                <B>{t('Take-home pay')}</B><B style={{ fontSize: 18 }}>{money(n(l.net) || n(l.gross) - n(l.deductions), 2)}</B>
              </View>
            </Card>
          )) : <Card><Empty icon="cash" title={t('No pay stubs yet')} sub={t('After your employer runs payroll in OENOD, your pay stubs show up here.')} /></Card>}
          <Card onPress={open}><Row><IconTile name="globe" color={tint(1)} /><B style={{ flex: 1 }}>{t('Full pay stubs and tax slips on the website')}</B><Icon name="chevron" color={C.faint} size={18} /></Row></Card>
        </>
      )}
    </ScrollView>
  );
}
