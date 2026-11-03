// Secure storage: the iPhone Keychain / Android Keystore on phones, session storage on the web test build.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const web = {
  get: async (k: string) => { try { return globalThis.sessionStorage?.getItem(k) ?? null; } catch { return null; } },
  set: async (k: string, v: string) => { try { globalThis.sessionStorage?.setItem(k, v); } catch { /* ignore */ } },
  del: async (k: string) => { try { globalThis.sessionStorage?.removeItem(k); } catch { /* ignore */ } },
};

export const secure = Platform.OS === 'web' ? web : {
  get: (k: string) => SecureStore.getItemAsync(k),
  set: (k: string, v: string) => SecureStore.setItemAsync(k, v, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }),
  del: (k: string) => SecureStore.deleteItemAsync(k),
};
