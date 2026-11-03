// Face ID / fingerprint sign-in. The server gives this phone its own key (never the password).
// The key sits in the Keychain / Keystore and can only be read after Face ID or fingerprint.
// The server swaps the key on every use, so a copied key stops working.
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { api, ApiError, clearCred, refreshSession } from './api';
import { t } from './i18n';

const KEY = 'oenod.device.key';   // {id, secret}: behind Face ID on iPhone
const FLAG = 'oenod.device.id';   // device id only, so the app knows the key exists without asking for Face ID
const native = Platform.OS !== 'web';
const plain = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
const guarded: SecureStore.SecureStoreOptions = Platform.OS === 'ios'
  ? { keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY, requireAuthentication: true, authenticationPrompt: 'Sign in to OENOD' }
  : { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

type Key = { id: number; secret: string };

/** "Face ID", "Touch ID", "fingerprint" or "face unlock", or null when the phone can't do it. */
export async function quickName(): Promise<string | null> {
  if (!native) return null;
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return null;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    if (Platform.OS === 'ios') return face ? 'Face ID' : 'Touch ID';
    return face ? t('face unlock') : t('fingerprint');
  } catch { return null; }
}

export async function quickOn(): Promise<boolean> {
  if (!native) return false;
  try { return !!(await SecureStore.getItemAsync(FLAG)); } catch { return false; }
}

async function saveKey(k: Key) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(k), guarded);
  await SecureStore.setItemAsync(FLAG, String(k.id), plain);
}

/** Reads the key after Face ID / fingerprint. Returns null if the person cancels. */
async function readKey(): Promise<Key | null> {
  if (Platform.OS !== 'ios') {
    // Android: ask for the fingerprint / face first, then read the key from the Keystore.
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: t('Sign in to OENOD'), cancelLabel: t('Use password'), disableDeviceFallback: false });
    if (!r.success) return null;
  }
  try {
    const v = await SecureStore.getItemAsync(KEY, guarded);
    return v ? (JSON.parse(v) as Key) : null;
  } catch { return null; } // cancelled on iPhone, or Face ID was reset (the key is then unreadable)
}

export async function quickForgetLocal() {
  if (!native) return;
  await SecureStore.deleteItemAsync(KEY, guarded).catch(() => {});
  await SecureStore.deleteItemAsync(FLAG, plain).catch(() => {});
}

/** Turn it on. Needs a fresh password sign-in, or the password (the server says 428 otherwise). */
export async function quickEnroll(password?: string): Promise<void> {
  const name = Platform.OS === 'ios' ? 'iPhone' : 'Android phone';
  const r = await api<{ device_id: number; secret: string }>('POST', '/api/auth/device/enroll', { name, platform: Platform.OS, ...(password ? { password } : {}) });
  await saveKey({ id: r.device_id, secret: r.secret });
  await clearCred(); // the phone no longer keeps the password
}

/** Sign in with Face ID. Returns the session, or null when not set up or cancelled. */
let running: Promise<any> | null = null;
export function quickLogin(): Promise<any | null> {
  if (!running) running = (async () => {
    if (!(await quickOn())) return null;
    const k = await readKey();
    if (!k) return null;
    await refreshSession();
    try {
      const s = await api<any>('POST', '/api/auth/device/login', { device_id: k.id, secret: k.secret });
      if (s?.device_secret) await saveKey({ id: k.id, secret: s.device_secret });
      return s?.user ? s : null;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await quickForgetLocal(); // turned off on the website, expired, or replaced
      throw e;
    }
  })().finally(() => { running = null; });
  return running;
}

/** Turn it off on this phone and on the server. */
export async function quickDisable() {
  const id = native ? await SecureStore.getItemAsync(FLAG).catch(() => null) : null;
  if (id) { try { await api('DELETE', `/api/account/devices/${Number(id)}`); } catch { /* already gone */ } }
  await quickForgetLocal();
}
