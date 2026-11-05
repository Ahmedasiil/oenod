import React, { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../lib/auth';
import { BASE, get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { day, time } from '../lib/format';
import { C, S } from '../lib/theme';
import { Card, Divider, Empty, ErrorBox, H2, ListRow, Loading, Pill, Row } from '../ui/kit';
import { Icon, type IconName } from '../ui/Icon';
import { IconTile, Summary, tint } from '../ui/Summary';
import { t } from '../lib/i18n';

const ICON: Record<string, IconName> = { shift: 'calendar', schedule: 'calendar', timeoff: 'sun', pay: 'cash', payroll: 'cash', approval: 'check', message: 'mail', chat: 'mail', news: 'news', clock: 'clock', alert: 'shield' };
const TI: Record<string, number> = { shift: 0, schedule: 0, timeoff: 3, pay: 2, payroll: 2, approval: 2, message: 4, chat: 4, news: 1, clock: 4, alert: 5 };
type N = { id: number; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

export default function Notifications() {
  const { reload } = useAuth();
  const d = useLoad(() => get<{ items: N[]; unread: number }>('/api/notifications'));
  useEffect(() => {
    if (d.data?.unread) post('/api/notifications/read').then(() => reload()).catch(() => {});
  }, [d.data?.unread, reload]);
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }}>
      {d.loading && !d.data ? <Loading /> : d.error && !d.data ? <ErrorBox text={d.error} onRetry={d.reload} /> : (
        <>
        <Summary seed={17} label={t('Unread')} value={String(d.data?.unread ?? 0)}
          badge={d.data?.unread ? <Pill text={t('New')} kind="info" /> : <Pill text={t('All caught up')} kind="good" />}
          minis={[[t('Today'), String((d.data?.items || []).filter((n) => n.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length)], [t('Total'), String(d.data?.items.length ?? 0)]]} />
        <H2>{t('Latest')}</H2>
        <Card style={{ paddingVertical: S.xs }}>
          {d.data?.items.length ? d.data.items.map((n, i) => (
            <View key={n.id}>
              {i ? <Divider /> : null}
              <ListRow
                title={n.title}
                sub={`${n.body ? n.body + ' · ' : ''}${day(n.created_at)} ${time(n.created_at)}`}
                left={<IconTile name={ICON[n.kind] || 'bell'} color={tint(TI[n.kind] ?? 0)} />}
                right={<Row style={{ gap: 6 }}>{n.read_at ? null : <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: C.blue }} />}{n.link ? <Icon name="chevron" size={18} color={C.faint} /> : null}</Row>}
                onPress={n.link ? () => WebBrowser.openBrowserAsync(BASE + '/' + n.link!.replace(/^\//, '')) : undefined}
              />
            </View>
          )) : <Empty icon="bell" title={t('You\'re all caught up')} sub={t('New shifts, approvals and messages show up here.')} />}
        </Card>
        </>
      )}
    </ScrollView>
  );
}
