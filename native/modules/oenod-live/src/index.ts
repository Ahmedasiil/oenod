// iPhone only (iOS 16.2+): the live shift on the lock screen and in the Dynamic Island.
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type Native = {
  supported(): boolean;
  show(site: string, since: number, breakSince: number, label: string, breakLabel: string): Promise<void>;
  end(): Promise<void>;
};
const N: Native | null = Platform.OS === 'ios' ? requireOptionalNativeModule<Native>('OenodLive') : null;

export const liveSupported = (): boolean => { try { return !!N?.supported(); } catch { return false; } };
export const liveShow = (o: { site: string; since: Date; breakSince?: Date | null; label: string; breakLabel: string }) =>
  N ? N.show(o.site, o.since.getTime() / 1000, o.breakSince ? o.breakSince.getTime() / 1000 : 0, o.label, o.breakLabel).catch(() => {}) : Promise.resolve();
export const liveEnd = () => (N ? N.end().catch(() => {}) : Promise.resolve());
