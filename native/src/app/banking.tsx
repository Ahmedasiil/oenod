// Banking, built into the app (owners and admins): bank balances, and sort each new bank line into your books with one tap.
import React, { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date, money } from '../lib/format';
import { t } from '../lib/i18n';
import { V } from '../ui/M6';
import { Btn, Card, Chips, Dot, Hero, Item, None, Search, Sheet, State, Tag, ToolPage, sure, useBusy } from '../ui/T1';

type Acc = { id: number; name: string; last4: string | null; balance: number; to_review: number; books: number };
type O = { accounts: Acc[]; gl: { code: string; name: string; type: string }[]; to_review: number; month?: { money_in: number; money_out: number } };
type Tx = { id: number; account: string; txn_date: string; description: string; amount: number; status: string; gl_name: string | null; suggest: { gl_code: string; why: string } | null };
type St = 'new' | 'done' | 'excluded';

export default function Banking() {
  const o = useLoad(() => get<O>('/api/bank'));
  const [st, setSt] = useState<St>('new');
  const [q, setQ] = useState('');
  const l = useLoad(() => get<{ txns: Tx[] }>(`/api/bank/txns?status=${st}`), [st]);
  const [tx, setTx] = useState<Tx | null>(null);
  const [gq, setGq] = useState('');
  const { busy, run } = useBusy();
  const x = o.data;
  const gl = x?.gl || [];
  const name = (c: string) => gl.find((g) => g.code === c)?.name || c;
  const list = useMemo(() => (l.data?.txns || []).filter((y) => !q.trim() || y.description.toLowerCase().includes(q.trim().toLowerCase())), [l.data, q]);
  const pickList = gl.filter((g) => (tx && tx.amount > 0 ? ['income', 'liability', 'equity', 'asset'] : ['expense', 'asset', 'liability']).includes(g.type) && (!gq.trim() || `${g.code} ${g.name}`.toLowerCase().includes(gq.trim().toLowerCase())));
  const done = () => { setTx(null); setGq(''); l.reload(); o.reload(); };
  const sort = (code: string, remember = false) => tx && run('c', async () => { await post(`/api/bank/txns/${tx.id}/categorize`, { gl_code: code, remember }); done(); });
  const skip = () => tx && run('x', async () => { await post(`/api/bank/txns/${tx.id}/exclude`); done(); });
  const undo = () => tx && run('u', async () => { await post(`/api/bank/txns/${tx.id}/undo`); done(); });
  const all = () => sure(t('Accept all suggestions?'), t('Lines with a clear match or rule are sorted. The rest stay for you.'), t('Accept'), () => run('all', async () => { await post('/api/bank/accept-all'); l.reload(); o.reload(); }));
  const total = x ? x.accounts.reduce((s, a) => s + Number(a.balance || 0), 0) : 0;
  return (
    <ToolPage title={t('Banking')} refreshing={o.refreshing} onRefresh={() => { o.refresh(); l.reload(); }}>
      {x ? <Hero id="bkh" label={t('In the bank')} value={money(total)} note={x.to_review ? t('{n} bank lines to sort', { n: x.to_review }) : t('Every line is sorted')} noteGood={!x.to_review}
        stats={[[t('Accounts'), String(x.accounts.length)], [t('Money in'), x.month ? money(x.month.money_in) : '—'], [t('Money out'), x.month ? money(x.month.money_out) : '—']]} /> : null}
      <State loading={o.loading && !x} error={!x ? o.error : null} onRetry={o.reload} />
      {x ? (
        <>
          {x.accounts.length ? <Card>{x.accounts.map((a) => <Item key={a.id} left={<Dot icon="wallet" tone="nv" />} title={a.name + (a.last4 ? ` ••${a.last4}` : '')} sub={Math.abs(a.balance - a.books) > 0.01 ? t('Books show {m}', { m: money(a.books, 2) }) : t('Matches your books')} right={money(a.balance, 2)} rightSub={a.to_review ? <Tag text={t('{n} to sort', { n: a.to_review })} tone="warn" /> : undefined} />)}</Card>
            : <Card><None icon="wallet" title={t('No bank connected')} sub={t('Connect your bank once on oenod.com. Your lines then show here every day.')} /></Card>}
          {x.to_review ? <Btn text={t('Accept all suggestions')} icon="check" onPress={all} busy={busy === 'all'} /> : null}
          <Chips value={st} onChange={setSt} items={[['new', t('To sort'), x.to_review], ['done', t('Sorted')], ['excluded', t('Skipped')]]} />
          <Search value={q} onChange={setQ} placeholder={t('Search bank lines')} />
          <State loading={l.loading && !l.data} error={!l.data ? l.error : null} onRetry={l.reload} />
          {l.data ? <Card>
            {list.length ? list.map((y) => <Item key={y.id} onPress={() => setTx(y)} left={<Dot icon={y.amount > 0 ? 'recv' : 'send'} tone={y.amount > 0 ? 'good' : 'dk'} />} title={y.description} sub={[date(y.txn_date), y.account, y.gl_name || (y.suggest ? t('Looks like {n}', { n: name(y.suggest.gl_code) }) : null)].filter(Boolean).join(' · ')}
              right={(y.amount > 0 ? '+' : '−') + money(Math.abs(y.amount), 2)} rightSub={st === 'new' ? <Tag text={y.suggest ? t('Sort') : t('Pick')} tone={y.suggest ? 'good' : 'info'} /> : undefined} />)
              : <None icon="check" title={st === 'new' ? t('All sorted') : t('Nothing here')} />}
          </Card> : null}
        </>
      ) : null}
      <Sheet open={!!tx} title={tx ? `${tx.amount > 0 ? '+' : '−'}${money(Math.abs(tx.amount), 2)} · ${date(tx.txn_date)}` : ''} onClose={() => { setTx(null); setGq(''); }}>
        {tx ? (
          <>
            <Text style={{ color: V.ink, fontSize: 15, fontWeight: '600' }}>{tx.description}</Text>
            {tx.status !== 'new' ? <Btn text={t('Undo')} icon="x" kind="dark" onPress={undo} busy={busy === 'u'} /> : (
              <>
                {tx.suggest ? <Btn text={t('Yes, it is {n}', { n: name(tx.suggest.gl_code) })} icon="check" onPress={() => sort(tx.suggest!.gl_code)} busy={busy === 'c'} /> : null}
                {tx.suggest ? <Text style={{ color: V.mute, fontSize: 12.5, textAlign: 'center' }}>{tx.suggest.why}</Text> : null}
                <Search value={gq} onChange={setGq} placeholder={t('Or pick where it goes')} />
                <Card>{pickList.slice(0, 30).map((g) => <Item key={g.code} title={g.name} sub={g.code} onPress={() => sort(g.code)} right={busy === 'c' ? '…' : undefined} />)}</Card>
                <Btn text={t('Skip this line')} icon="x" kind="dark" onPress={skip} busy={busy === 'x'} />
              </>
            )}
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
