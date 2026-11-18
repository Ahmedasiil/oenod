// Write an email (new, reply or forward) from any connected inbox, with Ava to draft or polish it, and send now or later.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { get, post } from '../../lib/api';
import { useLoad } from '../../lib/useLoad';
import { t } from '../../lib/i18n';
import { V } from '../../ui/M6';
import { Btn, In, Pick, ToolPage, oops, useBusy } from '../../ui/T1';
import type { Acc } from './index';

type Tone = 'friendly' | 'formal' | 'short' | 'warm';
export default function Compose() {
  const p = useLocalSearchParams<{ to?: string; cc?: string; subject?: string; reply_id?: string; fwd_id?: string; account_id?: string }>();
  const h = useLoad(() => get<{ accounts: Acc[]; ai: boolean }>('/api/mail/home'));
  const [acc, setAcc] = useState(p.account_id || '');
  const [to, setTo] = useState(p.to || '');
  const [cc, setCc] = useState(p.cc || '');
  const [subject, setSubject] = useState(p.subject || '');
  const [text, setText] = useState('');
  const [ask, setAsk] = useState('');
  const [tone, setTone] = useState<Tone>('friendly');
  const [err, setErr] = useState('');
  const { busy, run } = useBusy();
  const accs = h.data?.accounts || [];
  const from = acc || String(accs[0]?.id || '');
  const draft = () => run('ai', async () => {
    const r = await post<{ text: string }>('/api/mail/draft', { msg_id: Number(p.reply_id) || null, prompt: ask.trim() || null, tone, current: text.trim() || null });
    if (r.text) setText(r.text);
  });
  const send = () => {
    const list = to.split(/[,;\s]+/).filter(Boolean);
    if (!list.length || list.some((x) => !/^\S+@\S+\.\S+$/.test(x))) return setErr(t('Check the email address in To.'));
    if (!text.trim()) return setErr(t('Write the message first.'));
    if (!from) return oops(t('Connect an email account first.'));
    setErr('');
    run('send', async () => {
      await post('/api/mail/send', { account_id: Number(from), to: list.join(', '), cc: cc.trim() || null, subject: subject.trim() || null, text: text.trim(), reply_id: Number(p.reply_id) || null, fwd_id: Number(p.fwd_id) || null, sig: true, quote: !!(p.reply_id || p.fwd_id) });
      router.back();
    });
  };
  return (
    <ToolPage title={p.reply_id ? t('Reply') : p.fwd_id ? t('Forward') : t('New email')} foot={false}>
      {accs.length > 1 ? <Pick<string> label={t('From')} value={from} onChange={setAcc} items={accs.map((a) => [String(a.id), a.email] as [string, string])} /> : accs[0] ? <Text style={{ color: V.mute, fontSize: 13 }}>{t('From {a}', { a: accs[0].email })}</Text> : null}
      <In label={t('To')} value={to} onChangeText={setTo} keyboardType="email-address" autoCapitalize="none" placeholder="name@company.com" error={err || undefined} />
      {cc || p.reply_id ? <In label={t('Cc (optional)')} value={cc} onChangeText={setCc} keyboardType="email-address" autoCapitalize="none" /> : null}
      <In label={t('Subject')} value={subject} onChangeText={setSubject} />
      <In label={t('Message')} value={text} onChangeText={setText} multiline style={{ minHeight: 200 }} />
      {h.data?.ai !== false ? (
        <View style={{ gap: 10, padding: 14, borderRadius: 20, backgroundColor: V.surf2 }}>
          <In label={t('Tell Ava what to say (optional)')} value={ask} onChangeText={setAsk} placeholder={t('Say yes, we can deliver Friday')} />
          <Pick<Tone> label={t('Tone')} value={tone} onChange={setTone} items={[['friendly', t('Friendly')], ['formal', t('Formal')], ['short', t('Short')], ['warm', t('Warm')]]} />
          <Btn text={text.trim() ? t('Ava polishes it') : t('Ava writes it')} icon="spark" kind="dark" onPress={draft} busy={busy === 'ai'} />
        </View>
      ) : null}
      <Btn text={t('Send')} icon="send" onPress={send} busy={busy === 'send'} />
    </ToolPage>
  );
}
