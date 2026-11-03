import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { quickDisable, quickEnroll } from '../lib/quick';
import { C, S } from '../lib/theme';
import { t } from '../lib/i18n';
import { B, Button, Card, Field, Muted, Pill, Row } from './kit';
import { Icon } from './Icon';

/** Me tab: turn Face ID / fingerprint sign-in on or off for this phone. */
export function QuickCard() {
  const { quick, refreshQuick, session } = useAuth();
  const [askPw, setAskPw] = useState(false);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!quick.name || session?.user?.role === 'superadmin') return null;
  const name = quick.name;

  const turnOn = async () => {
    setBusy(true); setError('');
    try {
      await quickEnroll(askPw ? pw : undefined);
      setAskPw(false); setPw('');
      await refreshQuick();
    } catch (e: any) {
      if (e?.status === 428 || e?.data?.need_password) { setAskPw(true); if (e?.status !== 428) setError(e.message); }
      else setError(e?.message || t('Something went wrong. Please try again.'));
    } finally { setBusy(false); }
  };
  const turnOff = async () => { setBusy(true); try { await quickDisable(); await refreshQuick(); } finally { setBusy(false); } };

  return (
    <Card style={{ gap: S.md }}>
      <Row>
        <Icon name="user" color={C.blue} />
        <View style={{ flex: 1 }}>
          <B>{t('Sign in with {m}', { m: name })}</B>
          <Muted>{t('Open OENOD with {m} instead of your password. Your password is not kept on this phone.', { m: name })}</Muted>
        </View>
        <Pill text={quick.on ? t('On') : t('Off')} kind={quick.on ? 'good' : 'plain'} />
      </Row>
      {askPw && !quick.on ? (
        <Field label={t('Confirm your password')} value={pw} onChangeText={setPw} secureTextEntry textContentType="password" autoComplete="password" onSubmitEditing={turnOn} />
      ) : null}
      {error ? <Text style={{ color: C.bad }}>{error}</Text> : null}
      {quick.on
        ? <Button title={t('Turn off')} kind="secondary" onPress={turnOff} busy={busy} />
        : <Button title={t('Turn on {m}', { m: name })} onPress={turnOn} busy={busy} disabled={askPw && !pw} />}
    </Card>
  );
}
