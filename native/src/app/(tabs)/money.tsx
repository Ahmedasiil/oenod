// Money: owners see sales, the last 7 days, invoices and their wallet; employees see their pay and wallet.
import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { get } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date, money } from '../../lib/format';
import { C } from '../../lib/theme';
import { t } from '../../lib/i18n';
import { Card, Divider, ErrorBox, H2, ListRow, Loading, Muted, Pill, Screen } from '../../ui/kit';
import { IconTile } from '../../ui/Summary';
import { Rise, useCountUp } from '../../ui/Motion';
import { Icon, IconName } from '../../ui/Icon';
import { openTool } from '../web';

const n = (v: unknown) => Number(v || 0);

function Bars({ series }: { series: { day: string; total: number }[] }) {
  const last = series.slice(-7);
  const max = Math.max(1, ...last.map((s) => n(s.total)));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 96 }} accessibilityLabel={t('Sales, last 7 days')}>
      {last.map((s, i) => {
        const h = Math.max(4, (n(s.total) / max) * 80);
        const today = i === last.length - 1;
        return (
          <View key={s.day} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{ width: '100%', maxWidth: 30, height: h, borderRadius: 8, backgroundColor: today ? '#AFC3FF' : 'rgba(175,195,255,0.28)' }} />
            <Text style={{ color: '#9AA5C8', fontSize: 11, fontWeight: today ? '800' : '600' }}>{new Date(s.day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' })}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Tile({ icon, label, color, go }: { icon: IconName; label: string; color: string; go: () => void }) {
  return (
    <Card onPress={go} style={{ flex: 1, minWidth: 140, gap: 10, padding: 14 }}>
      <IconTile name={icon} color={color} size={38} />
      <Text style={{ color: C.ink, fontWeight: '700', fontSize: 14.5 }} numberOfLines={1}>{label}</Text>
    </Card>
  );
}

function OwnerMoney() {
  const d = useLoad<any>(() => get('/api/dashboard'));
  const x = d.data;
  const sales = useCountUp(n(x?.sales_today));
  const growth = x?.sales_prev_week ? Math.round(((x.sales_week - x.sales_prev_week) / x.sales_prev_week) * 100) : null;
  const hero = x ? (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#9AA5C8', fontWeight: '600', fontSize: 14 }}>{t('Sales today')}</Text>
        {growth == null ? null : <Pill text={t('{p}% vs last week', { p: `${growth >= 0 ? '+' : ''}${growth}` })} kind={growth >= 0 ? 'good' : 'warn'} />}
      </View>
      <Text style={{ color: '#FFFFFF', fontSize: 44, fontWeight: '800', letterSpacing: -1.6 }}>{money(sales)}</Text>
      <Text style={{ color: '#9AA5C8', fontSize: 13 }}>{t('This week')}: {money(x.sales_week)} · {t('Orders')}: {String(x.orders_today ?? 0)}</Text>
      {Array.isArray(x.series) && x.series.length ? <Bars series={x.series} /> : null}
    </View>
  ) : undefined;
  return (
    <Screen eyebrow={t('Money').toUpperCase()} title={t('Money')} subtitle={t('Sales, invoices and your wallet')} hero={hero ?? <View style={{ height: 120, justifyContent: 'center' }}><Loading /></View>} refreshing={d.refreshing} onRefresh={d.refresh}>
      {d.error && !x ? <ErrorBox text={d.error} onRetry={d.reload} /> : null}
      {x ? (
        <Rise style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Card style={{ flex: 1, padding: 14 }}><Muted style={{ fontSize: 13 }}>{t('Unpaid invoices')}</Muted><Text style={{ color: C.ink, fontSize: 21, fontWeight: '800', marginTop: 4 }} numberOfLines={1}>{money(x.open_ar)}</Text></Card>
            <Card style={{ flex: 1, padding: 14, borderColor: x.overdue_count ? C.warnLine : C.line }}><Muted style={{ fontSize: 13 }}>{t('Overdue')}</Muted><Text style={{ color: x.overdue_count ? C.warn : C.ink, fontSize: 21, fontWeight: '800', marginTop: 4 }} numberOfLines={1}>{money(x.overdue_amount)}</Text></Card>
          </View>
          <Card onPress={() => router.push('/wallet')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconTile name="wallet" color="#17A673" />
              <View style={{ flex: 1 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 16 }}>{t('Wallet')}</Text><Muted>{t('Get paid, send payouts and move money to your bank')}</Muted></View>
              <Icon name="chevron" color={C.faint} size={18} />
            </View>
          </Card>
          {(x.top_items || []).length ? (
            <>
              <H2>{t('Best sellers this week')}</H2>
              <Card style={{ paddingVertical: 4 }}>
                {x.top_items.slice(0, 5).map((it: any, i: number) => (
                  <View key={i}>{i ? <Divider /> : null}
                    <ListRow title={it.name} sub={t('{n} sold', { n: n(it.qty) })} right={<Text style={{ color: C.ink, fontWeight: '700' }}>{money(it.total ?? it.revenue)}</Text>} />
                  </View>
                ))}
              </Card>
            </>
          ) : null}
          <H2>{t('Money tools')}</H2>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Tile icon="news" label={t('Invoices')} color="#17A673" go={() => openTool('/invoices', t('Invoices'))} />
            <Tile icon="chart" label={t('Accounting')} color="#3D5BF5" go={() => openTool('/accounting', t('Accounting'))} />
            <Tile icon="cash" label={t('Sales')} color="#D98A1C" go={() => openTool('/sales', t('Sales'))} />
            <Tile icon="briefcase" label={t('Expenses')} color="#C2417A" go={() => openTool('/expenses', t('Expenses'))} />
            <Tile icon="users" label={t('Payroll')} color="#6B5CF6" go={() => openTool('/payroll', t('Payroll'))} />
            <Tile icon="chart" label={t('Cash flow')} color="#0EA5E9" go={() => openTool('/cashflow', t('Cash flow'))} />
          </View>
        </Rise>
      ) : null}
    </Screen>
  );
}

function StaffMoney() {
  const { session } = useAuth();
  const p = useLoad<any>(() => (session?.employee ? get('/api/me/pay') : Promise.resolve(null)), [!!session?.employee]);
  const x = p.data;
  const last = x?.lines?.[0];
  const hero = (
    <View style={{ gap: 10 }}>
      <Text style={{ color: '#9AA5C8', fontWeight: '600', fontSize: 14 }}>{session?.employee ? t('Last pay') : t('Wallet')}</Text>
      <Text style={{ color: '#FFFFFF', fontSize: 42, fontWeight: '800', letterSpacing: -1.4 }}>{session?.employee ? (last ? money(n(last.net) || n(last.gross), 2) : '—') : t('Get paid')}</Text>
      <Text style={{ color: '#9AA5C8', fontSize: 13 }}>{session?.employee ? (x?.next_pay_date ? t('Next pay day: {d}', { d: date(x.next_pay_date) }) : t('Your pay stubs show here after payroll runs.')) : t('Receive payments and move money to your bank.')}</Text>
    </View>
  );
  return (
    <Screen eyebrow={t('Money').toUpperCase()} title={t('Money')} subtitle={t('Pay and wallet')} hero={hero} refreshing={p.refreshing} onRefresh={p.refresh}>
      {p.loading && session?.employee && !x ? <Loading /> : null}
      <Rise style={{ gap: 12 }}>
        {session?.employee ? (
          <Card onPress={() => router.push('/pay')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconTile name="cash" color="#3D5BF5" />
              <View style={{ flex: 1 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 16 }}>{t('My pay')}</Text><Muted>{x?.ytd ? t('Take-home this year: {m}', { m: money(x.ytd.net) }) : t('Pay stubs and direct deposit')}</Muted></View>
              <Icon name="chevron" color={C.faint} size={18} />
            </View>
          </Card>
        ) : null}
        <Card onPress={() => router.push('/wallet')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconTile name="wallet" color="#17A673" />
            <View style={{ flex: 1 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 16 }}>{t('Wallet')}</Text><Muted>{t('Get paid and transfer money to your bank')}</Muted></View>
            <Icon name="chevron" color={C.faint} size={18} />
          </View>
        </Card>
        {session?.employee ? (
          <Card onPress={() => router.push('/timesheet')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconTile name="clock" color="#6B5CF6" />
              <View style={{ flex: 1 }}><Text style={{ color: C.ink, fontWeight: '700', fontSize: 16 }}>{t('My hours')}</Text><Muted>{t('Every punch, break and total')}</Muted></View>
              <Icon name="chevron" color={C.faint} size={18} />
            </View>
          </Card>
        ) : null}
        {p.error && session?.employee ? <ErrorBox text={p.error} onRetry={p.reload} /> : null}
      </Rise>
    </Screen>
  );
}

export default function Money() {
  const { isManager } = useAuth();
  return isManager ? <OwnerMoney /> : <StaffMoney />;
}
