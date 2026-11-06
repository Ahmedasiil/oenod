// OENOD look, in the style of oenod.com. Two palettes: Dark ("Midnight") and Light.
// C is one shared object; switching mode copies the other palette into it and the app redraws.
// 3.6 "Night" look, matching the redesigned oenod.com: night #050B24 hero, blue #3D5BF5, violet #6B5CF6.
const BRAND = {
  navy: '#000C58', navy2: '#0B1B3F', navyDeep: '#050B24', head: '#0B1B3F', night: '#050B24',
  sky: '#AFC3FF', mist: '#9AA5C8', onDark: '#E8ECFA', violet: '#6B5CF6', white: '#FFFFFF',
};

export const DARK = {
  ...BRAND,
  blue: '#5B76FF', blueSoft: 'rgba(91,118,255,0.16)', black: '#03071A',
  ink: '#F2F4FB', sub: '#9AA5C8', faint: '#66708F', line: 'rgba(175,195,255,0.10)',
  bg: '#050B24', card: '#0C1536', card2: '#132045',
  field: '#0C1536', seg: '#0C1536', segOn: '#1C2A55',
  tabBg: 'rgba(10,18,50,0.98)', tabOn: '#FFFFFF', link: '#AFC3FF',
  btn: '#FFFFFF', btnInk: '#0A1230',
  good: '#34D399', goodSoft: 'rgba(52,211,153,0.14)',
  warn: '#FBBF24', warnSoft: 'rgba(251,191,36,0.12)', warnLine: 'rgba(251,191,36,0.3)',
  bad: '#F87171', badSoft: 'rgba(248,113,113,0.13)', badLine: 'rgba(248,113,113,0.3)',
  dark: true,
};

export const LIGHT: typeof DARK = {
  ...BRAND,
  blue: '#3D5BF5', blueSoft: '#ECEFFE', black: '#0A1230',
  ink: '#0A1230', sub: '#4A5372', faint: '#7A829C', line: '#E4E7F0',
  bg: '#F5F7FB', card: '#FFFFFF', card2: '#EEF1F8',
  field: '#FFFFFF', seg: '#E9ECF4', segOn: '#FFFFFF',
  tabBg: 'rgba(255,255,255,0.985)', tabOn: '#0A1230', link: '#3D5BF5',
  btn: '#0A1230', btnInk: '#FFFFFF',
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

export const R = { sm: 10, md: 14, lg: 20, xl: 26 };
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const shadow = { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6 };
