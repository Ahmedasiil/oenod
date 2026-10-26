import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp, Receipt, Wallet } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { longDate, money } from '@/lib/format';
import { t } from '@/lib/i18n';
import { C, F, R, shadow } from '@/lib/theme';
import type { Me } from '@/lib/me';
import { Card, EmptyState, ErrorText, HeroCard, IconTile, Loading, Screen, Section, T } from '@/components/ui';

const label = (k: string) => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

export default function Payslips() {
  const { session } = useAuth();
  const { data, error, refreshing, reload } = useApi<Me>('/api/me');
  const [open, setOpen] = useState<string | null>(null);
  const cur = session?.org?.currency ?? 'CAD';
  if (!data && !error) return <Screen edges={[]}><Loading /></Screen>;
  const latest = data?.payslips[0];
  const taken = latest ? Number(latest.gross) - Number(latest.net) : 0;
  const keep = latest && Number(latest.gross) > 0 ? Number(latest.net) / Number(latest.gross) : 0;

  return (
    <Screen edges={[]} refreshing={refreshing} onRefresh={reload}>
      <ErrorText text={error} />
      {latest ? (
        <HeroCard>
          <T v="label" color={C.onNavyMuted}>Latest pay · {longDate(latest.payDate)}</T>
          <Text style={st.net}>{money(latest.net, cur)}</Text>
          <Text style={st.sub}>Take-home pay for {longDate(latest.periodStart)} – {longDate(latest.periodEnd)}</Text>
          <View style={st.split}>
            <View style={[st.splitBar, { flex: Math.max(keep, 0.01), backgroundColor: '#fff' }]} />
            <View style={[st.splitBar, { flex: Math.max(1 - keep, 0.01), backgroundColor: 'rgba(255,255,255,0.25)' }]} />
          </View>
          <View style={st.legend}>
            <Legend color="#fff" k="Gross" v={money(latest.gross, cur)} />
            <Legend color="rgba(255,255,255,0.35)" k="Deductions" v={money(taken, cur)} />
          </View>
        </HeroCard>
      ) : null}

      <Section title="History">
        {data?.payslips.length ? data.payslips.map((p) => {
          const on = open === p.id;
          return (
            <Pressable key={p.id} accessibilityRole="button" accessibilityState={{ expanded: on }} onPress={() => setOpen(on ? null : p.id)} style={st.slip}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <IconTile tone="green"><Receipt color={C.green} size={18} /></IconTile>
                <View style={{ flex: 1 }}>
                  <T v="bodyStrong">{longDate(p.payDate)}</T>
                  <T v="caption">{longDate(p.periodStart)} – {longDate(p.periodEnd)}</T>
                </View>
                <Text style={st.amount}>{money(p.net, cur)}</Text>
                {on ? <ChevronUp color={C.faint} size={18} /> : <ChevronDown color={C.faint} size={18} />}
              </View>
              {on && (
                <View style={st.detail}>
                  <Line k={t('me.hours')} v={`${p.regularHours}h${p.overtimeHours ? ` + ${p.overtimeHours}h overtime` : ''}`} />
                  <Line k="Gross" v={money(p.gross, cur)} />
                  {Object.entries(p.deductions ?? {}).filter(([, v]) => typeof v === 'number' && v).map(([k, v]) => <Line key={k} k={label(k)} v={`− ${money(v, cur)}`} muted />)}
                  <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginVertical: 4 }} />
                  <Line k="Net pay" v={money(p.net, cur)} bold />
                </View>
              )}
            </Pressable>
          );
        }) : <Card><EmptyState icon={<Wallet color={C.blue} size={24} />} title="No payslips yet" text="Your payslips show up here after each pay run is approved." /></Card>}
      </Section>
    </Screen>
  );
}

function Legend({ color, k, v }: { color: string; k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: C.onNavy, fontFamily: F.medium, fontSize: 13 }}>{k}</Text>
      <Text style={{ color: '#fff', fontFamily: F.bold, fontSize: 13 }}>{v}</Text>
    </View>
  );
}

function Line({ k, v, bold, muted }: { k: string; v: string; bold?: boolean; muted?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: muted ? C.muted : C.text, fontFamily: bold ? F.bold : F.medium, fontSize: 14 }}>{k}</Text>
      <Text style={{ color: C.ink, fontFamily: bold ? F.bold : F.semi, fontSize: 14, fontVariant: ['tabular-nums'] }}>{v}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  net: { color: '#fff', fontFamily: F.display, fontSize: 38, letterSpacing: -1.2 },
  sub: { color: C.onNavy, fontFamily: F.regular, fontSize: 14 },
  split: { flexDirection: 'row', gap: 4, height: 8, marginTop: 6 },
  splitBar: { height: 8, borderRadius: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  slip: { backgroundColor: C.paper, borderRadius: R.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, padding: 14, gap: 12, ...shadow(1) },
  amount: { fontFamily: F.display, fontSize: 16, color: C.ink },
  detail: { backgroundColor: C.bg, borderRadius: R.md, padding: 14, gap: 8 },
});
