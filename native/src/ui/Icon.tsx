// OENOD icon set: rounded strokes with a soft duotone fill, drawn for OENOD (24 x 24 grid).
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'home' | 'calendar' | 'sun' | 'users' | 'user' | 'bell' | 'clock' | 'check' | 'x' | 'chevron' | 'back' | 'phone' | 'mail' | 'pin' | 'logout' | 'globe' | 'qr' | 'plus' | 'coffee' | 'cash' | 'chart' | 'briefcase' | 'shield' | 'spark' | 'arrow' | 'face' | 'news' | 'moon' | 'device';

export function Icon({ name, size = 22, color = '#0B1220', stroke = 1.9, duo = true }: { name: IconName; size?: number; color?: string; stroke?: number; duo?: boolean }) {
  const p = { stroke: color, strokeWidth: stroke, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  // f: the soft tinted fill behind the outline
  const f = { fill: color, fillOpacity: duo ? 0.18 : 0, stroke: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && <><Path {...f} d="M4.5 10.2 12 4l7.5 6.2V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19z" /><Path {...p} d="M3 11 12 3.5 21 11" /><Path {...p} d="M5 9.6V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V9.6" /><Path {...p} d="M10 20.5v-5a2 2 0 0 1 4 0v5" /></>}
      {name === 'calendar' && <><Rect {...f} x={3.5} y={5} width={17} height={5} rx={2} /><Rect {...p} x={3.5} y={5} width={17} height={15.5} rx={3} /><Path {...p} d="M3.5 10h17M8 3v4M16 3v4" /><Circle cx={8.5} cy={14.5} r={1.1} fill={color} /><Circle cx={12} cy={14.5} r={1.1} fill={color} /><Circle cx={15.5} cy={14.5} r={1.1} fill={color} /></>}
      {name === 'sun' && <><Circle {...f} cx={12} cy={12} r={4.5} /><Circle {...p} cx={12} cy={12} r={4} /><Path {...p} d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>}
      {name === 'users' && <><Circle {...f} cx={9} cy={8} r={3.8} /><Circle {...p} cx={9} cy={8} r={3.5} /><Path {...p} d="M2.5 20c.8-3.6 3.4-5.6 6.5-5.6s5.7 2 6.5 5.6" /><Path {...p} d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.9c1.8.7 3 2.5 3.5 5.1" /></>}
      {name === 'user' && <><Circle {...f} cx={12} cy={8} r={4.3} /><Circle {...p} cx={12} cy={8} r={4} /><Path {...p} d="M4.5 20.5c1-3.9 4-6.2 7.5-6.2s6.5 2.3 7.5 6.2" /></>}
      {name === 'bell' && <><Path {...f} d="M6 16v-5a6 6 0 0 1 12 0v5l1.6 1.8H4.4z" /><Path {...p} d="M6 16v-5a6 6 0 0 1 12 0v5l1.6 1.8H4.4z" /><Path {...p} d="M10 20.5a2.2 2.2 0 0 0 4 0" /></>}
      {name === 'clock' && <><Circle {...f} cx={12} cy={12} r={9} /><Circle {...p} cx={12} cy={12} r={9} /><Path {...p} d="M12 7.2V12l3.2 2" /></>}
      {name === 'check' && <><Circle {...f} cx={12} cy={12} r={9.5} /><Path {...p} d="M7.5 12.4 10.6 15.5 16.8 8.8" /></>}
      {name === 'x' && <Path {...p} d="M6.5 6.5l11 11M17.5 6.5l-11 11" />}
      {name === 'chevron' && <Path {...p} d="M9.5 5.5 16 12l-6.5 6.5" />}
      {name === 'back' && <Path {...p} d="M14.5 5.5 8 12l6.5 6.5" />}
      {name === 'phone' && <><Path {...f} d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" /><Path {...p} d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" /></>}
      {name === 'mail' && <><Rect {...f} x={3} y={5} width={18} height={14} rx={3} /><Rect {...p} x={3} y={5} width={18} height={14} rx={3} /><Path {...p} d="m3.5 7.5 8.5 6 8.5-6" /></>}
      {name === 'pin' && <><Path {...f} d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><Path {...p} d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><Circle {...p} cx={12} cy={9.5} r={2.5} /></>}
      {name === 'logout' && <><Path {...p} d="M14.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3.5" /><Path {...p} d="M10 8l-4 4 4 4M6 12h10" /></>}
      {name === 'globe' && <><Circle {...f} cx={12} cy={12} r={9} /><Circle {...p} cx={12} cy={12} r={9} /><Path {...p} d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" /></>}
      {name === 'qr' && <><Rect {...f} x={3} y={3} width={7} height={7} rx={1.8} /><Rect {...p} x={3} y={3} width={7} height={7} rx={1.8} /><Rect {...p} x={14} y={3} width={7} height={7} rx={1.8} /><Rect {...p} x={3} y={14} width={7} height={7} rx={1.8} /><Path {...p} d="M14 14h3v3h-3zM20.5 14v.01M14 20.5h.01M17 20.5h3.5V17" /></>}
      {name === 'plus' && <><Circle {...f} cx={12} cy={12} r={9.5} /><Path {...p} d="M12 7.5v9M7.5 12h9" /></>}
      {name === 'coffee' && <><Path {...f} d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><Path {...p} d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><Path {...p} d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3.5v2.5M12 3.5v2.5" /></>}
      {name === 'cash' && <><Rect {...f} x={2.5} y={6} width={19} height={12} rx={3} /><Rect {...p} x={2.5} y={6} width={19} height={12} rx={3} /><Circle {...p} cx={12} cy={12} r={2.6} /><Path {...p} d="M6 9.5v.01M18 14.5v.01" /></>}
      {name === 'chart' && <><Rect {...f} x={3} y={3} width={18} height={18} rx={4} /><Path {...p} d="M7 16.5v-3M12 16.5v-8M17 16.5v-5.5" /></>}
      {name === 'briefcase' && <><Rect {...f} x={3} y={7} width={18} height={13} rx={3} /><Rect {...p} x={3} y={7} width={18} height={13} rx={3} /><Path {...p} d="M9 7V5.5A2 2 0 0 1 11 3.5h2a2 2 0 0 1 2 2V7M3 13h18" /></>}
      {name === 'shield' && <><Path {...f} d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z" /><Path {...p} d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z" /><Path {...p} d="m9 12 2 2 4-4" /></>}
      {name === 'spark' && <><Path {...f} d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" /><Path {...p} d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7zM18.5 16.5l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6z" /></>}
      {name === 'arrow' && <Path {...p} d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" />}
      {name === 'face' && <><Path {...p} d="M4 8.5V6.5a2.5 2.5 0 0 1 2.5-2.5h2M15.5 4h2A2.5 2.5 0 0 1 20 6.5v2M20 15.5v2a2.5 2.5 0 0 1-2.5 2.5h-2M8.5 20h-2A2.5 2.5 0 0 1 4 17.5v-2" /><Path {...p} d="M9 9.5v1M15 9.5v1M12 9.5v3.5h-1M9.5 16c1.5 1.2 3.5 1.2 5 0" /></>}
      {name === 'news' && <><Rect {...f} x={3} y={4} width={18} height={16} rx={3} /><Rect {...p} x={3} y={4} width={18} height={16} rx={3} /><Path {...p} d="M7 8.5h5M7 12h10M7 15.5h7" /></>}
      {name === 'moon' && <><Path {...f} d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /><Path {...p} d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></>}
      {name === 'device' && <><Rect {...f} x={6} y={2.5} width={12} height={19} rx={3} /><Rect {...p} x={6} y={2.5} width={12} height={19} rx={3} /><Path {...p} d="M10.5 18.5h3" /></>}
    </Svg>
  );
}
