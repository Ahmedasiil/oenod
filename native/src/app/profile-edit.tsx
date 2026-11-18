// Edit my profile and business card inside the app: name, headline, about, contact details, skills, links and
// who can see the card. Sends the full profile back (the server replaces it), keeping the card design and address.
import React, { useEffect, useState } from 'react';
import { Share } from 'react-native';
import { router } from 'expo-router';
import { get, put } from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { t } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { Btn, Card, In, Item, Pick, State, Tag, ToolPage, oops, useBusy } from '../ui/T1';

type Link = { label: string; url: string };
type Prof = { name: string; email: string; headline: string | null; bio: string | null; phone: string | null; public_email: string | null; website: string | null; location: string | null;
  company_label: string | null; card_theme: string | null; card_public: number | boolean; show_phone: number | boolean; show_email: number | boolean; slug: string; links: Link[]; skills: string[]; card_url: string };
type Ed = { name: string; headline: string; bio: string; phone: string; public_email: string; website: string; location: string; company_label: string; card_public: string; show_phone: string; show_email: string; skills: string; links: Link[]; nl: string };
const yn = (b: unknown) => (b ? 'yes' : 'no');

export default function ProfileEdit() {
  const d = useLoad(() => get<Prof>('/api/me/profile'));
  const x = d.data;
  const auth = useAuth() as any;
  const { busy, run } = useBusy();
  const [ed, setEd] = useState<Ed | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (x && !ed) setEd({ name: x.name || '', headline: x.headline || '', bio: x.bio || '', phone: x.phone || '', public_email: x.public_email || '', website: x.website || '', location: x.location || '', company_label: x.company_label || '',
      card_public: yn(x.card_public), show_phone: yn(x.show_phone), show_email: yn(x.show_email), skills: (x.skills || []).join(', '), links: x.links || [], nl: '' });
  }, [x]);
  const addLink = () => { if (!ed || !ed.nl.trim()) return; setEd({ ...ed, links: [...ed.links, { label: '', url: ed.nl.trim() }].slice(0, 8), nl: '' }); };
  const save = () => {
    if (!ed || !x) return;
    if (!ed.name.trim()) return setErr(t('Type your name.'));
    if (ed.public_email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ed.public_email.trim())) return setErr(t('Check the email address.'));
    setErr('');
    run('sv', async () => {
      await put('/api/me/profile', {
        name: ed.name.trim(), headline: ed.headline.trim() || null, bio: ed.bio.trim() || null, phone: ed.phone.trim() || null, public_email: ed.public_email.trim() || null, website: ed.website.trim() || null,
        location: ed.location.trim() || null, company_label: ed.company_label.trim() || null, card_theme: x.card_theme || 'navy', slug: x.slug,
        card_public: ed.card_public === 'yes', show_phone: ed.show_phone === 'yes', show_email: ed.show_email === 'yes',
        skills: ed.skills.split(',').map((s) => s.trim()).filter(Boolean), links: ed.links,
      });
      try { await auth.refresh?.(); } catch { /* the name shows after the next sign-in */ }
      d.reload(); router.back();
    });
  };
  const share = async () => { if (!x) return; try { await Share.share({ message: x.card_url }); } catch { oops(x.card_url); } };
  return (
    <ToolPage title={t('Edit my profile')} right="link" rightLabel={t('Share my card')} onRight={share}>
      <State loading={d.loading && !x} error={!x ? d.error : null} onRetry={d.reload} />
      {ed && x ? (
        <>
          <Card title={t('About me')}>
            <In label={t('Full name')} value={ed.name} onChangeText={(v) => setEd({ ...ed, name: v })} />
            <In label={t('Headline')} value={ed.headline} onChangeText={(v) => setEd({ ...ed, headline: v })} placeholder={t('e.g. Barista and latte artist')} />
            <In label={t('About')} value={ed.bio} onChangeText={(v) => setEd({ ...ed, bio: v })} multiline style={{ minHeight: 110 }} />
            <In label={t('City')} value={ed.location} onChangeText={(v) => setEd({ ...ed, location: v })} />
            <In label={t('Company on my card')} value={ed.company_label} onChangeText={(v) => setEd({ ...ed, company_label: v })} />
            <In label={t('Skills (separate with commas)')} value={ed.skills} onChangeText={(v) => setEd({ ...ed, skills: v })} />
          </Card>
          <Card title={t('Contact')}>
            <In label={t('Phone')} value={ed.phone} onChangeText={(v) => setEd({ ...ed, phone: v })} keyboardType="phone-pad" />
            <In label={t('Email on my card')} value={ed.public_email} onChangeText={(v) => setEd({ ...ed, public_email: v })} keyboardType="email-address" autoCapitalize="none" placeholder={x.email} />
            <In label={t('Website')} value={ed.website} onChangeText={(v) => setEd({ ...ed, website: v })} autoCapitalize="none" />
          </Card>
          <Card title={t('Links')}>
            {ed.links.map((l, i) => <Item key={i} title={l.label || l.url} sub={l.label ? l.url : undefined} right={t('Remove')} onPress={() => setEd({ ...ed, links: ed.links.filter((_, j) => j !== i) })} />)}
            <In label={t('Add a link')} value={ed.nl} onChangeText={(v) => setEd({ ...ed, nl: v })} autoCapitalize="none" placeholder="instagram.com/you" />
            {ed.nl.trim() ? <Btn text={t('Add link')} icon="plus" onPress={addLink} /> : null}
          </Card>
          <Card title={t('My card')}>
            <Pick<string> label={t('Who can see my card')} value={ed.card_public} onChange={(v) => setEd({ ...ed, card_public: v })} items={[['yes', t('Anyone with the link')], ['no', t('Only people at my company')]]} />
            <Pick<string> label={t('Show my phone')} value={ed.show_phone} onChange={(v) => setEd({ ...ed, show_phone: v })} items={[['yes', t('Yes')], ['no', t('No')]]} />
            <Pick<string> label={t('Show my email')} value={ed.show_email} onChange={(v) => setEd({ ...ed, show_email: v })} items={[['yes', t('Yes')], ['no', t('No')]]} />
          </Card>
          {err ? <Tag text={err} tone="bad" /> : null}
          <Btn text={t('Save my profile')} icon="check" kind="blue" onPress={save} busy={busy === 'sv'} />
          <Btn text={t('My resumes')} icon="doc" onPress={() => router.push('/resume' as any)} />
        </>
      ) : null}
    </ToolPage>
  );
}
