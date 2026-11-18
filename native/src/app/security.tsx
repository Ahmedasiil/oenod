// Company security, built into the app (owners and admins): auto sign-out times, admins without 2-step sign-in, failed sign-ins, locked accounts and the security log.
import React, { useState } from 'react';
import { get, put } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date } from '../lib/format';
import { t } from '../lib/i18n';
import { Btn, Card, Dot, Hero, Item, None, Pick, State, Tag, ToolPage, useBusy } from '../ui/T1';

type S = { settings: { idle_admin: number; idle_staff: number }; choices: number[]; events: { id: number; created_at: string; kind: string; severity: string; action: string | null; detail: string | null; name: string | null }[];
  locked: { user_id: number; created_at: string; name: string; email: string }[]; failed_7d: number; admins: number; admins_no_2fa: { name: string; email: string; role: string }[]; my_2fa: boolean; can_edit: boolean };
const mins = (m: number) => (m < 60 ? t('{n} minutes', { n: m }) : m === 60 ? t('1 hour') : t('{n} hours', { n: m / 60 }));

export default function Security() {
  const d = useLoad(() => get<S>('/api/sec/company'));
  const [idle, setIdle] = useState<{ a: string; s: string } | null>(null);
  const { busy, run } = useBusy();
  const x = d.data;
  const cur = idle || (x ? { a: String(x.settings.idle_admin), s: String(x.settings.idle_staff) } : { a: '', s: '' });
  const changed = !!x && (cur.a !== String(x.settings.idle_admin) || cur.s !== String(x.settings.idle_staff));
  const save = () => run('sv', async () => { await put('/api/sec/company', { idle_admin: Number(cur.a), idle_staff: Number(cur.s) }); setIdle(null); d.reload(); });
  const score = x ? Math.max(0, 100 - x.admins_no_2fa.length * 20 - x.locked.length * 10 - Math.min(30, x.failed_7d * 2)) : 0;
  return (
    <ToolPage title={t('Security')} refreshing={d.refreshing} onRefresh={d.refresh}>
      {x ? <Hero id="sec" label={t('Security score')} value={`${score} / 100`} note={x.admins_no_2fa.length ? t('{n} admins have no 2-step sign-in', { n: x.admins_no_2fa.length }) : t('Every admin uses 2-step sign-in')} noteGood={!x.admins_no_2fa.length}
        stats={[[t('Admins'), String(x.admins)], [t('Failed sign-ins, 7 days'), String(x.failed_7d)], [t('Locked'), String(x.locked.length)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          {x.admins_no_2fa.length ? <Card title={t('Needs 2-step sign-in')}>{x.admins_no_2fa.map((p) => <Item key={p.email} left={<Dot icon="shield" tone="warn" />} title={p.name} sub={p.email} rightSub={<Tag text={t(p.role)} />} />)}</Card> : null}
          <Card title={t('Sign people out when idle')}>
            <Pick<string> label={t('Owners and admins')} value={cur.a} onChange={(v) => setIdle({ ...cur, a: v })} items={x.choices.map((c) => [String(c), mins(c)] as [string, string])} />
            <Pick<string> label={t('Everyone else')} value={cur.s} onChange={(v) => setIdle({ ...cur, s: v })} items={x.choices.map((c) => [String(c), mins(c)] as [string, string])} />
          </Card>
          {changed && x.can_edit ? <Btn text={t('Save')} icon="check" kind="blue" onPress={save} busy={busy === 'sv'} /> : null}
          {x.locked.length ? <Card title={t('Locked accounts')}>{x.locked.map((p) => <Item key={p.user_id} left={<Dot icon="shield" tone="bad" />} title={p.name} sub={`${p.email} · ${date(p.created_at.slice(0, 10))}`} />)}</Card> : null}
          <Card title={t('Security log, 90 days')}>
            {x.events.length ? x.events.slice(0, 30).map((e) => <Item key={e.id} left={<Dot icon="shield" tone={e.severity === 'high' ? 'bad' : e.severity === 'medium' ? 'warn' : 'dk'} />} title={e.detail || t(e.kind)} sub={[e.name, date(e.created_at.slice(0, 10))].filter(Boolean).join(' · ')} />)
              : <None icon="check" title={t('Nothing unusual')} />}
          </Card>
        </>
      ) : null}
    </ToolPage>
  );
}
