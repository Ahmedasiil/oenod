// The approved OENOD look: white-led, deep navy, one bright blue for actions. Same palette as the web app.
export const C = {
  bg: '#F4F6FB',
  paper: '#FFFFFF',
  ink: '#0A0F2C',
  text: '#3A4160',
  muted: '#6E7591',
  faint: '#A3A9BF',
  line: '#E6E9F2',
  hair: '#EEF0F6',
  navy: '#000F55',
  navyDeep: '#000938',
  navy2: '#0A1E8C',
  royal: '#1B33C4',
  blue: '#2342E0',
  sky: '#EEF2FF',
  sky2: '#DCE4FF',
  onNavy: '#C9D4FF',
  onNavyMuted: '#8C9BD9',
  green: '#16A464',
  greenBg: '#E8F8F0',
  amber: '#9A6100',
  amberBg: '#FFF4DE',
  red: '#D92D4F',
  redBg: '#FFF1F4',
  violet: '#6C3FE0',
  violetBg: '#F2EDFF',
};

// Gradients for the navy hero surfaces.
export const G = {
  hero: ['#000A3D', '#000F55', '#13289E'] as const,
  orb: ['#2342E0', '#6C3FE0'] as const,
};

// Typefaces match the web app: Sora for headings and numbers, Plus Jakarta Sans for everything else.
export const F = {
  display: 'Sora_600SemiBold',
  displayBold: 'Sora_700Bold',
  displayLight: 'Sora_300Light',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semi: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extra: 'PlusJakartaSans_800ExtraBold',
};

export const R = { xs: 8, sm: 12, md: 16, lg: 22, xl: 28, pill: 999 };
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

/** Soft, layered shadow used on cards (React Native's boxShadow works on iOS, Android and web). */
const SHADOWS = [
  '0px 1px 2px rgba(10,19,64,0.04), 0px 4px 12px rgba(10,19,64,0.05)',
  '0px 2px 4px rgba(10,19,64,0.04), 0px 10px 24px rgba(10,19,64,0.08)',
  '0px 6px 14px rgba(10,19,64,0.10), 0px 22px 44px rgba(10,19,64,0.18)',
];
export const shadow = (level: 1 | 2 | 3 = 1) => ({ boxShadow: SHADOWS[level - 1] });
