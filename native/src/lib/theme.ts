// OENOD look, in the style of oenod.com. Two palettes: Dark ("Midnight") and Light.
// C is one shared object; switching mode copies the other palette into it and the app redraws.
// 3.7 "Navy Frame" look, the same as oenod.com and HQ since ds1 (Nov 2026): OENOD navy #000C58,
// royal navy #0B1C86, sky #B9C4FF. No purple: "violet" now maps to royal navy so older screens follow.
const BRAND = {
  navy: '#000C58', navy2: '#0B1C86', navyDeep: '#000738', head: '#000C58', night: '#060B26',
  sky: '#B9C4FF', mist: '#A6AEDA', onDark: '#E8ECFA', violet: '#0B1C86', white: '#FFFFFF',
};

export const DARK = {
  ...BRAND,
  blue: '#8EA0FF', blueSoft: 'rgba(142,160,255,0.14)', black: '#03071A',
  ink: '#F2F4FF', sub: '#A6AEDA', faint: '#6E77A8', line: 'rgba(150,168,255,0.16)',
  bg: '#060B26', card: '#0D1440', card2: '#111A4C',
  field: '#0D1440', seg: '#0D1440', segOn: '#1A2560',
  tabBg: 'rgba(13,20,64,0.98)', tabOn: '#FFFFFF', link: '#B9C4FF',
  btn: '#FFFFFF', btnInk: '#000C58',
  good: '#4ADE9B', goodSoft: 'rgba(74,222,155,0.13)',
  warn: '#F5B454', warnSoft: 'rgba(245,180,84,0.12)', warnLine: 'rgba(245,180,84,0.3)',
  bad: '#FF8A80', badSoft: 'rgba(255,138,128,0.12)', badLine: 'rgba(255,138,128,0.3)',
  dark: true,
};

export const LIGHT: typeof DARK = {
  ...BRAND,
  blue: '#1B2A9E', blueSoft: '#ECEFFA', black: '#0B1033',
  ink: '#0B1033', sub: '#5A6286', faint: '#8A90AE', line: '#E3E7F2',
  bg: '#F3F5FB', card: '#FFFFFF', card2: '#F7F8FC',
  field: '#FFFFFF', seg: '#E7EBF6', segOn: '#FFFFFF',
  tabBg: '#000C58', tabOn: '#FFFFFF', link: '#1B2A9E',
  btn: '#000C58', btnInk: '#FFFFFF',
  good: '#0E7A4B', goodSoft: '#E4F3EB',
  warn: '#A35A00', warnSoft: '#FBF0E2', warnLine: '#F0D3AA',
  bad: '#B42318', badSoft: '#FBEAE8', badLine: '#F2C4BF',
  dark: false,
};

export const C = { ...LIGHT };

const redraw: (() => void)[] = [];
/** Modules that build styles from C register here, so they rebuild when the mode changes. */
export const onPalette = (fn: () => void) => { redraw.push(fn); fn(); };
export function applyPalette(dark: boolean) {
  if (C.dark === dark) return;
  Object.assign(C, dark ? DARK : LIGHT);
  redraw.forEach((f) => f());
}

export const R = { sm: 10, md: 14, lg: 20, xl: 26 };
/** The website's framed card ring (7px soft halo + 1px line), used around navy hero cards. */
export const FRAME = { halo: 'rgba(0,12,88,0.07)', ring: 'rgba(0,12,88,0.22)', haloDark: 'rgba(142,160,255,0.08)', ringDark: 'rgba(150,168,255,0.3)' };
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const shadow = { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6 };
