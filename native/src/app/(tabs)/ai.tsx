// OENOD AI: ask anything about your business in plain words. Answers come from the company's
// live data (sales, team, schedule, stock, invoices). Owners also get the AI morning brief here.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useAuth } from '../../lib/auth';
import { get, post } from '../../lib/api';
import { t } from '../../lib/i18n';
import { C } from '../../lib/theme';
import { HeroGradient, PoweredBy } from '../../ui/Brand';
import { Icon } from '../../ui/Icon';
import { AiOrb } from '../../ui/TabBar';
import { Rise } from '../../ui/Motion';

type Msg = { role: 'user' | 'assistant'; content: string };

/** Light formatting for AI answers: **bold** and bullet lines. */
function Rich({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ gap: 6 }}>
      {text.split('\n').filter((l, i, a) => l.trim() || (i > 0 && a[i - 1].trim())).map((line, i) => {
        const bullet = /^\s*([-*•]|\d+\.)\s+/.test(line);
        const body = line.replace(/^\s*([-*•])\s+/, '').replace(/^#+\s*/, '');
        const parts = body.split(/(\*\*[^*]+\*\*)/g);
        const txt = (
          <Text style={{ color, fontSize: 15.5, lineHeight: 23, flex: bullet ? 1 : undefined }}>
            {parts.map((p, n) => (p.startsWith('**') && p.endsWith('**') ? <Text key={n} style={{ fontWeight: '800' }}>{p.slice(2, -2)}</Text> : <Text key={n}>{p}</Text>))}
          </Text>
        );
        if (!line.trim()) return <View key={i} style={{ height: 2 }} />;
        return bullet ? <View key={i} style={{ flexDirection: 'row', gap: 8 }}><Text style={{ color: '#5B76FF', fontSize: 15.5, lineHeight: 23 }}>•</Text>{txt}</View> : <View key={i}>{txt}</View>;
      })}
    </View>
  );
}

function Typing() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
      <ActivityIndicator size="small" color="#5B76FF" />
      <Text style={{ color: C.sub, fontSize: 14 }}>{t('OENOD AI is looking at your data…')}</Text>
    </View>
  );
}

export default function Ai() {
  const { session, isManager } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefErr, setBriefErr] = useState('');
  const [kb, setKb] = useState(0);
  const [hh, setHh] = useState(260);
  const scroll = useRef<any>(null);
  const personal = !session?.company;
  useFocusEffect(React.useCallback(() => { setStatusBarStyle('light'); }, []));

  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const b = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0));
    return () => { a.remove(); b.remove(); };
  }, []);
  useEffect(() => {
    if (!isManager) return;
    get<{ brief: string }>('/api/ai/brief').then((r) => setBrief(r.brief)).catch((e) => setBriefErr(e?.message || ''));
  }, [isManager]);

  const ask = async (text?: string) => {
    const v = (text ?? q).trim();
    if (!v || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: v }];
    setMsgs(next); setQ(''); setBusy(true);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    try {
      const r = await post<{ reply: string }>('/api/ai/chat', { messages: next, page: 'app/ai' });
      setMsgs([...next, { role: 'assistant', content: r.reply }]);
    } catch (e: any) {
      setMsgs([...next, { role: 'assistant', content: e?.message || t('OENOD AI could not answer right now. Try again in a moment.') }]);
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  const chips = personal
    ? [t('Improve my resume summary'), t('Practice a job interview'), t('Write a short bio for my card')]
    : isManager
      ? [t('How are sales today vs last week?'), t('Who is working right now?'), t('What should I reorder?'), t('Which invoices are overdue?')]
      : [t('When is my next shift?'), t('How many hours did I work this week?'), t('How do I request time off?')];

  const bottomBar = kb ? kb + 8 : insets.bottom + 92;
  const padH = Math.max(16, (width - 760) / 2 + 16);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: bottomBar + 80 }}>
        <View onLayout={(e) => setHh(e.nativeEvent.layout.height)} style={{ overflow: 'hidden', paddingTop: insets.top + 24, paddingBottom: 30, paddingHorizontal: padH, alignItems: 'center', gap: 14, backgroundColor: '#050B24', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
          <HeroGradient width={width} height={hh} fade={false} />
          <AiOrb size={72} />
          <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center' }}>{t('Ask OENOD AI')}</Text>
          <Text style={{ color: '#9AA5C8', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 420 }}>
            {personal ? t('Your career coach for resumes, interviews and your digital business card.') : t('Answers from your live business data: sales, team, schedule, stock and invoices.')}
          </Text>
        </View>
        <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 20, gap: 14 }}>
          {isManager && !msgs.length ? (
            <Rise>
              <View style={{ borderRadius: 22, padding: 18, gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="sun" size={18} color="#6B5CF6" />
                  <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16, flex: 1 }}>{t('Your brief')}</Text>
                  <Text style={{ color: C.faint, fontSize: 12 }}>{t('Live data')}</Text>
                </View>
                {brief ? <Rich text={brief} color={C.ink} /> : briefErr ? <Text style={{ color: C.sub, fontSize: 14 }}>{briefErr}</Text> : <ActivityIndicator color="#5B76FF" style={{ alignSelf: 'flex-start' }} />}
              </View>
            </Rise>
          ) : null}
          {!msgs.length ? (
            <Rise delay={100} style={{ gap: 10 }}>
              <Text style={{ color: C.sub, fontSize: 12, fontWeight: '700', letterSpacing: 1.4 }}>{t('TRY ASKING')}</Text>
              {chips.map((c) => (
                <Pressable key={c} onPress={() => ask(c)} accessibilityRole="button"
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: pressed ? C.card2 : C.card, borderWidth: 1, borderColor: C.line })}>
                  <Icon name="spark" size={18} color="#6B5CF6" />
                  <Text style={{ flex: 1, color: C.ink, fontSize: 15, fontWeight: '600' }}>{c}</Text>
                  <Icon name="arrow" size={18} color={C.faint} />
                </Pressable>
              ))}
            </Rise>
          ) : null}
          {msgs.map((m, i) => m.role === 'user' ? (
            <View key={i} style={{ alignSelf: 'flex-end', maxWidth: '85%', paddingVertical: 11, paddingHorizontal: 15, borderRadius: 20, borderBottomRightRadius: 6, backgroundColor: '#3D5BF5' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 15.5, lineHeight: 22 }}>{m.content}</Text>
            </View>
          ) : (
            <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <AiOrb size={28} still />
              <View style={{ flex: 1, padding: 14, borderRadius: 20, borderTopLeftRadius: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }}>
                <Rich text={m.content} color={C.ink} />
              </View>
            </View>
          ))}
          {busy ? <Typing /> : null}
          {msgs.length ? (
            <Pressable onPress={() => setMsgs([])} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}><Text style={{ color: C.link, fontWeight: '700' }}>{t('New conversation')}</Text></Pressable>
          ) : null}
          <PoweredBy />
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: bottomBar, alignItems: 'center', paddingHorizontal: 12 }}>
        <View style={{ width: '100%', maxWidth: 736, flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 6, paddingLeft: 16, borderRadius: 26, backgroundColor: C.dark ? '#0C1536' : '#FFFFFF', borderWidth: 1, borderColor: C.dark ? 'rgba(175,195,255,0.18)' : '#E4E7F0',
          shadowColor: '#0A1230', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
          <TextInput value={q} onChangeText={setQ} placeholder={t('Ask about your business…')} placeholderTextColor={C.faint} multiline maxLength={2000}
            style={{ flex: 1, color: C.ink, fontSize: 16, paddingTop: 11, paddingBottom: 11, maxHeight: 120 }} accessibilityLabel={t('Ask OENOD AI')} onSubmitEditing={() => ask()} blurOnSubmit />
          <Pressable onPress={() => ask()} disabled={!q.trim() || busy} accessibilityRole="button" accessibilityLabel={t('Send')}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: q.trim() && !busy ? '#3D5BF5' : C.card2 }}>
            <Icon name="send" size={20} color={q.trim() && !busy ? '#FFFFFF' : C.faint} duo={false} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
