import { useEffect, useState } from 'react';
import { api } from './api';
import { APP_VERSION } from './config';
import { locale } from './i18n';

export type Surface = { mode: 'LIVE' | 'MAINTENANCE' | 'READ_ONLY' | string; title?: string | null; message?: string | null; messages?: Record<string, string> | null; endsAt?: string | null; minVersion?: string | null; latestVersion?: string | null; updateUrl?: string | null };
export type PlatformStatus = { surfaces: Record<string, Surface>; banner?: { message: string; level?: string; link?: string | null } | null };

/** True when version a is older than b (1.2.9 < 1.2.10). */
export function older(a: string, b: string) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] ?? 0) - (y[i] ?? 0); if (d) return d < 0; }
  return false;
}

/** The switches the super admin sets for the mobile apps: maintenance, view-only, forced update, banner. Re-checked every two minutes. */
export function usePlatformStatus() {
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  useEffect(() => {
    let on = true;
    const load = () => api<PlatformStatus>('/api/platform/status', { auth: false }).then((s) => on && setStatus(s)).catch(() => {});
    load();
    const t = setInterval(load, 120_000);
    return () => { on = false; clearInterval(t); };
  }, []);
  const all = status?.surfaces?.all, mobile = status?.surfaces?.mobile;
  const live = all && all.mode !== 'LIVE' ? all : mobile;
  const translated = live && { ...live, message: live.messages?.[locale()] || live.message };
  return {
    status,
    maintenance: translated?.mode === 'MAINTENANCE' ? translated : null,
    readOnly: translated?.mode === 'READ_ONLY' ? translated : null,
    mustUpdate: mobile?.minVersion && older(APP_VERSION, mobile.minVersion) ? mobile : null,
    banner: status?.banner ?? null,
  };
}
