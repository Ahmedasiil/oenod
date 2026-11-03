import { locale, t } from './i18n';
// Dates from the server are UTC ("2026-11-03 13:00:00"). Show them in the company's time zone.
let tz: string | undefined;
let currency = 'CAD';
export const setLocale = (timezone?: string | null, cur?: string | null) => {
  tz = timezone || undefined;
  if (cur) currency = cur;
};

export const utc = (s?: string | null): Date | null => {
  if (!s) return null;
  const str = String(s);
  return new Date(str.length <= 10 ? str + 'T12:00:00' : str.replace(' ', 'T') + 'Z');
};

const fmt = (d: Date | null, o: Intl.DateTimeFormatOptions) => {
  if (!d) return '—';
  try { return d.toLocaleString(locale(), { ...o, timeZone: tz }); } catch { return d.toLocaleString(locale(), o); }
};

export const time = (s?: string | null) => fmt(utc(s), { hour: 'numeric', minute: '2-digit' });
export const day = (s?: string | null) => fmt(utc(s), { weekday: 'short', month: 'short', day: 'numeric' });
export const longDay = (s?: string | null) => fmt(utc(s), { weekday: 'long', month: 'long', day: 'numeric' });
/** A plain date "2026-11-23" (no time zone shift). */
export const date = (ymd?: string | null) => {
  if (!ymd) return '—';
  const d = new Date(ymd + 'T12:00:00');
  return d.toLocaleDateString(locale(), { month: 'short', day: 'numeric', year: 'numeric' });
};
/** Local "YYYY-MM-DD" key in the company time zone, for grouping shifts by day. */
export const dayKey = (s?: string | null) => {
  const d = utc(s);
  if (!d) return '';
  try { return d.toLocaleDateString('en-CA', { timeZone: tz }); } catch { return d.toISOString().slice(0, 10); }
};
export const todayKey = () => {
  try { return new Date().toLocaleDateString('en-CA', { timeZone: tz }); } catch { return new Date().toISOString().slice(0, 10); }
};
export const hm = (m?: number | null) => {
  const v = Math.max(0, Math.round(m || 0));
  return `${Math.floor(v / 60)}h ${String(v % 60).padStart(2, '0')}m`;
};
export const minutesBetween = (a?: string | null, b?: string | null) => {
  const x = utc(a), y = utc(b);
  return x && y ? Math.round((y.getTime() - x.getTime()) / 60000) : 0;
};
export const money = (n?: number | null, digits = 0) => {
  const v = Number(n || 0);
  try { return new Intl.NumberFormat(locale(), { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v); }
  catch { return '$' + v.toFixed(digits); }
};
export const greeting = () => {
  let h = new Date().getHours();
  try { h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: tz })) % 24; } catch { /* device time */ }
  return t(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
};
export const initials = (n?: string | null) => String(n || '?').split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
export const label = (s?: string | null) => t(String(s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()));
