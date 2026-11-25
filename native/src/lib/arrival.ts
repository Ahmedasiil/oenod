// Arrival clock-in (4.6). On a shift day, when the phone comes within about 150 m of the shift's workplace, the phone
// shows "You're at <shop>. Tap to clock in." It works with the app closed: the phone's own region monitoring
// (iOS) / geofencing (Android) wakes the app, which shows a local notification. Nothing is sent to OENOD and no
// location is tracked: the phone only knows "entered this circle". Tapping the alert opens OENOD and clocks in
// through the usual /api/me/clock with a fresh GPS reading, so every server check still applies.
// Backup: a reminder 5 minutes after the shift starts, cancelled when you clock in from the app.
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { get } from './api';
import { secure } from './secure';
import { t } from './i18n';
import { utc } from './format';

export const ARRIVAL_TASK = 'oenod-arrival';
const PLAN_KEY = 'oenod.arrival.plan';
const SEEN_KEY = 'oenod.arrival.seen';
const OFF_KEY = 'oenod.arrival.off';
const ASKED_KEY = 'oenod.arrival.asked';
const native = Platform.OS !== 'web';

export type ArrivalShift = { shift_id: number; start: string; end: string; start_hm?: string; location: { id: number; name: string; lat: number; lng: number; radius_m?: number } };
export type ArrivalPlan = { tz?: string; today?: ArrivalShift[]; tomorrow?: ArrivalShift[]; reminder_min?: number };
type Stored = { at: number; shifts: ArrivalShift[] };

const ms = (s: string) => (utc(s) || new Date(NaN)).getTime();
/** The shift this arrival belongs to: from 60 minutes before the start until 30 minutes before the end. */
export function shiftFor(shifts: ArrivalShift[], locId: number, now = Date.now()): ArrivalShift | null {
  const c = shifts.filter((s) => s.location?.id === locId && now >= ms(s.start) - 60 * 60000 && now <= ms(s.end) - 30 * 60000);
  c.sort((a, b) => ms(a.start) - ms(b.start));
  return c[0] || null;
}
/** One circle per workplace (iOS allows 20). Radius 150 m by default, kept between 75 and 500 m. */
export function regionsFor(shifts: ArrivalShift[], now = Date.now()): Location.LocationRegion[] {
  const seen = new Map<number, Location.LocationRegion>();
  for (const s of shifts) {
    const l = s.location; if (!l || l.lat == null || l.lng == null || ms(s.end) < now) continue;
    if (!seen.has(l.id)) seen.set(l.id, { identifier: 'l' + l.id, latitude: Number(l.lat), longitude: Number(l.lng), radius: Math.min(500, Math.max(75, Number(l.radius_m) || 150)), notifyOnEnter: true, notifyOnExit: false });
  }
  return [...seen.values()].slice(0, 18);
}

async function readJson<T>(k: string, d: T): Promise<T> { try { const v = await secure.get(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } }
async function seenSet(): Promise<number[]> { const now = Date.now(); const s = await readJson<{ id: number; at: number }[]>(SEEN_KEY, []); return s.filter((x) => now - x.at < 36 * 3600000).map((x) => x.id); }
async function markSeen(id: number) { const now = Date.now(); const s = (await readJson<{ id: number; at: number }[]>(SEEN_KEY, [])).filter((x) => now - x.at < 36 * 3600000); s.push({ id, at: now }); await secure.set(SEEN_KEY, JSON.stringify(s.slice(-40))); }

/** Shows the alert once per shift. Exported for the click test. */
export async function onEnter(locId: number, now = Date.now()): Promise<ArrivalShift | null> {
  if (await secure.get(OFF_KEY)) return null;
  const plan = await readJson<Stored>(PLAN_KEY, { at: 0, shifts: [] });
  const s = shiftFor(plan.shifts, locId, now); if (!s) return null;
  if ((await seenSet()).includes(s.shift_id)) return null;
  await markSeen(s.shift_id);
  if (native) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'arrival-' + s.shift_id,
      content: { title: t("You're at {name}", { name: s.location.name }), body: t('Tap to clock in.'), data: { type: 'arrival', shift_id: s.shift_id, url: `/clockin?loc=${s.location.id}&shift=${s.shift_id}` }, sound: true },
      trigger: null,
    }).catch(() => {});
  }
  return s;
}

if (native) {
  TaskManager.defineTask<{ eventType: Location.GeofencingEventType; region: Location.LocationRegion }>(ARRIVAL_TASK, async ({ data, error }) => {
    if (error || !data || data.eventType !== Location.GeofencingEventType.Enter) return;
    const id = Number(String(data.region?.identifier || '').replace(/^l/, ''));
    if (id) await onEnter(id);
  });
}

async function stopRegions() { try { if (await Location.hasStartedGeofencingAsync(ARRIVAL_TASK)) await Location.stopGeofencingAsync(ARRIVAL_TASK); } catch { /* not running */ } }

/** Backup reminders 5 minutes after each shift starts (local, so they work with the app closed and no push). */
async function planReminders(shifts: ArrivalShift[], after: number) {
  const now = Date.now();
  const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => [] as Notifications.NotificationRequest[]);
  for (const n of all) if (String(n.identifier).startsWith('clockrem-')) await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
  const seen = await seenSet();
  for (const s of shifts) {
    const at = ms(s.start) + after * 60000; if (!(at > now + 30000) || seen.includes(-s.shift_id)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: 'clockrem-' + s.shift_id,
      content: { title: t('Your shift at {name} has started', { name: s.location?.name || 'OENOD' }), body: t('Tap to clock in.'), data: { type: 'clock_reminder', shift_id: s.shift_id, url: `/clockin?loc=${s.location?.id || ''}&shift=${s.shift_id}` }, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
    }).catch(() => {});
  }
}

/** Call after clocking in: no reminder for this shift any more. */
export async function clockedIn(shiftId?: number | null) {
  if (!native) return;
  const now = Date.now(); const plan = await readJson<Stored>(PLAN_KEY, { at: 0, shifts: [] });
  // Without a shift id, the shift running now (or starting within the hour).
  const ids = shiftId ? [shiftId] : plan.shifts.filter((s) => now >= ms(s.start) - 60 * 60000 && now <= ms(s.end)).map((s) => s.shift_id);
  for (const id of ids) { await Notifications.cancelScheduledNotificationAsync('clockrem-' + id).catch(() => {}); await markSeen(id); await markSeen(-id); }
}

/** Google Play and Apple: say plainly why OENOD wants location while closed, before the phone's own question. */
export const disclose = () => new Promise<boolean>((res) => {
  Alert.alert(
    t('Arrival alerts'),
    t('OENOD uses your location in the background, even when the app is closed, only to notice when you arrive at your workplace on a shift day and offer to clock you in. Your phone checks this by itself and sends nothing to OENOD until you tap to clock in. You can turn it off any time in Me > Arrival alerts.') + '\n\n' + t('On the next screen, choose "Allow all the time" (Android) or "Change to Always Allow" (iPhone).'),
    [{ text: t('Not now'), style: 'cancel', onPress: () => res(false) }, { text: t('Continue'), onPress: () => res(true) }],
    { cancelable: true, onDismiss: () => res(false) },
  );
});

export type ArrivalState = 'on' | 'off' | 'need_always' | 'need_location' | 'none' | 'web';

/**
 * Loads today's and tomorrow's shifts with their workplaces and sets up the circles and reminders. Call on app start,
 * when the app comes back to the front, and after sign-in. `ask` shows the permission prompts (first time only).
 */
export async function syncArrival(ask = false): Promise<ArrivalState> {
  if (!native) return 'web';
  let plan: ArrivalPlan;
  try { plan = await get<ArrivalPlan>('/api/me/arrival'); } catch { return 'none'; }
  const shifts = [...(plan.today || []), ...(plan.tomorrow || [])].filter((s) => s && s.location && s.shift_id);
  await secure.set(PLAN_KEY, JSON.stringify({ at: Date.now(), shifts } as Stored));
  if (await secure.get(OFF_KEY)) { await stopRegions(); return 'off'; }
  await planReminders(shifts, Math.max(1, Number(plan.reminder_min) || 5));
  const regions = regionsFor(shifts);
  if (!regions.length) { await stopRegions(); return 'none'; }
  try {
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      if (!ask) return 'need_location';
      const r = await Location.requestForegroundPermissionsAsync(); if (r.status !== 'granted') return 'need_location';
    }
    let bg = await Location.getBackgroundPermissionsAsync();
    if (bg.status !== 'granted') {
      if (!ask || (await secure.get(ASKED_KEY))) return 'need_always';
      await secure.set(ASKED_KEY, '1');
      if (!(await disclose())) return 'need_always';
      bg = await Location.requestBackgroundPermissionsAsync();
      if (bg.status !== 'granted') return 'need_always';
    }
    await Notifications.requestPermissionsAsync().catch(() => null);
    await Location.startGeofencingAsync(ARRIVAL_TASK, regions);
    return 'on';
  } catch { return 'none'; }
}

/** The Settings switch. */
export async function setArrival(on: boolean): Promise<ArrivalState> {
  if (on) { await secure.del(OFF_KEY); await secure.del(ASKED_KEY); return syncArrival(true); }
  await secure.set(OFF_KEY, '1'); await stopRegions();
  if (native) { const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => [] as Notifications.NotificationRequest[]); for (const n of all) if (String(n.identifier).startsWith('clockrem-')) await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}); }
  return 'off';
}
export const arrivalOff = async () => !!(await secure.get(OFF_KEY));

/** Where a tapped notification should go: arrival alerts, our reminders and OENOD's "Your shift has started" (att7). */
export function clockLinkFor(n: { title?: string | null; data?: any } | null | undefined): string | null {
  if (!n) return null;
  const d = n.data || {};
  if ((d.type === 'arrival' || d.type === 'clock_reminder') && typeof d.url === 'string') return d.url;
  if (d.kind === 'geo.att7' || /^Your shift has started/i.test(String(n.title || ''))) return '/clockin';
  return null;
}
