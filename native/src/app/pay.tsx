import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BASE, get, put } from '../lib/api';
import { Btn, In, Item, Pick, Sheet, Tag, useBusy } from '../ui/T1';
import { useLoad } from '../lib/useLoad';
import { date, money } from '../lib/format';
import { C, S } from '../lib/theme';
import { lang, t } from '../lib/i18n';
import { B, Card, Divider, Empty, ErrorBox, H2, ListRow, Loading, Muted, Pill, Row } from '../ui/kit';
import { PoweredBy } from '../ui/Brand';
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
  const bk = useLoad(() => get<{ bank: { holder: string; institution: string | null; transit: string | null; routing: string | null; last4: string; kind: string; bank_status: string } | null; country: string }>('/api/me/bank').catch(() => null));
  const t4 = useLoad(() => get<{ years: number[]; employee_id?: number }>('/api/me/t4').catch(() => ({ years: [] as number[], employee_id: undefined as number | undefined })));
  const { busy, run } = useBusy();
  const [ed, setEd] = useState<{ holder: string; institution: string; transit: string; routing: string; account: string; kind: string; password: string; code: string } | null>(null);
  const [err, setErr] = useState('');
  const [slip, setSlip] = useState<{ year: number; s: Record<string, any> } | null>(null);
  const us = bk.data?.country === 'US';
  const open = () => { setErr(''); const b = bk.data?.bank; setEd({ holder: b?.holder || '', institution: b?.institution || '', transit: b?.transit || '', routing: b?.routing || '', account: '', kind: b?.kind || 'checking', password: '', code: '' }); };
  const saveBank = () => {
    if (!ed) return;
    if (!ed.holder.trim()) return setErr(t('Type the name on the account.'));
    if (us ? ed.routing.replace(/\D/g, '').length !== 9 : ed.institution.replace(/\D/g, '').length !== 3 || ed.transit.replace(/\D/g, '').length !== 5) return setErr(us ? t('The routing number is 9 digits.') : t('The institution number is 3 digits and the transit number is 5 digits.'));
    if (ed.account.replace(/\D/g, '').length < 4) return setErr(t('Type your account number.'));
    if (!ed.password) return setErr(t('Type your OENOD password to change where you get paid.'));
    setErr('');
    run('bk', async () => { await put('/api/me/bank', { ...ed, holder: ed.holder.trim() }); setEd(null); bk.reload(); d.reload(); });
  };
  const openSlip = (year: number) => t4.data?.employee_id && run('t4' + year, async () => { const r = await get<any>(`/api/cra/t4/${t4.data!.employee_id}/slip?year=${year}`); setSlip({ year, s: r.slip || r.slips?.[0] || r }); });
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ width: '100%', maxWidth: 760, alignSelf: 'center', padding: S.lg, gap: S.md, paddingBottom: 48 }}>
      {d.loading && !x ? <Loading /> : d.error && !x ? <ErrorBox text={d.error} onRetry={d.reload} /> : (
        <>
          <Summary seed={13} label={t('Last pay')} value={x?.lines[0] ? money(n(x.lines[0].net) || n(x.lines[0].gross), 2) : '—'}
            badge={x?.lines[0]?.pay_date ? <Pill text={date(x.lines[0].pay_date)} kind="info" /> : undefined}
            minis={[[t('Next pay day'), shortDay(x?.next_pay_date)], [t('Take-home'), x?.ytd ? money(x.ytd.net) : '—'], [t('Hours paid'), x?.ytd ? String(Math.round(n(x.ytd.hours) * 10) / 10) : '—']]}
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
          <Card style={{ gap: 4 }}>
            <H2>{t('Tax slips')}</H2>
            {t4.data?.years.length ? t4.data.years.map((y) => <ListRow key={y} title={t('T4 for {y}', { y })} onPress={() => openSlip(y)} right={<Icon name="chevron" color={C.faint} size={18} />} />)
              : <Muted>{t('Your T4 shows up here after your employer files it, by the end of February.')}</Muted>}
          </Card>
        </>
      )}
      <PoweredBy />
      <Sheet open={!!ed} title={t('Direct deposit')} onClose={() => setEd(null)}>
        {ed ? (
          <>
            <In label={t('Name on the account')} value={ed.holder} onChangeText={(v) => setEd({ ...ed, holder: v })} />
            {us ? <In label={t('Routing number (9 digits)')} value={ed.routing} onChangeText={(v) => setEd({ ...ed, routing: v })} keyboardType="number-pad" />
              : <View style={{ flexDirection: 'row', gap: 10 }}>
                  <In style={{ flex: 1 }} label={t('Institution (3 digits)')} value={ed.institution} onChangeText={(v) => setEd({ ...ed, institution: v })} keyboardType="number-pad" />
                  <In style={{ flex: 1 }} label={t('Transit (5 digits)')} value={ed.transit} onChangeText={(v) => setEd({ ...ed, transit: v })} keyboardType="number-pad" />
                </View>}
            <In label={t('Account number')} value={ed.account} onChangeText={(v) => setEd({ ...ed, account: v })} keyboardType="number-pad" />
            <Pick<string> label={t('Account type')} value={ed.kind} onChange={(v) => setEd({ ...ed, kind: v })} items={[['checking', t('Chequing')], ['savings', t('Savings')]]} />
            <In label={t('Your OENOD password')} value={ed.password} onChangeText={(v) => setEd({ ...ed, password: v })} secureTextEntry />
            <In label={t('2FA code (if you use one)')} value={ed.code} onChangeText={(v) => setEd({ ...ed, code: v })} keyboardType="number-pad" />
            <Muted>{t('Your manager approves the new account before the next pay run.')}</Muted>
            {err ? <Tag text={err} tone="bad" /> : null}
            <Btn text={t('Save bank account')} icon="check" kind="blue" onPress={saveBank} busy={busy === 'bk'} />
          </>
        ) : null}
      </Sheet>
      <Sheet open={!!slip} title={slip ? t('T4 for {y}', { y: slip.year }) : ''} onClose={() => setSlip(null)}>
        {slip ? (
          <>
            {([['box14', 'Employment income (box 14)'], ['box22', 'Income tax deducted (box 22)'], ['box16', 'CPP paid (box 16)'], ['box16a', 'CPP2 paid (box 16A)'], ['box18', 'EI paid (box 18)'], ['box24', 'EI insurable earnings (box 24)'], ['box26', 'CPP pensionable earnings (box 26)']] as [string, string][])
              .filter(([k]) => slip.s[k] !== undefined).map(([k, l]) => <Item key={k} title={t(l)} right={money(Number(slip.s[k] || 0), 2)} />)}
            <Muted>{t('Use these numbers when you file your taxes. Your employer also sends this slip to the CRA.')}</Muted>
          </>
        ) : null}
      </Sheet>
      </ScrollView>
  );
}
