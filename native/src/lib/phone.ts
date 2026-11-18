// Business Phone in the app: company calls ring like normal phone calls, also when the phone is locked.
// iPhone (3.8) rings through CallKit; Android (3.9.2) through Firebase and Twilio's full-screen call
// notification with Answer / Decline. The server (pbx1) gives a Twilio Voice token to people with a phone
// seat; this file registers it, keeps it fresh, and tracks the one active call for the in-app call screen.
// Web uses the website's phone.
import { useSyncExternalStore } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { router } from 'expo-router';
import { get, post } from './api';
import { keepSession } from './auth';
import { t } from './i18n';

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
  if (!c) return;
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

/** Call out with the company number (iPhone or Android, phone seat). Returns true when the call started, or a short
    message saying why this phone can't place it (4.3: Android checks the microphone and notification permissions
    first and waits for the call service, instead of letting the call engine stop the app). */
export async function dialOut(num: string): Promise<true | string> {
  const to = num.replace(/[^\d+]/g, '');
  if (to.replace(/\D/g, '').length < 10) return t('Type the full number with the area code.');
  if (!Voice) return t('Calling works in the OENOD app on your phone. Number: {n}', { n: num });
  if (call) return t('You are already on a call.');
  if (Platform.OS === 'android') {
    try {
      const P = PermissionsAndroid.PERMISSIONS;
      if (!(await PermissionsAndroid.check(P.RECORD_AUDIO))) await androidAsk();
      if (!(await PermissionsAndroid.check(P.RECORD_AUDIO))) return t('Allow the microphone for OENOD in your phone Settings, then call again.');
      if (Number(Platform.Version) >= 33 && !(await PermissionsAndroid.check(P.POST_NOTIFICATIONS))) return t('Allow notifications for OENOD in your phone Settings, so the call can keep going. Then call again.');
    } catch { return t('Allow the microphone for OENOD in your phone Settings, then call again.'); }
  }
  await syncPhone();
  await keepSession(); // the sign-in is saved before the call engine starts
  if (!voice || !token) return t('Business Phone is not set up for you yet. Ask your manager to give you a phone seat at Calls.');
  try {
    // Android: give the call service a moment to be ready the first time.
    if (Platform.OS === 'android') await new Promise((r) => setTimeout(r, 400));
    const c = await voice.connect(token, { params: { To: to.length === 10 ? '+1' + to : to } });
    track(c, to);
    return true;
  } catch { return t('The call could not start. Check your internet and try again.'); }
}
