// OENOD look, in the style of oenod.com. Two palettes: Dark ("Midnight") and Light.
// C is one shared object; switching mode copies the other palette into it and the app redraws.
const BRAND = {
  navy: '#000C58', navy2: '#0A1A78', navyDeep: '#00062E', head: '#10186A',
  sky: '#9FB4FF', mist: '#C9D3EA', violet: '#7A5CFF', white: '#FFFFFF',
};

export const DARK = {
  ...BRAND,
  blue: '#4F6BFF', blueSoft: 'rgba(91,124,255,0.16)', black: '#02030D',
  ink: '#F4F6FF', sub: '#A3AED0', faint: '#6E7AA3', line: 'rgba(255,255,255,0.09)',
  bg: '#070B22', card: '#0D1338', card2: '#141B47',
  field: 'rgba(255,255,255,0.06)', seg: 'rgba(255,255,255,0.06)', segOn: '#1C2766',
  tabBg: '#060920', tabOn: '#FFFFFF', link: '#9FB4FF',
  good: '#34D399', goodSoft: 'rgba(52,211,153,0.14)',
  warn: '#FBBF24', warnSoft: 'rgba(251,191,36,0.12)', warnLine: 'rgba(251,191,36,0.3)',
  bad: '#F87171', badSoft: 'rgba(248,113,113,0.13)', badLine: 'rgba(248,113,113,0.3)',
  dark: true,
};

export const LIGHT: typeof DARK = {
  ...BRAND,
  blue: '#3D5BFF', blueSoft: '#ECEFFF', black: '#0B1020',
  ink: '#0B1020', sub: '#5B6478', faint: '#8A93A6', line: '#E5E8F0',
  bg: '#F5F6FA', card: '#FFFFFF', card2: '#F3F5FA',
  field: '#F5F6FA', seg: '#ECEEF4', segOn: '#FFFFFF',
  tabBg: '#FFFFFF', tabOn: '#3D5BFF', link: '#3D5BFF',
  good: '#0E9F6E', goodSoft: '#E3F6EE',
  warn: '#B45309', warnSoft: '#FEF3E2', warnLine: '#F7D9AE',
  bad: '#DC2626', badSoft: '#FDECEC', badLine: '#F6C7C7',
  dark: false,
};

export const C = { ...DARK };

const redraw: (() => void)[] = [];
/** Modules that build styles from C register here, so they rebuild when the mode changes. */
export const onPalette = (fn: () => void) => { redraw.push(fn); fn(); };
export function applyPalette(dark: boolean) {
  if (C.dark === dark) return;
  Object.assign(C, dark ? DARK : LIGHT);
  redraw.forEach((f) => f());
}

export const R = { sm: 8, md: 12, lg: 18, xl: 24 };
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const shadow = { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 };
