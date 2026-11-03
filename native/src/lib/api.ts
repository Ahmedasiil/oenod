// OENOD API client. Talks to the same server and database as the website (https://oenod.com).
// Session cookie + CSRF header, exactly like the web app. Sign-in details are kept in the
// phone's secure keychain so the app can sign back in by itself when the server session ends.
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { secure } from './secure';
import { lang } from './i18n';

const configured = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl || 'https://oenod.com';
// On the web build (used for testing), talk to the server that served the page.
export const BASE = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : configured.replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  data: any;
  constructor(status: number, message: string, fields?: Record<string, string>, data?: any) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.data = data || {};
  }
}

let csrf = '';
let onSignedOut: (() => void) | null = null;
export const setSignedOutHandler = (fn: () => void) => { onSignedOut = fn; };

const CRED_KEY = 'oenod.cred';
export type Cred = { email: string; password: string };
export const saveCred = (c: Cred) => secure.set(CRED_KEY, JSON.stringify(c));
export const loadCred = async (): Promise<Cred | null> => {
  try { const v = await secure.get(CRED_KEY); return v ? (JSON.parse(v) as Cred) : null; } catch { return null; }
};
export const clearCred = () => secure.del(CRED_KEY);

async function raw(method: string, path: string, body?: unknown): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { Accept: 'application/json', 'X-OENOD-Client': `app-${Platform.OS}`, 'X-OENOD-Page': 'app', 'Accept-Language': lang() };
  if (method !== 'GET') { headers['Content-Type'] = 'application/json'; if (csrf) headers['X-CSRF-Token'] = csrf; }
  let res: Response;
  try {
    res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'include' });
  } catch {
    throw new ApiError(0, 'No internet connection. Check your connection and try again.');
  }
  let data: any = null;
  try { data = await res.json(); } catch { data = null; }
  if (data && typeof data === 'object' && typeof data.csrf === 'string' && data.csrf) csrf = data.csrf;
  return { status: res.status, data };
}

export async function refreshSession(): Promise<any> {
  const r = await raw('GET', '/api/session');
  if (r.status >= 400) throw new ApiError(r.status, r.data?.error || 'OENOD is not reachable right now.');
  return r.data;
}

let relogin: Promise<boolean> | null = null;
let altSignIn: (() => Promise<boolean>) | null = null;
/** Lets the Face ID module sign back in when the server session ends. */
export const setAltSignIn = (fn: () => Promise<boolean>) => { altSignIn = fn; };
async function silentSignIn(): Promise<boolean> {
  if (!relogin) {
    relogin = (async () => {
      const c = await loadCred();
      if (!c) { try { return altSignIn ? await altSignIn() : false; } catch { return false; } }
      await refreshSession();
      const r = await raw('POST', '/api/auth/login', c);
      return r.status === 200 && !!r.data?.user;
    })().finally(() => { setTimeout(() => { relogin = null; }, 0); });
  }
  return relogin;
}

/** Call the API. Retries once after a CSRF refresh (419) or a silent sign-in (401). */
export async function api<T = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  if (method !== 'GET' && !csrf) await refreshSession();
  let r = await raw(method, path, body);
  if (r.status === 419) { await refreshSession(); r = await raw(method, path, body); }
  if (r.status === 401 && !path.startsWith('/api/auth/')) {
    if (await silentSignIn()) r = await raw(method, path, body);
    if (r.status === 401) { onSignedOut?.(); }
  }
  if (r.status >= 400 || r.status === 0) {
    const d = r.data || {};
    throw new ApiError(r.status, d.error || 'Something went wrong. Please try again.', d.fields, d);
  }
  return r.data as T;
}

export const get = <T = any>(p: string) => api<T>('GET', p);
export const post = <T = any>(p: string, b: unknown = {}) => api<T>('POST', p, b);
export const put = <T = any>(p: string, b: unknown = {}) => api<T>('PUT', p, b);
