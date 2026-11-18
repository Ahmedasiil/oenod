// Tap to share (Android): while the business card screen is open, this phone acts as an NFC tag
// holding the public card link, so tapping another phone opens the card there.
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type Native = { status(): 'none' | 'off' | 'ready'; start(url: string): boolean; stop(): void; lastCrash?(): string | null };
const N: Native | null = Platform.OS === 'android' ? requireOptionalNativeModule<Native>('OenodTap') : null;

export const tapStatus = (): 'none' | 'off' | 'ready' => { try { return N ? N.status() : 'none'; } catch { return 'none'; } };
export const tapStart = (url: string) => { try { return N ? N.start(url) : false; } catch { return false; } };
export const tapStop = () => { try { N?.stop(); } catch { /* ignore */ } };
/** Why the app last closed on its own (Android), read once; null when it did not. */
export const lastCrash = (): string | null => { try { return N?.lastCrash ? N.lastCrash() : null; } catch { return null; } };
