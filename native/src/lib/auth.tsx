import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, clearCred, loadCred, post, refreshSession, saveCred, setSignedOutHandler } from './api';
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
  verify2fa: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  isManager: boolean;
};

const AuthCtx = createContext<Ctx | null>(null);
export const MANAGER_ROLES = ['owner', 'admin', 'manager'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [pending2fa, setPending2fa] = useState(false);
  const [pendingCred, setPendingCred] = useState<{ email: string; password: string } | null>(null);

  const apply = useCallback((s: Session | null) => {
    setSession(s && s.user ? s : null);
    if (s?.company) setLocale(s.company.timezone, s.company.currency);
  }, []);

  const reload = useCallback(async () => {
    const s = await refreshSession();
    apply(s);
  }, [apply]);

  useEffect(() => {
    setSignedOutHandler(() => setSession(null));
    (async () => {
      try {
        let s: Session = await refreshSession();
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
  }, [apply]);

  const signIn = useCallback(async (email: string, password: string) => {
    await refreshSession();
    const r = await api('POST', '/api/auth/login', { email: email.trim(), password });
    if (r?.pending_2fa) { setPendingCred({ email: email.trim(), password }); setPending2fa(true); return; }
    await saveCred({ email: email.trim(), password });
    apply(r);
  }, [apply]);

  const verify2fa = useCallback(async (code: string) => {
    const r = await api('POST', '/api/auth/2fa', { code: code.replace(/\s/g, '') });
    if (pendingCred) await saveCred(pendingCred);
    setPending2fa(false);
    setPendingCred(null);
    apply(r);
  }, [apply, pendingCred]);

  const signOut = useCallback(async () => {
    try { await post('/api/auth/logout'); } catch (e) { if (!(e instanceof ApiError)) throw e; }
    await clearCred();
    setPending2fa(false);
    setSession(null);
  }, []);

  const value = useMemo<Ctx>(() => ({
    ready, session, pending2fa, signIn, verify2fa, signOut, reload,
    isManager: MANAGER_ROLES.includes(session?.user?.role || ''),
  }), [ready, session, pending2fa, signIn, verify2fa, signOut, reload]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};
