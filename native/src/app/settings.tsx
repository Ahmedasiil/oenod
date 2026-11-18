// Settings, built into the app (owners and admins): company details, sales tax, currency, time zone, locations, and quick links to security and team.
import React, { useState } from 'react';
import { router } from 'expo-router';
import { get, put } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { t } from '../lib/i18n';
import { Btn, Card, Dot, Hero, In, Item, Pick, Sheet, State, ToolPage, useBusy } from '../ui/T1';

type Co = { id: number; name: string; legal_name: string | null; industry: string | null; phone: string | null; email: string | null; address: string | null; timezone: string; currency: string; tax_rate: number; invoice_prefix: string; usage?: { users: number; locations: number } };
type Loc = { id: number; name: string; address: string | null; status: string };
const CUR = ['CAD', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'EGP', 'AUD'];
const TZ = ['America/St_Johns', 'America/Halifax', 'America/Toronto', 'America/Winnipeg', 'America/Regina', 'America/Edmonton', 'America/Vancouver', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Asia/Dubai', 'Africa/Cairo', 'Asia/Riyadh', 'Australia/Sydney'];

export default function Settings() {
  const d = useLoad(() => get<Co>('/api/company'));
  const l = useLoad(() => get<{ locations: Loc[] }>('/api/locations').catch(() => ({ locations: [] as Loc[] })));
  const [ed, setEd] = useState<Record<string, string> | null>(null);
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const x = d.data;
  const open = () => x && (setErr(''), setEd({ name: x.name || '', legal_name: x.legal_name || '', industry: x.industry || '', phone: x.phone || '', email: x.email || '', address: x.address || '', timezone: x.timezone, currency: x.currency, tax_rate: String(x.tax_rate ?? 0), invoice_prefix: x.invoice_prefix || 'INV' }));
  const save = () => {
    if (!ed) return;
    if (!ed.name.trim()) return setErr(t('Type your company name.'));
    if (!ed.invoice_prefix.trim()) return setErr(t('Type an invoice prefix, like INV.'));
    setErr('');
    run('sv', async () => { await put('/api/company', { ...ed, name: ed.name.trim(), tax_rate: Number(ed.tax_rate.replace(',', '.')) || 0 }); setEd(null); d.reload(); });
  };
  const f = (k: string, label: string, extra: any = {}) => ed ? <In label={label} value={ed[k]} onChangeText={(v) => setEd({ ...ed, [k]: v })} {...extra} /> : null;
  return (
    <ToolPage title={t('Settings')} right="dots" rightLabel={t('Edit company details')} onRight={open} refreshing={d.refreshing} onRefresh={() => { d.refresh(); l.reload(); }}>
      {x ? <Hero id="set" label={t('Company')} value={x.name} note={[x.industry, x.address].filter(Boolean).join(' · ') || t('Add your address and phone')} noteGood
        stats={[[t('Currency'), x.currency], [t('Sales tax'), `${x.tax_rate}%`], [t('People'), String(x.usage?.users ?? '—')]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Card title={t('Company details')} right={t('Edit')} onRight={open}>
            <Item title={t('Legal name')} right={x.legal_name || '—'} />
            <Item title={t('Phone')} right={x.phone || '—'} />
            <Item title={t('Email')} right={x.email || '—'} />
            <Item title={t('Time zone')} right={x.timezone} />
            <Item title={t('Invoice numbers start with')} right={x.invoice_prefix} />
          </Card>
          <Card title={t('Locations')}>{(l.data?.locations || []).map((y) => <Item key={y.id} left={<Dot icon="pin" />} title={y.name} sub={y.address || undefined} />)}</Card>
          <Card title={t('More settings')}>
            <Item left={<Dot icon="shield" tone="nv" />} title={t('Security')} sub={t('Sign-out times, 2-step sign-in, sign-in history')} onPress={() => router.push('/security' as any)} />
            <Item left={<Dot icon="users" tone="nv" />} title={t('Team and roles')} onPress={() => router.push('/team' as any)} />
            <Item left={<Dot icon="bell" tone="nv" />} title={t('Notifications')} onPress={() => router.push('/notifications' as any)} />
            <Item left={<Dot icon="cash" tone="nv" />} title={t('Payroll')} onPress={() => router.push('/payrun' as any)} />
          </Card>
        </>
      ) : null}
      <Sheet open={!!ed} title={t('Company details')} onClose={() => setEd(null)}>
        {ed ? (
          <>
            {f('name', t('Company name'), { error: err || undefined })}
            {f('legal_name', t('Legal name'))}
            {f('industry', t('Type of business'))}
            {f('phone', t('Phone'), { keyboardType: 'phone-pad' })}
            {f('email', t('Email'), { keyboardType: 'email-address', autoCapitalize: 'none' })}
            {f('address', t('Address'))}
            {f('tax_rate', t('Sales tax %'), { keyboardType: 'decimal-pad' })}
            {f('invoice_prefix', t('Invoice prefix'))}
            <Pick<string> label={t('Currency')} value={ed.currency} onChange={(v) => setEd({ ...ed, currency: v })} items={CUR.map((c) => [c, c] as [string, string])} />
            <Pick<string> label={t('Time zone')} value={ed.timezone} onChange={(v) => setEd({ ...ed, timezone: v })} items={(TZ.includes(ed.timezone) ? TZ : [ed.timezone, ...TZ]).map((z) => [z, z.replace('_', ' ')] as [string, string])} />
            <Btn text={t('Save')} icon="check" onPress={save} busy={busy === 'sv'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
