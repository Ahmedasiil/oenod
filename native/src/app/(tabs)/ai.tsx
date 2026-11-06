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
import { PoweredBy } from '../../ui/Brand';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
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
          <Text style={{ color, fontSize: 14.5, lineHeight: 21, flex: bullet ? 1 : undefined }}>
            {parts.map((p, n) => (p.startsWith('**') && p.endsWith('**') ? <Text key={n} style={{ fontWeight: '700', color: '#FFFFFF' }}>{p.slice(2, -2)}</Text> : <Text key={n}>{p}</Text>))}
          </Text>
        );
        if (!line.trim()) return <View key={i} style={{ height: 2 }} />;
        return bullet ? <View key={i} style={{ flexDirection: 'row', gap: 8 }}><Text style={{ color: '#AFC3FF', fontSize: 14.5, lineHeight: 21 }}>•</Text>{txt}</View> : <View key={i}>{txt}</View>;
      })}
    </View>
  );
}

function Typing() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
      <ActivityIndicator size="small" color="#AFC3FF" />
      <Text style={{ color: '#9AA5C8', fontSize: 14 }}>{t('OENOD AI is looking at your data…')}</Text>
    </View>
  );
}

export default function Ai() {
  const { session, isManager } = useAuth();
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [kb, setKb] = useState(0);
  const scroll = useRef<any>(null);
  const personal = !session?.company;
  useFocusEffect(React.useCallback(() => { setStatusBarStyle('light'); }, []));

  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const b = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0));
    return () => { a.remove(); b.remove(); };
  }, []);

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
      ? [t('How did we do this week?'), t('Who is working right now?'), t('What should I reorder?'), t('Which invoices are overdue?')]
      : [t('When is my next shift?'), t('How many hours did I work this week?'), t('How do I request time off?')];

  const bottomBar = kb ? kb + 8 : insets.bottom + 92;
  return (
    <View style={{ flex: 1, backgroundColor: '#050B24' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: insets.top - 20, left: 0, right: 0, alignItems: 'center' }}>
        <Svg width={420} height={360}><Defs><RadialGradient id="aibg" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#3D5BF5" stopOpacity={0.35} /><Stop offset="1" stopColor="#3D5BF5" stopOpacity={0} /></RadialGradient></Defs><Rect width={420} height={360} fill="url(#aibg)" /></Svg>
      </View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: bottomBar + 80, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', paddingTop: insets.top + 44, paddingHorizontal: 20 }}>
          <AiOrb size={74} />
          <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center', marginTop: 18 }}>{t('Ask OENOD AI')}</Text>
          <Text style={{ color: '#9AA5C8', fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: 6, maxWidth: 380 }}>
            {personal ? t('Your career coach for resumes, interviews and your digital business card.') : t('It knows your sales, team, schedule and customers.')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 18 }}>
          {chips.map((c) => (
            <Pressable key={c} onPress={() => ask(c)} accessibilityRole="button"
              style={({ pressed }) => ({ minHeight: 34, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: pressed ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)' })}>
              <Text style={{ color: '#E8ECFA', fontSize: 12.5, fontWeight: '500' }}>{c}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 20 }}>
          {msgs.map((m, i) => m.role === 'user' ? (
            <Rise key={i} style={{ alignSelf: 'flex-end', maxWidth: '86%' }}>
              <View style={{ paddingVertical: 11, paddingHorizontal: 14, borderRadius: 18, borderBottomRightRadius: 6, backgroundColor: '#FFFFFF' }}>
                <Text style={{ color: '#0A1230', fontSize: 14.5, lineHeight: 21 }}>{m.content}</Text>
              </View>
            </Rise>
          ) : (
            <Rise key={i} style={{ alignSelf: 'flex-start', maxWidth: '92%' }}>
              <View style={{ padding: 14, borderRadius: 18, borderBottomLeftRadius: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
                <Rich text={m.content} color="#E8ECFA" />
              </View>
            </Rise>
          ))}
          {busy ? <Typing /> : null}
          {msgs.length ? (
            <Pressable onPress={() => setMsgs([])} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}><Text style={{ color: '#AFC3FF', fontWeight: '700' }}>{t('New conversation')}</Text></Pressable>
          ) : null}
          <PoweredBy dark />
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: bottomBar, alignItems: 'center', paddingHorizontal: 16 }}>
        <View style={{ width: '100%', maxWidth: 728, flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 5, paddingLeft: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
          <TextInput value={q} onChangeText={setQ} placeholder={t('Ask anything…')} placeholderTextColor="#7A829C" multiline maxLength={2000}
            style={{ flex: 1, color: '#FFFFFF', fontSize: 15, paddingTop: 11, paddingBottom: 11, maxHeight: 120 }} accessibilityLabel={t('Ask OENOD AI')} onSubmitEditing={() => ask()} blurOnSubmit />
          <Pressable onPress={() => ask()} disabled={!q.trim() || busy} accessibilityRole="button" accessibilityLabel={t('Send')}
            style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3D5BF5', opacity: q.trim() && !busy ? 1 : 0.55 }}>
            <Icon name="arrow" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
