/* Seasonal app icon: the home-screen icon wears the same seasonal touch as the logo inside the app
   (Christmas hat, Eid crescent, Diwali lamp, Canada Day maple, ...), then goes back to the normal icon.
   iPhone: Apple only allows the change while the app is open and shows its own one-line note
   ("You have changed the icon for OENOD"), so it happens when the person opens the app.
   Android: changed quietly when the app goes to the background (changing it on screen can close the app).
   National days use flags that differ by country, so those keep the normal icon.
   The person can turn this off in Me > Appearance. */
import { AppState, Platform } from 'react-native';
import { currentLook, onSeason } from './season';
import { secure } from './secure';

const ICONS = ['xmas', 'newyear', 'canada', 'july4', 'eid', 'ramadan', 'diwali', 'lunar', 'halloween', 'poppy', 'thanks', 'stpat', 'valentine'];
const iconName = (k: string) => 'Season' + k[0].toUpperCase() + k.slice(1);
const KEY = 'oes.icon';

let mod: any = null;
function native() {
  if (Platform.OS === 'web') return null;
  if (mod) return mod;
  try { mod = require('expo-alternate-app-icons'); } catch { mod = null; }
  return mod;
}

let enabled = true;
export const seasonIconSupported = () => { const m = native(); return !!(m && m.supportsAlternateIcons); };
export const seasonIconOn = () => enabled;
export async function setSeasonIconOn(on: boolean) {
  enabled = on;
  await secure.set(KEY, on ? 'on' : 'off');
  await apply(Platform.OS === 'ios');
}

/** The icon today's look asks for (null = the normal icon). */
export function wantedIcon(): string | null {
  if (!enabled) return null;
  const look = currentLook();
  return look && ICONS.includes(look.key) ? iconName(look.key) : null;
}

let busy = false;
async function apply(now: boolean) {
  const m = native();
  if (!m || !m.supportsAlternateIcons || busy) return;
  const want = wantedIcon();
  let have: string | null = null;
  try { have = m.getAppIconName(); } catch { return; }
  if ((have || null) === want) return;
  if (!now) return;
  busy = true;
  try { await m.setAlternateAppIcon(want); } catch { /* Apple refuses while a system sheet is up: try next time */ }
  busy = false;
}

/** Starts the icon keeper. Call once, from the root layout. */
export function startSeasonIcon(): () => void {
  if (!native()) return () => {};
  secure.get(KEY).then((v) => { enabled = v !== 'off'; if (Platform.OS === 'ios') setTimeout(() => apply(true), 1500); }).catch(() => {});
  const sub = AppState.addEventListener('change', (st) => {
    if (Platform.OS === 'ios' && st === 'active') setTimeout(() => apply(true), 1500);
    if (Platform.OS === 'android' && st === 'background') apply(true);
  });
  const off = onSeason(() => { if (Platform.OS === 'ios' && AppState.currentState === 'active') apply(true); });
  return () => { sub.remove(); off(); };
}
