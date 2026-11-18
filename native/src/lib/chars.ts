// Meeting characters (4.3), the same ones as the website's Meet picker: 89 poster characters (built in) and 390 World
// characters, a woman and a man from every country (downloaded from oenod.com the first time they are needed).
// Only a short code like "pczara" is shared with the others in the call (the "av" event), never a picture of your face,
// so people on the website see your character too, and you see theirs.
import { BASE } from './api';
import P from './posters.json';

export type Art = { xml: string; bg: string; vb: string; tk: null | { cx: number; cy: number; rx: number; ry: number; fill: string } };

export const POSTERS: [string, string][] = (P as any).list;
const PC: Record<string, string> = (P as any).pc;
export const isArt = (c: unknown): c is string => typeof c === 'string' && /^pc[a-z]{2,10}$/.test(c);

// ---------- World characters: loaded once from the website, only when someone needs them ----------
type WMeta = [string, string, string, string, string]; // key, name, country, region, w|m
export const WORLD = { st: 0 as 0 | 1 | 2, meta: [] as WMeta[], pc: {} as Record<string, string> };
const subs = new Set<() => void>();
export const onWorld = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
let loading: Promise<void> | null = null;
export function loadWorld(): Promise<void> {
  if (WORLD.st === 2) return Promise.resolve();
  if (!loading) {
    WORLD.st = 1;
    loading = (async () => {
      try {
        const r = await fetch(`${BASE}/assets/js/mw971.js?v=1`);
        const s = await r.text();
        const j = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
        WORLD.pc = j.pc || {}; WORLD.meta = j.meta || []; WORLD.st = 2;
      } catch { WORLD.st = 0; }
      loading = null;
      subs.forEach((f) => { try { f(); } catch { /* keep going */ } });
    })();
  }
  return loading;
}

// ---------- one picture, ready for react-native-svg ----------
const cache = new Map<string, Art>();
let uid = 0;
export function artFor(code: string): Art | null {
  if (!isArt(code)) return null;
  const k = code.slice(2);
  const hit = cache.get(k); if (hit) return hit;
  let raw = PC[k] || WORLD.pc[k];
  if (!raw) { if (/^x[a-z]{2}[wm]$/.test(k) && WORLD.st === 0) loadWorld(); return null; }
  raw = raw.replace(/<filter[\s\S]*?<\/filter>/g, '').replace(/<use[^>]*\/>/g, '').replace(/ filter="url\([^)]*\)"/g, '').replace(/\n/g, '');
  raw = raw.replace(/#U/g, 'c' + k + (++uid));
  let tk: Art['tk'] = null;
  raw = raw.replace(/<ellipse class="m88-tk"([^>]*)\/>/, (_m, a: string) => {
    const g = (n: string) => (a.match(new RegExp(' ' + n + '="([^"]*)"')) || [])[1] || '';
    tk = { cx: +g('cx'), cy: +g('cy'), rx: +g('rx'), ry: +g('ry'), fill: g('fill') || '#3A0A14' };
    return '';
  });
  raw = raw.replace(/ class="[^"]*"/g, '');
  const vb = (raw.match(/viewBox="([^"]*)"/) || [])[1] || '28 46 344 430';
  const bg = (raw.match(/<rect[^>]*fill="([^"]*)"/) || [])[1] || '#14203B';
  const a: Art = { xml: raw, bg, vb, tk };
  cache.set(k, a);
  return a;
}

export function artName(code: string): string {
  const k = code.slice(2);
  const p = POSTERS.find((x) => x[0] === k); if (p) return p[1];
  const w = WORLD.meta.find((x) => x[0] === k); return w ? `${w[1]} · ${w[2]}` : '';
}
