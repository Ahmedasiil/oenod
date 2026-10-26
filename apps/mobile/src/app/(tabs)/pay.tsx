import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ArrowDownLeft, ArrowUpRight, CreditCard, LineChart, Plane, Plus, Send, ShieldCheck, Sparkles, Users, LifeBuoy, ChevronRight } from 'lucide-react-native';
import { useApi } from '@/lib/use-api';
import { ago, money, nextStep, statusTone, human, type Overview } from '@/lib/pay';
import { C, F } from '@/lib/theme';
import { Badge, Card, ErrorText, HeroCard, IconTile, List, Loading, Row, Screen, Section, T } from '@/components/ui';

export default function Pay() {
  const router = useRouter();
  const { data: o, error, refreshing, reload, refetch } = useApi<Overview>('/api/pay/overview');
  useFocusEffect(useCallback(() => { refetch(); }, [])); // eslint-disable-line react-hooks/exhaustive-deps
  const topUp = () => router.push('/pay/topup');
  if (!o) return <Screen title="oenodpay">{error ? <ErrorText text={error} /> : <Loading />}</Screen>;
  const step = nextStep(o);
  const actions = [
    { label: 'Add', icon: Plus, onPress: topUp },
    { label: 'Send', icon: Send, onPress: () => router.push('/pay/send') },
    { label: 'Cards', icon: CreditCard, onPress: () => router.push('/pay/cards') },
    { label: 'Family', icon: Users, onPress: () => router.push('/pay/family') },
    { label: 'eSIM', icon: Plane, onPress: () => router.push('/pay/esim') },
  ];
  return (
    <Screen title="oenodpay" refreshing={refreshing} onRefresh={reload}>
      <HeroCard>
        <View style={st.heroTop}><Text style={st.eyebrow}>WALLET · {o.currency}</Text>{o.profile.kycStatus === 'VERIFIED' && <View style={st.verified}><ShieldCheck color="#fff" size={13} /><Text style={st.verifiedText}>Verified</Text></View>}</View>
        <Text style={st.balance} adjustsFontSizeToFit numberOfLines={1}>{money(o.availableCents, o.currency)}</Text>
        {o.balanceCents !== o.availableCents && <Text style={st.held}>{money(o.balanceCents - o.availableCents, o.currency)} held for review</Text>}
        <View style={st.actions}>{actions.map((a) => (
          <Pressable key={a.label} onPress={a.onPress} style={({ pressed }) => [st.action, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={a.label}>
            <View style={st.actionIcon}><a.icon color="#fff" size={20} /></View><Text style={st.actionText}>{a.label}</Text>
          </Pressable>
        ))}</View>
      </HeroCard>

      {step && <Pressable onPress={() => router.push(step.route)}><Card style={st.step}><IconTile tone="blue"><ShieldCheck color={C.blue} size={18} /></IconTile><View style={{ flex: 1 }}><T v="heading">{step.title}</T><T v="small" color={C.muted}>{step.text}</T></View><ChevronRight color={C.faint} size={18} /></Card></Pressable>}

      <Pressable onPress={() => router.push('/pay/coach')}>
        <Card style={st.health}>
          <View style={[st.score, { borderColor: o.health.score >= 70 ? C.green : o.health.score >= 45 ? '#FFB020' : C.red }]}><Text style={st.scoreText}>{o.health.score}</Text></View>
          <View style={{ flex: 1, gap: 2 }}><T v="label" color={C.muted}>FINANCIAL HEALTH</T><T v="heading">{o.health.score >= 70 ? "You're in good shape" : o.health.score >= 45 ? 'A few quick wins ahead' : "Let's build a plan"}</T><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Sparkles color={C.blue} size={14} /><T v="small" color={C.blue} style={{ fontFamily: F.bold }}>Talk to Oeno, your AI coach</T></View></View>
        </Card>
      </Pressable>

      <Section title="Explore">
        <List>
          <Row title="Markets" sub="Live stocks, crypto, gold and currencies" icon={<IconTile tone="blue"><LineChart color={C.blue} size={18} /></IconTile>} chevron onPress={() => router.push('/pay/markets')} />
          <Row title="Security" sub="PIN, two-step sign-in, freeze" icon={<IconTile tone="green"><ShieldCheck color={C.green} size={18} /></IconTile>} chevron onPress={() => router.push('/pay/security')} />
          <Row title="Help" sub="AI assistant, day and night" icon={<IconTile tone="violet"><LifeBuoy color={C.violet} size={18} /></IconTile>} chevron onPress={() => router.push('/pay/help')} />
        </List>
      </Section>

      {o.transfers.length > 0 && <Section title="Transfers"><List>{o.transfers.map((t) => <Row key={t.id} title={t.recipient.name} sub={`${t.recipient.label ?? t.recipient.country} · ${ago(t.createdAt)}`} icon={<IconTile tone="blue"><ArrowUpRight color={C.blue} size={18} /></IconTile>} right={<View style={{ alignItems: 'flex-end', gap: 4 }}><T v="bodyStrong">{money(t.sendCents, t.sendCurrency)}</T><Badge text={human(t.status)} tone={statusTone(t.status)} /></View>} />)}</List></Section>}

      {o.recent.length > 0 && <Section title="Activity"><List>{o.recent.slice(0, 8).map((a) => <Row key={a.id} title={a.memo ?? human(a.kind)} sub={ago(a.at)} icon={<IconTile tone={a.amountCents >= 0 ? 'green' : 'gray'}>{a.amountCents >= 0 ? <ArrowDownLeft color={C.green} size={18} /> : <ArrowUpRight color={C.muted} size={18} />}</IconTile>} right={<T v="bodyStrong" color={a.amountCents >= 0 ? C.green : undefined}>{a.amountCents >= 0 ? '+' : ''}{money(a.amountCents, a.currency)}</T>} />)}</List></Section>}
    </Screen>
  );
}

const st = StyleSheet.create({
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontFamily: F.semi, fontSize: 11, letterSpacing: 1.6, color: C.onNavyMuted },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  verifiedText: { fontFamily: F.semi, fontSize: 11.5, color: '#fff' },
  balance: { fontFamily: F.displayBold, fontSize: 44, color: '#fff', letterSpacing: -1 },
  held: { fontFamily: F.medium, fontSize: 13, color: C.onNavy },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  action: { alignItems: 'center', gap: 6, flex: 1 },
  actionIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: F.semi, fontSize: 12, color: C.onNavy },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  health: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  score: { width: 68, height: 68, borderRadius: 34, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontFamily: F.displayBold, fontSize: 22, color: C.navy },
});
