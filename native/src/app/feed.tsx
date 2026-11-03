import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { get, post } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { day, time } from '../lib/format';
import { C, R, S } from '../lib/theme';
import { t } from '../lib/i18n';
import { Avatar, B, Button, Card, Empty, ErrorBox, Loading, Muted, Pill, Row } from '../ui/kit';

type Post = {
  id: number; body: string; title: string | null; kind: 'post' | 'shoutout' | 'announcement' | 'poll' | 'event'; author: string; created_at: string; pinned: number | string;
  to_name: string | null; badge: string | null; must_ack: number | string; image: string | null;
  comments: { id: number; body: string; author: string; created_at: string }[];
  reactions: { emoji: string; n: number; mine: boolean }[];
  poll: { options: string[]; counts: number[]; total: number; mine: number | null } | null;
  rsvp?: { yes: number; maybe: number; no: number; mine: 'yes' | 'maybe' | 'no' | null };
  event_at: string | null; event_place: string | null;
  read: { n: number; acked: number; me: string | null; audience?: number | null };
};
type Feed = {
  posts: Post[]; to_ack: number; can_announce: boolean; badges: Record<string, string>;
  people: { id: number; first_name: string; last_name: string }[];
  birthdays: { first_name: string; last_name: string; days: number | string }[];
  anniversaries: { first_name: string; last_name: string; years: number | string; days: number | string }[];
};
type Kind = 'post' | 'shoutout' | 'announcement' | 'poll';
const say = (title: string, msg: string) => (Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg));
const input = { backgroundColor: C.white, borderRadius: R.md, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: C.ink, minWidth: 0 } as const;

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }}
      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.md, borderWidth: 1, borderColor: on ? C.blue : C.line, backgroundColor: on ? C.blueSoft : C.white }}>
      <Text style={{ fontWeight: '700', color: on ? C.blue : C.ink }}>{label}</Text>
    </Pressable>
  );
}

function PostCard({ p, badges, onChange }: { p: Post; badges: Record<string, string>; onChange: () => void }) {
  const mineR = p.reactions.some((r) => r.mine);
  const total = p.reactions.reduce((a, r) => a + r.n, 0);
  const [liked, setLiked] = useState(mineR);
  const [likes, setLikes] = useState(total);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try { await fn(); onChange(); } catch (e: any) { say(t('Not done'), e.message); } finally { setBusy(null); }
  };
  const like = async () => {
    setLiked(!liked); setLikes(likes + (liked ? -1 : 1));
    try { const r = await post<{ likes: number }>(`/api/feed/${p.id}/like`); setLikes(r.likes); } catch { setLiked(liked); setLikes(likes); }
  };
  const needsAck = p.kind === 'announcement' && Number(p.must_ack) && (!p.read.me || p.read.me === '1');
  return (
    <Card style={[{ gap: S.sm }, p.kind === 'announcement' ? { borderColor: C.blue } : {}]}>
      <Row>
        <Avatar name={p.author} size={38} />
        <View style={{ flex: 1 }}><B>{p.author}</B><Muted>{day(p.created_at)} · {time(p.created_at)}</Muted></View>
        {Number(p.pinned) ? <Pill text={t('Pinned')} kind="plain" /> : null}
        {p.kind === 'announcement' ? <Pill text={t('Announcement')} /> : p.kind === 'shoutout' ? <Pill text={t('Shout-out')} kind="good" /> : p.kind === 'poll' ? <Pill text={t('Poll')} /> : p.kind === 'event' ? <Pill text={t('Event')} /> : null}
      </Row>
      {p.kind === 'shoutout' && p.to_name ? <B style={{ color: C.good }}>{t('🏆 {n}', { n: p.to_name })}{p.badge && badges[p.badge] ? ` · ${t(badges[p.badge])}` : ''}</B> : null}
      {p.title ? <B style={{ fontSize: 17 }}>{p.title}</B> : null}
      {p.body ? <Text style={{ fontSize: 16, color: C.ink, lineHeight: 22 }}>{p.body}</Text> : null}

      {p.poll ? (
        <View style={{ gap: 6 }}>
          {p.poll.options.map((o, i) => {
            const pct = p.poll!.total ? Math.round((p.poll!.counts[i] / p.poll!.total) * 100) : 0;
            const me = p.poll!.mine === i;
            return (
              <Pressable key={i} onPress={() => act(`v${i}`, () => post(`/api/feed/${p.id}/vote`, { choice: i }))} accessibilityRole="radio" accessibilityState={{ checked: me }}
                style={{ borderWidth: 1, borderColor: me ? C.blue : C.line, borderRadius: R.sm, overflow: 'hidden' }}>
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: C.blueSoft }} />
                <Row style={{ padding: 10, justifyContent: 'space-between' }}><Text style={{ color: C.ink, fontWeight: me ? '800' : '500', flex: 1 }}>{o}</Text><Muted>{p.poll!.mine != null ? `${pct}%` : ''}</Muted></Row>
              </Pressable>
            );
          })}
          <Muted>{t('{n} votes', { n: p.poll.total })}</Muted>
        </View>
      ) : null}

      {p.kind === 'event' && p.event_at ? (
        <View style={{ gap: 8 }}>
          <Muted>📅 {day(p.event_at)} · {time(p.event_at)}{p.event_place ? ` · ${p.event_place}` : ''}</Muted>
          <Row>
            {(['yes', 'maybe', 'no'] as const).map((a) => (
              <Chip key={a} on={p.rsvp?.mine === a} label={`${t(a === 'yes' ? 'Going' : a === 'maybe' ? 'Maybe' : "Can't go")} ${p.rsvp?.[a] || ''}`.trim()} onPress={() => act(a, () => post(`/api/feed/${p.id}/rsvp`, { answer: a }))} />
            ))}
          </Row>
        </View>
      ) : null}

      {needsAck ? <Button title={t("I've read this")} icon="check" onPress={() => act('ack', () => post(`/api/feed/${p.id}/ack`))} busy={busy === 'ack'} /> : null}
      {p.kind === 'announcement' && Number(p.must_ack) && !needsAck ? <Muted style={{ color: C.good }}>✓ {t('You confirmed you read this')}</Muted> : null}

      <Row>
        <Pressable onPress={like} accessibilityRole="button" accessibilityState={{ selected: liked }} style={{ paddingVertical: 6, paddingRight: 12 }}>
          <Text style={{ fontWeight: '700', color: liked ? C.blue : C.sub }}>{liked ? '❤️' : '♡'} {likes || ''} {t('Like')}</Text>
        </Pressable>
        <Muted>{p.comments.length === 1 ? t('1 comment') : p.comments.length ? t('{n} comments', { n: p.comments.length }) : ''}</Muted>
      </Row>
      {p.comments.map((c) => (
        <View key={c.id} style={{ backgroundColor: C.bg, borderRadius: R.sm, padding: 10 }}><B style={{ fontSize: 14 }}>{c.author}</B><Text style={{ color: C.ink }}>{c.body}</Text></View>
      ))}
      <Row>
        <TextInput value={reply} onChangeText={setReply} placeholder={t('Write a comment')} placeholderTextColor={C.faint} style={[input, { flex: 1 }]} maxLength={1000} accessibilityLabel={t('Write a comment')} />
        <Button title={t('Send')} kind="secondary" onPress={() => act('c', async () => { await post(`/api/feed/${p.id}/comment`, { body: reply.trim() }); setReply(''); })} busy={busy === 'c'} disabled={!reply.trim()} style={{ minHeight: 44, paddingHorizontal: 14, flexShrink: 0 }} />
      </Row>
    </Card>
  );
}

export default function FeedScreen() {
  const d = useLoad(() => get<Feed>('/api/feed'));
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<Kind>('post');
  const [to, setTo] = useState(0);
  const [badge, setBadge] = useState('teamwork');
  const [mustAck, setMustAck] = useState(false);
  const [opts, setOpts] = useState(['', '']);
  const [busy, setBusy] = useState(false);
  const x = d.data;
  const send = async () => {
    setBusy(true);
    try {
      const b: Record<string, unknown> = { body: body.trim(), kind };
      if (kind === 'shoutout') { if (!to) throw new Error(t('Pick the teammate you want to thank.')); b.to_employee_id = to; b.badge = badge; }
      if (kind === 'announcement') b.must_ack = mustAck;
      if (kind === 'poll') b.options = opts.map((o) => o.trim()).filter(Boolean);
      await post('/api/feed', b);
      setBody(''); setKind('post'); setTo(0); setOpts(['', '']); setMustAck(false); d.reload();
    } catch (e: any) { say(t('Not done'), e.message); } finally { setBusy(false); }
  };
  const kinds: [Kind, string][] = [['post', t('Post')], ['shoutout', t('Shout-out')], ['poll', t('Poll')], ...(x?.can_announce ? [['announcement', t('Announcement')] as [Kind, string]] : [])];
  const celebrate = [
    ...(x?.birthdays || []).map((b) => t('🎂 {n} has a birthday this week', { n: `${b.first_name} ${b.last_name}` })),
    ...(x?.anniversaries || []).map((b) => t('🎉 {n} has a work anniversary this week', { n: `${b.first_name} ${b.last_name}` })),
  ];
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {x?.to_ack ? <Card style={{ backgroundColor: C.warnSoft, borderColor: '#F4D9B5' }}><B>{t('{n} announcements need your confirmation', { n: x.to_ack })}</B></Card> : null}
        <Card style={{ gap: S.sm }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{kinds.map(([k, l]) => <Chip key={k} on={kind === k} label={l} onPress={() => setKind(k)} />)}</View>
          {kind === 'shoutout' ? (
            <>
              <Muted>{t('Who do you want to thank?')}</Muted>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(x?.people || []).map((p) => <Chip key={p.id} on={to === p.id} label={`${p.first_name} ${p.last_name}`} onPress={() => setTo(p.id)} />)}</View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Object.entries(x?.badges || {}).map(([k, l]) => <Chip key={k} on={badge === k} label={t(l)} onPress={() => setBadge(k)} />)}</View>
            </>
          ) : null}
          <TextInput value={body} onChangeText={setBody} placeholder={t(kind === 'poll' ? 'Ask a question' : 'Share news or thank a teammate')} placeholderTextColor={C.faint} multiline maxLength={5000}
            style={[input, { minHeight: 80, textAlignVertical: 'top' }]} accessibilityLabel={t('Message')} />
          {kind === 'poll' ? (
            <>
              {opts.map((o, i) => <TextInput key={i} value={o} onChangeText={(v) => setOpts(opts.map((y, j) => (j === i ? v : y)))} placeholder={t('Choice {n}', { n: i + 1 })} placeholderTextColor={C.faint} style={input} maxLength={120} />)}
              {opts.length < 8 ? <Button title={t('Add a choice')} icon="plus" kind="ghost" onPress={() => setOpts([...opts, ''])} /> : null}
            </>
          ) : null}
          {kind === 'announcement' ? <Chip on={mustAck} label={t('Everyone must confirm they read it')} onPress={() => setMustAck(!mustAck)} /> : null}
          <Button title={t('Post')} icon="check" onPress={send} busy={busy} disabled={!body.trim() && kind !== 'shoutout'} />
        </Card>
        {celebrate.length ? <Card style={{ gap: 6 }}>{celebrate.map((c, i) => <Text key={i} style={{ color: C.ink, fontWeight: '600' }}>{c}</Text>)}</Card> : null}
        {d.loading && !x ? <Loading /> : d.error && !x ? <ErrorBox text={d.error} onRetry={d.reload} /> :
          x?.posts.length ? x.posts.map((p) => <PostCard key={`${p.id}-${p.comments.length}-${p.poll?.total ?? 0}-${p.read.me ?? ''}-${p.rsvp?.mine ?? ''}`} p={p} badges={x.badges} onChange={d.reload} />) :
          <Card><Empty icon="users" title={t('No posts yet')} sub={t('Share the first update with your team.')} /></Card>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
