// Tap to share (Android): while the business card screen is open, this phone acts as an NFC tag
// holding the public card link, so tapping another phone opens the card there.
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type Native = { status(): 'none' | 'off' | 'ready'; start(url: string): boolean; stop(): void; lastCrash?(): string | null; flushCookies?(): void; sessionCookie?(): string | null; restoreSession?(v: string): boolean };
const N: Native | null = Platform.OS === 'android' ? requireOptionalNativeModule<Native>('OenodTap') : null;

export const tapStatus = (): 'none' | 'off' | 'ready' => { try { return N ? N.status() : 'none'; } catch { return 'none'; } };
export const tapStart = (url: string) => { try { return N ? N.start(url) : false; } catch { return false; } };
export const tapStop = () => { try { N?.stop(); } catch { /* ignore */ } };
/** Why the app last closed on its own (Android), read once; null when it did not. */
export const lastCrash = (): string | null => { try { return N?.lastCrash ? N.lastCrash() : null; } catch { return null; } };

/** Saves the sign-in cookies now (Android), so a sudden close never signs the person out. */
export const flushCookies = () => { try { N?.flushCookies?.(); } catch { /* ignore */ } };
/** The sign-in cookie value (Android), to keep a copy that survives the app closing. */
export const sessionCookie = (): string | null => { try { return N?.sessionCookie ? N.sessionCookie() : null; } catch { return null; } };
/** Puts a kept sign-in cookie back when Android forgot it (Android). */
export const restoreSession = (v: string): boolean => { try { return N?.restoreSession ? N.restoreSession(v) : false; } catch { return false; } };
