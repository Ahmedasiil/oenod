// Money: owners see sales, the last 7 days, invoices and their wallet; employees see their pay and wallet.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Rect, Stop } from 'react-native-svg';
import { Logo } from '../../ui/Logo';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { get } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date, money } from '../../lib/format';
import { C } from '../../lib/theme';
import { t } from '../../lib/i18n';
import { Card, Divider, ErrorBox, H2, ListRow, Loading, Muted, Pill, Row, Screen } from '../../ui/kit';
import { IconTile } from '../../ui/Summary';
import { Rise, useCountUp } from '../../ui/Motion';
import { Icon, IconName } from '../../ui/Icon';
import { openTool } from '../web';

const n = (v: unknown) => Number(v || 0);

/** The navy wallet card: balance from the wallet, with Send, Get paid and Card. */
function WalletCard({ base }: { base: '/api/wallet' | '/api/me/wallet' }) {
  const w = useLoad<any>(() => get(base), [base]);
  const [sz, setSz] = useState({ w: 340, h: 190 });
  const bal = w.data?.balance;
  const cur = w.data?.wallet?.currency || 'CAD';
  const status = w.data?.wallet?.status;
  const val = bal ? money(n(bal.available), 2) : status && status !== 'active' ? t('Set up') : w.loading ? '…' : '—';
  const act = (icon: IconName, label: string) => (
    <Pressable key={label} onPress={() => router.push('/wallet')} accessibilityRole="button"
      style={({ pressed }) => ({ flex: 1, height: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: pressed ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)' })}>
      <Icon name={icon} size={16} color="#FFFFFF" duo={false} /><Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
  return (
    <Pressable onPress={() => router.push('/wallet')} accessibilityRole="button" accessibilityLabel={t('Wallet')}
      onLayout={(e) => setSz({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{ borderRadius: 22, padding: 18, overflow: 'hidden', backgroundColor: '#000C58' }}>
      <Svg width={sz.w} height={sz.h} style={{ position: 'absolute' }}>
        <Defs><SvgGrad id="wal" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#000C58" /><Stop offset="0.6" stopColor="#1B2A8F" /><Stop offset="1" stopColor="#3D5BF5" /></SvgGrad></Defs>
        <Rect width={sz.w} height={sz.h} fill="url(#wal)" />
        <Circle cx={sz.w + 50 - 100} cy={40} r={100} stroke="rgba(255,255,255,0.14)" fill="none" />
        <Circle cx={sz.w + 50 - 100} cy={40} r={130} stroke="rgba(255,255,255,0.05)" strokeWidth={30} fill="none" />
      </Svg>
      <Row style={{ gap: 8 }}>
        <Logo width={44} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>{t('Wallet')}</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: '#9AA5C8', fontSize: 12 }}>{cur}</Text>
      </Row>
      <Text style={{ color: '#9AA5C8', fontSize: 12.5, marginTop: 18 }}>{t('Available balance')}</Text>
      <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '800', letterSpacing: -1, marginTop: 4 }} numberOfLines={1}>{val}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {act('send', t('Send'))}{act('arrow', t('Get paid'))}{act('cash', t('Card'))}
      </View>
    </Pressable>
  );
}

const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);
function Bars({ series }: { series: { day: string; total: number }[] }) {
  const max = Math.max(1, ...series.map((s) => n(s.total)));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120, marginTop: 6 }} accessibilityLabel={t('Sales by day')}>
      {series.map((s, i) => {
        const h = Math.max(4, (n(s.total) / max) * 96);
        const hi = i === series.length - 1;
        return (
          <View key={s.day} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            <View style={{ width: '100%', height: h, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: hi ? '#3D5BF5' : (C.dark ? 'rgba(175,195,255,0.22)' : '#DCE3FF') }} />
            <Text style={{ color: C.faint, fontSize: 10.5, fontWeight: '600' }}>{new Date(s.day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' })}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Seg({ v, set, opts }: { v: string; set: (x: string) => void; opts: [string, string][] }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.dark ? C.card2 : '#F5F7FB', borderRadius: 10, padding: 3, gap: 2 }}>
      {opts.map(([k, l]) => (
        <Pressable key={k} onPress={() => set(k)} accessibilityRole="tab" accessibilityState={{ selected: v === k }}
          style={{ height: 26, paddingHorizontal: 10, borderRadius: 8, justifyContent: 'center', backgroundColor: v === k ? C.card : 'transparent' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: v === k ? C.ink : C.faint }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function CardHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <Text style={{ flex: 1, color: C.ink, fontSize: 15, fontWeight: '700' }} accessibilityRole="header">{title}</Text>
      {right}
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
  const { session } = useAuth();
  const admin = ['owner', 'admin'].includes(session?.user?.role || '');
  const d = useLoad<any>(() => get('/api/dashboard'));
  const inv = useLoad<any>(() => get('/api/invoices').catch(() => null));
  const [span, setSpan] = useState('7');
  const x = d.data;
  const series: { day: string; total: number }[] = x?.series || [];
  const cur = span === '7' ? series.slice(-7) : series;
  const prev = span === '7' ? series.slice(-14, -7) : [];
  const sum = (a: any[]) => a.reduce((t, s) => t + n(s.total), 0);
  const growth = span === '7' && prev.length ? pct(sum(cur), sum(prev)) : null;
  const invoices: any[] = (inv.data?.invoices || []).slice(0, 3);
  const hero = (
    <View style={{ marginTop: -4 }}>
      {admin ? <WalletCard base="/api/wallet" /> : <WalletCard base="/api/me/wallet" />}
    </View>
  );
  const AVC = ['#0E8FB0', '#D98A1C', '#C2417A', '#17A673'];
  return (
    <Screen eyebrow={session?.company?.name || t('Money')} title={t('Money')} hero={hero} refreshing={d.refreshing} onRefresh={() => { d.refresh(); inv.refresh(); }}>
      {d.error && !x ? <ErrorBox text={d.error} onRetry={d.reload} /> : null}
      <Rise>
        <Card>
          <CardHead title={span === '7' ? t('Sales this week') : t('Sales, last 14 days')} right={<Seg v={span} set={setSpan} opts={[['7', t('Week')], ['14', t('2 weeks')]]} />} />
          {x ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={{ color: C.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, flex: 1 }}>{money(sum(cur))}</Text>
                {growth == null ? null : <Text style={{ color: growth >= 0 ? C.good : C.warn, fontWeight: '600', fontSize: 13, marginBottom: 4 }}>{`${growth >= 0 ? '+' : ''}${growth}%`}</Text>}
              </View>
              <Bars series={cur} />
            </>
          ) : <Loading />}
        </Card>
      </Rise>
      {x ? (
        <Rise delay={80}>
          <Card>
            <CardHead title={t('Unpaid invoices')} right={x.overdue_count ? <Pill text={t('{n} overdue', { n: x.overdue_count })} kind="warn" /> : <Pill text={t('All on time')} kind="good" />} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.ink, fontSize: 20, fontWeight: '800' }}>{money(x.open_ar)}</Text>
                <Text style={{ color: C.faint, fontSize: 12.5 }}>{x.overdue_count ? t('{m} is past due', { m: money(x.overdue_amount) }) : t('Nothing past due')}</Text>
              </View>
              <Pressable onPress={() => openTool('/invoices', t('Invoices'))} accessibilityRole="button"
                style={{ height: 38, paddingHorizontal: 16, borderRadius: 14, justifyContent: 'center', backgroundColor: C.dark ? '#FFFFFF' : '#0A1230' }}>
                <Text style={{ color: C.dark ? '#0A1230' : '#FFFFFF', fontWeight: '600', fontSize: 13 }}>{t('Review')}</Text>
              </Pressable>
            </View>
          </Card>
        </Rise>
      ) : null}
      {invoices.length ? (
        <Rise delay={120}>
          <Card style={{ paddingBottom: 8 }}>
            <CardHead title={t('Invoices')} right={<Pressable onPress={() => openTool('/invoices', t('Invoices'))} hitSlop={8}><Text style={{ color: C.blue, fontWeight: '600', fontSize: 13 }}>{t('See all')}</Text></Pressable>} />
            {invoices.map((v, i) => {
              const paid = v.status === 'paid';
              const name = v.customer || v.customer_name || t('Customer');
              return (
                <View key={v.id ?? i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: C.line }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: AVC[i % AVC.length] }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 }}>{String(name).split(/\s+/).map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: C.ink, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{name}</Text>
                    <Text style={{ color: C.faint, fontSize: 12.5 }} numberOfLines={1}>{[v.number ? `#${v.number}` : null, v.due_date ? t('due {d}', { d: date(v.due_date) }) : null].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <Text style={{ color: C.ink, fontWeight: '700', fontSize: 14 }}>{money(n(v.total))}</Text>
                    <Pill text={paid ? t('Paid') : v.overdue ? t('Overdue') : v.status === 'draft' ? t('Draft') : t('Due')} kind={paid ? 'good' : v.overdue ? 'bad' : 'warn'} />
                  </View>
                </View>
              );
            })}
          </Card>
        </Rise>
      ) : null}
      {x && (x.top_items || []).length ? (
        <Rise delay={160}>
          <Card style={{ paddingBottom: 6 }}>
            <CardHead title={t('Best sellers this week')} />
            {x.top_items.slice(0, 5).map((it: any, i: number) => (
              <View key={i}>{i ? <Divider /> : null}
                <ListRow title={it.name} sub={t('{n} sold', { n: n(it.qty) })} right={<Text style={{ color: C.ink, fontWeight: '700' }}>{money(it.total ?? it.revenue)}</Text>} />
              </View>
            ))}
          </Card>
        </Rise>
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
    </Screen>
  );
}

function StaffMoney() {
  const { session } = useAuth();
  const p = useLoad<any>(() => (session?.employee ? get('/api/me/pay') : Promise.resolve(null)), [!!session?.employee]);
  const x = p.data;
  const last = x?.lines?.[0];
  const hero = <View style={{ marginTop: -4 }}><WalletCard base="/api/me/wallet" /></View>;
  return (
    <Screen eyebrow={session?.company?.name || t('Pay and wallet')} title={t('Money')} hero={hero} refreshing={p.refreshing} onRefresh={p.refresh}>
      {p.loading && session?.employee && !x ? <Loading /> : null}
      <Rise style={{ gap: 12 }}>
        {session?.employee && last ? (
          <Card>
            <CardHead title={t('Last pay')} right={x?.next_pay_date ? <Pill text={t('Next: {d}', { d: date(x.next_pay_date) })} kind="info" /> : undefined} />
            <Text style={{ color: C.ink, fontSize: 24, fontWeight: '800' }}>{money(n(last.net) || n(last.gross), 2)}</Text>
          </Card>
        ) : null}
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
