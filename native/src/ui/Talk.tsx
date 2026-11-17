// Talk: a full-screen conversation (team chat room, help ticket): header, bubbles that scroll to the newest, and a type box with Send.
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { SubTop, V } from './M6';
import { State } from './T1';
import { t } from '../lib/i18n';

export type Bubble = { id: number | string; mine: boolean; by?: string; color?: string; body: string; at?: string; note?: string; staff?: boolean };

export function Talk({ title, sub, bubbles, loading, error, onRetry, canSend = true, cantSend, onSend, empty, right, rightLabel, onRight }: {
  title: string; sub?: string; bubbles: Bubble[]; loading: boolean; error: string | null; onRetry: () => void; canSend?: boolean; cantSend?: string;
  onSend: (text: string) => Promise<unknown>; empty?: string; right?: any; rightLabel?: string; onRight?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const sc = useRef<any>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { const h = setTimeout(() => sc.current?.scrollToEnd({ animated: false }), 60); return () => clearTimeout(h); }, [bubbles.length]);
  const send = async () => {
    const s = text.trim();
    if (!s || busy) return;
    setBusy(true); setErr('');
    try { await onSend(s); setText(''); } catch (e: any) { setErr(String(e?.message || t('Not sent. Try again.'))); } finally { setBusy(false); }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: V.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, width: '100%', maxWidth: 760, alignSelf: 'center', gap: 2 }}>
        <SubTop title={title} right={right} rightLabel={rightLabel} onRight={onRight} />
        {sub ? <Text style={{ color: V.mute, fontSize: 12.5, textAlign: 'center' }} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <ScrollView ref={sc} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10, width: '100%', maxWidth: 760, alignSelf: 'center', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <State loading={loading && !bubbles.length} error={!bubbles.length ? error : null} onRetry={onRetry} />
        {!loading && !error && !bubbles.length ? <Text style={{ color: V.mute, fontSize: 14, textAlign: 'center', marginTop: 40 }}>{empty || t('No messages yet. Say hello.')}</Text> : null}
        {bubbles.map((b) => (
          <View key={b.id} style={{ alignSelf: b.mine ? 'flex-end' : 'flex-start', maxWidth: '84%', gap: 3 }}>
            {!b.mine && b.by ? <Text style={{ color: b.color || V.link, fontSize: 12, fontWeight: '700', marginLeft: 6 }}>{b.by}{b.staff ? ' · ' + t('OENOD team') : ''}</Text> : null}
            <View style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderBottomRightRadius: b.mine ? 6 : 20, borderBottomLeftRadius: b.mine ? 20 : 6,
              backgroundColor: b.mine ? '#2238D8' : V.surf, borderWidth: b.mine ? 0 : 1, borderColor: V.line }}>
              <Text style={{ color: b.mine ? '#FFFFFF' : V.ink, fontSize: 15, lineHeight: 21 }} selectable>{b.body}</Text>
            </View>
            {b.at || b.note ? <Text style={{ color: V.faint, fontSize: 11, alignSelf: b.mine ? 'flex-end' : 'flex-start', marginHorizontal: 6 }}>{[b.at, b.note].filter(Boolean).join(' · ')}</Text> : null}
          </View>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom + 10, borderTopWidth: 1, borderTopColor: V.line, backgroundColor: '#0D0E14' }}>
        {err ? <Text style={{ color: '#FF8A96', fontSize: 12, marginBottom: 6, textAlign: 'center' }}>{err}</Text> : null}
        {canSend ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
            <TextInput value={text} onChangeText={setText} placeholder={t('Type a message')} placeholderTextColor={V.faint} multiline accessibilityLabel={t('Type a message')}
              style={{ flex: 1, minHeight: 46, maxHeight: 130, borderRadius: 23, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 11, backgroundColor: V.surf2, color: V.ink, fontSize: 15.5, borderWidth: 1, borderColor: V.line }} />
            <Pressable onPress={send} disabled={!text.trim() || busy} accessibilityRole="button" accessibilityLabel={t('Send')}
              style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: text.trim() ? '#FFFFFF' : V.surf2, opacity: pressed || busy ? 0.6 : 1 })}>
              <Icon name="send" size={18} color={text.trim() ? V.navy : V.mute} duo={false} />
            </Pressable>
          </View>
        ) : <Text style={{ color: V.mute, fontSize: 13, textAlign: 'center', paddingVertical: 8 }}>{cantSend || t('Only managers can post here.')}</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}
