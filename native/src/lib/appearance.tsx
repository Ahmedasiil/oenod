// Appearance: Automatic (follows the phone), Light or Dark. Saved on this phone.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { applyPalette } from './theme';
import { secure } from './secure';

export type Mode = 'system' | 'light' | 'dark';
const KEY = 'oenod.appearance';
const Ctx = createContext<{ mode: Mode; dark: boolean; setMode: (m: Mode) => void }>({ mode: 'system', dark: true, setMode: () => {} });
export const useAppearance = () => useContext(Ctx);

// Screen to reopen after the app redraws in the new colours.
let returnTo: string | null = null;
/** Open this screen right after the next sign-in (used to show setup after a new account). */
export const setReturnTo = (r: string) => { returnTo = r; };
export const takeReturnTo = () => { const r = returnTo; returnTo = null; return r; };

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, set] = useState<Mode>('system');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    secure.get(KEY).then((v) => { if (v === 'light' || v === 'dark' || v === 'system') set(v); }).catch(() => {}).finally(() => setLoaded(true));
  }, []);
  const dark = mode === 'system' ? system !== 'light' : mode === 'dark';
  applyPalette(dark); // before children render, so every screen draws in the right colours
  const value = useMemo(() => ({
    mode, dark,
    setMode: (m: Mode) => { if (m === mode) return; returnTo = '/me'; set(m); secure.set(KEY, m).catch(() => {}); },
  }), [mode, dark]);
  if (!loaded) return null;
  return <Ctx.Provider value={value}><React.Fragment key={dark ? 'd' : 'l'}>{children}</React.Fragment></Ctx.Provider>;
}
