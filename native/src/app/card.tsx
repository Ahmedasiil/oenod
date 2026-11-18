// My business card, inside the app: the card as other people see it, a big QR code to scan, share the link with
// anyone, send a contact file, add it to Apple or Google Wallet, and answer reviews and meeting requests from the card.
import React, { useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { BASE, del, get, put } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { t } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { QR } from '../ui/QR';
import { TapShare } from '../ui/TapShare';
import { FH7, NavyFill, V } from '../ui/M6';
import { Btn, Card, Chips, Dot, In, Item, None, Sheet, State, Tag, ToolPage, oops, sure, useBusy } from '../ui/T1';

type Prof = { name: string; email: string; headline: string | null; phone: string | null; public_email: string | null; website: string | null; location: string | null; company_label: string | null; company?: string | null;
  card_public: number | boolean; show_phone: number | boolean; show_email: number | boolean; slug: string; card_url: string; skills: string[]; employee?: { job_title: string | null; badge_url: string; qr_token: string } | null };
type Cd6 = { week?: { views: number; saves: number; xchg: number }; reviews?: { approved: number; avg: number | null; pending: number }; meet_pending?: number };
type Rev = { id: number; name: string; place: string | null; rating: number; body: string | null; status: string; date: string };
type Req = { id: number; name: string; email: string | null; phone: string | null; company: string | null; kind: string; topic: string | null; when: string; minutes: number; status: string; past: boolean; url: string | null };

const stars = (n: number) => '★★★★★'.slice(0, Math.max(0, Math.min(5, n))) + '☆☆☆☆☆'.slice(0, 5 - Math.max(0, Math.min(5, n)));
const copy = (s: string) => { try { (globalThis as any).navigator?.clipboard?.writeText?.(s)?.catch?.(() => {}); } catch { /* not on this phone */ } };

export default function MyCard() {
  const { session } = useAuth() as any;
  const p = useLoad(() => get<Prof>('/api/me/profile'));
  const c6 = useLoad(() => get<Cd6>('/api/me/cd6').catch(() => null));
  const ps = useLoad(() => get<{ apple: boolean; google: boolean }>('/api/public/passes').catch(() => ({ apple: false, google: false })));
  const rv = useLoad(() => get<{ reviews: Rev[] }>('/api/me/cd6/reviews').catch(() => ({ reviews: [] as Rev[] })));
  const rq = useLoad(() => get<{ requests: Req[] }>('/api/me/cd6/requests').catch(() => ({ requests: [] as Req[] })));
  const { busy, run } = useBusy();
  const x = p.data;
  const emp = x?.employee || null;
  const [which, setWhich] = useState<'card' | 'badge'>('card');
  const [sel, setSel] = useState<Req | null>(null);
  const [msg, setMsg] = useState('');
  const pub = !!x?.card_public;
  const url = which === 'badge' && emp ? emp.badge_url : x?.card_url || '';
  const vcf = x ? `${BASE}/c/${x.slug}.vcf` : '';
  const company = x?.company_label || x?.company || '';
  const reviews = rv.data?.reviews || [];
  const reqs = (rq.data?.requests || []).filter((r) => !r.past || r.status === 'pending');

  const shareLink = async () => {
    if (!url) return;
    if (which === 'card' && !pub) return sure(t('Your card is private'), t('Only people at your company can open it. Make it public in Edit card so anyone can see it.'), t('Edit card'), () => router.push('/profile-edit' as any));
    try { await Share.share({ message: which === 'badge' ? url : t('Here is my business card: {u}', { u: url }), url }); } catch { copy(url); oops(t('Your link: {u}', { u: url })); }
  };
  const copyLink = () => { copy(url); oops(t('Link copied: {u}', { u: url })); };
  const shareContact = async () => {
    if (!pub) return sure(t('Your card is private'), t('Make it public in Edit card so other people can save your contact.'), t('Edit card'), () => router.push('/profile-edit' as any));
    try { await Share.share({ message: t('Save my contact: {u}', { u: vcf }), url: vcf }); } catch { copy(vcf); oops(vcf); }
  };
  const apple = () => {
    if (!x) return;
    if (!pub) return oops(t('Make your card public in Edit card first, then add it to Apple Wallet.'));
    run('ap', async () => { await WebBrowser.openBrowserAsync(`${BASE}/api/public/card/${encodeURIComponent(x.slug)}/apple`); });
  };
  const google = () => run('gw', async () => { const r = await get<{ url: string }>('/api/me/card/google'); await WebBrowser.openBrowserAsync(r.url); });
  const setReview = (r: Rev, status: 'approved' | 'pending') => run('rv' + r.id, async () => { rv.setData(await put<{ reviews: Rev[] }>(`/api/me/cd6/reviews/${r.id}`, { status })); c6.reload(); });
  const hideReview = (r: Rev) => sure(t('Hide this review?'), t('It will not show on your card.'), t('Hide'), () => run('rh' + r.id, async () => {
    rv.setData(await del<{ reviews: Rev[] }>(`/api/me/cd6/reviews/${r.id}`)); c6.reload();
  }), true);
  const answer = (action: 'approve' | 'decline' | 'cancel') => sel && run('mr' + action, async () => {
    await put(`/api/me/cd6/requests/${sel.id}`, { action, message: msg.trim() || undefined }); setSel(null); setMsg(''); rq.reload(); c6.reload();
  });

  const shown = [x?.show_phone ? x?.phone : null, x?.show_email ? x?.public_email || x?.email : null].filter(Boolean) as string[];
  return (
    <ToolPage title={t('My business card')} right="send" rightLabel={t('Share my card')} onRight={shareLink} refreshing={p.refreshing} onRefresh={() => { p.refresh(); c6.reload(); rv.reload(); rq.reload(); }}>
      <State loading={p.loading && !x} error={!x ? p.error : null} onRetry={p.reload} />
      {x ? (
        <>
          {emp ? <Chips value={which} onChange={setWhich} items={[['card', t('Business card')], ['badge', t('Work badge')]]} /> : null}
          <View style={{ borderRadius: 26, overflow: 'hidden', padding: 22, gap: 14 }}>
            <NavyFill id="cdf" hero />
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 26, ...FH7 }} numberOfLines={2}>{x.name}</Text>
              {which === 'badge' && emp ? <Text style={{ color: '#B9C4FF', fontSize: 15 }}>{[emp.job_title, company].filter(Boolean).join(' · ') || t('Team member')}</Text>
                : <Text style={{ color: '#B9C4FF', fontSize: 15 }} numberOfLines={2}>{[x.headline, company].filter(Boolean).join(' · ') || t('Add a headline in Edit card')}</Text>}
              {which === 'card' && shown.length ? <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13.5 }}>{shown.join('  ·  ')}</Text> : null}
              {which === 'card' && x.location ? <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{x.location}</Text> : null}
            </View>
            <View style={{ alignSelf: 'center', padding: 12, borderRadius: 20, backgroundColor: '#FFFFFF' }}>
              {url ? <QR value={url} size={230} color="#000C58" /> : null}
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center' }}>
              {which === 'badge' ? t('Show this at work to clock in or prove you work here.') : t('Anyone can scan this with their camera to open your card.')}
            </Text>
          </View>
          {which === 'card' ? (
            <>
              {!pub ? <Tag text={t('Private: only people at your company can open it')} tone="warn" /> : <Tag text={t('Public: anyone with the link can open it')} tone="good" />}
              <TapShare url={pub ? x.card_url : undefined} />
              <Btn text={t('Share my card')} icon="send" kind="blue" onPress={shareLink} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Btn text={t('Copy link')} icon="link" onPress={copyLink} /></View>
                <View style={{ flex: 1 }}><Btn text={t('Send my contact')} icon="user" onPress={shareContact} /></View>
              </View>
              {Platform.OS !== 'android' && ps.data?.apple ? <Btn text={t('Add to Apple Wallet')} icon="wallet" kind="dark" onPress={apple} busy={busy === 'ap'} /> : null}
              {Platform.OS !== 'ios' && ps.data?.google ? <Btn text={t('Add to Google Wallet')} icon="wallet" kind="dark" onPress={google} busy={busy === 'gw'} /> : null}
              <Card title={t('My card')}>
                <Item left={<Dot icon="user" tone="nv" />} title={t('Edit card')} sub={t('Name, headline, contact, links and who can see it')} onPress={() => router.push('/profile-edit' as any)} />
                <Item left={<Dot icon="doc" tone="nv" />} title={t('My résumés')} sub={t('Build, check and share your résumé')} onPress={() => router.push('/resume' as any)} />
                <Item left={<Dot icon="briefcase" tone="nv" />} title={t('Find a job')} sub={t('Jobs near you, apply with your résumé')} onPress={() => router.push('/jobs' as any)} />
              </Card>
              {c6.data?.week ? (
                <Card title={t('This week')}>
                  <Item title={t('People who opened your card')} right={String(c6.data.week.views)} />
                  <Item title={t('Saved your contact')} right={String(c6.data.week.saves)} />
                  <Item title={t('Swapped cards with you')} right={String(c6.data.week.xchg)} />
                </Card>
              ) : null}
              {reqs.length ? (
                <Card title={t('Meeting requests')}>
                  {reqs.slice(0, 20).map((r) => <Item key={r.id} onPress={() => { setSel(r); setMsg(''); }} left={<Dot icon={r.kind === 'video' ? 'video' : r.kind === 'call' ? 'phone' : 'calendar'} tone={r.status === 'pending' ? 'warn' : 'nv'} />}
                    title={r.name} sub={[r.when, r.topic].filter(Boolean).join(' · ')} rightSub={<Tag text={t(r.status === 'pending' ? 'New' : r.status === 'approved' ? 'Booked' : r.status === 'moved' ? 'New time sent' : r.status === 'declined' ? 'Declined' : 'Cancelled')} tone={r.status === 'pending' ? 'warn' : r.status === 'approved' ? 'good' : 'plain'} />} />)}
                </Card>
              ) : null}
              <Card title={c6.data?.reviews?.avg ? t('Reviews · {a} of 5', { a: c6.data.reviews.avg }) : t('Reviews')}>
                {reviews.length ? reviews.slice(0, 30).map((r) => (
                  <View key={r.id} style={{ paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: V.line }}>
                    <Item title={`${stars(r.rating)}  ${r.name}`} sub={[r.place, r.date].filter(Boolean).join(' · ')} rightSub={r.status === 'pending' ? <Tag text={t('Waiting for you')} tone="warn" /> : <Tag text={t('On my card')} tone="good" />} />
                    {r.body ? <Text style={{ color: V.ink, fontSize: 14 }}>{r.body}</Text> : null}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {r.status === 'pending' ? <View style={{ flex: 1 }}><Btn text={t('Show on my card')} icon="check" kind="blue" onPress={() => setReview(r, 'approved')} busy={busy === 'rv' + r.id} /></View>
                        : <View style={{ flex: 1 }}><Btn text={t('Take off my card')} icon="x" onPress={() => setReview(r, 'pending')} busy={busy === 'rv' + r.id} /></View>}
                      <View style={{ flex: 1 }}><Btn text={t('Hide')} icon="x" kind="dark" onPress={() => hideReview(r)} busy={busy === 'rh' + r.id} /></View>
                    </View>
                  </View>
                )) : <None icon="heart" title={t('No reviews yet')} sub={t('People who open your card can leave you a star rating. You choose which ones show.')} />}
              </Card>
            </>
          ) : (
            <Btn text={t('Share my badge')} icon="send" kind="blue" onPress={shareLink} />
          )}
        </>
      ) : null}

      <Sheet open={!!sel} title={sel ? sel.name : ''} onClose={() => setSel(null)}>
        {sel ? (
          <>
            <Item title={sel.when} sub={[t(sel.kind === 'video' ? 'Video call' : sel.kind === 'call' ? 'Phone call' : 'In person'), t('{n} min', { n: sel.minutes }), sel.company].filter(Boolean).join(' · ')} />
            {sel.topic ? <Item title={t('About')} sub={sel.topic} /> : null}
            {sel.phone || sel.email ? <Item title={t('Contact')} sub={[sel.phone, sel.email].filter(Boolean).join(' · ')} /> : null}
            {sel.status === 'pending' || sel.status === 'approved' ? <In label={t('Message (optional)')} value={msg} onChangeText={setMsg} multiline style={{ minHeight: 80 }} /> : null}
            {sel.status === 'pending' ? (
              <>
                <Btn text={t('Accept')} icon="check" kind="blue" onPress={() => answer('approve')} busy={busy === 'mrapprove'} />
                <Btn text={t('Decline')} icon="x" kind="red" onPress={() => answer('decline')} busy={busy === 'mrdecline'} />
              </>
            ) : sel.status === 'approved' ? <Btn text={t('Cancel the meeting')} icon="x" kind="red" onPress={() => answer('cancel')} busy={busy === 'mrcancel'} /> : null}
          </>
        ) : null}
      </Sheet>
    </ToolPage>
  );
}
