// iPhone only: the OENOD Apple Watch app sends its pairing code here, so the person only taps Allow.
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type Native = {
  pending(): string | null;
  status(): { supported: boolean; paired: boolean; installed: boolean };
  addListener(name: 'onPair', cb: (e: { code: string }) => void): { remove(): void };
};
const N: Native | null = Platform.OS === 'ios' ? requireOptionalNativeModule<Native>('OenodWatchLink') : null;

export const watchPending = (): string | null => { try { return N ? N.pending() : null; } catch { return null; } };
export const onWatchPair = (cb: (code: string) => void) => {
  try { const s = N?.addListener('onPair', (e) => { if (e && /^\d{6}$/.test(e.code)) cb(e.code); }); return () => s?.remove(); } catch { return () => {}; }
};
