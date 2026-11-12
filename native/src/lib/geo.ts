// Site attendance (OENOD 3.4): precise location at clock-in, and location reports to the
// server while clocked in at a geofenced site (never on breaks, never after clock-out).
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { get, post } from './api';
import { secure } from './secure';
import { t } from './i18n';

export const GEO_TASK = 'oenod-site-attendance';
const WARN_KEY = 'oenod.geo.warn';
const native = Platform.OS !== 'web';

export type GeoSession = { time_entry_id: number; state: 'inside' | 'outside' | 'off' | 'lost' | 'break'; site: string; distance_m: number | null } | null;
export type GeoMe = { enabled: boolean; track: boolean; strict: boolean; ping_sec: number; policy_version: number; consented: boolean; session: GeoSession };
export type Fix = { lat?: number; lng?: number; accuracy?: number; mocked?: boolean; location_status: 'ok' | 'off' | 'denied' | 'unavailable' };

const fromPos = (p: Location.LocationObject): Fix => ({
  lat: p.coords.latitude, lng: p.coords.longitude,
  accuracy: p.coords.accuracy == null ? undefined : Math.round(p.coords.accuracy),
  mocked: !!p.mocked, location_status: 'ok',
});

/** One precise reading for clock-in / clock-out. Never throws. */
export async function currentFix(): Promise<Fix> {
  try {
    if (native && !(await Location.hasServicesEnabledAsync())) return { location_status: 'off' };
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { location_status: 'denied' };
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((r) => setTimeout(() => r(null), 12000)),
    ]);
    if (pos) return fromPos(pos);
    const last = await Location.getLastKnownPositionAsync({ maxAge: 60000, requiredAccuracy: 100 });
    return last ? fromPos(last) : { location_status: 'unavailable' };
  } catch { return { location_status: 'unavailable' }; }
}

/** Shows the server's employee message once per new title (local notification). */
async function showWarning(w: { title: string; body: string } | null | undefined) {
  if (!w) { await secure.del(WARN_KEY); return; }
  const last = await secure.get(WARN_KEY);
  if (last === w.title) return;
  await secure.set(WARN_KEY, w.title);
  if (!native) return;
  try {
    await Notifications.scheduleNotificationAsync({ content: { title: w.title, body: w.body }, trigger: null });
  } catch { /* notifications are a nice-to-have; the banner shows it too */ }
}

async function ping(body: Record<string, unknown>) {
  try {
    const r = await post<{ tracking: boolean; warning: { title: string; body: string } | null; clocked_out?: boolean }>('/api/geo/ping', body);
    await showWarning(r.warning);
    if (!r.tracking || r.clocked_out) await stopTracking();
    return r;
  } catch (e: any) {
    if (e?.status === 401 || e?.status === 403) await stopTracking();
    return null;
  }
}

/** Status for the current state of location services and permission. */
async function statusNow(): Promise<'ok' | 'off' | 'denied'> {
  try {
    if (!(await Location.hasServicesEnabledAsync())) return 'off';
    const p = await Location.getForegroundPermissionsAsync();
    return p.status === 'granted' ? 'ok' : 'denied';
  } catch { return 'ok'; }
}

if (native) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(GEO_TASK, async ({ data, error }) => {
    if (error) {
      const s = await statusNow();
      await ping({ status: s === 'ok' ? 'unavailable' : s, background: true });
      return;
    }
    const locs = data?.locations || [];
    const p = locs[locs.length - 1];
    if (!p) return;
    await ping({ ...fromPos(p), status: 'ok', background: true });
  });
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export async function isTracking() {
  if (!native) return false;
  try { return await Location.hasStartedLocationUpdatesAsync(GEO_TASK); } catch { return false; }
}

export async function stopTracking() {
  if (!native) return;
  try { if (await Location.hasStartedLocationUpdatesAsync(GEO_TASK)) await Location.stopLocationUpdatesAsync(GEO_TASK); } catch { /* not running */ }
}

let fgTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Starts or stops location reports to match what the server says. Call after every clock
 * action, on app start and when the app comes back to the front. Returns the server status.
 */
export async function syncTracking(): Promise<GeoMe | null> {
  let me: GeoMe;
  try { me = await get<GeoMe>('/api/geo/me'); } catch { return null; }
  const want = !!(me.enabled && me.track && me.consented && me.session && me.session.state !== 'break');
  if (!want) {
    await stopTracking();
    if (fgTimer) { clearInterval(fgTimer); fgTimer = null; }
    return me;
  }
  // Send one reading now, so the manager sees where things stand straight away.
  const s = await statusNow();
  if (s !== 'ok') await ping({ status: s, background: false });
  else { const f = await currentFix(); await ping(f.lat != null ? { ...f, status: 'ok', background: false } : { status: f.location_status, background: false }); }

  if (!native || Platform.OS === 'ios') {
    // Web, and iPhone (3.7, App Store rule 2.5.4: no location while the app is closed): report every
    // ping_sec seconds while the app is open. The server flags the gap when it is closed.
    if (native) await stopTracking(); // a phone that ran the old background reports turns them off
    if (!fgTimer) fgTimer = setInterval(async () => { const f = await currentFix(); await ping(f.lat != null ? { ...f, status: 'ok', background: false } : { status: f.location_status, background: false }); }, Math.max(30, me.ping_sec || 60) * 1000);
    return me;
  }
  if (await isTracking()) return me;
  try {
    if (Platform.OS === 'android') await Notifications.requestPermissionsAsync().catch(() => null);
    else await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true } }).catch(() => null);
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') { await ping({ status: 'denied', background: false }); return me; }
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') {
      // The app still reports while it is open; the server flags the gap if it is closed.
      return me;
    }
    await Location.startLocationUpdatesAsync(GEO_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 15,
      timeInterval: Math.max(30, me.ping_sec || 60) * 1000,
      deferredUpdatesInterval: Math.max(30, me.ping_sec || 60) * 1000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      activityType: Location.ActivityType.Other,
      foregroundService: {
        notificationTitle: t('OENOD: clocked in'),
        notificationBody: t('Location is shared with your manager until you clock out or start a break.'),
        notificationColor: '#000C58',
        killServiceOnDestroy: false,
      },
    });
  } catch { /* the server notices missing reports and tells the manager */ }
  return me;
}

/** Consent prompt: the screen resolves this when the person accepts or leaves. */
let consentWaiter: ((ok: boolean) => void) | null = null;
export const waitForConsent = () => new Promise<boolean>((res) => { consentWaiter?.(false); consentWaiter = res; });
export const answerConsent = (ok: boolean) => { const w = consentWaiter; consentWaiter = null; w?.(ok); };
