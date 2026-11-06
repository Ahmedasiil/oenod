import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { C } from '../lib/theme';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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
      <View onLayout={(e) => setSz({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={[{ borderRadius: 22, padding: 18, gap: 12, overflow: 'hidden', backgroundColor: '#000C58' }, style]}>
        <Svg width={sz.w} height={sz.h} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Defs><LinearGradient id="sumg" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#000C58" /><Stop offset="0.6" stopColor="#1B2A8F" /><Stop offset="1" stopColor="#3D5BF5" /></LinearGradient></Defs>
          <Rect width={sz.w} height={sz.h} fill="url(#sumg)" />
          <Circle cx={sz.w - 50} cy={40} r={100} stroke="rgba(255,255,255,0.14)" fill="none" />
          <Circle cx={sz.w - 50} cy={40} r={130} stroke="rgba(255,255,255,0.05)" strokeWidth={30} fill="none" />
        </Svg>
        <Row style={{ justifyContent: 'space-between', zIndex: 1 }}>
          <Text style={{ color: '#AFC3FF', fontWeight: '600', fontSize: 13, flexShrink: 1 }} numberOfLines={1}>{label}</Text>
          {badge}
        </Row>
        {value != null ? <Text style={{ zIndex: 1, color: '#FFFFFF', fontSize: value.length > 18 ? 26 : value.length > 14 ? 29 : value.length > 10 ? 32 : 36, fontWeight: '800', letterSpacing: -1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text> : null}
        {children ? <View style={{ zIndex: 1 }}>{children}</View> : null}
        {minis?.length ? <Row style={{ gap: 8, zIndex: 1 }}>{minis.map(([l, v]) => <Mini key={l} label={l} value={v} />)}</Row> : null}
        {foot ? <Text style={{ color: '#9AA5C8', fontSize: 13, zIndex: 1 }}>{foot}</Text> : null}
      </View>
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
