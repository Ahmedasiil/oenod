// Business Phone in the app: company calls ring like normal phone calls, also when the phone is locked.
// iPhone (3.8) rings through CallKit; Android (3.9.2) through Firebase and Twilio's full-screen call
// notification with Answer / Decline. The server (pbx1) gives a Twilio Voice token to people with a phone
// seat; this file registers it, keeps it fresh, and tracks the one active call for the in-app call screen.
// Web uses the website's phone.
import { useSyncExternalStore } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { router } from 'expo-router';
import { get, post } from './api';

type PbxMe = { allowed: boolean; ready: boolean; on: boolean; seat: boolean; status: 'available' | 'busy' | 'off' };
export type CallView = { from: string; state: 'connecting' | 'ringing' | 'live' | 'reconnecting' | 'ended'; muted: boolean; held: boolean; since: number | null };

let Voice: any = null;
let voice: any = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try { Voice = require('@twilio/voice-react-native-sdk'); } catch { Voice = null; }
}

let token: string | null = null;
let tokenAt = 0;
let call: any = null;
let view: CallView | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const set = (v: CallView | null) => { view = v; emit(); };

/** Who is calling, as CallKit shows it: the number, or a client name without the "client:" prefix. */
const who = (s?: string) => (s || '').replace(/^client:/, '') || 'OENOD';

function track(c: any, from: string) {
  call = c;
  set({ from, state: 'connecting', muted: false, held: false, since: null });
  const E = Voice.Call.Event;
  c.on(E.Connected, () => set({ ...(view as CallView), state: 'live', since: Date.now() }));
  c.on(E.Reconnecting, () => view && set({ ...view, state: 'reconnecting' }));
  c.on(E.Reconnected, () => view && set({ ...view, state: 'live' }));
  const done = () => { call = null; if (view) set({ ...view, state: 'ended' }); setTimeout(() => { if (!call) set(null); }, 1500); };
  c.on(E.Disconnected, done);
  c.on(E.ConnectFailure, done);
  setTimeout(() => router.push('/call'), 0);
}

function setup() {
  if (voice || !Voice) return !!voice;
  try {
    voice = new Voice.Voice();
    if (Platform.OS === 'ios') voice.initializePushRegistry().catch(() => {});
    if (Platform.OS === 'ios') voice.setCallKitConfiguration({ callKitIncludesCallsInRecents: true, callKitMaximumCallGroups: 1, callKitMaximumCallsPerCallGroup: 1, callKitRingtoneSound: 'oenod_ring.caf' } as any).catch(() => {});
    voice.on(Voice.Voice.Event.CallInvite, (inv: any) => {
      const from = who(inv.getFrom?.());
      inv.on(Voice.CallInvite.Event.Accepted, (c: any) => track(c, from));
    });
    // A call already answered from the lock screen before the app's JavaScript started.
    voice.getCalls().then((m: Map<string, any>) => { const c = [...m.values()][0]; if (c && !call) track(c, who(c.getFrom?.())); }).catch(() => {});
    return true;
  } catch { voice = null; return false; }
}

/** Android 13+: calls need the microphone, and the ringing call needs notifications. Asked once, when the
    person has a phone seat; a "no" just means calls ring on the computer instead. */
async function androidAsk(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const P = PermissionsAndroid.PERMISSIONS;
    const want = [P.RECORD_AUDIO, ...(Number(Platform.Version) >= 33 ? [P.POST_NOTIFICATIONS] : []), ...(Number(Platform.Version) >= 31 ? [P.BLUETOOTH_CONNECT] : [])];
    const r = await PermissionsAndroid.requestMultiple(want as any);
    return r[P.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
  } catch { return false; }
}

/** Sign-in / app comes to the front: register this phone for company calls when the person has a seat. */
export async function syncPhone(): Promise<void> {
  if (!Voice) return;
  let me: PbxMe;
  try { me = await get<PbxMe>('/api/pbx/me'); } catch { return; }
  if (!(me.allowed && me.on && me.ready && me.seat)) { await stopPhone(); return; }
  if (!(await androidAsk())) return;
  if (!setup()) return;
  if (token && Date.now() - tokenAt < 30 * 60 * 1000) return;
  try {
    const r = await post<{ token: string }>('/api/pbx/token', { platform: Platform.OS === 'android' ? 'android' : 'ios' });
    token = r.token; tokenAt = Date.now();
    await voice.register(token);
  } catch { /* not ready yet; tried again next time the app opens */ }
}

/** Sign-out: stop ringing on this phone. */
export async function stopPhone(): Promise<void> {
  const t = token; token = null; tokenAt = 0;
  if (voice && t) { try { await voice.unregister(t); } catch { /* already gone */ } }
}

export const useCall = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => view, () => view);

export async function hangUp() { try { await call?.disconnect(); } catch { /* gone */ } if (!call) set(null); }
export async function toggleMute() { if (!call || !view) return; const m = !view.muted; try { await call.mute(m); set({ ...view, muted: m }); } catch { /* ignore */ } }
export async function toggleHold() { if (!call || !view) return; const h = !view.held; try { await call.hold(h); set({ ...view, held: h }); } catch { /* ignore */ } }
export async function speakerPicker() {
  try {
    if (Platform.OS === 'ios') { await voice?.showAvRoutePickerView(); return; }
    // Android: switch between earpiece and speaker (or a Bluetooth headset when one is connected).
    const devs = await voice?.getAudioDevices(); if (!devs) return;
    const list: any[] = devs.audioDevices || []; const cur = devs.selectedDevice;
    const order = ['speaker', 'bluetooth', 'earpiece'];
    const avail = order.map((t) => list.find((d) => d.type === t)).filter(Boolean);
    const i = avail.findIndex((d: any) => d.uuid === cur?.uuid);
    await avail[(i + 1) % avail.length]?.select();
  } catch { /* ignore */ }
}
export async function keypad(d: string) { try { await call?.sendDigits(d); } catch { /* ignore */ } }

/** Call out with the company number (iPhone or Android, phone seat). Returns false when this phone can't place the call itself;
    the caller then opens the Calls screen, whose dial pad calls from the browser phone. */
export async function dialOut(num: string): Promise<boolean> {
  const to = num.replace(/[^\d+]/g, '');
  if (!Voice || to.replace(/\D/g, '').length < 10) return false;
  await syncPhone();
  if (!voice || !token || call) return false;
  try {
    const c = await voice.connect(token, { params: { To: to.length === 10 ? '+1' + to : to } });
    track(c, to);
    return true;
  } catch { return false; }
}
