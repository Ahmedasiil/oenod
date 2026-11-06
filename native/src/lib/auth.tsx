import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { api, ApiError, BASE, clearCred, loadCred, post, refreshSession, saveCred, setAltSignIn, setSignedOutHandler } from './api';
import { quickEnroll, quickLogin, quickName, quickOn } from './quick';
import { t } from './i18n';
import { setLocale } from './format';

export type Session = {
  user: { id: number; name: string; email: string; role: string; totp_enabled?: boolean; pro?: boolean; lang?: string | null } | null;
  company: { id: number; name: string; currency: string; timezone: string; status: string; modules_off: string[] } | null;
  employee: { id: number; name: string; qr_token: string } | null;
  notifications?: number;
  maintenance?: string | null;
  version?: string;
};

type Ctx = {
  ready: boolean;
  session: Session | null;
  pending2fa: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (d: { name: string; email: string; password: string; company?: string; industry?: string; personal?: boolean }) => Promise<void>;
  verify2fa: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  providers: string[];
  signInWith: (provider: string) => Promise<void>;
  signInQuick: () => Promise<boolean>;
  quick: { name: string | null; on: boolean };
  refreshQuick: () => Promise<void>;
  isManager: boolean;
};

const AuthCtx = createContext<Ctx | null>(null);
export const MANAGER_ROLES = ['owner', 'admin', 'manager'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [pending2fa, setPending2fa] = useState(false);
  const [pendingCred, setPendingCred] = useState<{ email: string; password: string } | null>(null);
  const [providers, setProviders] = useState<string[]>([]);
  const [quick, setQuick] = useState<{ name: string | null; on: boolean }>({ name: null, on: false });
  const refreshQuick = useCallback(async () => { setQuick({ name: await quickName(), on: await quickOn() }); }, []);

  const apply = useCallback((s: Session | null) => {
    const sp = (s as any)?.signin_providers;
    if (Array.isArray(sp)) setProviders(sp.filter((p: string) => ['google', 'apple', 'microsoft'].includes(p)));
    setSession(s && s.user ? s : null);
    if (s?.company) setLocale(s.company.timezone, s.company.currency);
  }, []);

  const reload = useCallback(async () => {
    const s = await refreshSession();
    apply(s);
  }, [apply]);

  useEffect(() => {
    setSignedOutHandler(() => setSession(null));
    setAltSignIn(async () => !!(await quickLogin())?.user);
    (async () => {
      try {
        let s: Session = await refreshSession();
        await refreshQuick();
        if (!s.user && (await quickOn())) {
          try { const q = await quickLogin(); if (q?.user) s = q; } catch { /* show sign-in */ }
        }
        if (!s.user) {
          const c = await loadCred();
          if (c) {
            try {
              const r = await post('/api/auth/login', c);
              if (r?.user) s = r;
            } catch { /* show sign-in */ }
          }
        }
        apply(s);
      } catch { apply(null); }
      setReady(true);
    })();
  }, [apply, refreshQuick]);

  const offerQuick = useCallback(async (role?: string) => {
    if (role === 'superadmin') return; // HQ accounts use passkeys only
    const name = await quickName();
    if (!name || (await quickOn())) return;
    const yes = () => quickEnroll().then(refreshQuick).catch((e) => Alert.alert(name, e?.message || t('Could not turn it on. Try again from the Me tab.')));
    Alert.alert(t('Sign in with {m}?', { m: name }), t('Next time, open OENOD with {m} instead of typing your password. You can turn it off on the Me tab.', { m: name }), [
      { text: t('Not now'), style: 'cancel' },
      { text: t('Turn on'), onPress: yes },
    ]);
  }, [refreshQuick]);

  const signIn = useCallback(async (email: string, password: string) => {
    await refreshSession();
    const r = await api('POST', '/api/auth/login', { email: email.trim(), password });
    if (r?.pending_2fa) { setPendingCred({ email: email.trim(), password }); setPending2fa(true); return; }
    // Phones with Face ID / fingerprint use a device key instead of keeping the password.
    if (Platform.OS !== 'web' && !(await quickName())) await saveCred({ email: email.trim(), password });
    apply(r);
    offerQuick(r?.user?.role);
  }, [apply, offerQuick]);

  // New account from the app: a business (owner + free trial) or a personal account.
  const signUp = useCallback(async (d: { name: string; email: string; password: string; company?: string; industry?: string; personal?: boolean }) => {
    await refreshSession();
    const body: any = d.personal
      ? { type: 'personal', name: d.name.trim(), email: d.email.trim(), password: d.password, accept_terms: true }
      : { name: d.name.trim(), email: d.email.trim(), password: d.password, company: (d.company || '').trim(), industry: d.industry || '', plan: 'growth', accept_terms: true };
    const r = await api('POST', '/api/auth/signup', body);
    if (Platform.OS !== 'web' && !(await quickName())) await saveCred({ email: d.email.trim(), password: d.password });
    apply(r);
  }, [apply]);

  const signInQuick = useCallback(async () => {
    const r = await quickLogin();
    if (r?.user) { apply(r); return true; }
    await refreshQuick();
    return false;
  }, [apply, refreshQuick]);

  const signInWith = useCallback(async (provider: string) => {
    if (Platform.OS === 'web') { window.location.href = `${BASE}/api/auth/oauth/${provider}/start`; return; }
    const res = await WebBrowser.openAuthSessionAsync(`${BASE}/api/auth/oauth/${provider}/start?app=1`, 'oenod://auth');
    if (res.type !== 'success' || !res.url) return; // closed by the person
    const q = new URL(res.url.replace(/^oenod:\/\/auth/, 'https://app.invalid/auth')).searchParams;
    if (q.get('error')) throw new ApiError(400, q.get('error') || '');
    const ticket = q.get('ticket');
    if (!ticket) return;
    await refreshSession();
    const r = await api('POST', '/api/auth/oauth/ticket', { ticket });
    if (r?.pending_2fa) { setPendingCred(null); setPending2fa(true); return; }
    apply(r); // Face ID can be turned on later from the Me tab (it asks for the password)
  }, [apply]);

  const verify2fa = useCallback(async (code: string) => {
    const r = await api('POST', '/api/auth/2fa', { code: code.replace(/\s/g, '') });
    if (pendingCred && Platform.OS !== 'web' && !(await quickName())) await saveCred(pendingCred);
    const strong = !!pendingCred; // a Google/Apple/Microsoft sign-in can't add Face ID without the password
    setPending2fa(false);
    setPendingCred(null);
    apply(r);
    if (strong) offerQuick(r?.user?.role);
  }, [apply, pendingCred, offerQuick]);

  const signOut = useCallback(async () => {
    try { await post('/api/auth/logout'); } catch (e) { if (!(e instanceof ApiError)) throw e; }
    await clearCred();
    await import('./geo').then((g) => g.stopTracking()).catch(() => {});
    setPending2fa(false);
    setSession(null);
  }, []);

  const value = useMemo<Ctx>(() => ({
    ready, session, pending2fa, signIn, signUp, verify2fa, signOut, reload, providers, signInWith, signInQuick, quick, refreshQuick,
    isManager: MANAGER_ROLES.includes(session?.user?.role || ''),
  }), [ready, session, pending2fa, signIn, signUp, verify2fa, signOut, reload, providers, signInWith, signInQuick, quick, refreshQuick]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};
