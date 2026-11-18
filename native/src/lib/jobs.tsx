// Shared bits for the in-app job marketplace: the job row, work types, plain limit messages and "near me".
import React from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { t } from './i18n';
import { Dot, Item, Tag } from '../ui/T1';

export type JobCard = { id: number; title: string; type: string; pay: string | null; company: string; city: string | null; remote: boolean; category: string; created_at: string; snippet: string; match: number | null; saved: boolean; applied: string | null; km?: number | null; new?: boolean };
export const TYPES: [string, string][] = [['', 'Any type'], ['full_time', 'Full time'], ['part_time', 'Part time'], ['contract', 'Contract'], ['seasonal', 'Seasonal']];
export const typeName = (k: string) => t((TYPES.find((x) => x[0] === k) || ['', k])[1]);
/** Plan limits come back as 402: say it plainly, with no plan names or prices. */
export const plain = (e: any, what: 'apply' | 'cover' | 'alert' | 'share') => {
  if (e?.status !== 402) return e;
  return new Error(t(what === 'apply' ? 'You used all your applications for this month. You can apply again on the 1st.' : what === 'cover' ? 'Ava cover letters are not on your account yet. You can write your own below.'
    : what === 'alert' ? 'You have the most job alerts your account can keep. Remove one to add another.' : 'Share links are not on your account yet.'));
};
/** One reading of where the phone is, rounded to about 1 km. Null when location is off or not allowed. */
export async function nearMe(): Promise<{ lat: number; lng: number } | null> {
  try {
    if (Platform.OS !== 'web' && !(await Location.hasServicesEnabledAsync())) return null;
    if ((await Location.requestForegroundPermissionsAsync()).status !== 'granted') return null;
    const p = await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), new Promise<null>((r) => setTimeout(() => r(null), 10000))])
      || await Location.getLastKnownPositionAsync({ maxAge: 600000 });
    return p ? { lat: Math.round(p.coords.latitude * 100) / 100, lng: Math.round(p.coords.longitude * 100) / 100 } : null;
  } catch { return null; }
}

export function JobRow({ j, onPress }: { j: JobCard; onPress: () => void }) {
  const where = j.remote ? t('Remote') : [j.city, j.km != null ? t('{k} km', { k: j.km }) : null].filter(Boolean).join(' · ');
  return (
    <Item onPress={onPress} left={<Dot icon="briefcase" tone={j.applied ? 'good' : j.saved ? 'nv' : 'dk'} />} title={j.title}
      sub={[j.company, where, typeName(j.type)].filter(Boolean).join(' · ')} right={j.pay || undefined}
      rightSub={j.applied ? <Tag text={t('Applied')} tone="good" /> : j.match != null ? <Tag text={t('{n}% match', { n: j.match })} tone={j.match >= 70 ? 'good' : j.match >= 45 ? 'info' : 'plain'} /> : j.new ? <Tag text={t('New')} tone="info" /> : undefined} />
  );
}

