import React, { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../lib/auth';
import { BASE, get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { day, time } from '../lib/format';
import { C, S } from '../lib/theme';
import { Card, Divider, Empty, ErrorBox, ListRow, Loading } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { t } from '../lib/i18n';

type N = { id: number; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

export default function Notifications() {
  const { reload } = useAuth();
  const d = useLoad(() => get<{ items: N[]; unread: number }>('/api/notifications'));
  useEffect(() => {
    if (d.data?.unread) post('/api/notifications/read').then(() => reload()).catch(() => {});
  }, [d.data?.unread, reload]);
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: S.lg, gap: S.md }}>
      {d.loading && !d.data ? <Loading /> : d.error && !d.data ? <ErrorBox text={d.error} onRetry={d.reload} /> : (
        <Card style={{ paddingVertical: S.xs }}>
          {d.data?.items.length ? d.data.items.map((n, i) => (
            <View key={n.id}>
              {i ? <Divider /> : null}
              <ListRow
                title={n.title}
                sub={`${n.body ? n.body + ' · ' : ''}${day(n.created_at)} ${time(n.created_at)}`}
                left={<View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: n.read_at ? 'transparent' : C.blue }} />}
                right={n.link ? <Icon name="chevron" size={18} color={C.faint} /> : <View />}
                onPress={n.link ? () => WebBrowser.openBrowserAsync(BASE + '/' + n.link!.replace(/^\//, '')) : undefined}
              />
            </View>
          )) : <Empty icon="bell" title={t('You\'re all caught up')} sub={t('New shifts, approvals and messages show up here.')} />}
        </Card>
      )}
    </ScrollView>
  );
}
