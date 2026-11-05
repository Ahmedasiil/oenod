// OENOD look, in the style of oenod.com. Two palettes: Dark ("Midnight") and Light.
// C is one shared object; switching mode copies the other palette into it and the app redraws.
const BRAND = {
  navy: '#000C58', navy2: '#0A1A78', navyDeep: '#00062E', head: '#10186A',
  sky: '#9FB4FF', mist: '#C9D3EA', violet: '#7A5CFF', white: '#FFFFFF',
};

export const DARK = {
  ...BRAND,
  blue: '#4F6BFF', blueSoft: 'rgba(120,145,255,0.14)', black: '#05060B',
  ink: '#FFFFFF', sub: '#8F96AE', faint: '#5D647E', line: 'rgba(255,255,255,0.07)',
  bg: '#07080F', card: '#12141E', card2: '#1B1E2B',
  field: '#161925', seg: '#12141E', segOn: '#262A3B',
  tabBg: '#0D0F18', tabOn: '#FFFFFF', link: '#A9BAFF',
  btn: '#FFFFFF', btnInk: '#07080F',
  good: '#34D399', goodSoft: 'rgba(52,211,153,0.14)',
  warn: '#FBBF24', warnSoft: 'rgba(251,191,36,0.12)', warnLine: 'rgba(251,191,36,0.3)',
  bad: '#F87171', badSoft: 'rgba(248,113,113,0.13)', badLine: 'rgba(248,113,113,0.3)',
  dark: true,
};

export const LIGHT: typeof DARK = {
  ...BRAND,
  blue: '#1F33C9', blueSoft: '#E9ECFB', black: '#0A0D1F',
  ink: '#0A0D1F', sub: '#5B6276', faint: '#8A90A3', line: '#E6E8EF',
  bg: '#F3F4F8', card: '#FFFFFF', card2: '#F0F2F7',
  field: '#FFFFFF', seg: '#E8EAF1', segOn: '#FFFFFF',
  tabBg: '#FFFFFF', tabOn: '#000C58', link: '#1F33C9',
  btn: '#000C58', btnInk: '#FFFFFF',
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
