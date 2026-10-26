import * as Location from 'expo-location';

/** Current position for clocking in, or null if the person said no or it took too long. */
export async function currentPosition(): Promise<{ lat: number; lng: number; accuracy: number | null } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  try {
    const p = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((r) => setTimeout(() => r(null), 12_000)),
    ]);
    if (!p) { const last = await Location.getLastKnownPositionAsync(); return last ? { lat: last.coords.latitude, lng: last.coords.longitude, accuracy: last.coords.accuracy } : null; }
    return { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
  } catch { return null; }
}
