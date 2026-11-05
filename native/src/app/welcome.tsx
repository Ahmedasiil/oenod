// First screen for anyone who is signed out: three short pages with the OENOD logo,
// then Sign in or Start free trial. Owners and employees use the same app;
// OENOD recognises who signed in and opens the right home.
import React, { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop, Wordmark } from '../ui/Brand';
import { Icon, IconName } from '../ui/Icon';
import { BASE } from '../lib/api';
import { C } from '../lib/theme';
import { t } from '../lib/i18n';
import { secure } from '../lib/secure';

export const SEEN = 'oenod.welcomed';

type Page = { key: string; title: string; body: string; chips: { icon: IconName; text: string }[] };

function Chip({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(159,180,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={C.sky} />
      </View>
      <Text style={{ color: C.white, fontSize: 15, fontWeight: '600', flex: 1 }}>{text}</Text>
    </View>
  );
}

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ref = useRef<any>(null);
  const [i, setI] = useState(0);
  useEffect(() => { secure.set(SEEN, '1').catch(() => {}); }, []);
  const pages: Page[] = [
    { key: 'hi', title: t('Welcome to OENOD'), body: t('Your whole business in one app. Built for owners and the people who work with them.'), chips: [
      { icon: 'shield', text: t('Secure sign-in with Face ID') },
      { icon: 'globe', text: t('10 languages, works worldwide') },
    ] },
    { key: 'owner', title: t('For owners'), body: t('See sales, labour and who is working right now. Approve time off and run your team from anywhere.'), chips: [
      { icon: 'chart', text: t('Live sales and labour today') },
      { icon: 'users', text: t('Your team at a glance') },
      { icon: 'check', text: t('Approve requests in one tap') },
    ] },
    { key: 'team', title: t('For your team'), body: t('Employees clock in, see their shifts, request time off and get paid, all from their phone.'), chips: [
      { icon: 'clock', text: t('Clock in and out on site') },
      { icon: 'calendar', text: t('Shifts and schedule') },
      { icon: 'cash', text: t('Pay stubs and wallet') },
    ] },
  ];
  const last = i === pages.length - 1;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setI(Math.round(e.nativeEvent.contentOffset.x / width));
  const next = () => {
    if (last) { router.push('/login'); return; }
    ref.current?.scrollTo({ x: width * (i + 1), animated: true });
    setI(i + 1);
  };

  return (
    <Backdrop>
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, height: 44 }}>
          <Wordmark width={104} />
          {!last ? (
            <Pressable onPress={() => router.push('/login')} accessibilityRole="button" style={{ padding: 8 }}>
              <Text style={{ color: C.mist, fontWeight: '600', fontSize: 15 }}>{t('Skip')}</Text>
            </Pressable>
          ) : null}
        </View>
        <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} onScroll={onScroll} scrollEventThrottle={64} style={{ flex: 1 }}>
          {pages.map((p, n) => (
            <View key={p.key} style={{ width, paddingHorizontal: 28, justifyContent: 'center', gap: 18 }}>
              {n === 0 ? (
                <View style={{ alignItems: 'center', marginBottom: 18 }}>
                  <View style={{ width: 132, height: 132, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                    <Wordmark width={108} />
                  </View>
                </View>
              ) : (
                <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(159,180,255,0.16)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ color: C.sky, fontWeight: '700', fontSize: 12, letterSpacing: 1.2 }}>{n === 1 ? t('OWNER ACCOUNT') : t('EMPLOYEE ACCOUNT')}</Text>
                </View>
              )}
              <Text style={{ color: C.white, fontSize: 34, fontWeight: '800', letterSpacing: -0.8, lineHeight: 40, textAlign: n === 0 ? 'center' : 'left' }} accessibilityRole="header">{p.title}</Text>
              <Text style={{ color: C.mist, fontSize: 17, lineHeight: 25, textAlign: n === 0 ? 'center' : 'left' }}>{p.body}</Text>
              <View style={{ gap: 10, marginTop: 8 }}>{p.chips.map((c) => <Chip key={c.text} icon={c.icon} text={c.text} />)}</View>
            </View>
          ))}
        </ScrollView>
        <View style={{ paddingHorizontal: 24, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 }} accessibilityLabel={t('Page {n} of {m}', { n: i + 1, m: pages.length })}>
            {pages.map((p, n) => <View key={p.key} style={{ height: 6, width: n === i ? 22 : 6, borderRadius: 3, backgroundColor: n === i ? C.white : 'rgba(255,255,255,0.3)' }} />)}
          </View>
          <Pressable onPress={next} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 56, borderRadius: 16, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: pressed ? 0.85 : 1 })}>
            <Text style={{ color: C.navy, fontSize: 17, fontWeight: '800' }}>{last ? t('Sign in') : t('Continue')}</Text>
            <Icon name="arrow" size={20} color={C.navy} />
          </Pressable>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(BASE + '/#/signup')} accessibilityRole="link" style={{ alignItems: 'center', padding: 8 }}>
            <Text style={{ color: C.mist, fontSize: 15 }}>{t('New business?')} <Text style={{ color: C.white, fontWeight: '700' }}>{t('Start your free trial')}</Text></Text>
          </Pressable>
        </View>
      </View>
    </Backdrop>
  );
}
