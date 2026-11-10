// Create an account right in the app, in three short steps: you, your business, your suites.
// A business gets a free trial with the owner signed in; "Just me" makes a personal account.
import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { BASE } from '../lib/api';
import { t } from '../lib/i18n';
import { secure } from '../lib/secure';
import { setReturnTo } from '../lib/appearance';
import { GradientButton } from '../ui/Brand';
import { Icon, IconName } from '../ui/Icon';
import { A, AuthPage, Chip, ErrorLine, GField, GlassBtn, Heading, In, Steps } from '../ui/AuthKit';

export const SUITES_KEY = 'oenod.suites';
const INDUSTRIES = ['Restaurant & cafe', 'Retail', 'Construction', 'Health & wellness', 'Beauty & salon', 'Professional services', 'Hospitality', 'Transport & logistics', 'Cleaning & trades', 'Other'];
export const SUITES: { key: string; name: string; icon: IconName; color: string; sub: string }[] = [
  { key: 'people', name: 'People', icon: 'users', color: '#2A3BC4', sub: 'Team, schedule, time clock, payroll' },
  { key: 'money', name: 'Money', icon: 'wallet', color: '#17A673', sub: 'Wallet, invoices, accounting' },
  { key: 'customers', name: 'Customers', icon: 'chat', color: '#C2417A', sub: 'CRM, reviews, Ava phone line' },
  { key: 'operations', name: 'Operations', icon: 'briefcase', color: '#D98A1C', sub: 'Inventory, POS, cameras' },
  { key: 'platform', name: 'AI & platform', icon: 'spark', color: '#0B1C86', sub: 'OENOD AI, Meet, docs. Always on.' },
];

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
function strength(p: string) {
  let s = 0;
  if (p.length >= 10) s++;
  if (/[A-Za-z]/.test(p) && /\d/.test(p)) s++;
  if (p.length >= 14 || /[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

export default function Signup() {
  const { signUp } = useAuth();
  const [step, setStep] = useState(1);
  const [personal, setPersonal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [suites, setSuites] = useState<string[]>(['people', 'money', 'customers', 'platform']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const total = personal ? 1 : 3;
  const s = strength(password);

  const create = async () => {
    setErr(''); setBusy(true);
    try {
      await secure.set(SUITES_KEY, JSON.stringify(suites)).catch(() => {});
      if (!personal) setReturnTo('/setup');
      await signUp({ name, email, password, company, industry, personal });
    } catch (e: any) {
      setReturnTo('');
      setErr(e?.message || t('Could not create your account. Try again.'));
      if (e?.fields) { setFields(e.fields); if (e.fields.email || e.fields.password) setStep(1); }
    } finally { setBusy(false); }
  };

  const next = () => {
    setErr(''); setFields({});
    if (step === 1) {
      const f: Record<string, string> = {};
      if (!name.trim()) f.name = t('Add your name.');
      if (!emailOk(email)) f.email = t('Enter a valid email.');
      if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) f.password = t('At least 10 characters, with letters and numbers.');
      if (Object.keys(f).length) { setFields(f); return; }
      if (!agree) { setErr(t('Please accept the Terms of Service and Privacy Policy to continue.')); return; }
      if (personal) { create(); return; }
      setStep(2); return;
    }
    if (step === 2) {
      if (!company.trim()) { setFields({ company: t('Add your business name.') }); return; }
      setStep(3); return;
    }
    create();
  };
  const back = step > 1 ? <Pressable onPress={() => setStep(step - 1)} accessibilityRole="button" hitSlop={8}><Text style={{ color: A.sky, fontWeight: '700' }}>{t('Back')}</Text></Pressable> : undefined;

  return (
    <AuthPage right={back}>
      <Steps n={step} of={total} />
      {step === 1 ? (
        <>
          <In><Heading eyebrow={t('Step {n} of {m}', { n: 1, m: total })} title={t('Create your account')} sub={personal ? t('A free personal account for your profile, resume and digital business card.') : t('Start your 14-day free trial. No card needed.')} /></In>
          <In delay={60} style={{ flexDirection: 'row', gap: 8, padding: 4, borderRadius: 999, backgroundColor: A.glass, borderWidth: 1, borderColor: A.line }}>
            {[[false, t('For my business')], [true, t('Just for me')]].map(([v, l]) => (
              <Pressable key={String(v)} onPress={() => setPersonal(v as boolean)} accessibilityRole="tab" accessibilityState={{ selected: personal === v }}
                style={{ flex: 1, minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: personal === v ? '#FFFFFF' : 'transparent' }}>
                <Text style={{ color: personal === v ? '#0A1230' : A.sub, fontWeight: '700', fontSize: 14 }}>{l as string}</Text>
              </Pressable>
            ))}
          </In>
          <In delay={100} style={{ gap: 14 }}>
            <GField label={t('Full name')} icon="user" value={name} onChangeText={setName} autoComplete="name" textContentType="name" error={fields.name} returnKeyType="next" />
            <GField label={t('Work email')} icon="mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" error={fields.email} returnKeyType="next" />
            <View style={{ gap: 8 }}>
              <GField label={t('Password')} icon="shield" secure value={password} onChangeText={setPassword} autoComplete="new-password" textContentType="newPassword" error={fields.password} returnKeyType="go" onSubmitEditing={next} />
              {password ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {[0, 1, 2].map((i) => <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < s ? (s === 3 ? A.ok : s === 2 ? '#8EA0FF' : '#F2B33D') : 'rgba(255,255,255,0.12)' }} />)}
                  <Text style={{ color: A.sub, fontSize: 12, width: 64, textAlign: 'right' }}>{[t('Too short'), t('Weak'), t('Good'), t('Strong')][s]}</Text>
                </View>
              ) : null}
            </View>
          </In>
          <In delay={140}>
            <Pressable onPress={() => setAgree(!agree)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: agree ? '#8EA0FF' : A.line, backgroundColor: agree ? '#2A3BC4' : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                {agree ? <Icon name="check" size={16} color="#FFFFFF" duo={false} /> : null}
              </View>
              <Text style={{ flex: 1, color: A.sub, fontSize: 13.5, lineHeight: 20 }}>
                {t('I agree to the')} <Text style={{ color: A.sky, fontWeight: '700' }} onPress={() => Linking.openURL(BASE + '/#/terms')}>{t('Terms of Service')}</Text>, {t('the')} <Text style={{ color: A.sky, fontWeight: '700' }} onPress={() => Linking.openURL(BASE + '/#/legal')}>{t('Acceptable Use Policy')}</Text> {t('and the')} <Text style={{ color: A.sky, fontWeight: '700' }} onPress={() => Linking.openURL(BASE + '/#/privacy')}>{t('Privacy Policy')}</Text>.
              </Text>
            </Pressable>
          </In>
        </>
      ) : step === 2 ? (
        <>
          <In><Heading eyebrow={t('Step {n} of {m}', { n: 2, m: total })} title={t('About your business')} sub={t('OENOD sets up the right tools and templates for your industry.')} /></In>
          <In delay={60}><GField label={t('Business name')} icon="briefcase" value={company} onChangeText={setCompany} autoComplete="organization" textContentType="organizationName" error={fields.company} /></In>
          <In delay={110} style={{ gap: 10 }}>
            <Text style={{ color: A.sub, fontSize: 13, fontWeight: '600' }}>{t('Industry')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {INDUSTRIES.map((x) => <Chip key={x} label={t(x)} on={industry === x} onPress={() => setIndustry(industry === x ? '' : x)} />)}
            </View>
          </In>
        </>
      ) : (
        <>
          <In><Heading eyebrow={t('Step {n} of {m}', { n: 3, m: total })} title={t('Pick your suites')} sub={t('Turn on what you need now. Everything stays one tap away, and you can change this any time.')} /></In>
          <In delay={60} style={{ gap: 10 }}>
            {SUITES.map((x) => (
              <Chip key={x.key} icon={x.icon} label={t(x.name)} sub={t(x.sub)} on={suites.includes(x.key)}
                onPress={() => x.key === 'platform' ? null : setSuites(suites.includes(x.key) ? suites.filter((k) => k !== x.key) : [...suites, x.key])} />
            ))}
          </In>
          <In delay={120} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icon name="spark" size={18} color={A.sky} />
            <Text style={{ flex: 1, color: A.sub, fontSize: 13.5 }}>{t('Your 14-day trial includes every suite. No card needed.')}</Text>
          </In>
        </>
      )}
      <ErrorLine text={err} />
      <View style={{ flex: 1 }} />
      <View style={{ gap: 12 }}>
        <GradientButton light busy={busy} title={step === total ? (personal ? t('Create my account') : t('Create my workspace')) : t('Continue')} iconRight="arrow" onPress={next} />
        {step === 1 ? <GlassBtn title={t('I already have an account')} onPress={() => router.replace('/login')} /> : null}
      </View>
    </AuthPage>
  );
}
