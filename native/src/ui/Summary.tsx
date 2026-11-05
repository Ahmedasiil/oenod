import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { C } from '../lib/theme';
import { HeroCard } from './Brand';
import { Rise } from './Motion';
import { Icon, type IconName } from './Icon';
import { Row } from './kit';
import { locale } from '../lib/i18n';
import { utc } from '../lib/format';

/** Shared tint palette, the same one the home screen tiles use. */
export const TINTS = ['#7C93FF', '#A78BFA', '#34D399', '#FBBF24', '#38BDF8', '#F472B6'];
/** Short date like "Thu 20" for tight tiles. */
export const shortDay = (iso?: string | null) => { if (!iso) return '—'; const d = iso.length <= 10 ? new Date(iso + 'T12:00:00') : utc(iso); return d ? d.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric' }) : '—'; };
export const tint = (n: number) => TINTS[((n % TINTS.length) + TINTS.length) % TINTS.length];

/** Small glass stat tile that sits inside a HeroCard. */
export function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, backgroundColor: 'rgba(7,11,34,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12 }}>
      <Text style={{ color: C.mist, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
      <Text style={{ color: C.white, fontSize: value.length > 11 ? 13 : value.length > 7 ? 15 : 18, fontWeight: '800', marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
    </View>
  );
}

/** The gradient summary card every screen opens with: label, big number, badge, and up to 3 mini stats. */
export function Summary({ label, value, badge, minis, foot, seed = 5, children, style }: {
  label: string; value?: string; badge?: React.ReactNode; minis?: [string, string][]; foot?: string; seed?: number; children?: React.ReactNode; style?: ViewStyle;
}) {
  return (
    <Rise>
      <HeroCard seed={seed} style={style}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: C.mist, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{label}</Text>
          {badge}
        </Row>
        {value != null ? <Text style={{ color: C.white, fontSize: value.length > 18 ? 27 : value.length > 14 ? 30 : value.length > 10 ? 34 : 40, fontWeight: '800', letterSpacing: -1.2 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text> : null}
        {children}
        {minis?.length ? <Row style={{ gap: 8 }}>{minis.map(([l, v]) => <Mini key={l} label={l} value={v} />)}</Row> : null}
        {foot ? <Text style={{ color: C.mist, fontSize: 13 }}>{foot}</Text> : null}
      </HeroCard>
    </Rise>
  );
}

/** Tinted rounded-square icon used at the start of list rows and cards. */
export function IconTile({ name, color = TINTS[0], size = 40 }: { name: IconName; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.33, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} color={color} size={Math.round(size * 0.5)} />
    </View>
  );
}

/** A staggered section wrapper so lists rise in after the summary. */
export function Section({ children, i = 0 }: { children: React.ReactNode; i?: number }) {
  return <Rise delay={140 + i * 90} style={{ gap: 12 }}>{children}</Rise>;
}

/** Calendar-style date block: short weekday over the day number. */
export function DateTile({ iso, today }: { iso: string; today?: boolean }) {
  const d = (iso.length <= 10 ? new Date(iso + 'T12:00:00') : utc(iso)) || new Date();
  const wd = d.toLocaleDateString(locale(), { weekday: 'short' }).replace('.', '');
  const on = !!today;
  return (
    <View style={{ width: 52, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.blue : C.blue + '1A', borderWidth: 1, borderColor: on ? C.blue : C.blue + '33' }}>
      <Text style={{ color: on ? '#FFFFFF' : C.link, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>{wd}</Text>
      <Text style={{ color: on ? '#FFFFFF' : C.ink, fontSize: 20, fontWeight: '800', marginTop: -1 }}>{d.getDate()}</Text>
    </View>
  );
}
