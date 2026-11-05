import React, { useState } from 'react';
import { Alert, Platform, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { useAuth } from '../lib/auth';
import { quickForgetLocal } from '../lib/quick';
import { C, S } from '../lib/theme';
import { t } from '../lib/i18n';
import { B, Button, Card, ErrorBox, Field, Loading, Muted, Row } from '../ui/kit';
import { PoweredBy } from '../ui/Brand';
import { IconTile } from '../ui/Summary';

type Check = { blockers: string[]; needs_code: boolean; email: string; closes_company?: string | null };

/** Delete my account: required by the App Store and Google Play. */
export default function DeleteAccount() {
  const d = useLoad(() => get<Check>('/api/account/delete'));
  const { signOut } = useAuth();
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const done = async () => {
    await quickForgetLocal().catch(() => {});
    await signOut().catch(() => {});
    router.replace('/login');
    const msg = t('Your account and your personal information were deleted.');
    if (Platform.OS === 'web') { try { window.alert(msg); } catch { /* ignore */ } } else Alert.alert(t('Account deleted'), msg);
  };

  const remove = async () => {
    setBusy(true); setError('');
    try {
      await post('/api/account/delete', { password: pw, code: code || undefined, confirm: word.trim().toUpperCase() });
      await done();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const sendLink = async () => {
    if (!d.data) return;
    try { await post('/api/auth/forgot', { email: d.data.email }); setSent(true); } catch (e: any) { setError(e.message); }
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ width: '100%', maxWidth: 760, alignSelf: 'center', padding: S.lg, gap: S.md, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      {d.loading && !d.data ? <Loading /> : d.error && !d.data ? <ErrorBox text={d.error} onRetry={d.reload} /> : d.data ? (
        <>
          <Card style={{ gap: 8, borderColor: C.badLine, backgroundColor: C.badSoft }}>
            <Row><IconTile name="shield" color={C.bad} /><B style={{ flex: 1 }}>{t('This cannot be undone')}</B></Row>
            <Muted>{t('We delete your login, your name and email, your phone sign-in keys, your public business card and your resumes. You are signed out everywhere.')}</Muted>
            <Muted>{t('Your employer keeps the work records the law requires, such as hours worked, pay stubs and tax slips, but they are no longer linked to a login.')}</Muted>
          </Card>
          {d.data.closes_company && !d.data.blockers.length ? (
            <Card style={{ gap: 8, borderColor: C.bad, borderWidth: 1 }}>
              <B>{t('Your company closes too')}</B>
              <Muted>{t('You are the only person in {c}, so it closes with your account. Its plan stops and nobody can sign in to it again.', { c: d.data.closes_company })}</Muted>
            </Card>
          ) : null}
          {d.data.blockers.length ? (
            <Card style={{ gap: 8, borderColor: C.bad, borderWidth: 1 }}>
              <B>{t('First, one more step')}</B>
              {d.data.blockers.map((b) => <Muted key={b}>{t(b)}</Muted>)}
            </Card>
          ) : (
            <>
              <Field label={t('Your OENOD password')} value={pw} onChangeText={setPw} secureTextEntry textContentType="password" autoComplete="password" />
              {sent ? <Muted>{t('Check your email for a link to set your password, then come back here.')}</Muted> : (
                <Text style={{ color: C.blue, fontWeight: '600' }} onPress={sendLink} accessibilityRole="link">{t('No password? Email me a link to set one')}</Text>
              )}
              {d.data.needs_code ? <Field label={t('6-digit code')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode" /> : null}
              <Field label={t('Type DELETE to confirm')} value={word} onChangeText={setWord} autoCapitalize="characters" autoCorrect={false} />
              {error ? <Text style={{ color: C.bad }}>{error}</Text> : null}
              <Button title={t('Delete my account')} kind="danger" icon="x" onPress={remove} busy={busy} disabled={!pw || word.trim().toUpperCase() !== 'DELETE'} />
            </>
          )}
          <Button title={t('Cancel')} kind="secondary" onPress={() => router.back()} />
        </>
      ) : null}
      <PoweredBy />
      </ScrollView>
  );
}
