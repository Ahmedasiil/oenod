import React from 'react';
import { ScrollView, View } from 'react-native';
import { get } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { day, hm, label, time } from '../lib/format';
import { C, S } from '../lib/theme';
import { B, Card, Divider, Empty, ErrorBox, H2, ListRow, Loading, Pill, Row } from '../ui/kit';
import { IconTile, Summary, tint } from '../ui/Summary';
import { t } from '../lib/i18n';

type E = { id: number; clock_in: string; clock_out: string | null; status: string; minutes: number; location: string | null; break_minutes: number };

export default function Timesheet() {
  const d = useLoad(() => get<{ entries: E[] }>('/api/me/timesheet'));
  const entries = d.data?.entries || [];
  const weekAgo = Date.now() - 7 * 86400000;
  const week = entries.filter((e) => new Date(e.clock_in.replace(' ', 'T') + 'Z').getTime() >= weekAgo).reduce((a, e) => a + (e.minutes || 0), 0);
  const month = entries.reduce((a, e) => a + (e.minutes || 0), 0);
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }}>
      {d.loading && !d.data ? <Loading /> : d.error && !d.data ? <ErrorBox text={d.error} onRetry={d.reload} /> : (
        <>
          <Summary seed={14} label={t('Last 7 days')} value={hm(week)}
            badge={entries.some((e) => !e.clock_out) ? <Pill text={t('Clocked in')} kind="good" /> : undefined}
            minis={[[t('Last 31 days'), hm(month)], [t('Shifts worked'), String(entries.length)], [t('Approved'), String(entries.filter((e) => e.status === 'approved').length)]]} />
          <H2>{t('Recent hours')}</H2>
          <Card style={{ paddingVertical: S.xs }}>
            {entries.length ? entries.map((e, i) => (
              <View key={e.id}>
                {i ? <Divider /> : null}
                <ListRow
                  left={<IconTile name="clock" color={tint(e.status === 'approved' ? 2 : e.status === 'open' ? 0 : 1)} />}
                  title={`${day(e.clock_in)} · ${time(e.clock_in)}–${e.clock_out ? time(e.clock_out) : t('now')}`}
                  sub={[e.location, e.break_minutes ? t('{n} min break', { n: e.break_minutes }) : null].filter(Boolean).join(' · ') || undefined}
                  right={<View style={{ alignItems: 'flex-end', gap: 4 }}><B>{hm(e.minutes)}</B><Pill text={label(e.status)} kind={e.status === 'approved' ? 'good' : e.status === 'open' ? 'info' : 'plain'} /></View>}
                />
              </View>
            )) : <Empty icon="clock" title={t('No hours yet')} sub={t('Clock in from the Home tab and your hours appear here.')} />}
          </Card>
        </>
      )}
    </ScrollView>
  );
}
