// Business Phone in the app (3.8, iPhone): company calls ring like normal phone calls through CallKit,
// also when the phone is locked. The server (pbx1) gives a Twilio Voice token to people with a phone
// seat; this file registers it, keeps it fresh, and tracks the one active call for the in-app call screen.
// Android waits for OENOD's Firebase project (see react-native.config.js); web uses the website's phone.
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { get, post } from './api';

type PbxMe = { allowed: boolean; ready: boolean; on: boolean; seat: boolean; status: 'available' | 'busy' | 'off' };
export type CallView = { from: string; state: 'connecting' | 'ringing' | 'live' | 'reconnecting' | 'ended'; muted: boolean; held: boolean; since: number | null };

let Voice: any = null;
let voice: any = null;
if (Platform.OS === 'ios') {
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
    voice.initializePushRegistry().catch(() => {});
    voice.setCallKitConfiguration({ callKitIncludesCallsInRecents: true, callKitMaximumCallGroups: 1, callKitMaximumCallsPerCallGroup: 1 } as any).catch(() => {});
    voice.on(Voice.Voice.Event.CallInvite, (inv: any) => {
      const from = who(inv.getFrom?.());
      inv.on(Voice.CallInvite.Event.Accepted, (c: any) => track(c, from));
    });
    // A call already answered from the lock screen before the app's JavaScript started.
    voice.getCalls().then((m: Map<string, any>) => { const c = [...m.values()][0]; if (c && !call) track(c, who(c.getFrom?.())); }).catch(() => {});
    return true;
  } catch { voice = null; return false; }
}

/** Sign-in / app comes to the front: register this iPhone for company calls when the person has a seat. */
export async function syncPhone(): Promise<void> {
  if (!Voice) return;
  let me: PbxMe;
  try { me = await get<PbxMe>('/api/pbx/me'); } catch { return; }
  if (!(me.allowed && me.on && me.ready && me.seat)) { await stopPhone(); return; }
  if (!setup()) return;
  if (token && Date.now() - tokenAt < 30 * 60 * 1000) return;
  try {
    const r = await post<{ token: string }>('/api/pbx/token', { platform: 'ios' });
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
export async function speakerPicker() { try { await voice?.showAvRoutePickerView(); } catch { /* ignore */ } }
export async function keypad(d: string) { try { await call?.sendDigits(d); } catch { /* ignore */ } }
