// One sale: the receipt (lines, tax, tip, how they paid), share it, and refund it.
import React, { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { money, time, day } from '../../lib/format';
import { t } from '../../lib/i18n';
import { FH, V } from '../../ui/M6';
import { Btn, Card, Hero, In, Item, Sheet, State, Tag, ToolPage, useBusy } from '../../ui/T1';
import { payWord, type Sale } from './index';

type Full = Sale & { lines: { name: string; qty: number; unit_price: number; line_total: number }[]; company: { name: string; address: string | null; phone: string | null } };

export default function SaleView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => get<Full>(`/api/sales/${Number(id)}`), [id]);
  const [ref, setRef] = useState(false);
  const [why, setWhy] = useState('');
  const { busy, run } = useBusy();
  const s = d.data;
  const receipt = () => s && Share.share({ message: [`${s.company.name} · ${t('Receipt')} #${s.number}`, `${day(s.created_at)} ${time(s.created_at)}`, '',
    ...s.lines.map((l) => `${Number(l.qty)} × ${l.name}  ${money(l.line_total, 2)}`), '', `${t('Tax')}: ${money(s.tax, 2)}`, Number(s.tip) ? `${t('Tip')}: ${money(s.tip, 2)}` : '', `${t('Total')}: ${money(s.total, 2)} (${payWord(s.payment_method)})`].filter((x) => x !== '').join('\n') }).catch(() => {});
  const refund = () => run('refund', async () => { await post(`/api/sales/${s!.id}/refund`, { reason: why.trim() || null }); setRef(false); d.reload(); });
  return (
    <ToolPage title={s ? `#${s.number}` : t('Sale')} right="send" rightLabel={t('Share receipt')} onRight={receipt} refreshing={d.refreshing} onRefresh={d.refresh}>
      <State loading={d.loading && !s} error={!s ? d.error : null} onRetry={d.reload} />
      {s ? (
        <>
          <Hero id="sld" label={s.customer || t('Walk-in customer')} value={money(s.total, 2)} note={`${day(s.created_at)} · ${time(s.created_at)}`} noteGood={s.status !== 'refunded'}
            stats={[[t('Paid by'), payWord(s.payment_method)], [t('Cashier'), (s.cashier || '—').split(' ')[0]], [t('Items'), String(s.lines.length)]]} />
          {s.status === 'refunded' ? <View style={{ alignItems: 'center' }}><Tag text={s.refund_reason ? t('Refunded: {r}', { r: s.refund_reason }) : t('Refunded')} tone="bad" /></View> : null}
          <Card title={t('Receipt')}>
            {s.lines.map((l, n) => <Item key={n} title={l.name} sub={`${Number(l.qty)} × ${money(l.unit_price, 2)}`} right={money(l.line_total, 2)} />)}
            {Number(s.discount) > 0 ? <Item title={t('Discount')} right={'−' + money(s.discount, 2)} /> : null}
            <Item title={t('Tax')} right={money(s.tax, 2)} />
            {Number(s.tip) > 0 ? <Item title={t('Tip')} right={money(s.tip, 2)} /> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 }}>
              <Text style={[FH, { color: V.ink, fontSize: 17 }]}>{t('Total')}</Text><Text style={[FH, { color: V.ink, fontSize: 17 }]}>{money(s.total, 2)}</Text>
            </View>
          </Card>
          <Btn text={t('Share receipt')} icon="send" kind="dark" onPress={receipt} />
          {s.status !== 'refunded' ? <Btn text={t('Refund this sale')} icon="x" kind="dark" onPress={() => { setWhy(''); setRef(true); }} /> : null}
        </>
      ) : null}
      <Sheet open={ref} title={t('Refund #{n}', { n: s?.number || '' })} onClose={() => setRef(false)}>
        <Text style={{ color: V.mute, fontSize: 14 }}>{t('The full {m} goes back. Items go back into stock.', { m: money(s?.total || 0, 2) })}</Text>
        <In label={t('Why (optional)')} value={why} onChangeText={setWhy} placeholder={t('Wrong item, unhappy customer…')} />
        <Btn text={t('Refund {m}', { m: money(s?.total || 0, 2) })} icon="x" kind="red" onPress={refund} busy={busy === 'refund'} />
      </Sheet>
    </ToolPage>
  );
}
