// Plan the week, inside the app (managers): add shifts for one or many people and days, edit or remove a shift,
// search the week, let Ava fill open shifts, copy the week forward and publish. Replaces the website /schedule board.
import React, { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { del, get, post, put } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { date, time, utc } from '../lib/format';
import { t } from '../lib/i18n';
import { Btn, Card, Chips, Dot, Hero, In, Item, None, Pick, Search, Sheet, State, Tag, ToolPage, isYmd, sure, useBusy } from '../ui/T1';

type Shift = { id: number; employee_id: number | null; starts_at: string; ends_at: string; date: string; minutes: number; break_minutes: number; role: string | null; notes: string | null; published: number | boolean; warnings?: string[]; slots?: number };
type Person = { id: number; name: string; job_title?: string | null };
type Week = { from: string; to: string; shifts: Shift[]; people: Person[]; drafts: number; unconfirmed: number; warnings: number };
type Ed = { id?: number; who: string; days: string[]; start: string; end: string; brk: string; role: string; notes: string; publish: string };

const addDays = (ymd: string, n: number) => { const d = new Date(ymd + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const monday = (ymd: string) => { const d = new Date(ymd + 'T12:00:00'); const k = (d.getDay() + 6) % 7; return addDays(ymd, -k); };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const hhmm = (s: string) => { const d = utc(s); return d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : ''; };
const okTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const fixTime = (s: string) => { const m = s.trim().match(/^(\d{1,2})(?::?(\d{2}))?$/); return m ? `${m[1].padStart(2, '0')}:${m[2] || '00'}` : s.trim(); };
const hrs = (m: number) => `${Math.round(m / 6) / 10} h`;
const wd = (ymd: string) => new Date(ymd + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' });

export default function ShiftPlan() {
  const q = useLocalSearchParams<{ day?: string; add?: string }>();
  const [from, setFrom] = useState(monday(isYmd(String(q.day || '')) ? String(q.day) : today()));
  const d = useLoad(() => get<Week>(`/api/schedule?from=${from}`), [from]);
  const x = d.data;
  const { busy, run } = useBusy();
  const [s, setS] = useState('');
  const [tab, setTab] = useState<'all' | 'open' | 'draft'>('all');
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(from, i)), [from]);
  const blank = (day?: string): Ed => ({ who: '', days: [day && days.includes(day) ? day : days[0]], start: '09:00', end: '17:00', brk: '30', role: '', notes: '', publish: 'no' });
  const [ed, setEd] = useState<Ed | null>(q.add ? blank(String(q.day || '')) : null);
  const [err, setErr] = useState('');
  const people = x?.people || [];
  const nm = (id: number | null) => (id ? people.find((p) => p.id === id)?.name || t('Someone') : t('Open shift'));
  const all = x?.shifts || [];
  const open = all.filter((y) => !y.employee_id);
  const list = all.filter((y) => (tab === 'open' ? !y.employee_id : tab === 'draft' ? !y.published : true))
    .filter((y) => !s.trim() || `${nm(y.employee_id)} ${y.role || ''} ${y.notes || ''}`.toLowerCase().includes(s.trim().toLowerCase()))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const mins = all.reduce((a, y) => a + (y.minutes || 0) - (y.break_minutes || 0), 0);

  const edit = (y: Shift) => { setErr(''); setEd({ id: y.id, who: y.employee_id ? String(y.employee_id) : '', days: [y.date], start: hhmm(y.starts_at), end: hhmm(y.ends_at), brk: String(y.break_minutes || 0), role: y.role || '', notes: y.notes || '', publish: y.published ? 'yes' : 'no' }); };
  const toggleDay = (k: string) => ed && setEd({ ...ed, days: ed.id ? [k] : ed.days.includes(k) ? ed.days.filter((z) => z !== k) : [...ed.days, k] });
  const save = () => {
    if (!ed) return;
    const st = fixTime(ed.start), en = fixTime(ed.end);
    if (!ed.days.length) return setErr(t('Pick at least one day.'));
    if (!okTime(st) || !okTime(en)) return setErr(t('Use times like 09:00 or 17:30.'));
    setErr('');
    const base = { start: st, end: en, break_minutes: Number(ed.brk) || 0, role: ed.role.trim() || null, notes: ed.notes.trim() || null };
    run('sv', async () => {
      if (ed.id) await put(`/api/schedule/shifts/${ed.id}`, { ...base, date: ed.days[0], employee_id: ed.who ? Number(ed.who) : null });
      else await post('/api/schedule/shifts', { ...base, dates: ed.days.sort(), employee_ids: ed.who ? [Number(ed.who)] : [], publish: ed.publish === 'yes' });
      setEd(null); d.reload();
    });
  };
  const remove = () => ed?.id && sure(t('Remove this shift?'), t('If it was published, the person is told.'), t('Remove'), () => run('rm', async () => { await del(`/api/shifts/${ed.id}`); setEd(null); d.reload(); }), true);
  const publish = () => sure(t('Publish this week?'), t('Everyone with a shift gets a notification to confirm it.'), t('Publish'), () => run('pb', async () => {
    const r = await post<{ published: number }>('/api/schedule/publish', { from, to: addDays(from, 6) });
    sure(t('Published'), t('{n} shifts are live for the team.', { n: r.published }), t('OK'), () => {}); d.reload();
  }));
  const auto = () => run('au', async () => {
    const r = await post<{ assigned: number; unfilled: number }>('/api/schedule/auto', { from });
    sure(t('Ava filled open shifts'), r.unfilled ? t('{a} filled. {u} still need someone.', { a: r.assigned, u: r.unfilled }) : t('{a} filled. Check them, then publish.', { a: r.assigned }), t('OK'), () => {}); d.reload();
  });
  const copy = () => sure(t('Copy this week to next week?'), t('Shifts are added as drafts. Nothing is sent until you publish.'), t('Copy'), () => run('cp', async () => {
    const r = await post<{ copied: number }>('/api/schedule/copy', { from, weeks: 1 });
    sure(t('Copied'), t('{n} shifts were added to next week.', { n: r.copied }), t('OK'), () => {}); setFrom(addDays(from, 7));
  }));

  return (
    <ToolPage title={t('Plan the week')} right="plus" rightLabel={t('Add shift')} onRight={() => { setErr(''); setEd(blank()); }} refreshing={d.refreshing} onRefresh={d.refresh}>
      <Chips<string> value={from} onChange={setFrom} items={[[addDays(from, -7), t('Last week')], [from, `${date(from)} – ${date(addDays(from, 6))}`], [addDays(from, 7), t('Next week')]]} />
      {x ? <Hero id="spl" label={t('Scheduled this week')} value={hrs(mins)} note={x.drafts ? t('{n} shifts not published yet', { n: x.drafts }) : t('Everything is published')} noteGood={!x.drafts}
        stats={[[t('Shifts'), String(all.length)], [t('Open'), String(open.length)], [t('Not confirmed'), String(x.unconfirmed || 0)]]} /> : null}
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {x ? (
        <>
          <Btn text={t('Add shift')} icon="plus" kind="blue" onPress={() => { setErr(''); setEd(blank()); }} />
          {open.length ? <Btn text={t('Ava fills open shifts')} icon="spark" onPress={auto} busy={busy === 'au'} /> : null}
          {x.drafts ? <Btn text={t('Publish this week')} icon="send" kind="dark" onPress={publish} busy={busy === 'pb'} /> : null}
          <Search value={s} onChange={setS} placeholder={t('Search people or roles')} />
          <Chips value={tab} onChange={setTab} items={[['all', t('All'), all.length], ['open', t('Open shifts'), open.length], ['draft', t('Drafts'), x.drafts]]} />
          {days.map((k) => {
            const rows = list.filter((y) => y.date === k);
            return rows.length ? (
              <Card key={k} title={`${wd(k)} · ${date(k)}`}>
                {rows.map((y) => <Item key={y.id} onPress={() => edit(y)} left={<Dot icon={y.employee_id ? 'user' : 'calendar'} tone={!y.employee_id ? 'warn' : y.published ? 'nv' : 'dk'} />}
                  title={nm(y.employee_id)} sub={[`${time(y.starts_at)} – ${time(y.ends_at)}`, y.role].filter(Boolean).join(' · ')}
                  rightSub={y.warnings?.length ? <Tag text={t('Check')} tone="warn" /> : !y.published ? <Tag text={t('Draft')} /> : undefined} />)}
              </Card>
            ) : null;
          })}
          {!list.length ? <Card><None icon="calendar" title={s ? t('Nothing matches') : t('No shifts this week')} sub={s ? undefined : t('Tap Add shift to plan the week.')} /></Card> : null}
          <Btn text={t('Copy this week to next week')} icon="calendar" onPress={copy} busy={busy === 'cp'} />
          <Btn text={t('Time-off and swap requests')} icon="calendar" onPress={() => router.navigate('/schedule' as any)} />
        </>
      ) : null}

      <Sheet open={!!ed} title={ed?.id ? t('Edit shift') : t('Add shift')} onClose={() => setEd(null)}>
        {ed ? (
          <>
            <Pick<string> label={t('Who')} value={ed.who} onChange={(v) => setEd({ ...ed, who: v })} items={[['', t('Open shift, anyone can pick it up')], ...people.map((p) => [String(p.id), p.name] as [string, string])]} />
            <Card title={ed.id ? t('Day') : t('Days (tap to pick more than one)')}>
              {days.map((k) => <Item key={k} onPress={() => toggleDay(k)} left={<Dot icon={ed.days.includes(k) ? 'check' : 'calendar'} tone={ed.days.includes(k) ? 'good' : 'dk'} />} title={`${wd(k)} · ${date(k)}`} />)}
            </Card>
            <In label={t('Start')} value={ed.start} onChangeText={(v) => setEd({ ...ed, start: v })} placeholder="09:00" />
            <In label={t('End')} value={ed.end} onChangeText={(v) => setEd({ ...ed, end: v })} placeholder="17:00" />
            <Pick<string> label={t('Break')} value={ed.brk} onChange={(v) => setEd({ ...ed, brk: v })} items={[['0', t('No break')], ['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 h']]} />
            <In label={t('Role (optional)')} value={ed.role} onChangeText={(v) => setEd({ ...ed, role: v })} placeholder={t('e.g. Barista')} />
            <In label={t('Note (optional)')} value={ed.notes} onChangeText={(v) => setEd({ ...ed, notes: v })} />
            {!ed.id ? <Pick<string> label={t('Tell the team now?')} value={ed.publish} onChange={(v) => setEd({ ...ed, publish: v })} items={[['no', t('No, keep as draft')], ['yes', t('Yes, publish and notify')]]} /> : null}
            {err ? <Tag text={err} tone="bad" /> : null}
            <Btn text={ed.id ? t('Save shift') : t('Add shift')} icon="check" kind="blue" onPress={save} busy={busy === 'sv'} />
            {ed.id ? <Btn text={t('Remove shift')} icon="x" kind="red" onPress={remove} busy={busy === 'rm'} /> : null}
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
