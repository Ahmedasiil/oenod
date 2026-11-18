// Loyalty, built into the app (managers): points rules, top members, points given and used, and gift cards.
import React, { useState } from 'react';
import { router } from 'expo-router';
import { get, put } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { money } from '../lib/format';
import { t } from '../lib/i18n';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Sheet, State, Tag, ToolPage, useBusy } from '../ui/T1';

type L = { settings: { loyalty_rate: number; loyalty_reward_points: number; loyalty_reward_value: number }; members: { id: number; name: string; email: string | null; points: number }[]; issued_30: number; redeemed_30: number;
  gift_cards: { id: number; code: string; balance: number; initial_amount?: number; status: string; customer: string | null }[]; gift_outstanding: number };

export default function Loyalty() {
  const d = useLoad(() => get<L>('/api/loyalty'));
  const [tab, setTab] = useState<'members' | 'gift'>('members');
  const [ed, setEd] = useState<{ rate: string; pts: string; val: string } | null>(null);
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const s = x?.settings;
  const save = () => {
    if (!ed) return;
    const r = Number(ed.rate.replace(',', '.')), p = parseInt(ed.pts, 10), v = Number(ed.val.replace(',', '.'));
    if (!(r >= 0) || !(p > 0) || !(v >= 0)) return setErr(t('Type numbers only.'));
    setErr('');
    run('sv', async () => { await put('/api/loyalty', { loyalty_rate: r, loyalty_reward_points: p, loyalty_reward_value: v }); setEd(null); d.reload(); });
  };
  return (
    <ToolPage title={t('Loyalty')} right="dots" rightLabel={t('Change the rules')} onRight={() => s && (setErr(''), setEd({ rate: String(s.loyalty_rate), pts: String(s.loyalty_reward_points), val: String(s.loyalty_reward_value) }))} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x && s ? <Hero id="loy" label={t('Members with points')} value={String(x.members.length)} note={s.loyalty_rate > 0 ? t('{r} points per $1 · {p} points = {v} off', { r: s.loyalty_rate, p: s.loyalty_reward_points, v: money(s.loyalty_reward_value, 2) }) : t('Loyalty is off. Tap ••• to set your rules.')} noteGood={s.loyalty_rate > 0}
        stats={[[t('Given, 30 days'), String(x.issued_30)], [t('Used, 30 days'), String(x.redeemed_30)], [t('Gift card balance'), money(x.gift_outstanding)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Chips value={tab} onChange={setTab} items={[['members', t('Top members'), x.members.length], ['gift', t('Gift cards'), x.gift_cards.length]]} />
          {tab === 'members' ? (
            <Card>{x.members.length ? x.members.slice(0, 60).map((m, i) => <Item key={m.id} onPress={() => router.push(`/customers/${m.id}` as any)} left={<Dot icon="heart" tone={i < 3 ? 'warn' : 'nv'} />} title={m.name} sub={m.email || undefined} right={t('{n} pts', { n: m.points })}
              rightSub={s && m.points >= s.loyalty_reward_points ? <Tag text={t('Reward ready')} tone="good" /> : undefined} />) : <None icon="heart" title={t('No members yet')} sub={t('Customers earn points when they buy at your register.')} />}</Card>
          ) : (
            <Card>{x.gift_cards.length ? x.gift_cards.map((g) => <Item key={g.id} left={<Dot icon="wallet" tone={g.status === 'active' ? 'nv' : 'dk'} />} title={g.code} sub={g.customer || undefined} right={money(g.balance, 2)} rightSub={<Tag text={t(g.status)} tone={g.status === 'active' ? 'good' : 'plain'} />} />)
              : <None icon="wallet" title={t('No gift cards yet')} sub={t('Sell gift cards from the Register.')} />}</Card>
          )}
          <Btn text={t('Change the rules')} icon="heart" onPress={() => s && (setErr(''), setEd({ rate: String(s.loyalty_rate), pts: String(s.loyalty_reward_points), val: String(s.loyalty_reward_value) }))} />
        </>
      ) : null}
      <Sheet open={!!ed} title={t('Loyalty rules')} onClose={() => setEd(null)}>
        {ed ? (
          <>
            <In label={t('Points for every $1 spent (0 turns it off)')} value={ed.rate} onChangeText={(v) => setEd({ ...ed, rate: v })} keyboardType="decimal-pad" error={err || undefined} />
            <In label={t('Points needed for a reward')} value={ed.pts} onChangeText={(v) => setEd({ ...ed, pts: v })} keyboardType="number-pad" />
            <In label={t('Reward value ($ off)')} value={ed.val} onChangeText={(v) => setEd({ ...ed, val: v })} keyboardType="decimal-pad" />
            <Btn text={t('Save rules')} icon="check" onPress={save} busy={busy === 'sv'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
