import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'home' | 'calendar' | 'sun' | 'users' | 'user' | 'bell' | 'clock' | 'check' | 'x' | 'chevron' | 'back' | 'phone' | 'mail' | 'pin' | 'logout' | 'globe' | 'qr' | 'plus' | 'coffee' | 'cash';

export function Icon({ name, size = 22, color = '#0B1220', stroke = 2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const p = { stroke: color, strokeWidth: stroke, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && <><Path {...p} d="M3 10.5 12 3l9 7.5" /><Path {...p} d="M5 9.5V21h14V9.5" /><Path {...p} d="M10 21v-6h4v6" /></>}
      {name === 'calendar' && <><Rect {...p} x={3} y={5} width={18} height={16} rx={2.5} /><Path {...p} d="M3 10h18M8 3v4M16 3v4" /></>}
      {name === 'sun' && <><Circle {...p} cx={12} cy={12} r={4} /><Path {...p} d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
      {name === 'users' && <><Circle {...p} cx={9} cy={8} r={3.5} /><Path {...p} d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><Path {...p} d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.5 3.5 5.2" /></>}
      {name === 'user' && <><Circle {...p} cx={12} cy={8} r={4} /><Path {...p} d="M4 21c1-4 4.2-6.5 8-6.5s7 2.5 8 6.5" /></>}
      {name === 'bell' && <><Path {...p} d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><Path {...p} d="M10 20a2 2 0 0 0 4 0" /></>}
      {name === 'clock' && <><Circle {...p} cx={12} cy={12} r={9} /><Path {...p} d="M12 7v5l3 2" /></>}
      {name === 'check' && <Path {...p} d="M4 12.5 9.5 18 20 6.5" />}
      {name === 'x' && <Path {...p} d="M6 6l12 12M18 6 6 18" />}
      {name === 'chevron' && <Path {...p} d="M9 5l7 7-7 7" />}
      {name === 'back' && <Path {...p} d="M15 5l-7 7 7 7" />}
      {name === 'phone' && <Path {...p} d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" />}
      {name === 'mail' && <><Rect {...p} x={3} y={5} width={18} height={14} rx={2} /><Path {...p} d="m3 7 9 6 9-6" /></>}
      {name === 'pin' && <><Path {...p} d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><Circle {...p} cx={12} cy={9.5} r={2.5} /></>}
      {name === 'logout' && <><Path {...p} d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><Path {...p} d="M10 8l-4 4 4 4M6 12h10" /></>}
      {name === 'globe' && <><Circle {...p} cx={12} cy={12} r={9} /><Path {...p} d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" /></>}
      {name === 'qr' && <><Rect {...p} x={3} y={3} width={7} height={7} rx={1} /><Rect {...p} x={14} y={3} width={7} height={7} rx={1} /><Rect {...p} x={3} y={14} width={7} height={7} rx={1} /><Path {...p} d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" /></>}
      {name === 'plus' && <Path {...p} d="M12 5v14M5 12h14" />}
      {name === 'coffee' && <><Path {...p} d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><Path {...p} d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3" /></>}
      {name === 'cash' && <><Rect {...p} x={2.5} y={6} width={19} height={12} rx={2} /><Circle {...p} cx={12} cy={12} r={2.5} /></>}
    </Svg>
  );
}
