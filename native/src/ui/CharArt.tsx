// A meeting character (poster or World) drawn with react-native-svg. The mouth opens with the voice level (0..1),
// like on the website: the picture itself is drawn once, only the small mouth on top moves.
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Ellipse, SvgXml } from 'react-native-svg';
import { artFor, onWorld } from '../lib/chars';

const Base = memo(function Base({ xml }: { xml: string }) {
  return <SvgXml xml={xml} width="100%" height="100%" />;
});

export function CharArt({ code, level = 0, fit = 'slice', style }: { code: string; level?: number; fit?: 'slice' | 'meet'; style?: ViewStyle }) {
  const [, bump] = useState(0);
  useEffect(() => onWorld(() => bump((n) => n + 1)), []);
  const a = artFor(code);
  if (!a) return <View style={[{ backgroundColor: '#14203B' }, style]} />;
  const par = fit === 'meet' ? 'xMidYMax meet' : 'xMidYMid slice';
  const xml = a.xml.replace(/preserveAspectRatio="[^"]*"/, `preserveAspectRatio="${par}"`).replace(/<svg /, '<svg width="100%" height="100%" ');
  const s = 0.3 + Math.min(1, level) * 0.9;
  const tk = a.tk;
  return (
    <View style={[{ backgroundColor: a.bg, overflow: 'hidden' }, style]}>
      <Base xml={xml} />
      {tk && level > 0.06 ? (
        <Svg style={StyleSheet.absoluteFill} viewBox={a.vb} preserveAspectRatio={par} pointerEvents="none">
          <Ellipse cx={tk.cx} cy={tk.cy - tk.ry * 0.5 + tk.ry * 0.5 * s} rx={tk.rx} ry={tk.ry * s} fill={tk.fill} />
        </Svg>
      ) : null}
    </View>
  );
}
