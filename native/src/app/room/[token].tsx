// OENOD Meet room, built into the app (4.3). Same meeting as oenod.com/#/m/<token>: the app talks to the same
// meeting service (GET /api/public/meet/<token>, POST /join, /sync, /leave) and connects video straight to the
// other people with WebRTC, so people on the website and in the app are in one call. Works signed in or as a guest.
// Before joining: camera preview, mic and camera switches, your name. Then the waiting room if the host lets people
// in, then the call: video tiles, mute, camera, flip, speaker, chat, raise hand, leave or end for everyone.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE, post, get } from '../../lib/api';
import { t } from '../../lib/i18n';
import { initials } from '../../lib/format';
import { Ph } from '../../ui/H';
import type { PhName } from '../../ui/phPaths';
import { BigBtn, ErrText, FieldLabel, MInput, MK, MSheet, Opt } from '../../ui/MeetKit';
import { Grad } from '../../ui/H';
import { Logo } from '../../ui/Logo';
import * as RTC from '../../lib/rtc';

type Info = { title: string; status: string; in_call: number; host_here: boolean; brand: { company: string; lobby?: boolean }; me: { name: string; admin?: boolean } | null; max?: number };
type Peer = { id: number; name: string; a?: number; v?: number; h?: number; host?: number };
type Chat = { id: number; peer: number; name: string; body: string; to?: number };
type Stage = 'load' | 'pre' | 'lobby' | 'call' | 'end' | 'bad';
type Conn = { pc: any; id: number; queue: any[]; stream: any | null; offerer: boolean; restarts: number };

const store: { name?: string } = {};

export default function Room() {
  const { token = '' } = useLocalSearchParams<{ token: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [stage, setStage] = useState<Stage>('load');
  const [info, setInfo] = useState<Info | null>(null);
  const [why, setWhy] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(store.name || '');
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [front, setFront] = useState(true);
  const [speaker, setSpeaker] = useState(true);
  const [hand, setHand] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [streams, setStreams] = useState<Record<number, string>>({});
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat[]>([]);
  const [unread, setUnread] = useState(0);
  const [sheet, setSheet] = useState<'' | 'chat' | 'leave' | 'people'>('');
  const [msg, setMsg] = useState('');
  const [toast, setToast] = useState('');
  const [since, setSince] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Everything the sync loop needs, outside React state so it never reads an old value.
  const R = useRef({
    me: null as null | { peer: number; key: string; host?: boolean }, ice: [] as any[], iceAt: 0,
    pcs: new Map<number, Conn>(), outbox: [] as any[], evQ: [] as any[], chatQ: [] as string[], cmd: null as any,
    after: 0, chatAfter: 0, evAfter: 0, evInit: true, peers: [] as Peer[], syncing: false, timer: null as any,
    fastUntil: 0, fails: 0, dead: false, left: false, stage: 'load' as Stage, mic: null as any, cam: null as any, local: null as any,
    st: { a: true, v: true, h: false }, sheet: '' as string,
  }).current;
  R.sheet = sheet;

  const say = useCallback((s: string) => { setToast(s); setTimeout(() => setToast((x) => (x === s ? '' : x)), 3200); }, []);
  const go = (s: Stage) => { R.stage = s; setStage(s); };

  // ---------- camera and microphone ----------
  const paintLocal = () => {
    try { if (R.local) R.local.release?.(); } catch { /* released */ }
    const tracks = [R.cam].filter(Boolean);
    R.local = tracks.length ? RTC.stream(tracks) : null;
    setLocalUrl(R.local ? R.local.toURL() : null);
  };
  const getCam = async (facing: 'user' | 'environment') => {
    try { const s = await RTC.getUserMedia({ audio: false, video: { facingMode: facing, width: 1280, height: 720, frameRate: 24 } }); return s.getVideoTracks()[0] || null; } catch { return null; }
  };
  const getMic = async () => {
    try { const s = await RTC.getUserMedia({ audio: true, video: false }); return s.getAudioTracks()[0] || null; } catch { return null; }
  };
  const sendTrack = (kind: 'audio' | 'video', track: any) => {
    for (const c of R.pcs.values()) {
      const tr = c.pc.getTransceivers().find((x: any) => x.receiver?.track?.kind === kind);
      if (tr?.sender) tr.sender.replaceTrack(track || null).catch(() => {});
    }
  };

  // ---------- open the meeting ----------
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const i = await get<Info>(`/api/public/meet/${encodeURIComponent(String(token))}`);
        if (off) return;
        setInfo(i);
        if (i.me?.name) setName(i.me.name);
        if (i.status === 'cancelled') { setWhy('cancelled'); go('end'); return; }
        if (i.status === 'ended') { setWhy('ended'); go('end'); return; }
        go('pre');
        R.mic = await getMic(); R.cam = await getCam('user');
        if (off) { RTC.stop(R.mic); RTC.stop(R.cam); return; }
        R.st.a = !!R.mic; R.st.v = !!R.cam; setMic(!!R.mic); setCam(!!R.cam);
        if (!R.mic && !R.cam) setErr(t('OENOD could not use your camera or microphone. You can still join, or allow them in your phone Settings.'));
        paintLocal();
      } catch (e: any) { if (!off) { setErr(e?.message || t('This meeting link is not valid.')); go('bad'); } }
    })();
    return () => { off = true; };
  }, [token]);

  // ---------- WebRTC: every person connects to every other one; the lower number makes the offer ----------
  const push = (to: number, k: string, d: any) => { R.outbox.push({ to, k, d }); R.fastUntil = Date.now() + 6000; kick(); };
  const attachLocal = (c: Conn) => {
    for (const tr of c.pc.getTransceivers()) {
      const kind = tr.receiver?.track?.kind; if (!kind) continue;
      try { tr.direction = 'sendrecv'; } catch { /* closed */ }
      tr.sender.replaceTrack((kind === 'audio' ? R.mic : R.cam) || null).catch(() => {});
    }
  };
  const newPc = (id: number): Conn => {
    const pc = RTC.peer({ iceServers: R.ice, bundlePolicy: 'max-bundle' });
    const c: Conn = { pc, id, queue: [], stream: null, offerer: (R.me?.peer || 0) < id, restarts: 0 };
    pc.addEventListener('icecandidate', (e: any) => { if (e.candidate) push(id, 'ice', e.candidate.toJSON ? e.candidate.toJSON() : e.candidate); });
    pc.addEventListener('track', (e: any) => {
      const s = (e.streams && e.streams[0]) || null;
      if (s) c.stream = s;
      else { if (!c.stream) c.stream = RTC.stream([]); if (e.track && !c.stream.getTracks().includes(e.track)) c.stream.addTrack(e.track); }
      setStreams((m) => ({ ...m, [id]: c.stream.toURL() + '#' + c.stream.getTracks().length }));
    });
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'failed' && c.offerer && c.restarts < 3) { c.restarts++; offer(c, true); }
      if (pc.connectionState === 'connected') c.restarts = 0;
    });
    R.pcs.set(id, c);
    return c;
  };
  const offer = async (c: Conn, restart = false) => {
    try { const o = await c.pc.createOffer(restart ? { iceRestart: true } : {}); await c.pc.setLocalDescription(o); push(c.id, 'offer', { type: 'offer', sdp: c.pc.localDescription.sdp }); } catch { /* closed */ }
  };
  const call = async (id: number) => {
    const c = newPc(id);
    c.pc.addTransceiver('audio', { direction: 'sendrecv' });
    c.pc.addTransceiver('video', { direction: 'sendrecv' });
    attachLocal(c);
    await offer(c);
  };
  const drop = (id: number) => {
    const c = R.pcs.get(id);
    if (c) { try { c.pc.close(); } catch { /* closed */ } R.pcs.delete(id); }
    setStreams((m) => { if (!(id in m)) return m; const n = { ...m }; delete n[id]; return n; });
  };
  const onSignal = async (s: any) => {
    let c = R.pcs.get(s.from);
    try {
      if (s.k === 'offer') {
        if (!c || c.offerer) { if (c) drop(s.from); c = newPc(s.from); c.offerer = false; }
        await c.pc.setRemoteDescription(RTC.desc({ type: 'offer', sdp: s.d.sdp }));
        attachLocal(c);
        const a = await c.pc.createAnswer(); await c.pc.setLocalDescription(a);
        push(s.from, 'answer', { type: 'answer', sdp: c.pc.localDescription.sdp });
        for (const q of c.queue.splice(0)) await c.pc.addIceCandidate(RTC.cand(q)).catch(() => {});
      } else if (s.k === 'answer' && c && c.pc.signalingState === 'have-local-offer') {
        await c.pc.setRemoteDescription(RTC.desc({ type: 'answer', sdp: s.d.sdp }));
        for (const q of c.queue.splice(0)) await c.pc.addIceCandidate(RTC.cand(q)).catch(() => {});
      } else if (s.k === 'ice' && s.d) {
        if (!c) { c = newPc(s.from); c.offerer = false; }
        if (c.pc.remoteDescription) await c.pc.addIceCandidate(RTC.cand(s.d)).catch(() => {}); else c.queue.push(s.d);
      } else if (s.k === 'bye') drop(s.from);
    } catch { /* a broken message is ignored; the connection retries */ }
  };

  // ---------- sync with the meeting service ----------
  const api = (path: string, body: any) => post<any>(`/api/public/meet/${encodeURIComponent(String(token))}${path}`, body);
  const schedule = (ms: number) => { clearTimeout(R.timer); if (!R.dead) R.timer = setTimeout(sync, ms); };
  let kickT: any = null;
  const kick = () => { if (R.dead || R.stage !== 'call') return; clearTimeout(kickT); kickT = setTimeout(() => { if (!R.syncing) schedule(0); }, 120); };
  const sync = async () => {
    if (R.dead || R.syncing || !R.me) return;
    R.syncing = true;
    const out = R.outbox.splice(0, 60); const ev = R.evQ.splice(0, 30); const m = R.chatQ.shift() || '';
    const needIce = !R.iceAt || Date.now() - R.iceAt > 3600000;
    const body: any = { peer: R.me.peer, key: R.me.key, ice: needIce ? 1 : 0, after: R.after, chat_after: R.chatAfter, ev_after: R.evAfter, ev_init: R.evInit ? 1 : 0,
      st: { a: R.st.a ? 1 : 0, v: R.st.v ? 1 : 0, s: 0, h: R.st.h ? 1 : 0 }, out, ev, msg: m };
    const cmd = R.cmd; if (cmd) { body.cmd = cmd; R.cmd = null; }
    let r: any = null;
    try { r = await api('/sync', body); R.fails = 0; }
    catch (e: any) {
      R.syncing = false;
      R.outbox.unshift(...out); R.evQ.unshift(...ev); if (m) R.chatQ.unshift(m); if (cmd) R.cmd = Object.assign(cmd, R.cmd || {});
      const st = e?.status || 0;
      if ((st === 403 || st === 404 || st === 410) && e?.data?.error) return end(st === 410 ? 'ended' : 'gone');
      R.fails++; if (R.fails === 2) say(t('Reconnecting…'));
      return schedule(Math.min(8000, 1500 * R.fails));
    }
    R.syncing = false;
    if (R.dead) return;
    if (!r || typeof r !== 'object' || !r.me) { R.outbox.unshift(...out); R.evQ.unshift(...ev); if (m) R.chatQ.unshift(m); R.fails++; return schedule(Math.min(8000, 1500 * R.fails)); }
    await handle(r);
    const fast = Date.now() < R.fastUntil || R.outbox.length || R.chatQ.length || R.evQ.length;
    const alone = R.stage === 'call' && R.peers.length <= 1;
    schedule(R.stage === 'lobby' || (alone && !fast) ? 3000 : fast ? 600 : 1500);
  };
  const handle = async (r: any) => {
    if (r.ended) return end(r.limit ? 'limit' : 'ended');
    if (r.ice && r.ice.length) { R.ice = r.ice; R.iceAt = Date.now(); }
    const st = r.me?.state;
    if (st === 'denied' || st === 'removed' || st === 'left') return end(st);
    if (R.stage === 'lobby') { if (st === 'in') enterCall(); return; }
    if (st !== 'in') return;
    const prev = R.peers; const before = new Set(prev.map((p) => p.id));
    R.peers = r.peers || [];
    const ids = new Set(R.peers.map((p) => p.id));
    for (const p of R.peers) {
      if (p.id === R.me!.peer) continue;
      if (!before.has(p.id) && before.size) say(`${p.name} ${t('joined')}`);
      if (!R.pcs.has(p.id) && R.me!.peer < p.id) await call(p.id);
      if (p.h && !(prev.find((x) => x.id === p.id) || ({} as Peer)).h) say(`✋ ${p.name} ${t('raised their hand')}`);
    }
    for (const id of [...R.pcs.keys()]) if (!ids.has(id)) drop(id);
    for (const p of prev) if (!ids.has(p.id) && p.id !== R.me!.peer) say(`${p.name} ${t('left')}`);
    setPeers(R.peers);
    for (const s of r.signals || []) { await onSignal(s); R.after = Math.max(R.after, s.id); }
    if ((r.signals || []).length) R.fastUntil = Date.now() + 6000;
    if (R.evInit) { R.evInit = false; R.evAfter = Math.max(R.evAfter, r.ev_max || 0); }
    for (const e of r.events || []) if (e.id > R.evAfter) R.evAfter = e.id;
    const fresh: Chat[] = [];
    for (const c of r.chat || []) { if (c.id <= R.chatAfter) continue; R.chatAfter = c.id; fresh.push(c); }
    if (fresh.length) {
      setChat((x) => [...x, ...fresh].slice(-300));
      const theirs = fresh.filter((c) => c.peer !== R.me!.peer);
      if (theirs.length && R.sheet !== 'chat') { setUnread((n) => n + theirs.length); const l = theirs[theirs.length - 1]; say(`${l.name}: ${l.body.slice(0, 80)}`); }
    }
  };

  // ---------- join, waiting room, call, leave ----------
  const join = async () => {
    if (busy) return;
    const nm = (info?.me?.name || name).trim();
    if (!info?.me && nm.length < 2) { setErr(t('Type your name so others know who you are.')); return; }
    setErr(''); setBusy(true);
    try {
      const r = await api('/join', { name: nm, audio: R.st.a, video: R.st.v, website: '' });
      store.name = nm;
      R.me = { peer: r.peer, key: r.key, host: !!r.host }; R.ice = r.ice || []; R.iceAt = R.ice.length ? Date.now() : 0;
      RTC.audioStart(speaker);
      if (r.state === 'lobby') { go('lobby'); schedule(300); } else enterCall();
    } catch (e: any) { setErr(e?.message || t('Could not join. Check your internet and try again.')); }
    finally { setBusy(false); }
  };
  const enterCall = () => { go('call'); setSince(Date.now()); schedule(0); };
  const stopAll = () => {
    for (const id of [...R.pcs.keys()]) drop(id);
    RTC.stop(R.mic); RTC.stop(R.cam); R.mic = R.cam = null;
    try { R.local?.release?.(); } catch { /* released */ } R.local = null; setLocalUrl(null);
    RTC.audioStop();
  };
  const sendLeave = () => {
    if (!R.me || R.left) return; R.left = true;
    fetch(`${BASE}/api/public/meet/${encodeURIComponent(String(token))}/leave`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ peer: R.me.peer, key: R.me.key }), credentials: 'include' }).catch(() => {});
  };
  const end = (w: string) => { if (R.dead) return; R.dead = true; clearTimeout(R.timer); sendLeave(); stopAll(); setWhy(w); setSheet(''); go('end'); };
  const leave = () => end('left');
  const endForAll = async () => { R.cmd = { end: true }; R.syncing = false; await sync(); end('ended'); };
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  useEffect(() => () => { if (!R.dead) { R.dead = true; clearTimeout(R.timer); sendLeave(); stopAll(); } }, []);
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  useEffect(() => {
    const s = BackHandler.addEventListener('hardwareBackPress', () => { if (R.stage === 'call' || R.stage === 'lobby') { setSheet('leave'); return true; } return false; });
    return () => s.remove();
  }, []);
  useEffect(() => { const s = AppState.addEventListener('change', (a) => { if (a === 'active' && (R.stage === 'call' || R.stage === 'lobby')) schedule(0); }); return () => s.remove(); }, []);

  // ---------- buttons ----------
  const toggleMic = async () => {
    if (!R.mic) { R.mic = await getMic(); if (!R.mic) { say(t('Allow the microphone for OENOD in your phone Settings.')); return; } sendTrack('audio', R.mic); }
    else R.mic.enabled = !R.mic.enabled;
    R.st.a = !!(R.mic && R.mic.enabled); setMic(R.st.a); kick();
  };
  const toggleCam = async () => {
    if (R.cam) { sendTrack('video', null); RTC.stop(R.cam); R.cam = null; }
    else { R.cam = await getCam(front ? 'user' : 'environment'); if (!R.cam) { say(t('Allow the camera for OENOD in your phone Settings.')); return; } sendTrack('video', R.cam); }
    R.st.v = !!R.cam; setCam(R.st.v); paintLocal(); kick();
  };
  const flip = async () => {
    if (!R.cam) return;
    const f = !front;
    try { await R.cam.applyConstraints({ facingMode: f ? 'user' : 'environment' }); setFront(f); paintLocal(); }
    catch { const n = await getCam(f ? 'user' : 'environment'); if (n) { const o = R.cam; R.cam = n; sendTrack('video', n); RTC.stop(o); setFront(f); paintLocal(); } }
  };
  const toggleSpeaker = () => { const s = !speaker; setSpeaker(s); RTC.speaker(s); };
  const toggleHand = () => { const h = !R.st.h; R.st.h = h; setHand(h); kick(); };
  const sendChat = () => { const b = msg.trim(); if (!b) return; R.chatQ.push(b.slice(0, 1000)); setMsg(''); R.fastUntil = Date.now() + 4000; kick(); };

  // ---------- screens ----------
  const title = info?.title || t('OENOD Meet');
  const company = info?.brand?.company || '';
  const mmss = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return `${h ? h + ':' + String(m).padStart(2, '0') : m}:${String(s % 60).padStart(2, '0')}`; };

  if (stage === 'load' || stage === 'bad' || stage === 'end') {
    const txt: Record<string, [string, string]> = {
      left: [t('You left the meeting'), t('Thanks for joining.')],
      ended: [t('The meeting has ended'), t('The host ended the meeting for everyone.')],
      cancelled: [t('This meeting was cancelled'), t('The host cancelled it. Check your email or messages for a new time.')],
      limit: [t('Your free meeting has ended'), t('Free OENOD meetings have a time limit. The host can upgrade to OENOD Meet Pro for unlimited time.')],
      denied: [t('You were not let in'), t('Someone in the meeting declined your request.')],
      removed: [t('You were removed from the meeting'), t('Someone in the meeting removed you.')],
      gone: [t('You were disconnected'), t('The connection to the meeting was lost.')],
    };
    const [h, p] = stage === 'bad' ? [t('Meeting not found'), err || t('This meeting link is not valid.')] : stage === 'end' ? (txt[why] || txt.left) : [t('Opening the meeting…'), ''];
    return (
      <Dark insets={insets}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 28 }}>
          {stage === 'load' ? <ActivityIndicator color="#FFFFFF" size="large" /> : <Circle ph={stage === 'end' && (why === 'left' || why === 'ended') ? 'check' : 'warning'} />}
          <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 }}>{h}</Text>
          {p ? <Text style={{ color: MK.soft, fontSize: 15, textAlign: 'center', lineHeight: 21 }}>{p}</Text> : null}
          {stage !== 'load' ? (
            <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 14 }}>
              {stage === 'end' && (why === 'left' || why === 'gone') ? <WhiteBtn text={t('Join again')} ph="video-camera" onPress={() => router.replace({ pathname: '/room/[token]', params: { token: String(token) } })} /> : null}
              <GlassBtn text={t('Close')} onPress={close} />
            </View>
          ) : null}
        </View>
      </Dark>
    );
  }

  if (stage === 'pre') {
    const lobby = !info?.me && !!info?.brand?.lobby;
    const vw = Math.min(width - 40, 520);
    return (
      <Dark insets={insets}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, gap: 14, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 10, minHeight: 44 }}>
            <RoundGlass ph="caret-left" label={t('Back')} onPress={close} />
            <View style={{ flex: 1, alignItems: 'center' }}><Logo width={70} color="#FFFFFF" /></View>
            <View style={{ width: 42 }} />
          </View>
          <View style={{ alignSelf: 'stretch', gap: 4 }}>
            <Text style={{ color: MK.soft, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }}>{t('OENOD MEET')}{company ? ' · ' + company : ''}</Text>
            <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.6 }} numberOfLines={2}>{title}</Text>
            <Text style={{ color: MK.soft, fontSize: 14 }}>{info?.in_call ? (info.in_call === 1 ? t('1 person is in the call.') : t('{n} people are in the call.', { n: info.in_call })) : t('No one is in the call yet.')}</Text>
          </View>
          <View style={{ width: vw, height: vw * 0.75, borderRadius: 26, overflow: 'hidden', backgroundColor: '#0A0B10', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            {cam && localUrl ? <RTC.View streamURL={localUrl} style={{ flex: 1 }} objectFit="cover" mirror={front} />
              : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Face name={info?.me?.name || name || t('Guest')} size={86} /></View>}
            <View style={{ position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
              <CtlBtn ph={mic ? 'microphone' : 'microphone-slash'} off={!mic} label={mic ? t('Turn microphone off') : t('Turn microphone on')} onPress={toggleMic} />
              <CtlBtn ph={cam ? 'video-camera' : 'video-camera-slash'} off={!cam} label={cam ? t('Turn camera off') : t('Turn camera on')} onPress={toggleCam} />
              {cam ? <CtlBtn ph="camera-rotate" label={t('Flip camera')} onPress={flip} /> : null}
            </View>
          </View>
          <View style={{ alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, gap: 10 }}>
            {info?.me ? (
              <Text style={{ color: MK.muted, fontSize: 14 }}>{t('Joining as')} <Text style={{ color: MK.ink, fontWeight: '800' }}>{info.me.name}</Text></Text>
            ) : (<>
              <FieldLabel text={t('Your name')} />
              <MInput value={name} onChangeText={setName} placeholder={t('First and last name')} autoComplete="name" maxLength={60} returnKeyType="go" onSubmitEditing={join} accessibilityLabel={t('Your name')} />
            </>)}
            <ErrText text={err} />
            <BigBtn text={busy ? t('Joining…') : lobby ? t('Ask to join') : t('Join now')} ph={lobby ? 'hand' : 'video-camera'} busy={busy} onPress={join} />
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Ph name="shield-check" size={16} color={MK.ok} />
              <Text style={{ flex: 1, color: MK.muted, fontSize: 12.5 }}>{t('Video goes straight between the people in the call and is encrypted.')}</Text>
            </View>
          </View>
        </ScrollView>
      </Dark>
    );
  }

  if (stage === 'lobby') {
    return (
      <Dark insets={insets}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 28 }}>
          <Circle ph="clock" />
          <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', textAlign: 'center' }}>{t('Asking to join…')}</Text>
          <Text style={{ color: MK.soft, fontSize: 15, textAlign: 'center', lineHeight: 21 }}>{t('Someone in the meeting will let you in soon.')}</Text>
          <ActivityIndicator color={MK.soft} style={{ marginTop: 6 }} />
          <View style={{ alignSelf: 'stretch', marginTop: 18 }}><GlassBtn text={t('Cancel')} onPress={leave} /></View>
        </View>
      </Dark>
    );
  }

  // ---------- the call ----------
  const others = peers.filter((p) => p.id !== R.me?.peer);
  const meTile = { id: -1, name: info?.me?.name || name || t('You'), a: mic ? 1 : 0, v: cam ? 1 : 0, h: hand ? 1 : 0 } as Peer;
  const top = insets.top + 8; const barH = 92 + insets.bottom;
  const areaH = height - top - 52 - barH; const areaW = width - 20;
  const solo = others.length === 1;
  const list = solo ? others : [meTile, ...others];
  const cols = list.length <= 1 ? 1 : list.length <= 4 ? (areaW > areaH ? list.length : 2) : (areaW > areaH ? 4 : 2);
  const rows = Math.ceil(list.length / cols);
  const tw = (areaW - (cols - 1) * 8) / cols; const th = Math.min((areaH - (rows - 1) * 8) / rows, list.length === 1 ? areaH : tw * 1.35);
  const tile = (p: Peer, w: number, h: number, self?: boolean) => {
    const url = self ? (cam ? localUrl : null) : (p.v ? (streams[p.id] || '').split('#')[0] || null : null);
    return (
      <View key={p.id} style={{ width: w, height: h, borderRadius: 20, overflow: 'hidden', backgroundColor: '#11131F', borderWidth: 1, borderColor: p.h ? '#F5C451' : 'rgba(255,255,255,0.08)' }}>
        {url ? <RTC.View streamURL={url} style={{ flex: 1 }} objectFit="cover" mirror={self && front} zOrder={self ? 1 : 0} />
          : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Face name={p.name} size={Math.min(84, w * 0.42)} /></View>}
        <View style={{ position: 'absolute', left: 8, bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, backgroundColor: 'rgba(5,6,13,0.6)' }}>
            {!p.a ? <Ph name="microphone-slash" size={13} color="#FF8A8F" /> : null}
            {p.h ? <Text style={{ fontSize: 12 }}>✋</Text> : null}
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>{self ? t('You') : p.name}{p.host ? ' · ' + t('Host') : ''}</Text>
          </View>
        </View>
      </View>
    );
  };
  return (
    <View style={{ flex: 1, backgroundColor: '#05060D' }}>
      <View style={{ paddingTop: top, paddingHorizontal: 14, height: top + 52, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }} numberOfLines={1}>{title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: MK.live }} />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12.5, fontVariant: ['tabular-nums'] }}>{mmss(now - since)} · {t('{n} in the call', { n: others.length + 1 })}</Text>
          </View>
        </View>
        <RoundGlass ph="users" label={t('People')} onPress={() => setSheet('people')} />
        <RoundGlass ph={speaker ? 'speaker-high' : 'speaker-slash'} label={speaker ? t('Speaker on') : t('Speaker off')} onPress={toggleSpeaker} />
      </View>
      <View style={{ flex: 1, paddingHorizontal: 10 }}>
        {others.length === 0 ? (
          <View style={{ flex: 1 }}>
            {tile(meTile, areaW, areaH, true)}
            <View pointerEvents="none" style={{ position: 'absolute', top: 18, left: 0, right: 0, alignItems: 'center' }}>
              <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: 'rgba(5,6,13,0.7)' }}><Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' }}>{t('Waiting for others to join…')}</Text></View>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignContent: 'center', justifyContent: 'center' }}>
            {list.map((p) => tile(p, list.length === 1 ? areaW : tw, list.length === 1 ? areaH : th, p.id === -1))}
          </View>
        )}
        {solo ? <View style={{ position: 'absolute', right: 20, top: 10 }}>{tile(meTile, 104, 146, true)}</View> : null}
      </View>
      {toast ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: barH + 10, alignItems: 'center' }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.95)' }}><Text style={{ color: MK.ink, fontSize: 13.5, fontWeight: '700' }} numberOfLines={2}>{toast}</Text></View>
        </View>
      ) : null}
      <View style={{ height: barH, paddingBottom: insets.bottom, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 8, backgroundColor: '#0A0B12', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
        <CtlBtn ph={mic ? 'microphone' : 'microphone-slash'} off={!mic} label={mic ? t('Mute') : t('Unmute')} onPress={toggleMic} caption />
        <CtlBtn ph={cam ? 'video-camera' : 'video-camera-slash'} off={!cam} label={cam ? t('Camera') : t('Camera off')} onPress={toggleCam} caption />
        <CtlBtn ph="camera-rotate" label={t('Flip')} onPress={flip} caption disabled={!cam} />
        <CtlBtn ph="chat-circle-dots" label={t('Chat')} onPress={() => { setUnread(0); setSheet('chat'); }} caption badge={unread} />
        <CtlBtn ph="hand" on={hand} label={hand ? t('Lower') : t('Hand')} onPress={toggleHand} caption />
        <CtlBtn ph="phone-disconnect" red label={t('Leave')} onPress={() => setSheet('leave')} caption />
      </View>

      <MSheet open={sheet === 'leave'} title={t('Leave the meeting?')} onClose={() => setSheet('')}>
        <Opt ph="sign-out" title={t('Leave the meeting')} sub={t('The others can keep talking.')} onPress={leave} main />
        {R.me?.host || info?.me?.admin ? <Opt ph="phone-disconnect" title={t('End the meeting for everyone')} sub={t('Everyone is disconnected.')} onPress={endForAll} /> : null}
      </MSheet>
      <MSheet open={sheet === 'people'} title={t('People in the call')} sub={t('{n} in the call', { n: others.length + 1 })} onClose={() => setSheet('')}>
        {[meTile, ...others].map((p) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
            <Face name={p.name} size={40} light />
            <Text style={{ flex: 1, color: MK.ink, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{p.id === -1 ? t('You') : p.name}{p.host ? ' · ' + t('Host') : ''}</Text>
            {p.h ? <Text>✋</Text> : null}
            <Ph name={p.a ? 'microphone' : 'microphone-slash'} size={18} color={p.a ? MK.navy : MK.bad} />
            <Ph name={p.v ? 'video-camera' : 'video-camera-slash'} size={18} color={p.v ? MK.navy : MK.muted} />
          </View>
        ))}
      </MSheet>
      <MSheet open={sheet === 'chat'} title={t('Chat')} sub={t('Everyone in the call can see these messages.')} onClose={() => setSheet('')}
        footer={(
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <MInput value={msg} onChangeText={setMsg} placeholder={t('Send a message')} onSubmitEditing={sendChat} returnKeyType="send" style={{ flex: 1 }} accessibilityLabel={t('Message')} />
            <Pressable onPress={sendChat} accessibilityRole="button" accessibilityLabel={t('Send')} style={{ width: 50, height: 50, borderRadius: 14, backgroundColor: MK.navy, alignItems: 'center', justifyContent: 'center' }}>
              <Ph name="paper-plane-tilt" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        )}>
        {chat.length ? chat.map((c) => {
          const mine = c.peer === R.me?.peer;
          return (
            <View key={c.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', gap: 2 }}>
              {!mine ? <Text style={{ color: MK.muted, fontSize: 11.5, fontWeight: '700' }}>{c.name}{c.to ? ' · ' + t('Private') : ''}</Text> : null}
              <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: mine ? MK.navy : MK.mist }}>
                <Text style={{ color: mine ? '#FFFFFF' : MK.ink, fontSize: 14.5 }}>{c.body}</Text>
              </View>
            </View>
          );
        }) : <Text style={{ color: MK.muted, fontSize: 14, paddingVertical: 12 }}>{t('No messages yet. Say hello.')}</Text>}
      </MSheet>
    </View>
  );
}

// ---------- small parts ----------
function Dark({ children, insets }: { children: React.ReactNode; insets: { top: number; bottom: number } }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: MK.navy, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 10 }}>
      <Grad id="roomband" x1={0.1} y1={0} x2={0.7} y2={1} stops={[[0, MK.navy], [0.65, MK.navy2], [1, '#1A2FCF']]} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -80, top: -40, width: 260, height: 260, borderRadius: 130, borderWidth: 38, borderColor: 'rgba(255,255,255,0.05)' }} />
      {children}
    </KeyboardAvoidingView>
  );
}
function Circle({ ph }: { ph: PhName }) {
  return <View style={{ width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }}><Ph name={ph} size={38} color="#FFFFFF" duo={0.3} /></View>;
}
function Face({ name, size, light }: { name: string; size: number; light?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: light ? MK.tint : '#1E2550', borderWidth: light ? 0 : 1, borderColor: 'rgba(185,196,255,0.25)' }}>
      <Text style={{ color: light ? MK.navy : '#FFFFFF', fontSize: size * 0.36, fontWeight: '800' }}>{initials(name)}</Text>
    </View>
  );
}
function RoundGlass({ ph, label, onPress }: { ph: PhName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' })}>
      <Ph name={ph} size={20} color="#FFFFFF" duo={0.3} />
    </Pressable>
  );
}
function CtlBtn({ ph, label, onPress, off, on, red, caption, badge, disabled }: { ph: PhName; label: string; onPress: () => void; off?: boolean; on?: boolean; red?: boolean; caption?: boolean; badge?: number; disabled?: boolean }) {
  const bg = red ? '#E5484D' : off ? '#FFFFFF' : on ? '#F5C451' : 'rgba(255,255,255,0.12)';
  const fg = red ? '#FFFFFF' : off || on ? MK.navy : '#FFFFFF';
  return (
    <Pressable onPress={disabled ? undefined : onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled, selected: !!(off || on) }}
      style={({ pressed }) => ({ alignItems: 'center', gap: 5, opacity: disabled ? 0.4 : pressed ? 0.75 : 1, minWidth: 52 })}>
      <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, borderWidth: red || off || on ? 0 : 1, borderColor: 'rgba(255,255,255,0.14)' }}>
        <Ph name={ph} size={23} color={fg} duo={0.3} />
        {badge ? <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4, backgroundColor: '#4A63FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0A0B12' }}><Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' }}>{badge > 99 ? '99+' : badge}</Text></View> : null}
      </View>
      {caption ? <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700' }} numberOfLines={1}>{label}</Text> : null}
    </Pressable>
  );
}
function WhiteBtn({ text, ph, onPress }: { text: string; ph: PhName; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={text} style={({ pressed }) => ({ height: 56, borderRadius: 18, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: pressed ? 0.85 : 1 })}>
      <Ph name={ph} size={19} color={MK.navy} /><Text style={{ color: MK.navy, fontSize: 16, fontWeight: '800' }}>{text}</Text>
    </Pressable>
  );
}
function GlassBtn({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={text} style={({ pressed }) => ({ height: 56, borderRadius: 18, backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' })}>
      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{text}</Text>
    </Pressable>
  );
}
