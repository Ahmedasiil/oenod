// Reports, built into the app (owners and admins): revenue, profit, labour, tax and tips for a period, by location and by category.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { get } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { money } from '../lib/format';
import { t } from '../lib/i18n';
import { V } from '../ui/M6';
import { Card, Chips, Hero, Item, None, State, ToolPage, plusDays, ymd } from '../ui/T1';

type R = { from: string; to: string; orders: number; pos_net: number; invoiced: number; revenue: number; tax_collected: number; tips: number; cogs: number; labor_hourly: number; labor_salary: number;
  labor_hours: number; gross_profit: number; prime_cost_pct: number | null; operating_profit: number; by_location: { location: string; orders: number; total: number }[]; by_category: { category: string; revenue: number; qty: number }[] };
type P = '7' | '30' | '90';

function Bar({ label, value, max, sub }: { label: string; value: number; max: number; sub: string }) {
  const w = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <View style={{ paddingVertical: 10, gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' }}>{money(value)}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)' }}><View style={{ width: `${w}%`, height: 8, borderRadius: 4, backgroundColor: '#4A63FF' }} /></View>
      <Text style={{ color: V.mute, fontSize: 12 }}>{sub}</Text>
    </View>
  );
}

export default function Reports() {
  const [p, setP] = useState<P>('30');
  const d = useLoad(() => get<R>(`/api/reports?from=${plusDays(-(Number(p) - 1))}&to=${ymd()}`), [p]);
  const x = d.data;
  const labor = x ? x.labor_hourly + x.labor_salary : 0;
  const maxLoc = x ? Math.max(0, ...x.by_location.map((l) => Number(l.total))) : 0;
  const maxCat = x ? Math.max(0, ...x.by_category.map((c) => Number(c.revenue))) : 0;
  return (
    <ToolPage title={t('Reports')} refreshing={d.refreshing} onRefresh={d.refresh}>
      <Chips<P> value={p} onChange={setP} items={[['7', t('7 days')], ['30', t('30 days')], ['90', t('90 days')]]} />
      {x ? <Hero id="rph" label={t('Money in')} value={money(x.revenue)} note={t('Profit after costs and pay: {m}', { m: money(x.operating_profit) })} noteGood={x.operating_profit >= 0}
        stats={[[t('Gross profit'), money(x.gross_profit)], [t('Team pay'), money(labor)], [t('Orders'), String(x.orders)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Card title={t('Where the money went')}>
            <Item title={t('Register sales')} right={money(x.pos_net, 2)} />
            <Item title={t('Invoices')} right={money(x.invoiced, 2)} />
            <Item title={t('Cost of goods')} right={'−' + money(x.cogs, 2)} />
            <Item title={t('Hourly pay ({h} h)', { h: x.labor_hours })} right={'−' + money(x.labor_hourly, 2)} />
            <Item title={t('Salaries')} right={'−' + money(x.labor_salary, 2)} />
            <Item title={t('Profit')} right={money(x.operating_profit, 2)} />
          </Card>
          <Card title={t('Good to know')}>
            <Item title={t('Goods + pay, as % of sales')} sub={t('Under 60% is healthy for most shops')} right={x.prime_cost_pct != null ? `${x.prime_cost_pct}%` : '—'} />
            <Item title={t('Tax collected')} sub={t('Set aside for the government')} right={money(x.tax_collected, 2)} />
            <Item title={t('Tips')} right={money(x.tips, 2)} />
          </Card>
          <Card title={t('By location')}>
            {x.by_location.length ? x.by_location.map((l) => <Bar key={l.location} label={l.location} value={Number(l.total)} max={maxLoc} sub={t('{n} orders', { n: l.orders })} />) : <None icon="pin" title={t('No sales in this time')} />}
          </Card>
          <Card title={t('Best sellers by category')}>
            {x.by_category.length ? x.by_category.slice(0, 12).map((c) => <Bar key={c.category} label={c.category} value={Number(c.revenue)} max={maxCat} sub={t('{n} sold', { n: Math.round(Number(c.qty)) })} />) : <None icon="chart" title={t('No sales in this time')} />}
          </Card>
        </>
      ) : null}
    </ToolPage>
  );
}
