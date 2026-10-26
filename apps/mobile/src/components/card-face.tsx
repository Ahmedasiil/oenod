import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '@/lib/theme';

type Card = { last4: string; brand: string; status: string; expMonth: number; expYear: number };

/** The oenodpay card, drawn with the Crescent blue gradient. */
export function CardFace({ c, name }: { c: Card; name: string }) {
  return (
    <View style={[st.card, c.status !== 'ACTIVE' && { opacity: 0.55 }]}>
      <LinearGradient colors={['#3A5BFF', '#2342E0', '#000F55']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <Text style={st.brand}>oenod<Text style={{ color: '#9DAEFF' }}>pay</Text></Text>
      <View style={st.chip} />
      <Text style={st.number}>•••• •••• •••• {c.last4}</Text>
      <View style={st.foot}><Text style={st.small}>{name.toUpperCase()}</Text><Text style={st.small}>{String(c.expMonth).padStart(2, '0')}/{String(c.expYear).slice(-2)} · {c.brand.toUpperCase()}</Text></View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { aspectRatio: 1.586, borderRadius: 22, padding: 20, overflow: 'hidden', justifyContent: 'space-between' },
  brand: { fontFamily: F.displayBold, fontSize: 18, color: '#fff' },
  chip: { width: 44, height: 32, borderRadius: 7, backgroundColor: '#E2C277' },
  number: { fontFamily: F.semi, fontSize: 18, letterSpacing: 2.5, color: '#fff' },
  foot: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontFamily: F.medium, fontSize: 11.5, color: C.onNavy },
});
