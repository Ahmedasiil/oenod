// Meet tab (approved Meet design, 11-18): navy band, the four big actions (New meeting, Join with code, Schedule,
// Your room), the black "up next" card, Coming up by day and Recent. New meeting, scheduling, the code, the link and
// inviting all happen right here in the app; the call itself opens in OENOD Meet inside the app (same sign-in).
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { get, post } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useLoad } from '../../lib/useLoad';
import { day, dayKey, time, todayKey } from '../../lib/format';
import { t } from '../../lib/i18n';
import { at, srv, codeFor, emailInvite, ends, lenText, makeMeeting, myRoom, names, shareInvite, textInvite, tokenOf, when, type Meeting, type Room } from '../../lib/meet';
import { openSheet, openTool } from '../web';
import { meetingId, openMeeting } from '../guest';
import { Logo } from '../../ui/Logo';
import { PoweredBy } from '../../ui/Brand';
import { ActionCard, BigBtn, Chip, CodeBig, DayLine, ErrText, FieldLabel, LinkBox, MBand, MInput, MK, MList, MRow, MSec, MSheet, NextCard, Opt, Pill, RoundBtn, Tint } from '../../ui/MeetKit';

const meetHome = () => openTool('/meet', 'OENOD Meet');

export function joinMeeting(m: { url?: string }) {
  const id = meetingId(String(m.url || ''));
  if (id) return openMeeting(id);
  // An OENOD page opens in the app's OENOD screen; a meeting on another service opens in a sheet over the app.
  const own = String(m.url || '').match(/^https:\/\/(?:www\.)?oenod\.com\/?#?(\/.*)?$/i);
  if (own) return openTool(own[1] || '/meet', 'OENOD Meet');
  if (m.url && /^https:\/\//.test(m.url)) return openSheet(m.url);
  return meetHome();
}

type Shown = { title: string; starts_at: string; duration_min?: number; url?: string };
type SheetState =
  | { k: 'new' }
  | { k: 'made'; m: Shown; code: string; fresh?: boolean }
  | { k: 'schedule' }
  | { k: 'details'; m: Meeting; past?: boolean }
  | { k: 'invite'; m: Shown; code: string }
  | { k: 'room' }
  | null;
type Emp = { id: number; first_name: string; last_name?: string; user_id?: number | null };

const label = (k: string) => (k === todayKey() ? t('Today') : k === dayKey(srv(new Date(Date.now() + 864e5))) ? t('Tomorrow') : '');

export default function MeetTab() {
  const insets = useSafeAreaInsets();
  const { session, isManager } = useAuth();
  const me = session?.user?.name || '';
  const up = useLoad(() => get<{ meetings: Meeting[] }>('/api/meetings'));
  const past = useLoad(() => get<{ meetings: Meeting[] }>('/api/meetings?scope=past').catch(() => ({ meetings: [] as Meeting[] })));
  const [sheet, setSheet] = useState<SheetState>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const close = () => { setSheet(null); setErr(''); setBusy(''); };
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(i); }, []);

  const list = useMemo(() => (up.data?.meetings || []).filter((m) => m.status !== 'cancelled' && ends(m) > now).sort((a, b) => at(a.starts_at).getTime() - at(b.starts_at).getTime()), [up.data, now]);
  const recent = useMemo(() => (past.data?.meetings || []).filter((m) => m.status !== 'cancelled').slice(0, 5), [past.data]);
  const live = list.find((m) => at(m.starts_at).getTime() <= now);
  const top = live || list[0];
  const rest = list.filter((m) => m !== top);
  const groups = useMemo(() => {
    const g: { k: string; items: Meeting[] }[] = [];
    for (const m of rest.slice(0, 12)) { const k = dayKey(m.starts_at); const last = g[g.length - 1]; if (last && last.k === k) last.items.push(m); else g.push({ k, items: [m] }); }
    return g;
  }, [rest]);

  const inMin = top ? Math.round((at(top.starts_at).getTime() - now) / 60000) : 0;
  const chip = !top ? '' : live ? t('Live now') : inMin < 60 ? t('Starts in {n} min', { n: Math.max(1, inMin) }) : label(dayKey(top.starts_at)) ? `${label(dayKey(top.starts_at))} · ${time(top.starts_at)}` : `${day(top.starts_at)} · ${time(top.starts_at)}`;

  const fail = (e: any) => setErr(e?.message || t('Something went wrong. Please try again.'));
  const startNow = async (title?: string, people?: number[]) => {
    setErr(''); setBusy('start');
    try { const m = await makeMeeting({ title: title || t('Meeting with {name}', { name: me.split(' ')[0] || t('the team') }), instant: true, duration_min: 60, employee_ids: people }); close(); up.reload(); openMeeting(m.token); }
    catch (e) { fail(e); setBusy(''); }
  };
  const getLink = async () => {
    setErr(''); setBusy('link');
    try { const m = await makeMeeting({ title: t('Meeting with {name}', { name: me.split(' ')[0] || t('the team') }), instant: true, duration_min: 60 }); const code = await codeFor(m.token); setBusy(''); up.reload(); setSheet({ k: 'made', m, code, fresh: true }); }
    catch (e) { fail(e); setBusy(''); }
  };
  const openDetails = (m: Meeting, wasPast?: boolean) => { setErr(''); setSheet({ k: 'details', m, past: wasPast }); };
  const invite = async (m: Shown) => { const code = await codeFor(tokenOf(m)); setErr(''); setSheet({ k: 'invite', m, code }); };

  return (
    <View style={{ flex: 1, backgroundColor: MK.mist }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}
        refreshControl={<RefreshControl refreshing={up.refreshing} onRefresh={() => { up.refresh(); past.reload(); }} tintColor="#FFFFFF" />}>
        <MBand top={insets.top} title={t('Meet')} sub={t('Start a video call, join with a code, or plan one for later.')}
          left={<Logo width={70} color="#FFFFFF" />}
          right={<RoundBtn ph="calendar-dots" label={t('Schedule a meeting')} onPress={() => { setErr(''); setSheet({ k: 'schedule' }); }} />} />

        <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, marginTop: -80, gap: 16 }}>
          <ActionCard tiles={[
            { title: t('New meeting'), sub: t('Start now or get a link'), ph: 'video-camera', main: true, onPress: () => { setErr(''); setSheet({ k: 'new' }); } },
            { title: t('Join with code'), sub: t('Type the 10 numbers'), ic: 'keypad', onPress: () => router.push('/meet/join') },
            { title: t('Schedule'), sub: t('Pick a day and time'), ph: 'calendar-dots', onPress: () => { setErr(''); setSheet({ k: 'schedule' }); } },
            { title: t('Your room'), sub: t('Same link every time'), ph: 'user-circle', onPress: () => { setErr(''); setSheet({ k: 'room' }); } },
          ]} />

          {top ? (
            <NextCard chip={chip} live={!!live} title={top.title} when={`${when(top)}${top.host ? ' · ' + t('Host: {name}', { name: top.host }) : ''}`} names={names(top)} onPress={() => openDetails(top)}>
              <Pill text={live ? t('Join now') : t('Join')} tone="white" ph="video-camera" onPress={() => joinMeeting(top)} />
              <Pill text={t('Invite')} tone="glass" ph="user-plus" onPress={() => invite(top)} />
            </NextCard>
          ) : null}

          <MSec title={t('Coming up')} right={t('Schedule')} onRight={() => setSheet({ k: 'schedule' })} />
          <MList>
            {groups.length ? groups.map((g) => (
              <View key={g.k}>
                <DayLine text={label(g.k) || day(g.items[0].starts_at)} />
                {g.items.map((m, i) => (
                  <MRow key={m.id} first={i === 0} time={time(m.starts_at)} len={lenText(m.duration_min)} bar={i === 0 && g === groups[0] ? MK.blue : MK.navy}
                    title={m.title} sub={[names(m).length ? t('{n} people', { n: names(m).length + 1 }) : t('Just you so far'), m.host].filter(Boolean).join(' · ')}
                    btn={at(m.starts_at).getTime() - now < 15 * 60000 ? t('Join') : undefined} onBtn={() => joinMeeting(m)} onPress={() => openDetails(m)} />
                ))}
              </View>
            )) : (
              <MRow first time="—" bar={MK.line} title={up.loading ? t('Loading…') : top ? t('Nothing else coming up') : t('No meetings coming up')}
                sub={up.error ? up.error : t('Tap Schedule to plan one, or New meeting to start now')} onPress={() => setSheet({ k: 'schedule' })} />
            )}
          </MList>

          {recent.length ? (
            <>
              <MSec title={t('Recent')} />
              <MList>
                {recent.map((m, i) => (
                  <MRow key={m.id} first={i === 0} time={day(m.starts_at).replace(/^\w+,?\s*/, '')} len={time(m.starts_at)} bar="#C9CEDF"
                    title={m.title} sub={names(m).length ? names(m).slice(0, 3).join(', ') : lenText(m.duration_min)} onPress={() => openDetails(m, true)} />
                ))}
              </MList>
            </>
          ) : null}
          <PoweredBy />
        </View>
      </ScrollView>

      {/* New meeting */}
      <MSheet open={sheet?.k === 'new'} title={t('New meeting')} sub={t('Your team can join from the app, guests from any browser.')} onClose={close}>
        <Opt main ph="video-camera" title={t('Start now')} sub={t('Open the call and invite people from inside')} busy={busy === 'start'} onPress={() => startNow()} />
        <Opt ic="link" title={t('Get a link to share')} sub={t('A code and link for now, start when you are ready')} busy={busy === 'link'} onPress={getLink} />
        <Opt ph="calendar-dots" title={t('Schedule for later')} sub={t('Pick a day, time and who comes')} onPress={() => setSheet({ k: 'schedule' })} />
        <ErrText text={err} />
      </MSheet>

      {/* A meeting just made, or any meeting's code and link */}
      {sheet?.k === 'made' ? (
        <MSheet open title={sheet.fresh ? t('Your meeting is ready') : sheet.m.title} sub={sheet.fresh ? t('Send the code or link. People can join as soon as you start.') : when(sheet.m)} onClose={close}
          footer={<View style={{ gap: 10 }}>
            <BigBtn text={at(sheet.m.starts_at).getTime() <= Date.now() + 15 * 60000 ? t('Start the meeting') : t('Done')} ph={at(sheet.m.starts_at).getTime() <= Date.now() + 15 * 60000 ? 'video-camera' : 'check'}
              onPress={() => { const m = sheet.m; close(); if (at(m.starts_at).getTime() <= Date.now() + 15 * 60000) joinMeeting(m); }} />
          </View>}>
          <CodeCard m={sheet.m} code={sheet.code} />
          <InviteRow m={sheet.m} code={sheet.code} />
        </MSheet>
      ) : null}

      {/* Schedule */}
      {sheet?.k === 'schedule' ? (
        <ScheduleSheet canInvite onClose={close} onMade={async (m) => { up.reload(); const code = await codeFor(m.token); setSheet({ k: 'made', m, code, fresh: true }); }} />
      ) : null}

      {/* Meeting details */}
      {sheet?.k === 'details' ? (
        <DetailsSheet m={sheet.m} past={sheet.past} canCancel={!sheet.past && (isManager || sheet.m.host === me)} onClose={close}
          onJoin={() => { const m = sheet.m; close(); joinMeeting(m); }}
          onAgain={() => startNow(sheet.m.title, (sheet.m.people || []).map((p) => Number(p.employee_id)).filter(Boolean))}
          busy={busy} err={err}
          onInvite={() => invite(sheet.m)}
          onCancelled={() => { close(); up.reload(); }} />
      ) : null}

      {/* Invite */}
      {sheet?.k === 'invite' ? (
        <MSheet open title={t('Invite people')} sub={sheet.m.title} onClose={close}>
          <CodeCard m={sheet.m} code={sheet.code} />
          <Opt main ph="arrow-up-right" title={t('Share the invite')} sub={t('Messages, WhatsApp, Mail or copy it')} onPress={() => shareInvite(sheet.m, sheet.code)} />
          <Opt ph="chat-circle-dots" title={t('Send a text')} sub={t('Opens Messages with the invite filled in')} onPress={() => textInvite(sheet.m, sheet.code)} />
          <Opt ph="envelope-simple" title={t('Send an email')} sub={t('Opens Mail with the invite filled in')} onPress={() => emailInvite(sheet.m, sheet.code)} />
        </MSheet>
      ) : null}

      {/* Your room */}
      {sheet?.k === 'room' ? <RoomSheet me={me} onClose={close} /> : null}
    </View>
  );
}

function CodeCard({ m, code }: { m: Shown; code: string }) {
  return (
    <Tint>
      <CodeBig label={t('Meeting code')} code={code || '—'} />
      {m.url ? <LinkBox text={m.url} btn={t('Share')} onBtn={() => shareInvite(m, code)} /> : null}
      <Text style={{ color: MK.muted, fontSize: 12.5 }}>{t('In the OENOD app tap Meet, then Join with code. Guests can open the link in any browser.')}</Text>
    </Tint>
  );
}

function InviteRow({ m, code }: { m: Shown; code: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Pill text={t('Share')} ph="arrow-up-right" onPress={() => shareInvite(m, code)} />
      <Pill text={t('Text')} tone="light" ph="chat-circle-dots" onPress={() => textInvite(m, code)} />
      <Pill text={t('Email')} tone="light" ph="envelope-simple" onPress={() => emailInvite(m, code)} />
    </View>
  );
}

function DetailsSheet({ m, past, canCancel, onClose, onJoin, onAgain, onInvite, onCancelled, busy, err }: { m: Meeting; past?: boolean; canCancel: boolean; onClose: () => void; onJoin: () => void; onAgain: () => void; onInvite: () => void; onCancelled: () => void; busy: string; err: string }) {
  const [code, setCode] = useState('');
  const [cErr, setCErr] = useState('');
  useEffect(() => { if (!past) codeFor(tokenOf(m)).then(setCode); }, [m, past]);
  const soon = at(m.starts_at).getTime() - Date.now() < 15 * 60000;
  const ppl = names(m);
  const cancel = () => Alert.alert(t('Cancel this meeting?'), t('Everyone invited is told it is off.'), [
    { text: t('Keep it'), style: 'cancel' },
    { text: t('Cancel meeting'), style: 'destructive', onPress: () => post(`/api/meetings/${m.id}/cancel`, {}).then(onCancelled).catch((e) => setCErr(e?.message || t('Something went wrong. Please try again.'))) },
  ]);
  return (
    <MSheet open title={m.title} sub={when(m)} onClose={onClose}
      footer={past ? <BigBtn text={t('Start it again')} ph="repeat" busy={busy === 'start'} onPress={onAgain} />
        : <BigBtn text={soon ? t('Join now') : t('Start early')} ph="video-camera" onPress={onJoin} />}>
      {!past ? <CodeCard m={m} code={code} /> : null}
      <View style={{ borderRadius: 18, borderWidth: 1.5, borderColor: MK.line, padding: 14, gap: 10 }}>
        <Text style={{ color: MK.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>{t('Who is coming')}</Text>
        {m.host ? <Person name={m.host} tag={t('Host')} /> : null}
        {ppl.length ? ppl.map((n) => <Person key={n} name={n} />) : <Text style={{ color: MK.muted, fontSize: 14 }}>{t('Nobody else invited yet.')}</Text>}
      </View>
      {m.agenda ? <Text style={{ color: MK.ink, fontSize: 14, lineHeight: 20 }}>{m.agenda}</Text> : null}
      {!past ? <Opt ph="user-plus" title={t('Invite people')} sub={t('Share the code and link')} onPress={onInvite} /> : null}
      {canCancel ? <Pill text={t('Cancel meeting')} tone="light" ph="x" onPress={cancel} style={{ alignSelf: 'flex-start' }} /> : null}
      <ErrText text={cErr || err} />
    </MSheet>
  );
}

function Person({ name, tag }: { name: string; tag?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: MK.tint, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: MK.navy, fontSize: 12, fontWeight: '800' }}>{name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</Text>
      </View>
      <Text style={{ flex: 1, color: MK.ink, fontSize: 14.5, fontWeight: '600' }} numberOfLines={1}>{name}</Text>
      {tag ? <View style={{ height: 22, paddingHorizontal: 9, borderRadius: 99, backgroundColor: MK.navy, justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>{tag}</Text></View> : null}
    </View>
  );
}

// Day, time, length, who. Times are on the half hour in the phone's own time.
function ScheduleSheet({ onClose, onMade }: { canInvite?: boolean; onClose: () => void; onMade: (m: Awaited<ReturnType<typeof makeMeeting>>) => void }) {
  const days = useMemo(() => Array.from({ length: 10 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; }), []);
  const [di, setDi] = useState(0);
  const slots = useMemo(() => {
    const out: Date[] = [];
    for (let h = 6; h < 23; h++) for (const mm of [0, 30]) { const d = new Date(days[di]); d.setHours(h, mm, 0, 0); if (d.getTime() > Date.now() + 5 * 60000) out.push(d); }
    return out;
  }, [di, days]);
  const [slot, setSlot] = useState<number | null>(null);
  useEffect(() => { const nine = slots.find((d) => d.getHours() === 9 && d.getMinutes() === 0); setSlot(di > 0 && nine ? nine.getTime() : slots.length ? slots[0].getTime() : null); }, [slots, di]);
  const [len, setLen] = useState(30);
  const [title, setTitle] = useState('');
  const [guests, setGuests] = useState('');
  const [emps, setEmps] = useState<Emp[] | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { get<{ employees: Emp[] }>('/api/employees?status=active').then((r) => setEmps(r.employees || [])).catch(() => setEmps([])); }, []);
  const go = async () => {
    setErr('');
    if (!title.trim()) return setErr(t('Give the meeting a name, like "Weekly check-in".'));
    if (!slot) return setErr(t('Pick a time.'));
    setBusy(true);
    try { onMade(await makeMeeting({ title: title.trim(), starts: new Date(slot), duration_min: len, employee_ids: picked, guests })); }
    catch (e: any) { setErr(e?.message || t('Something went wrong. Please try again.')); setBusy(false); }
  };
  const dLabel = (d: Date, i: number) => (i === 0 ? t('Today') : i === 1 ? t('Tomorrow') : d.toLocaleDateString(undefined, { weekday: 'short' }));
  return (
    <MSheet open title={t('Schedule a meeting')} sub={t('Everyone you pick gets the invite with the code and link.')} onClose={onClose}
      footer={<BigBtn text={t('Schedule it')} ph="check" busy={busy} onPress={go} />}>
      <FieldLabel text={t('Name')} />
      <MInput value={title} onChangeText={setTitle} placeholder={t('Weekly check-in')} returnKeyType="done" accessibilityLabel={t('Meeting name')} />
      <FieldLabel text={t('Day')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {days.map((d, i) => <Chip key={i} text={i < 2 ? dLabel(d, i) : String(d.getDate())} sub={i < 2 ? undefined : dLabel(d, i)} on={di === i} onPress={() => setDi(i)} />)}
      </ScrollView>
      <FieldLabel text={t('Time')} />
      {slots.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {slots.map((d) => <Chip key={d.getTime()} text={d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} on={slot === d.getTime()} onPress={() => setSlot(d.getTime())} />)}
        </ScrollView>
      ) : <Text style={{ color: MK.muted, fontSize: 13.5 }}>{t('No times left today. Pick another day.')}</Text>}
      <FieldLabel text={t('How long')} />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {[15, 30, 45, 60, 90].map((n) => <Chip key={n} text={lenText(n)} on={len === n} onPress={() => setLen(n)} />)}
      </View>
      {emps && emps.length ? (
        <>
          <FieldLabel text={t('Who from your team')} />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {emps.slice(0, 40).map((e) => { const on = picked.includes(e.id); return <Chip key={e.id} text={`${e.first_name} ${(e.last_name || '').slice(0, 1)}`.trim()} on={on} onPress={() => setPicked(on ? picked.filter((x) => x !== e.id) : [...picked, e.id])} />; })}
          </View>
        </>
      ) : null}
      <FieldLabel text={t('Guests (email)')} />
      <MInput value={guests} onChangeText={setGuests} placeholder="name@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" accessibilityLabel={t('Guest emails')} />
      <ErrText text={err} />
    </MSheet>
  );
}

function RoomSheet({ me, onClose }: { me: string; onClose: () => void }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = (fresh = false) => { setErr(''); setBusy(true); myRoom(me, fresh).then(setRoom).catch((e) => setErr(e?.message || t('Something went wrong. Please try again.'))).finally(() => setBusy(false)); };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <MSheet open title={t('Your room')} sub={t('Your own meeting room. Keep the code and use it all day.')} onClose={onClose}
      footer={<BigBtn text={t('Open my room')} ph="video-camera" busy={busy && !room} disabled={!room} onPress={() => { if (room) { onClose(); openMeeting(room.token); } }} />}>
      {room ? (
        <>
          <CodeCard m={room} code={room.code} />
          <InviteRow m={room} code={room.code} />
          <Pill text={t('Get a new code')} tone="light" ph="repeat" busy={busy} onPress={() => load(true)} style={{ alignSelf: 'flex-start' }} />
        </>
      ) : busy ? <Tint><Text style={{ color: MK.muted, fontSize: 14 }}>{t('Getting your room ready…')}</Text></Tint> : null}
      <ErrText text={err} />
    </MSheet>
  );
}
