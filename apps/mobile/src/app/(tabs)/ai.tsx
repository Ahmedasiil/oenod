import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUp, CalendarDays, Clock, ListChecks, Palmtree, ShieldCheck, Sparkles } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { C, F, G, R, shadow } from '@/lib/theme';
import { Markdown } from '@/components/markdown';
import { Notice, T } from '@/components/ui';

type Turn = { role: 'user' | 'assistant'; text: string; actions?: { tool: string; status: string; message?: string }[] };
const STARTERS = [
  { q: 'When is my next shift?', icon: CalendarDays },
  { q: 'How many hours have I worked this week?', icon: Clock },
  { q: 'How much vacation do I have left?', icon: Palmtree },
  { q: 'What tasks are due this week?', icon: ListChecks },
];

function Orb({ size = 40 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient colors={G.orb} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View><Sparkles color="#fff" size={size * 0.48} /></View>
    </View>
  );
}

export default function Ai() {
  const { session } = useAuth();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [cid, setCid] = useState<string | undefined>();
  const scroll = useRef<ScrollViewInstance>(null);
  const first = (session?.employee?.name ?? session?.user.name ?? '').split(' ')[0];

  const send = async (msg = text) => {
    const m = msg.trim();
    if (!m || busy) return;
    setText(''); setBusy(true); setTurns((x) => [...x, { role: 'user', text: m }]);
    try {
      const r = await api<{ conversationId: string; reply: string; actions: Turn['actions'] }>('/api/ai/chat', { body: { message: m, conversationId: cid } });
      setCid(r.conversationId);
      setTurns((x) => [...x, { role: 'assistant', text: r.reply, actions: r.actions }]);
    } catch (e) {
      setTurns((x) => [...x, { role: 'assistant', text: `**I couldn't do that.** ${(e as Error).message}` }]);
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <Notice />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
        <View style={s.head}>
          <Orb size={38} />
          <View style={{ flex: 1 }}>
            <T v="title" style={{ fontSize: 19 }}>{t('me.assistant')}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} />
              <T v="caption">OENOD AI</T>
            </View>
          </View>
        </View>

        <ScrollView ref={scroll} contentContainerStyle={{ padding: 20, gap: 14, flexGrow: 1 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!turns.length && (
            <View style={{ gap: 18, paddingTop: 8 }}>
              <View style={{ alignItems: 'center', gap: 12, paddingVertical: 10 }}>
                <Orb size={64} />
                <T v="display" style={{ textAlign: 'center', fontSize: 24 }}>{t('ai.hello', { name: first })}</T>
                <T v="small" style={{ textAlign: 'center', fontSize: 14.5, maxWidth: 290 }}>{t('ai.sub')}</T>
              </View>
              <View style={s.grid}>
                {STARTERS.map(({ q, icon: I }) => (
                  <Pressable key={q} onPress={() => send(q)} style={({ pressed }) => [s.starter, pressed && { backgroundColor: C.sky, transform: [{ scale: 0.98 }] }]}>
                    <View style={s.starterIcon}><I color={C.blue} size={18} /></View>
                    <Text style={s.starterText}>{q}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={s.trust}>
                <ShieldCheck color={C.green} size={16} />
                <T v="caption" style={{ flex: 1, color: C.text }}>{t('ai.approvalNote')}</T>
              </View>
            </View>
          )}
          {turns.map((x, i) => x.role === 'user'
            ? <View key={i} style={s.me}><Text style={s.meText}>{x.text}</Text></View>
            : (
              <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Orb size={28} />
                <View style={s.bot}>
                  <Markdown text={x.text} />
                  {x.actions?.map((a, j) => (
                    <View key={j} style={s.action}>
                      <ShieldCheck color={a.status === 'COMPLETED' ? C.green : a.status === 'BLOCKED' || a.status === 'FAILED' ? C.red : C.amber} size={16} />
                      <Text style={s.actionText}>{a.message ?? a.tool.replace(/_/g, ' ')}{a.status === 'NEEDS_APPROVAL' ? ` · ${t('ai.waitingApproval')}` : a.status === 'COMPLETED' ? ` · ${t('ai.done')}` : ''}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          {busy && (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Orb size={28} />
              <View style={[s.bot, { flexDirection: 'row', gap: 5, paddingVertical: 14 }]}>
                {[0, 1, 2].map((d) => <View key={d} style={[s.typing, { opacity: 0.35 + d * 0.25 }]} />)}
                <T v="caption" style={{ marginLeft: 6 }}>{t('ai.thinking')}</T>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={s.bar}>
          <TextInput value={text} onChangeText={setText} placeholder={t('ai.placeholder')} placeholderTextColor={C.faint} multiline style={s.input} onSubmitEditing={() => send()} />
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.send')} onPress={() => send()} disabled={busy || !text.trim()} style={[s.send, (busy || !text.trim()) && { opacity: 0.35 }]}>
            <LinearGradient colors={G.orb} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View><ArrowUp color="#fff" size={20} strokeWidth={2.5} /></View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, backgroundColor: C.bg },
  grid: { gap: 10 },
  starter: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper, borderRadius: R.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, padding: 14, ...shadow(1) },
  starterIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.sky, alignItems: 'center', justifyContent: 'center' },
  starterText: { flex: 1, fontFamily: F.semi, fontSize: 14.5, color: C.ink },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.greenBg, borderRadius: R.sm, padding: 12 },
  me: { alignSelf: 'flex-end', maxWidth: '84%', backgroundColor: C.navy, borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 15, paddingVertical: 11 },
  meText: { color: '#fff', fontSize: 15, lineHeight: 21, fontFamily: F.medium },
  bot: { flexShrink: 1, maxWidth: '88%', backgroundColor: C.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, borderRadius: 20, borderTopLeftRadius: 6, padding: 14, gap: 8, ...shadow(1) },
  action: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, padding: 10 },
  actionText: { flex: 1, fontSize: 13, color: C.text, fontFamily: F.medium },
  typing: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.blue },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginHorizontal: 16, marginBottom: 12, marginTop: 4, padding: 6, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, backgroundColor: C.paper, ...shadow(2) },
  input: { flex: 1, maxHeight: 120, minHeight: 44, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: C.ink, fontFamily: F.medium, outlineStyle: 'none' } as object,
  send: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
