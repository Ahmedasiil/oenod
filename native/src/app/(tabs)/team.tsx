import React, { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { get } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { time } from '../../lib/format';
import { C, R, S } from '../../lib/theme';
import { Avatar, Card, Divider, Empty, ErrorBox, ListRow, Loading, Muted, Pill, Screen } from '../../ui/kit';
import { t } from '../../lib/i18n';

type Emp = { id: number; name: string; job_title: string | null; location: string | null; status: string; color: string | null; open_entry: { clock_in: string; break_started_at: string | null } | null; account_role: string | null };

export default function Team() {
  const d = useLoad(() => get<{ employees: Emp[] }>('/api/employees'));
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const all = (d.data?.employees || []).filter((e) => e.status !== 'terminated');
    const s = q.trim().toLowerCase();
    return s ? all.filter((e) => `${e.name} ${e.job_title || ''} ${e.location || ''}`.toLowerCase().includes(s)) : all;
  }, [d.data, q]);
  const working = list.filter((e) => e.open_entry).length;

  return (
    <Screen title={t('Team')} subtitle={d.data ? t('{n} people · {w} working now', { n: list.length, w: working }) : t('Your people')} refreshing={d.refreshing} onRefresh={d.refresh}>
      <TextInput value={q} onChangeText={setQ} placeholder={t('Search by name, role or location')} placeholderTextColor={C.faint} accessibilityLabel={t('Search team')}
        style={{ backgroundColor: C.field, borderRadius: R.md, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, minHeight: 48, fontSize: 16, color: C.ink }} />
      {d.loading && !d.data ? <Loading /> : d.error && !d.data ? <ErrorBox text={d.error} onRetry={d.reload} /> : (
        <Card style={{ paddingVertical: S.xs }}>
          {list.length ? list.map((e, i) => (
            <View key={e.id}>
              {i ? <Divider /> : null}
              <ListRow
                title={e.name}
                sub={[e.job_title, e.location].filter(Boolean).join(' · ') || t('Team member')}
                left={<Avatar name={e.name} color={e.color} />}
                right={e.open_entry ? <Pill text={e.open_entry.break_started_at ? t('Break') : t('In · {t}', { t: time(e.open_entry.clock_in) })} kind={e.open_entry.break_started_at ? 'warn' : 'good'} /> : e.status === 'on_leave' ? <Pill text={t('On leave')} kind="warn" /> : undefined}
                onPress={() => router.push(`/employee/${e.id}`)}
              />
            </View>
          )) : <Empty icon="users" title={t('No one found')} sub={t(q ? 'Try another search.' : 'Add team members on the website.')} />}
        </Card>
      )}
      <Muted style={{ textAlign: 'center' }}>{t('Add or edit people on oenod.com. Changes show here right away.')}</Muted>
    </Screen>
  );
}
