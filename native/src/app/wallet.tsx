import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../lib/auth';
import { get, post, put } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { day, money, time } from '../lib/format';
import { C, R, S } from '../lib/theme';
import { t } from '../lib/i18n';
import { B, Button, Card, Divider, Empty, ErrorBox, Field, H2, ListRow, Loading, Muted, Pill, Row } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { QR } from '../ui/QR';

type W = {
  wallet: { kind: 'company' | 'user'; name: string; status: 'new' | 'pending' | 'review' | 'active' | 'frozen'; currency: string; activated: boolean; details_submitted: boolean;
    can_receive: boolean; can_payout: boolean; needs: string[]; bank: string | null; payout_schedule: 'manual' | 'daily' | 'weekly' | 'monthly'; accept_payments: boolean; frozen_reason: string | null; pay_url: string };
  balance: { available: number; pending: number } | null;
  activity: { id: string; type: string; description: string; amount: number; fee: number; net: number; status: string; created: string; available_on: string | null }[];
  payouts: { id: number; amount: number; status: string; arrival: string | null; failure: string | null; created_at: string; automatic: number }[];
  received: { amount: number; payer_name: string | null; note: string | null; paid_at: string }[];
  security: { twofa: boolean; min_payout: number; max_payout: number | null };
  error: string | null;
};
const say = (title: string, msg: string) => (Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg));
const rid = () => 'app-' + Date.now().toString(36) + '-' + Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
const PAYOUT_STATUS: Record<string, [string, 'good' | 'warn' | 'bad' | 'info' | 'plain']> = {
  requested: ['Requested', 'info'], pending: ['On the way', 'info'], in_transit: ['On the way', 'info'], paid: ['In your bank', 'good'], failed: ['Failed', 'bad'], canceled: ['Canceled', 'plain'],
};

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }}
      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.md, borderWidth: 1, borderColor: on ? C.blue : C.line, backgroundColor: on ? C.blueSoft : C.white }}>
      <Text style={{ fontWeight: '700', color: on ? C.blue : C.ink }}>{label}</Text>
    </Pressable>
  );
}

function WalletView({ base }: { base: '/api/me/wallet' | '/api/wallet' }) {
  const [fresh, setFresh] = useState(false);
  const d = useLoad(() => get<W>(base + (fresh ? '?fresh=1' : '')), [base, fresh]);
  const [busy, setBusy] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const x = d.data;

  // Stripe pages open in a secure browser tab; when it closes we ask Stripe for the latest state.
  const openStripe = useCallback(async (path: string, key: string) => {
    setBusy(key);
    try {
      const r = await post<{ url: string }>(base + path);
      await WebBrowser.openBrowserAsync(r.url);
      setFresh(true); d.reload();
    } catch (e: any) { say(t('Not done'), e.message); } finally { setBusy(null); }
  }, [base, d]);

  const setting = async (body: Record<string, unknown>) => {
    try { await put(base + '/settings', body); d.reload(); } catch (e: any) { say(t('Not done'), e.message); }
  };

  const payout = async () => {
    setError('');
    const amt = Math.round(Number(amount.replace(',', '.')) * 100) / 100;
    if (!amt || amt <= 0) { setError(t('Enter an amount.')); return; }
    if (!password) { setError(t('Enter your OENOD password to confirm.')); return; }
    if (x?.security.twofa && !/^\d{6}$/.test(code)) { setError(t('Enter the 6-digit code from your authenticator app.')); return; }
    setBusy('payout');
    try {
      await post(base + '/payout', { amount: amt, password, code: x?.security.twofa ? code : undefined, request_id: rid() });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSending(false); setAmount(''); setPassword(''); setCode('');
      say(t('Transfer started'), t('{a} is on its way to your bank. It usually arrives in 1 to 3 business days.', { a: money(amt, 2) }));
      d.reload();
    } catch (e: any) { setError(e.message); setPassword(''); } finally { setBusy(null); }
  };

  if (d.loading && !x) return <Loading />;
  if (!x) return <ErrorBox text={d.error || t('Could not load.')} onRetry={d.reload} />;
  const w = x.wallet;
  const cur = (n: number) => money(n, 2);
  const avail = x.balance?.available ?? 0;
  const canSend = w.can_payout && avail >= x.security.min_payout && w.status !== 'frozen';

  return (
    <>
      <View style={{ backgroundColor: C.navy, borderRadius: 22, padding: S.xl, gap: S.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: '#C9D3EA', fontWeight: '600' }}>{w.kind === 'company' ? t('Company wallet') : t('My wallet')}</Text>
          <Pill text={t(w.status === 'active' ? 'Active' : w.status === 'frozen' ? 'On hold' : w.status === 'review' ? 'Being checked' : w.activated ? 'Setup not finished' : 'Not activated')}
            kind={w.status === 'active' ? 'good' : w.status === 'frozen' ? 'bad' : 'warn'} />
        </Row>
        <Text style={{ color: C.white, fontSize: 40, fontWeight: '800', letterSpacing: -1 }} accessibilityLabel={t('Available balance')}>{cur(avail)}</Text>
        <Text style={{ color: '#C9D3EA' }}>{t('Available')}{x.balance?.pending ? ` · ${t('{a} on the way', { a: cur(x.balance.pending) })}` : ''}</Text>
        {w.bank ? <Text style={{ color: '#C9D3EA', fontSize: 13 }}>🏦 {w.bank}</Text> : null}
      </View>

      {x.error ? <Card style={{ backgroundColor: C.warnSoft }}><Muted>{x.error}</Muted></Card> : null}
      {w.status === 'frozen' ? <Card style={{ backgroundColor: C.badSoft }}><B>{t('Your wallet is on hold')}</B><Muted>{w.frozen_reason || t('Contact OENOD support.')}</Muted></Card> : null}

      {!w.activated ? (
        <Card style={{ gap: S.md }}>
          <B>{t('Get paid and send money to your bank')}</B>
          <Muted>{t('Activate your wallet once. Stripe, our payment partner, checks your identity and connects your bank account. It takes about 5 minutes.')}</Muted>
          <Button title={t('Activate my wallet')} icon="check" onPress={() => openStripe('/activate', 'activate')} busy={busy === 'activate'} />
        </Card>
      ) : !w.details_submitted || w.needs.length ? (
        <Card style={{ gap: S.md }}>
          <B>{t('Finish setting up your wallet')}</B>
          {w.needs.map((n, i) => <Muted key={i}>• {t(n)}</Muted>)}
          <Button title={t('Finish setup')} icon="chevron" onPress={() => openStripe('/activate', 'activate')} busy={busy === 'activate'} />
        </Card>
      ) : w.status === 'review' ? (
        <Card><B>{t('Stripe is checking your details')}</B><Muted>{t('This usually takes a few minutes. Tap Refresh below to check again.')}</Muted></Card>
      ) : null}

      {w.activated ? (
        sending ? (
          <Card style={{ gap: S.md }}>
            <B>{t('Transfer to my bank')}</B>
            <Field label={t('Amount (up to {a})', { a: cur(x.security.max_payout ? Math.min(avail, x.security.max_payout) : avail) })} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus />
            <Pressable onPress={() => setAmount(String(avail))} style={{ alignSelf: 'flex-start' }}><Text style={{ color: C.blue, fontWeight: '700' }}>{t('Use full balance')}</Text></Pressable>
            <Field label={t('Your OENOD password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" />
            {x.security.twofa ? <Field label={t('6-digit code')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode" /> : null}
            <Muted>{t('For your safety we ask for your password on every transfer.')}</Muted>
            {error ? <Text style={{ color: C.bad, fontWeight: '600' }}>{error}</Text> : null}
            <Row><Button title={t('Cancel')} kind="secondary" onPress={() => { setSending(false); setError(''); }} style={{ flex: 1 }} /><Button title={t('Send to bank')} onPress={payout} busy={busy === 'payout'} style={{ flex: 1 }} /></Row>
          </Card>
        ) : (
          <View style={{ gap: S.sm }}>
            <Button title={t('Transfer to my bank')} icon="cash" onPress={() => setSending(true)} disabled={!canSend} />
            {!canSend && w.can_payout ? <Muted style={{ textAlign: 'center' }}>{t('You can transfer once you have at least {a}.', { a: cur(x.security.min_payout) })}</Muted> : null}
            <Row>
              {w.can_receive && w.accept_payments ? <Button title={t('Get paid')} icon="qr" kind="secondary" onPress={() => setShowQR(!showQR)} style={{ flex: 1 }} /> : null}
              <Button title={t('Bank and statements')} icon="globe" kind="secondary" onPress={() => openStripe('/bank', 'bank')} busy={busy === 'bank'} style={{ flex: 1 }} />
            </Row>
          </View>
        )
      ) : null}

      {showQR ? (
        <Card style={{ alignItems: 'center', gap: S.md }}>
          <B>{t('Scan to pay {n}', { n: w.name })}</B>
          <View style={{ padding: 12, backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.line }}><QR value={w.pay_url} size={210} /></View>
          <Muted style={{ textAlign: 'center' }}>{t('Anyone can pay you by card with this code or link. The money lands in this wallet.')}</Muted>
          <Button title={t('Share my payment link')} icon="globe" kind="secondary" onPress={() => Share.share({ message: w.pay_url, url: w.pay_url })} style={{ alignSelf: 'stretch' }} />
        </Card>
      ) : null}

      {w.activated ? (
        <>
          <H2>{t('Automatic transfers')}</H2>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['manual', 'daily', 'weekly', 'monthly'] as const).map((s) => <Chip key={s} on={w.payout_schedule === s} label={t(s === 'manual' ? 'Only when I ask' : s === 'daily' ? 'Every day' : s === 'weekly' ? 'Every week' : 'Every month')} onPress={() => setting({ payout_schedule: s })} />)}
          </View>
          <Card onPress={() => setting({ accept_payments: !w.accept_payments })}>
            <Row><Icon name={w.accept_payments ? 'check' : 'x'} color={w.accept_payments ? C.good : C.faint} /><View style={{ flex: 1 }}><B>{t('Accept payments with my link')}</B><Muted>{t(w.accept_payments ? 'On. Tap to turn off.' : 'Off. Tap to turn on.')}</Muted></View></Row>
          </Card>
        </>
      ) : null}

      {x.payouts.length ? (
        <>
          <H2>{t('Transfers to bank')}</H2>
          <Card style={{ paddingVertical: S.xs }}>
            {x.payouts.slice(0, 15).map((p, i) => {
              const [label, kind] = PAYOUT_STATUS[p.status] || [p.status, 'plain'];
              return (
                <View key={p.id}>{i ? <Divider /> : null}
                  <ListRow title={cur(p.amount)} sub={p.failure || (p.arrival ? t('Arrives {d}', { d: day(p.arrival) }) : `${day(p.created_at)}${p.automatic ? ' · ' + t('Automatic') : ''}`)} right={<Pill text={t(label)} kind={kind} />} />
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      <H2>{t('Activity')}</H2>
      <Card style={{ paddingVertical: S.xs }}>
        {x.activity.length ? x.activity.slice(0, 25).map((a, i) => (
          <View key={a.id}>{i ? <Divider /> : null}
            <ListRow title={t(a.type)} sub={`${day(a.created)} ${time(a.created)}${a.fee ? ' · ' + t('fee {a}', { a: cur(a.fee) }) : ''}${a.status === 'pending' && a.available_on ? ' · ' + t('available {d}', { d: day(a.available_on) }) : ''}`}
              right={<B style={{ color: a.net >= 0 ? C.good : C.ink }}>{a.net >= 0 ? '+' : '−'}{cur(Math.abs(a.net))}</B>} />
          </View>
        )) : <Empty icon="cash" title={t('No activity yet')} sub={t('Payments you receive and transfers to your bank show up here.')} />}
      </Card>

      {x.received.length ? (
        <>
          <H2>{t('Paid by')}</H2>
          <Card style={{ paddingVertical: S.xs }}>
            {x.received.slice(0, 10).map((r, i) => (
              <View key={i}>{i ? <Divider /> : null}<ListRow title={r.payer_name || t('Customer')} sub={[r.note, day(r.paid_at)].filter(Boolean).join(' · ')} right={<B>{cur(r.amount)}</B>} /></View>
            ))}
          </Card>
        </>
      ) : null}
      <Muted style={{ textAlign: 'center', color: C.faint }}>{t('Payments and bank transfers are handled securely by Stripe. OENOD never sees your full bank or card numbers.')}</Muted>
    </>
  );
}

export default function WalletScreen() {
  const { session } = useAuth();
  const role = session?.user?.role || '';
  const companyAdmin = ['owner', 'admin'].includes(role) && !!session?.company;
  const [which, setWhich] = useState<'me' | 'company'>(companyAdmin ? 'company' : 'me');
  const [k, setK] = useState(0);
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {companyAdmin ? (
          <View style={{ flexDirection: 'row', backgroundColor: '#E8EBF2', borderRadius: R.md, padding: 4 }} accessibilityRole="tablist">
            {([['company', session?.company?.name || t('Company wallet')], ['me', t('My wallet')]] as const).map(([v, l]) => (
              <Pressable key={v} onPress={() => setWhich(v)} accessibilityRole="tab" accessibilityState={{ selected: which === v }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: R.sm, alignItems: 'center', backgroundColor: which === v ? C.white : 'transparent' }}>
                <Text style={{ fontWeight: '700', color: which === v ? C.ink : C.sub }} numberOfLines={1}>{l}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <WalletView key={`${which}-${k}`} base={which === 'company' ? '/api/wallet' : '/api/me/wallet'} />
        <Button title={t('Refresh')} kind="ghost" onPress={() => setK((x) => x + 1)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
