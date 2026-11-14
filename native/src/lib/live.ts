// 3.9: keeps the live shift (lock screen + Dynamic Island) in step with the time clock.
import { liveEnd, liveShow } from '../../modules/oenod-live/src';
import { t } from './i18n';

const utc = (s: string) => new Date(s.replace(' ', 'T') + 'Z');

type Open = { clock_in: string; break_started_at: string | null; break_minutes: number } | null;

export function syncLive(open: Open, site: string) {
  if (!open) { liveEnd(); return; }
  const since = new Date(utc(open.clock_in).getTime() + (open.break_minutes || 0) * 60000);
  liveShow({ site: site || 'OENOD', since, breakSince: open.break_started_at ? utc(open.break_started_at) : null, label: t('On shift'), breakLabel: t('On break') });
}
