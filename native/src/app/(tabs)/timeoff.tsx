import React, { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { date, label } from '../../lib/format';
import { C, S } from '../../lib/theme';
import { Avatar, B, Button, Card, Empty, ErrorBox, H2, Loading, Muted, Pill, Row, Screen } from '../../ui/kit';
import { t } from '../../lib/i18n';

type Req = { id: number; employee_id: number; kind: string; starts_on: string; ends_on: string; reason: string | null; status: string; first_name: string; last_name: string; color: string | null };
const KINDS: Record<string, string> = { vacation: 'Vacation', sick: 'Sick day', personal: 'Personal', unpaid: 'Unpaid' };
const kindName = (k: string) => (KINDS[k] ? t(KINDS[k]) : label(k));
const pillKind = (s: string) => (s === 'approved' ? 'good' : s === 'denied' ? 'bad' : 'warn') as 'good' | 'bad' | 'warn';
const days = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000) + 1;

function ReqCard({ r, canDecide, mine, onDone }: { r: Req; canDecide: boolean; mine: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const decide = async (status: 'approved' | 'denied') => {
    setBusy(status);
    try { await post(`/api/timeoff/${r.id}/decide`, { status }); onDone(); }
    catch (e: any) { if (Platform.OS === 'web') window.alert(e.message); else Alert.alert(t('Not done'), e.message); }
    finally { setBusy(null); }
  };
  const n = days(r.starts_on, r.ends_on);
  return (
    <Card>
      <Row>
        {!mine ? <Avatar name={`${r.first_name} ${r.last_name}`} color={r.color} size={38} /> : null}
        <View style={{ flex: 1 }}>
          <B>{mine ? kindName(r.kind) : `${r.first_name} ${r.last_name}`}</B>
          <Muted>{!mine ? `${kindName(r.kind)} · ` : ''}{r.starts_on === r.ends_on ? date(r.starts_on) : `${date(r.starts_on)} – ${date(r.ends_on)}`} · {n === 1 ? t('1 day') : t('{n} days', { n })}</Muted>
          {r.reason ? <Muted style={{ marginTop: 2 }}>“{r.reason}”</Muted> : null}
        </View>
        <Pill text={label(r.status)} kind={pillKind(r.status)} />
      </Row>
      {canDecide && r.status === 'pending' ? (
        <Row style={{ marginTop: S.md }}>
          <Button title={t('Deny')} kind="secondary" icon="x" onPress={() => decide('denied')} busy={busy === 'denied'} style={{ flex: 1 }} />
          <Button title={t('Approve')} icon="check" onPress={() => decide('approved')} busy={busy === 'approved'} style={{ flex: 1 }} />
        </Row>
      ) : null}
    </Card>
  );
}

export default function TimeOff() {
  const { isManager, session } = useAuth();
  const d = useLoad(() => get<{ requests: Req[] }>('/api/timeoff'));
  const me = session?.employee?.id;
  const all = d.data?.requests || [];
  const mine = all.filter((r) => r.employee_id === me);
  const team = all.filter((r) => r.employee_id !== me);
  const pending = team.filter((r) => r.status === 'pending');
  const decided = team.filter((r) => r.status !== 'pending').slice(0, 15);

  return (
    <Screen title={t('Time off')} subtitle={t('Vacation, sick days and personal time')} refreshing={d.refreshing} onRefresh={d.refresh}>
      {session?.employee ? <Button title={t('Request time off')} icon="plus" onPress={() => router.push('/timeoff-new')} /> : null}
      {d.loading && !d.data ? <Loading /> : d.error && !d.data ? <ErrorBox text={d.error} onRetry={d.reload} /> : (
        <>
          {isManager ? (
            <>
              <H2>{t('To review')}{pending.length ? ` (${pending.length})` : ''}</H2>
              {pending.length ? pending.map((r) => <ReqCard key={r.id} r={r} canDecide mine={false} onDone={d.reload} />) : <Card><Muted>{t('Nothing waiting for your approval.')}</Muted></Card>}
            </>
          ) : null}
          {session?.employee ? (
            <>
              <H2>{t('My requests')}</H2>
              {mine.length ? mine.map((r) => <ReqCard key={r.id} r={r} canDecide={false} mine onDone={d.reload} />) : <Card><Empty icon="sun" title={t('No requests yet')} sub={t('Ask for vacation, a sick day or personal time. Your manager gets notified right away.')} /></Card>}
            </>
          ) : null}
          {isManager && decided.length ? (
            <>
              <H2>{t('Recently decided')}</H2>
              {decided.map((r) => <ReqCard key={r.id} r={r} canDecide={false} mine={false} onDone={d.reload} />)}
            </>
          ) : null}
          <View style={{ height: 8 }} />
          <Muted style={{ color: C.faint, textAlign: 'center' }}>{t('Changes show on the website instantly.')}</Muted>
        </>
      )}
    </Screen>
  );
}
