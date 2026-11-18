// OENOD Meet helpers for the app: make a meeting, get its 10-number code, share it, remember recent codes and
// keep the person's own room. Everything uses the same oenod.com API as the website.
import { Linking, Platform, Share } from 'react-native';
import { get, post } from './api';
import { secure } from './secure';
import { t } from './i18n';
import { day, time } from './format';
import { meetingId } from '../app/guest';

export type Person = { name?: string; email?: string; employee_id?: number | null };
export type Meeting = { id: number; title: string; starts_at: string; duration_min?: number; url?: string; status?: string; host?: string; host_user_id?: number; agenda?: string | null; people?: Person[] };
export type MadeMeeting = { id: number; url: string; token: string; title: string; starts_at: string; duration_min: number };

/** The server keeps times in UTC as "YYYY-MM-DD HH:MM:SS". */
/** A Date as the server's UTC text, which format.ts time() and day() read. */
export const srv = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
export const at = (s: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s.replace(' ', 'T') : s.replace(' ', 'T') + 'Z');
export const ends = (m: Meeting) => at(m.starts_at).getTime() + (m.duration_min || 30) * 60000;
export const tokenOf = (m: { url?: string }) => meetingId(String(m.url || ''));
export const names = (m: Meeting) => (m.people || []).map((p) => p.name || p.email || '').filter(Boolean);
export const when = (m: { starts_at: string; duration_min?: number }) => `${day(m.starts_at)} · ${time(m.starts_at)}–${time(srv(new Date(at(m.starts_at).getTime() + (m.duration_min || 30) * 60000)))}`;
export const lenText = (min?: number) => { const n = min || 30; return n % 60 === 0 ? t('{n} h', { n: n / 60 }) : n > 60 ? t('{h} h {m} min', { h: Math.floor(n / 60), m: n % 60 }) : t('{n} min', { n }); };

const codes = new Map<string, string>();
/** The meeting's 10-number code, shown as "482 913 5067". Empty when it can't be found. */
export async function codeFor(token: string | null): Promise<string> {
  if (!token) return '';
  if (codes.has(token)) return codes.get(token)!;
  try {
    const r = await get<{ code?: string; pretty?: string }>(`/api/public/mc1/${encodeURIComponent(token)}`);
    const c = r?.pretty || (r?.code ? r.code.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3') : '');
    if (c) codes.set(token, c);
    return c;
  } catch { return ''; }
}

/** Make an OENOD Meet meeting. Starts now when `instant`, else at `starts`. */
export async function makeMeeting(o: { title: string; instant?: boolean; starts?: Date; duration_min?: number; employee_ids?: number[]; guests?: string; agenda?: string }): Promise<MadeMeeting> {
  const starts = o.instant || !o.starts ? new Date() : o.starts;
  const r = await post<{ id: number; url: string }>('/api/meetings', {
    title: o.title, agenda: o.agenda || '', provider: 'oenod', instant: !!o.instant, starts_at: starts.toISOString(),
    duration_min: o.duration_min || 60, employee_ids: o.employee_ids || [], guests: o.guests || '',
  });
  const token = meetingId(String(r?.url || ''));
  if (!r?.id || !token) throw new Error(t('The meeting could not be made. Please try again.'));
  return { id: r.id, url: r.url, token, title: o.title, starts_at: srv(starts), duration_min: o.duration_min || 60 };
}

export function inviteText(m: { title: string; starts_at: string; duration_min?: number; url?: string }, code: string) {
  const soon = at(m.starts_at).getTime() <= Date.now() + 5 * 60000;
  return [
    t('Join my OENOD Meet video call: {title}', { title: m.title }),
    soon ? t('Now') : when(m),
    m.url ? t('Join: {url}', { url: m.url }) : '',
    code ? t('Meeting code: {code}', { code }) : '',
    t('In the OENOD app: Meet > Join with code.'),
  ].filter(Boolean).join('\n');
}

/** Open the phone's share sheet (Messages, WhatsApp, Mail, Copy and so on). */
export const shareInvite = (m: { title: string; starts_at: string; duration_min?: number; url?: string }, code: string) =>
  Share.share(Platform.OS === 'ios' ? { message: inviteText(m, code) } : { message: inviteText(m, code), title: m.title }).catch(() => {});
export const textInvite = (m: { title: string; starts_at: string; duration_min?: number; url?: string }, code: string) =>
  Linking.openURL(`sms:${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(inviteText(m, code))}`).catch(() => shareInvite(m, code));
export const emailInvite = (m: { title: string; starts_at: string; duration_min?: number; url?: string }, code: string) =>
  Linking.openURL(`mailto:?subject=${encodeURIComponent(t('Invitation: {title}', { title: m.title }))}&body=${encodeURIComponent(inviteText(m, code))}`).catch(() => shareInvite(m, code));

// Recent codes typed on Join with code (this phone only).
export type Recent = { code: string; title?: string; at: number };
const RK = 'oenod.meet.recent';
export async function recentCodes(): Promise<Recent[]> {
  try { const v = JSON.parse((await secure.get(RK)) || '[]'); return Array.isArray(v) ? v.slice(0, 5) : []; } catch { return []; }
}
export async function rememberCode(code: string, title?: string) {
  const d = code.replace(/\D/g, '');
  if (d.length !== 10) return;
  const list = (await recentCodes()).filter((r) => r.code !== d);
  await secure.set(RK, JSON.stringify([{ code: d, title, at: Date.now() }, ...list].slice(0, 5))).catch(() => {});
}
export async function forgetCodes() { await secure.del(RK).catch(() => {}); }

// Your room: one long meeting of your own, same code every time while it lasts. Made again when it has ended.
const ROOM = 'oenod.meet.room';
export type Room = { token: string; url: string; code: string; title: string; starts_at: string; duration_min: number };
export async function myRoom(name: string, fresh = false): Promise<Room> {
  if (!fresh) {
    try {
      const r: Room | null = JSON.parse((await secure.get(ROOM)) || 'null');
      const live = r && at(r.starts_at).getTime() + r.duration_min * 60000 > Date.now() + 30 * 60000;
      if (r && live) { const code = await codeFor(r.token); if (code) return { ...r, code }; }
    } catch { /* make a new one */ }
  }
  const first = String(name || '').trim().split(/\s+/)[0];
  const m = await makeMeeting({ title: first ? t("{name}'s room", { name: first }) : t('Your room'), instant: true, duration_min: 600 });
  const code = await codeFor(m.token);
  const room: Room = { token: m.token, url: m.url, code, title: m.title, starts_at: m.starts_at, duration_min: 600 };
  await secure.set(ROOM, JSON.stringify(room)).catch(() => {});
  return room;
}
