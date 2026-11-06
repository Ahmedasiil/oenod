// Phones stay upright. Tablets and unfolded foldables (Galaxy Z Fold, Pixel Fold, Pixel Tablet, iPad)
// turn freely, and the lock is re-checked whenever the window changes size (fold, unfold, split screen).
import { useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

const apply = () => {
  const { width, height } = Dimensions.get('window');
  const big = Math.min(width, height) >= 560;
  (big ? ScreenOrientation.unlockAsync() : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)).catch(() => {});
};

export function useOrientationRule() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    apply();
    const sub = Dimensions.addEventListener('change', apply);
    return () => sub.remove();
  }, []);
}
