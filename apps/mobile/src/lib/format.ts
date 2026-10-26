import { formatDate, formatMoney, formatTime, localeInfo } from '@oenod/i18n';
import { locale } from './i18n';

export const money = (v: number | string, currency = 'CAD') => formatMoney(locale(), Math.round(Number(v) * 100), currency);
export const day = (d: string | Date) => formatDate(locale(), d, { weekday: 'short', month: 'short', day: 'numeric' });
export const time = (d: string | Date, tz?: string) => formatTime(locale(), d, tz);
export const longDate = (d: string | Date) => formatDate(locale(), d, { dateStyle: 'medium' });
export const hoursBetween = (a: string | Date, b: string | Date) => Math.round(((new Date(b).getTime() - new Date(a).getTime()) / 36e5) * 10) / 10;
export const intl = () => localeInfo(locale()).intl;
