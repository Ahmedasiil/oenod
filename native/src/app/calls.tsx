// Business Phone, full screen inside the app: your own ring status, every call with notes and Call back,
// and (owners and admins) who rings, how long, after-hours and text-back. Replaces the website /calls page.
import React, { useState } from 'react';
import { router } from 'expo-router';
import { get, put } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date, time } from '../lib/format';
import { t } from '../lib/i18n';
import { dialOut } from '../lib/phone';
import { pretty } from './(tabs)/phone';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Sheet, State, Tag, ToolPage, oops, useBusy } from '../ui/T1';

type Me = { allowed?: boolean; ready?: boolean; on?: boolean; seat?: boolean; status?: string; line?: string | null; can_manage?: boolean };
type Call = { id: number; dir: string; number: string; customer: string | null; state: string; agent: string | null; at: string; secs: number; note: string | null; recorded: boolean };
type Person = { id: number; name: string; seat: boolean; me: boolean; status: string };
type Cfg = { on: boolean; ring: number; shift_only: boolean; cell: string; after: string; notes: boolean; textback: boolean; hours: boolean };
type PSet = { cfg: Cfg; allowed: boolean; line: string | null; people: Person[]; seats: number };

const missed = (c: Call) => c.dir === 'in' && !c.secs && c.state !== 'live';
const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60 ? (s % 60) + ' s' : ''}`.trim() : `${s} s`);
const yn = (b: boolean) => (b ? 'yes' : 'no');

export default function CallsScreen() {
  const me = useLoad(() => get<Me>('/api/pbx/me'));
  const cl = useLoad(() => get<{ calls: Call[] }>('/api/pbx/calls'));
  const m = me.data;
  const st = useLoad(() => (m?.can_manage ? get<PSet>('/api/pbx/settings') : Promise.resolve(null)), [m?.can_manage]);
  const { busy, run } = useBusy();
  const [tab, setTab] = useState<'all' | 'missed' | 'in' | 'out'>('all');
  const [sel, setSel] = useState<Call | null>(null);
  const [note, setNote] = useState('');
  const [ed, setEd] = useState<{ on: string; ring: string; shift: string; after: string; cell: string; textback: string; notes: string; hours: string; seats: number[] } | null>(null);
  const [err, setErr] = useState('');
  const all = cl.data?.calls || [];
  const list = all.filter((c) => (tab === 'missed' ? missed(c) : tab === 'all' ? true : c.dir === tab));
  const s = st.data;

  const setStatus = (v: string) => run('me' + v, async () => { await put('/api/pbx/me', { status: v }); me.reload(); });
  const callBack = async (n: string) => { if (!(await dialOut(n))) oops(t('Calling works in the OENOD app on your phone. Number: {n}', { n: pretty(n) })); };
  const openCall = (c: Call) => { setSel(c); setNote(c.note || ''); };
  const saveNote = () => sel && run('nt', async () => { await put(`/api/pbx/calls/${sel.id}/note`, { note }); setSel(null); cl.reload(); });
  const openSet = () => s && (setErr(''), setEd({ on: yn(s.cfg.on), ring: String(s.cfg.ring), shift: yn(s.cfg.shift_only), after: s.cfg.after, cell: s.cfg.cell ? pretty(s.cfg.cell) : '', textback: yn(s.cfg.textback), notes: yn(s.cfg.notes), hours: yn(s.cfg.hours), seats: s.people.filter((p) => p.seat).map((p) => p.id) }));
  const saveSet = () => {
    if (!ed) return;
    const d = ed.cell.replace(/\D/g, '');
    if (ed.after === 'cell' && d.length < 10) return setErr(t('Type the 10-digit cell number that should ring after hours.'));
    if (ed.on === 'yes' && !ed.seats.length) return setErr(t('Pick at least one person to ring.'));
    setErr('');
    run('sv', async () => {
      await put('/api/pbx/settings', { on: ed.on === 'yes', ring: Number(ed.ring), shift_only: ed.shift === 'yes', after: ed.after, cell: d, textback: ed.textback === 'yes', notes: ed.notes === 'yes', hours: ed.hours === 'yes', seats: ed.seats });
      setEd(null); st.reload(); me.reload();
    });
  };
  const seat = (id: number) => ed && setEd({ ...ed, seats: ed.seats.includes(id) ? ed.seats.filter((x) => x !== id) : [...ed.seats, id] });

  return (
    <ToolPage title={t('Business Phone')} right={m?.can_manage && s ? 'dots' : undefined} rightLabel={t('Who rings and opening hours')} onRight={openSet}
      refreshing={cl.refreshing} onRefresh={() => { cl.refresh(); me.reload(); st.reload(); }}>
      {m ? <Hero id="pbx" label={t('Company line')} value={m.line ? pretty(m.line) : t('No line yet')} note={m.on ? t('Calls ring the team in the app') : t('Business Phone is off')} noteGood={!!m.on}
        stats={[[t('Calls'), String(all.length)], [t('Missed'), String(all.filter(missed).length)], [t('Ringing'), s ? String(s.seats) : m.seat ? t('You') : '—']]} /> : null}
      <State loading={me.loading && !m} error={!m ? me.error : null} onRetry={me.reload} />
      {m && !m.allowed && !m.line ? (
        <Card>
          <None icon="phone" title={t('No company phone line yet')} sub={t('The OENOD team can set up a phone number for your company.')} />
          <Btn text={t('Ask the OENOD team')} icon="chat" kind="blue" onPress={() => router.push('/support' as any)} />
        </Card>
      ) : null}
      {m ? (
        <>
          {m.seat ? (
            <Pick<string> label={t('When the company line rings')} value={m.status === 'busy' || m.status === 'off' ? m.status : 'available'} onChange={setStatus}
              items={[['available', t('Ring me')], ['busy', t('Busy, skip me')], ['off', t('Off, do not ring me')]]} />
          ) : null}
          <Chips value={tab} onChange={setTab} items={[['all', t('All'), all.length], ['missed', t('Missed'), all.filter(missed).length], ['in', t('Incoming')], ['out', t('Outgoing')]]} />
          <Card>
            {list.length ? list.slice(0, 120).map((c) => (
              <Item key={c.id} onPress={() => openCall(c)} left={<Dot icon="phone" tone={missed(c) ? 'bad' : c.dir === 'out' ? 'nv' : 'good'} />}
                title={c.customer || pretty(c.number)} sub={[`${date(c.at.slice(0, 10))} ${time(c.at)}`, c.agent, c.note ? t('note') : null].filter(Boolean).join(' · ')}
                right={c.secs ? dur(c.secs) : undefined} rightSub={missed(c) ? <Tag text={t('Missed')} tone="bad" /> : c.state === 'live' ? <Tag text={t('Live')} tone="good" /> : undefined} />
            )) : <None icon="phone" title={cl.loading ? t('Loading…') : t('No calls yet')} sub={t('Calls to your company number show up here')} />}
          </Card>
          {s ? (
            <Card title={t('Who rings')} right={t('Change')} onRight={openSet}>
              {s.people.filter((p) => p.seat).map((p) => <Item key={p.id} left={<Dot icon="user" tone={p.status === 'available' ? 'good' : p.status === 'on_call' ? 'nv' : 'dk'} />} title={p.name + (p.me ? ` (${t('you')})` : '')} rightSub={<Tag text={t(p.status === 'on_call' ? 'On a call' : p.status === 'available' ? 'Available' : p.status === 'busy' ? 'Busy' : 'Off')} />} />)}
              {!s.seats ? <None icon="users" title={t('Nobody rings yet')} sub={t('Tap Change to pick who answers the company line.')} /> : null}
              <Item title={t('Rings for')} right={t('{n} seconds', { n: s.cfg.ring })} />
              <Item title={t('After hours')} right={s.cfg.after === 'cell' ? pretty(s.cfg.cell || '') || t('Cell') : t('Ava answers')} />
            </Card>
          ) : null}
        </>
      ) : null}

      <Sheet open={!!sel} title={sel ? sel.customer || pretty(sel.number) : ''} onClose={() => setSel(null)}>
        {sel ? (
          <>
            <Item title={t(sel.dir === 'out' ? 'Outgoing call' : missed(sel) ? 'Missed call' : 'Incoming call')} sub={`${date(sel.at.slice(0, 10))} ${time(sel.at)}${sel.agent ? ' · ' + sel.agent : ''}`} right={sel.secs ? dur(sel.secs) : undefined} />
            <Btn text={t('Call back')} icon="phone" kind="blue" onPress={() => callBack(sel.number)} />
            <In label={t('Call notes')} value={note} onChangeText={setNote} multiline style={{ minHeight: 110 }} placeholder={t('What was the call about?')} />
            <Btn text={t('Save notes')} icon="check" onPress={saveNote} busy={busy === 'nt'} />
          </>
        ) : null}
      </Sheet>

      <Sheet open={!!ed} title={t('Who rings and opening hours')} onClose={() => setEd(null)}>
        {ed && s ? (
          <>
            <Pick<string> label={t('Business Phone')} value={ed.on} onChange={(v) => setEd({ ...ed, on: v })} items={[['yes', t('On, ring the team')], ['no', t('Off')]]} />
            <Card title={t('Who rings')}>
              {s.people.map((p) => <Item key={p.id} onPress={() => seat(p.id)} left={<Dot icon={ed.seats.includes(p.id) ? 'check' : 'user'} tone={ed.seats.includes(p.id) ? 'good' : 'dk'} />} title={p.name} rightSub={<Tag text={ed.seats.includes(p.id) ? t('Rings') : t('Does not ring')} tone={ed.seats.includes(p.id) ? 'good' : 'plain'} />} />)}
            </Card>
            <Pick<string> label={t('Ring for')} value={ed.ring} onChange={(v) => setEd({ ...ed, ring: v })} items={['15', '20', '25', '30', '40'].map((n) => [n, t('{n} seconds', { n })] as [string, string])} />
            <Pick<string> label={t('Only ring people on shift')} value={ed.shift} onChange={(v) => setEd({ ...ed, shift: v })} items={[['yes', t('Yes')], ['no', t('No, ring everyone picked')]]} />
            <Pick<string> label={t('Follow opening hours')} value={ed.hours} onChange={(v) => setEd({ ...ed, hours: v })} items={[['yes', t('Yes')], ['no', t('No, ring any time')]]} />
            <Pick<string> label={t('When nobody answers or after hours')} value={ed.after} onChange={(v) => setEd({ ...ed, after: v })} items={[['ava', t('Ava answers and takes a message')], ['cell', t('Ring a cell phone')]]} />
            {ed.after === 'cell' ? <In label={t('Cell number')} value={ed.cell} onChangeText={(v) => setEd({ ...ed, cell: v })} keyboardType="phone-pad" placeholder="(780) 555-0100" /> : null}
            <Pick<string> label={t('Text back missed callers')} value={ed.textback} onChange={(v) => setEd({ ...ed, textback: v })} items={[['yes', t('Yes')], ['no', t('No')]]} />
            <Pick<string> label={t('Ava call notes')} value={ed.notes} onChange={(v) => setEd({ ...ed, notes: v })} items={[['yes', t('Yes')], ['no', t('No')]]} />
            {err ? <Tag text={err} tone="bad" /> : null}
            <Btn text={t('Save')} icon="check" kind="blue" onPress={saveSet} busy={busy === 'sv'} />
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
