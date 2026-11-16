import React, { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { get, post } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Btn, In, Pick, Sheet, useBusy } from '../../ui/T1';
import { useLoad } from '../../lib/useLoad';
import { time } from '../../lib/format';
import { C, R, S } from '../../lib/theme';
import { Avatar, Card, Divider, Empty, ErrorBox, H2, ListRow, Loading, Muted, Pill, Screen } from '../../ui/kit';
import { t } from '../../lib/i18n';
import { Section, Summary } from '../../ui/Summary';
import { Icon } from '../../ui/Icon';

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
  const all = (d.data?.employees || []).filter((e) => e.status !== 'terminated');
  const onBreak = all.filter((e) => e.open_entry?.break_started_at).length;
  const onLeave = all.filter((e) => e.status === 'on_leave').length;
  const live = all.filter((e) => e.open_entry).length;
  // Add a team member right here (and invite them to the app), no website needed.
  const { session } = useAuth();
  const role = String(session?.user?.role || '');
  const canInviteAdmin = role === 'owner' || role === 'admin';
  const blank = { first_name: '', last_name: '', email: '', phone: '', job_title: '' };
  const [add, setAdd] = useState(false);
  const [f, setF] = useState(blank);
  const [inv, setInv] = useState<'employee' | 'manager' | 'admin' | 'none'>('employee');
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const save = () => {
    if (!f.first_name.trim() || !f.last_name.trim()) return setErr(t('Type their first and last name.'));
    if (inv !== 'none' && !/^\S+@\S+\.\S+$/.test(f.email.trim())) return setErr(t('Type their email so we can send the invite, or pick "No invite".'));
    setErr('');
    run('add', async () => {
      const r = await post<{ id: number }>('/api/employees', { first_name: f.first_name.trim(), last_name: f.last_name.trim(), email: f.email.trim() || null, phone: f.phone.trim() || null, job_title: f.job_title.trim() || null });
      if (inv !== 'none' && r?.id) await post(`/api/employees/${r.id}/invite`, { email: f.email.trim(), role: inv });
      setAdd(false); setF(blank); d.reload();
      if (r?.id) router.push(`/employee/${r.id}`);
    });
  };

  return (
    <Screen back title={t('Team')} subtitle={d.data ? t('{n} people · {w} working now', { n: list.length, w: working }) : t('Your people')} refreshing={d.refreshing} onRefresh={d.refresh}>
      {d.data ? <Summary seed={8} label={t('Team members')} value={String(all.length)}
        badge={live ? <Pill text={t('{n} working now', { n: live })} kind="good" /> : undefined}
        minis={[[t('Working now'), String(live - onBreak)], [t('On break'), String(onBreak)], [t('On leave'), String(onLeave)]]} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.field, borderRadius: R.md, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14 }}>
      <Icon name="users" size={18} color={C.sub} />
      <TextInput value={q} onChangeText={setQ} placeholder={t('Search by name, role or location')} placeholderTextColor={C.faint} accessibilityLabel={t('Search team')}
        style={{ flex: 1, minHeight: 48, fontSize: 16, color: C.ink }} />
      </View>
      {d.loading && !d.data ? <Loading /> : d.error && !d.data ? <ErrorBox text={d.error} onRetry={d.reload} /> : (
        <Section>
        <H2>{q ? t('Results') : t('Everyone')}</H2>
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
          )) : <Empty icon="users" title={t('No one found')} sub={t(q ? 'Try another search.' : 'Tap Add a team member below.')} />}
        </Card>
        </Section>
      )}
      <Btn text={t('Add a team member')} icon="plus" onPress={() => { setErr(''); setAdd(true); }} />
      <Sheet open={add} title={t('Add a team member')} onClose={() => setAdd(false)}>
        <In label={t('First name')} value={f.first_name} onChangeText={(v) => setF({ ...f, first_name: v })} error={err || undefined} />
        <In label={t('Last name')} value={f.last_name} onChangeText={(v) => setF({ ...f, last_name: v })} />
        <In label={t('Email')} value={f.email} onChangeText={(v) => setF({ ...f, email: v })} keyboardType="email-address" autoCapitalize="none" />
        <In label={t('Phone (optional)')} value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" />
        <In label={t('Job title (optional)')} value={f.job_title} onChangeText={(v) => setF({ ...f, job_title: v })} />
        <Pick<'employee' | 'manager' | 'admin' | 'none'> label={t('Invite to the app')} value={inv} onChange={setInv}
          items={[['employee', t('As staff')], ['manager', t('As manager')], ...(canInviteAdmin ? [['admin', t('As admin')] as ['admin', string]] : []), ['none', t('No invite')]]} />
        <Btn text={inv === 'none' ? t('Add') : t('Add and send invite')} icon="check" onPress={save} busy={busy === 'add'} />
      </Sheet>
    </Screen>
  );
}
