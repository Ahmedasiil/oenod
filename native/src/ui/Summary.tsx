import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { C } from '../lib/theme';
import { NavyFill } from './Brand';
import { Rise } from './Motion';
import { Icon, type IconName } from './Icon';
import { Row } from './kit';
import { locale } from '../lib/i18n';
import { utc } from '../lib/format';

/** Shared tint palette, the same one the home screen tiles use. */
export const TINTS = ['#000C58', '#0B1C86', '#1B2A9E', '#2A3BC4', '#000738', '#3346C9'];
/** Short date like "Thu 20" for tight tiles. */
export const shortDay = (iso?: string | null) => { if (!iso) return '—'; const d = iso.length <= 10 ? new Date(iso + 'T12:00:00') : utc(iso); return d ? d.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric' }) : '—'; };
export const tint = (n: number) => TINTS[((n % TINTS.length) + TINTS.length) % TINTS.length];

/** Small glass stat tile that sits inside the navy summary card. */
export function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 11 }}>
      <Text style={{ color: '#FFFFFF', fontSize: value.length > 11 ? 13 : value.length > 7 ? 14.5 : 17, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      <Text style={{ color: '#9AA5C8', fontSize: 11.5, marginTop: 1 }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/** The navy summary card screens open with (same look as the wallet card): label, big number, badge, up to 3 mini stats. */
export function Summary({ label, value, badge, minis, foot, children, style }: {
  label: string; value?: string; badge?: React.ReactNode; minis?: [string, string][]; foot?: string; seed?: number; children?: React.ReactNode; style?: ViewStyle;
}) {
  const [sz, setSz] = React.useState({ w: 340, h: 180 });
  return (
    <Rise>
      <View style={[{ borderRadius: 27, padding: 5, backgroundColor: C.dark ? 'rgba(142,160,255,0.08)' : 'rgba(0,12,88,0.07)' }, style]}>
      <View onLayout={(e) => setSz({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={{ borderRadius: 22, padding: 18, gap: 12, overflow: 'hidden', backgroundColor: '#000C58', borderWidth: 1, borderColor: 'rgba(185,196,255,0.22)' }}>
        <NavyFill w={sz.w} h={sz.h} />
        <Row style={{ justifyContent: 'space-between', zIndex: 1 }}>
          <Text style={{ color: '#B9C4FF', fontWeight: '600', fontSize: 13, flexShrink: 1 }} numberOfLines={1}>{label}</Text>
          {badge}
        </Row>
        {value != null ? <Text style={{ zIndex: 1, color: '#FFFFFF', fontSize: value.length > 18 ? 26 : value.length > 14 ? 29 : value.length > 10 ? 32 : 36, fontWeight: '800', letterSpacing: -1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text> : null}
        {children ? <View style={{ zIndex: 1 }}>{children}</View> : null}
        {minis?.length ? <Row style={{ gap: 8, zIndex: 1 }}>{minis.map(([l, v]) => <Mini key={l} label={l} value={v} />)}</Row> : null}
        {foot ? <Text style={{ color: '#9AA5C8', fontSize: 13, zIndex: 1 }}>{foot}</Text> : null}
      </View>
      </View>
    </Rise>
  );
}

/** Tinted rounded-square icon used at the start of list rows and cards. */
export function IconTile({ name, color, size = 40 }: { name: IconName; color?: string; size?: number }) {
  // Navy Frame: white icon on a navy tile (light), soft navy tile with a sky icon (dark). `color` is kept for old callers.
  void color;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.33, backgroundColor: C.dark ? '#16205E' : '#000C58', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} color={C.dark ? '#B9C4FF' : '#FFFFFF'} size={Math.round(size * 0.5)} duo={false} />
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
