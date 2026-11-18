// One pay run: every person's hours, pay, taxes and take-home. Fix hours, tips or a bonus while it is a draft, approve it,
// make the direct deposit bank file (password checked), mark it paid, and open anyone's pay stub.
import React, { useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { BASE, get, post, put } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date, money } from '../../lib/format';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Btn, Card, Dot, Hero, In, Item, Sheet, State, Tag, ToolPage, oops, sure, useBusy } from '../../ui/T1';
import { Ready, Run, runTone, runWord } from './index';

type Line = { id: number; employee_id: number; first_name: string; last_name: string | null; pay_type: string; rate: number; regular_h: number; overtime_h: number; paid_h: number; regular_pay: number; overtime_pay: number; tips: number; adjustments: number; gross: number; deductions: number; net: number;
  items: { code: string; name: string; amount: number }[]; bank: { bank_status: string; last4: string | null } | null; deposit_status: string | null; note: string | null };
type R = Run & { lines: Line[]; unapproved: number; ready: Ready };
const n = (s: string) => Number(String(s).replace(',', '.')) || 0;

export default function PayRun() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => get<R>(`/api/payroll/${id}`), [id]);
  const [ln, setLn] = useState<Line | null>(null);
  const [ed, setEd] = useState({ regular_h: '', overtime_h: '', tips: '', adjustments: '', note: '' });
  const [dep, setDep] = useState<{ password: string; code: string } | null>(null);
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const r = d.data;
  const draft = r?.status === 'draft';
  const nm = (l: Line) => `${l.first_name} ${l.last_name || ''}`.trim();
  const openLine = (l: Line) => { setErr(''); setLn(l); setEd({ regular_h: String(l.regular_h), overtime_h: String(l.overtime_h), tips: String(l.tips), adjustments: String(l.adjustments), note: l.note || '' }); };
  const saveLine = () => ln && run('ln', async () => { await put(`/api/pay-lines/${ln.id}`, ln.pay_type === 'hourly' ? { regular_h: n(ed.regular_h), overtime_h: n(ed.overtime_h), tips: n(ed.tips), adjustments: n(ed.adjustments), note: ed.note } : { tips: n(ed.tips), adjustments: n(ed.adjustments), note: ed.note }); setLn(null); d.reload(); });
  const approve = () => r && sure(t('Approve this pay run?'), t('{n} people get their pay stub. Total gross {m}.', { n: r.lines.length, m: money(r.gross, 2) }), t('Approve'), () => run('ap', async () => { await post(`/api/payroll/${id}/approve`, {}); d.reload(); }));
  const paid = () => sure(t('Mark as paid?'), t('Use this once the money has left your bank.'), t('Mark paid'), () => run('pd', async () => { await post(`/api/payroll/${id}/paid`, {}); d.reload(); }));
  const shareFile = async () => {
    const res = await fetch(`${BASE}/api/payroll/${id}/deposit-file`, { credentials: 'include', headers: { 'X-OENOD-Client': `app-${Platform.OS}`, 'X-OENOD-Page': 'app' } });
    if (!res.ok) throw new Error(t('The bank file could not be opened. Try again.'));
    const txt = await res.text();
    await Share.share({ title: t('Payroll bank file'), message: txt });
  };
  const deposit = () => {
    if (!dep || !r) return;
    if (!dep.password) return setErr(t('Type your OENOD password.'));
    setErr('');
    run('dep', async () => {
      const body = { password: dep.password, code: dep.code || undefined };
      if (r.deposited_at) await post(`/api/payroll/${id}/deposit-ticket`, body); else await post(`/api/payroll/${id}/deposit`, body);
      setDep(null); d.reload();
      try { await shareFile(); } catch (e) { oops(e); }
    });
  };
  const stub = (l: Line) => run('st' + l.id, async () => {
    const s = await get<any>(`/api/payroll/${id}/stub/${l.employee_id}`);
    const lines = [`${nm(l)} · ${date(r!.period_start)} – ${date(r!.period_end)}`, `${t('Gross')}: ${money(s.gross ?? l.gross, 2)}`, ...(l.items || []).map((i) => `${t(i.name)}: −${money(i.amount, 2)}`), `${t('Take-home')}: ${money(s.net ?? l.net, 2)}`];
    try { await Share.share({ title: t('Pay stub'), message: lines.join('\n') }); } catch { oops(lines.join('\n')); }
  });
  return (
    <ToolPage title={r ? `${date(r.period_start)} – ${date(r.period_end)}` : t('Pay run')} refreshing={d.refreshing} onRefresh={d.refresh}>
      {r ? <Hero id="prr" label={t('Take-home pay')} value={money(r.net, 2)} note={`${runWord(r.status)}${r.pay_date ? ' · ' + t('pay day {d}', { d: date(r.pay_date) }) : ''}`} noteGood={r.status !== 'draft'}
        stats={[[t('Gross'), money(r.gross)], [t('Taxes held'), money(r.deductions || 0)], [t('Your share'), money(r.employer_taxes || 0)]]} /> : null}
      <State loading={d.loading && !r} error={!r ? d.error : null} onRetry={d.reload} />
      {r ? (
        <>
          {draft && r.unapproved ? <Card><Item left={<Dot icon="clock" tone="warn" />} title={t('{n} time cards not approved yet', { n: r.unapproved })} sub={t('Approve them in Time clock, then open this run again.')} /></Card> : null}
          <Card title={t('{n} people', { n: r.lines.length })}>
            {r.lines.map((l) => <Item key={l.id} onPress={() => (draft ? openLine(l) : stub(l))} left={<Dot icon="user" tone={l.bank?.bank_status === 'verified' ? 'nv' : 'warn'} />} title={nm(l)}
              sub={[l.pay_type === 'hourly' ? t('{h} h at {r}', { h: l.paid_h, r: money(l.rate, 2) }) : t('Salary'), l.tips ? t('tips {m}', { m: money(l.tips, 2) }) : null, l.adjustments ? t('bonus {m}', { m: money(l.adjustments, 2) }) : null, l.bank?.bank_status === 'verified' ? null : t('no bank account')].filter(Boolean).join(' · ')}
              right={money(l.net, 2)} rightSub={<Tag text={busy === 'st' + l.id ? '…' : draft ? t('Edit') : t('Pay stub')} tone={draft ? 'info' : 'plain'} />} />)}
          </Card>
          {draft ? <Btn text={t('Approve pay run')} icon="check" kind="blue" onPress={approve} busy={busy === 'ap'} /> : null}
          {r.status === 'approved' ? (
            <>
              <Btn text={r.deposited_at ? t('Get the bank file again') : t('Make the direct deposit file')} icon="wallet" kind="blue" onPress={() => { setErr(''); setDep({ password: '', code: '' }); }} />
              <Btn text={t('Mark as paid')} icon="check" kind="dark" onPress={paid} busy={busy === 'pd'} />
            </>
          ) : null}
          {r.status === 'paid' ? <Card><Item left={<Dot icon="check" tone="good" />} title={t('This pay run is paid')} sub={r.approved_by_name ? t('Approved by {n}', { n: r.approved_by_name }) : undefined} /></Card> : null}
          <Tag text={runWord(r.status)} tone={runTone(r.status)} />
        </>
      ) : null}
      <Sheet open={!!ln} title={ln ? nm(ln) : ''} onClose={() => setLn(null)}>
        {ln ? (
          <>
            {ln.pay_type === 'hourly' ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <In style={{ flex: 1 }} label={t('Regular hours')} value={ed.regular_h} onChangeText={(v) => setEd({ ...ed, regular_h: v })} keyboardType="decimal-pad" />
                <In style={{ flex: 1 }} label={t('Overtime hours')} value={ed.overtime_h} onChangeText={(v) => setEd({ ...ed, overtime_h: v })} keyboardType="decimal-pad" />
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <In style={{ flex: 1 }} label={t('Tips')} value={ed.tips} onChangeText={(v) => setEd({ ...ed, tips: v })} keyboardType="decimal-pad" />
              <In style={{ flex: 1 }} label={t('Bonus or fix')} value={ed.adjustments} onChangeText={(v) => setEd({ ...ed, adjustments: v })} keyboardType="decimal-pad" />
            </View>
            <In label={t('Note')} value={ed.note} onChangeText={(v) => setEd({ ...ed, note: v })} />
            <Card title={t('This pay')}>
              <Item title={t('Gross')} right={money(ln.gross, 2)} />
              {ln.items.map((i) => <Item key={i.code} title={t(i.name)} right={'−' + money(i.amount, 2)} />)}
              <Item title={t('Take-home')} right={money(ln.net, 2)} />
            </Card>
            <Btn text={t('Save')} icon="check" onPress={saveLine} busy={busy === 'ln'} />
          </>
        ) : null}
      </Sheet>
      <Sheet open={!!dep} title={t('Direct deposit')} onClose={() => setDep(null)}>
        {dep ? (
          <>
            <Text style={{ color: V.mute, fontSize: 13.5, lineHeight: 19 }}>{t('This makes the file your bank uses to pay everyone. For your safety, type your OENOD password first.')}</Text>
            <In label={t('Password')} value={dep.password} onChangeText={(v) => setDep({ ...dep, password: v })} secureTextEntry error={err || undefined} />
            <In label={t('2FA code (if you use one)')} value={dep.code} onChangeText={(v) => setDep({ ...dep, code: v })} keyboardType="number-pad" />
            <Btn text={t('Make the file')} icon="wallet" kind="blue" onPress={deposit} busy={busy === 'dep'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
