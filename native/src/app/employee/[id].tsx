import React from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { get } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { day, hm, label, minutesBetween, time } from '../../lib/format';
import { C, S } from '../../lib/theme';
import { Avatar, B, Button, Card, Divider, ErrorBox, H2, ListRow, Loading, Muted, Pill, Row } from '../../ui/kit';
import { t } from '../../lib/i18n';
import { DateTile, IconTile, Mini, tint } from '../../ui/Summary';
import { HeroCard, PoweredBy } from '../../ui/Brand';
import { Rise } from '../../ui/Motion';

export default function Employee() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useLoad(() => get(`/api/employees/${Number(id)}`), [id]);
  if (d.loading && !d.data) return <Loading />;
  if (!d.data) return <View style={{ padding: S.lg }}><ErrorBox text={d.error || t('Not found.')} onRetry={d.reload} /></View>;
  const e = d.data;
  const tel = e.phone ? String(e.phone).replace(/[^\d+]/g, '') : '';
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }}>
      <Rise><HeroCard seed={16} style={{ alignItems: 'center' }}>
        <View style={{ borderRadius: 44, padding: 3, backgroundColor: 'rgba(255,255,255,0.18)' }}><Avatar name={e.name} color={e.color} size={76} /></View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.white }}>{e.name}</Text>
        <Text style={{ color: C.mist, textAlign: 'center' }}>{[e.job_title, e.department, e.location].filter(Boolean).join(' · ') || t('Team member')}</Text>
        <Row><Pill text={label(e.status)} kind={e.status === 'active' ? 'good' : 'warn'} />{e.account_role ? <Pill text={label(e.account_role)} kind="info" /> : <Pill text={t('No app account yet')} kind="info" />}</Row>
        <Row style={{ gap: 8, alignSelf: 'stretch' }}>
          <Mini label={t('Upcoming shifts')} value={String((e.upcoming_shifts || []).length)} />
          <Mini label={t('Recent time')} value={hm((e.recent_time || []).slice(0, 10).reduce((a: number, r: any) => a + (r.minutes ?? minutesBetween(r.clock_in, r.clock_out) ?? 0), 0))} />
        </Row>
      </HeroCard></Rise>
      <Row>
        {tel ? <Button title={t('Call')} icon="phone" kind="secondary" onPress={() => Linking.openURL(`tel:${tel}`)} style={{ flex: 1 }} /> : null}
        {tel ? <Button title={t('Text')} icon="mail" kind="secondary" onPress={() => Linking.openURL(`sms:${tel}`)} style={{ flex: 1 }} /> : null}
        {e.email ? <Button title={t('Email')} icon="mail" kind="secondary" onPress={() => Linking.openURL(`mailto:${e.email}`)} style={{ flex: 1 }} /> : null}
      </Row>
      <H2>{t('Contact')}</H2>
      <Card style={{ paddingVertical: S.xs }}>
        {e.phone ? <><ListRow title={e.phone} sub={t('Phone')} left={<IconTile name="phone" color={tint(2)} size={36} />} /><Divider /></> : null}
        {e.email ? <><ListRow title={e.email} sub={t('Email')} left={<IconTile name="mail" color={tint(0)} size={36} />} /><Divider /></> : null}
        <ListRow title={e.hire_date || '—'} sub={t('Hired')} left={<IconTile name="briefcase" color={tint(1)} size={36} />} />
        {e.emergency_name ? <><Divider /><ListRow title={`${e.emergency_name}${e.emergency_phone ? ' · ' + e.emergency_phone : ''}`} sub={t('Emergency contact')} left={<IconTile name="shield" color={tint(5)} size={36} />} /></> : null}
      </Card>
      <H2>{t('Upcoming shifts')}</H2>
      <Card>
        {(e.upcoming_shifts || []).length ? e.upcoming_shifts.slice(0, 10).map((s: any, i: number) => (
          <View key={s.id}>{i ? <Divider /> : null}<ListRow left={<DateTile iso={s.starts_at} />} title={`${time(s.starts_at)}–${time(s.ends_at)}`} sub={[s.role, s.location].filter(Boolean).join(' · ') || undefined} right={<Muted>{hm(minutesBetween(s.starts_at, s.ends_at))}</Muted>} /></View>
        )) : <Muted>{t('No upcoming shifts.')}</Muted>}
      </Card>
      <H2>{t('Recent time')}</H2>
      <Card>
        {(e.recent_time || []).length ? e.recent_time.slice(0, 10).map((r: any, i: number) => (
          <View key={r.id}>{i ? <Divider /> : null}<ListRow left={<IconTile name="clock" color={tint(r.status === 'approved' ? 2 : 0)} size={36} />} title={`${day(r.clock_in)}, ${time(r.clock_in)}–${r.clock_out ? time(r.clock_out) : t('now')}`} sub={label(r.status)} right={<B>{hm(r.minutes ?? minutesBetween(r.clock_in, r.clock_out))}</B>} /></View>
        )) : <Muted>{t('No time recorded yet.')}</Muted>}
      </Card>
      <PoweredBy />
      </ScrollView>
  );
}
