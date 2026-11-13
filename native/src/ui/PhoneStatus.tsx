// Me tab (3.8, iPhone): Business Phone status for people with a phone seat. Available rings this phone
// (CallKit, also when locked); Busy or Off sends callers to the team or Ava instead.
import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { get, put } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { C, S } from '../lib/theme';
import { t } from '../lib/i18n';
import { Button, Card, Muted } from './kit';
import { syncPhone } from '../lib/phone';

type Me = { allowed: boolean; ready: boolean; on: boolean; seat: boolean; status: 'available' | 'busy' | 'off' };

export function PhoneStatus() {
  const d = useLoad(() => get<Me>('/api/pbx/me'));
  const [busy, setBusy] = useState(false);
  if (Platform.OS !== 'ios' || !d.data || !(d.data.allowed && d.data.on && d.data.seat)) return null;
  const pick = async (status: Me['status']) => {
    setBusy(true);
    try { await put('/api/pbx/me', { status }); d.reload(); syncPhone(); } catch { /* shown by reload */ } finally { setBusy(false); }
  };
  const st = d.data.status;
  const opts: [Me['status'], string][] = [['available', t('Available')], ['busy', t('Busy')], ['off', t('Off')]];
  return (
    <Card style={{ gap: S.sm }}>
      <Text style={{ color: C.ink, fontSize: 16, fontWeight: '700' }}>{t('Business Phone')}</Text>
      <Muted>{st === 'available' ? t('Company calls ring on this iPhone, also when it is locked.') : t('Company calls will not ring on this iPhone.')}</Muted>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {opts.map(([k, l]) => (
          <Button key={k} title={l} kind={st === k ? 'primary' : 'secondary'} disabled={busy} onPress={() => pick(k)} style={{ flex: 1, minHeight: 44 }} />
        ))}
      </View>
    </Card>
  );
}
