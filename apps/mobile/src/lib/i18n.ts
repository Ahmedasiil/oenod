import { I18nManager } from 'react-native';
import { dir, isLocale, t as translate, type Key } from '@oenod/i18n';

let current = 'en';

/** Use the person's OENOD language, or the phone's language the first time. */
export function setLocale(l?: string | null) {
  const device = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0];
  current = isLocale(l) ? l : isLocale(device) ? device : 'en';
  const rtl = dir(current) === 'rtl';
  // Right-to-left layout (Arabic) takes effect the next time the app opens.
  if (I18nManager.isRTL !== rtl) { I18nManager.allowRTL(rtl); I18nManager.forceRTL(rtl); }
  return current;
}
export const locale = () => current;
export const t = (k: Key, vars?: Record<string, string | number>) => translate(current, k, vars);
