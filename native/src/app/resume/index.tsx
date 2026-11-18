// Résumé, built into the app: your résumés, make a new one (it starts from your profile), open one to edit.
import React from 'react';
import { router } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { day } from '../../lib/format';
import { t } from '../../lib/i18n';
import { Btn, Card, Dot, Hero, Item, None, State, Tag, ToolPage, useBusy } from '../../ui/T1';

type R = { id: number; title: string; template: string; share_token: string | null; updated_at: string };

export default function Resumes() {
  const d = useLoad(() => get<{ resumes: R[] }>('/api/me/resumes'));
  const { busy, run } = useBusy();
  const x = d.data;
  const make = () => run('new', async () => { const r = await post<{ id: number }>('/api/me/resumes', { title: t('My résumé'), template: 'classic', data: {} }); router.push(`/resume/${r.id}`); });
  return (
    <ToolPage title={t('Résumé')} right="plus" rightLabel={t('New résumé')} onRight={make} refreshing={d.refreshing} onRefresh={d.refresh}>
      <Hero id="rsh" label={t('Your résumés')} value={x ? String(x.resumes.length) : '—'} note={t('Ava can write it for you from a few notes')} noteGood stats={[[t('Shared'), x ? String(x.resumes.filter((r) => r.share_token).length) : '—']]} />
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Btn text={t('Make a new résumé')} icon="plus" onPress={make} busy={busy === 'new'} />
          <Card>
            {x.resumes.length ? x.resumes.map((r) => <Item key={r.id} onPress={() => router.push(`/resume/${r.id}`)} left={<Dot icon="doc" tone="nv" />} title={r.title} sub={t('Updated {d}', { d: day(r.updated_at) })} rightSub={r.share_token ? <Tag text={t('Shared')} tone="good" /> : undefined} />)
              : <None icon="doc" title={t('No résumé yet')} sub={t('Tap Make a new résumé. It starts from your profile.')} />}
          </Card>
        </>
      ) : null}
    </ToolPage>
  );
}
