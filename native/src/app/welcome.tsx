// First screen for anyone signed out, in the oenod.com website style: three short pages
// (OENOD, owners, employees), then Sign in. OENOD recognises who signed in and opens the right home.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop, GradientButton, PoweredBy, Wordmark } from '../ui/Brand';
import { Icon, IconName } from '../ui/Icon';
import { BASE } from '../lib/api';
import { C } from '../lib/theme';
import { t } from '../lib/i18n';
import { secure } from '../lib/secure';

export const SEEN = 'oenod.welcomed';
const native = Platform.OS !== 'web';

const glass = { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 } as const;

/** Clean list with a small light dot and a hairline between rows. */
function Dots({ items }: { items: string[] }) {
  return (
    <View style={{ marginTop: 6 }}>
      {items.map((x, n) => (
        <View key={x} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderTopWidth: n ? 1 : 0, borderColor: 'rgba(255,255,255,0.08)' }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#A9BAFF', shadowColor: '#6F86FF', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }} />
          <Text style={{ color: '#E6E9F5', fontSize: 15, fontWeight: '600' }}>{x}</Text>
        </View>
      ))}
    </View>
  );
}

function Float({ icon, tint, label, value, delay = 0, style }: { icon: IconName; tint: string; label: string; value: string; delay?: number; style?: any }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
    ]));
    a.start(); return () => a.stop();
  }, [v, delay]);
  const y = v.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, alignSelf: 'flex-start', transform: [{ translateY: y }] }, glass, { backgroundColor: 'rgba(10,14,48,0.72)' }, style]}>
      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: tint + '26', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={19} color={tint} /></View>
      <View>
        <Text style={{ color: C.sub, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: C.white, fontSize: 15, fontWeight: '700' }}>{value}</Text>
      </View>
    </Animated.View>
  );
}

function Check({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name="check" size={16} color={C.good} />
      <Text style={{ color: C.mist, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

function Eyebrow({ text }: { text: string }) {
  return (
    <View style={[{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingLeft: 4, paddingRight: 12, paddingVertical: 4 }, glass]}>
      <View style={{ backgroundColor: C.blue, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}><Text style={{ color: C.white, fontSize: 12, fontWeight: '800' }}>{t('New')}</Text></View>
      <Text style={{ color: C.mist, fontSize: 13, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={{ color: '#A9BAFF', fontWeight: '800', fontSize: 12, letterSpacing: 1.8 }}>{text}</Text>;
}

function Title({ a, b }: { a: string; b: string }) {
  return (
    <Text style={{ color: '#FFFFFF', fontSize: 44, fontWeight: '800', letterSpacing: -1.6, lineHeight: 48 }} accessibilityRole="header">
      {a} <Text style={{ color: '#A9BAFF' }}>{b}</Text>
    </Text>
  );
}

function StatGrid({ cells }: { cells: [string, string][] }) {
  return (
    <View style={[{ borderRadius: 22, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap' }, glass]}>
      {cells.map(([v, l], i) => (
        <View key={l} style={{ width: '50%', paddingVertical: 18, paddingHorizontal: 14, alignItems: 'center', borderColor: 'rgba(255,255,255,0.10)', borderRightWidth: i % 2 === 0 ? 1 : 0, borderBottomWidth: i < 2 ? 1 : 0 }}>
          <Text style={{ color: C.white, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 }}>{v}</Text>
          <Text style={{ color: C.sub, fontSize: 13, textAlign: 'center', marginTop: 2 }}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

function ClockPreview() {
  return (
    <View style={[{ borderRadius: 22, padding: 18, gap: 12 }, glass]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: C.sub, fontWeight: '600' }}>{t('Time clock')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.goodSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.good }} />
          <Text style={{ color: C.good, fontSize: 12, fontWeight: '700' }}>{t('Clocked in')}</Text>
        </View>
      </View>
      <Text style={{ color: C.white, fontSize: 40, fontWeight: '800', letterSpacing: -1.5 }}>3h 42m</Text>
      <Text style={{ color: C.sub, fontSize: 13 }}>{t('Next shift: {d}', { d: 'Fri 9:00 – 5:00' })}</Text>
    </View>
  );
}

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ref = useRef<any>(null);
  const [i, setI] = useState(0);
  useEffect(() => { secure.set(SEEN, '1').catch(() => {}); }, []);
  const pages = 3;
  const last = i === pages - 1;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setI(Math.round(e.nativeEvent.contentOffset.x / width));
  const next = () => {
    if (last) { router.push('/login'); return; }
    ref.current?.scrollTo({ x: width * (i + 1), animated: true });
    setI(i + 1);
  };
  const page = { width, paddingHorizontal: 24, paddingTop: 12, gap: 18 } as const;

  return (
    <Backdrop>
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, height: 48 }}>
          <Wordmark width={112} />
          <Pressable onPress={() => router.push('/login')} accessibilityRole="button" style={[{ borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 }, glass]}>
            <Text style={{ color: C.white, fontWeight: '700', fontSize: 14 }}>{t('Sign in')}</Text>
          </Pressable>
        </View>

        <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} onScroll={onScroll} scrollEventThrottle={64} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'stretch' }}>
          <View style={[page, { justifyContent: 'center' }]}>
            <Label text={t('OENOD AI is built into every screen').toUpperCase()} />
            <Title a={t('Run your entire company')} b={t('from your phone.')} />
            <Text style={{ color: '#8F96AE', fontSize: 16, lineHeight: 24 }}>{t('People, time clock, schedules, pay and your wallet in one app. One login for owners and their whole team.')}</Text>
            <Dots items={[t('Bank-grade security'), t('10 languages'), t('Face ID'), t('Shifts and schedule')]} />
          </View>

          <View style={[page, { justifyContent: 'center' }]}>
            <Label text={t('OWNER ACCOUNT')} />
            <Title a={t('Your business,')} b={t('live.')} />
            <Text style={{ color: '#8F96AE', fontSize: 16, lineHeight: 24 }}>{t('See sales, labour and who is working right now. Approve time off and run your team from anywhere.')}</Text>
            <StatGrid cells={[['$2,848', t('sales today')], ['24%', t('labour cost')], ['3', t('working now')], ['2', t('requests to approve')]]} />
          </View>

          <View style={[page, { justifyContent: 'center' }]}>
            <Label text={t('EMPLOYEE ACCOUNT')} />
            <Title a={t('Your day,')} b={t('in one tap.')} />
            <Text style={{ color: '#8F96AE', fontSize: 16, lineHeight: 24 }}>{t('Employees clock in, see their shifts, request time off and get paid, all from their phone.')}</Text>
            <ClockPreview />
            <Dots items={[t('Shifts and schedule'), t('Pay stubs'), t('Time off')]} />
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 24, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 6 }} accessibilityLabel={t('Page {n} of {m}', { n: i + 1, m: pages })}>
            {[0, 1, 2].map((n) => <View key={n} style={{ height: 6, width: n === i ? 24 : 6, borderRadius: 3, backgroundColor: n === i ? C.white : 'rgba(255,255,255,0.28)' }} />)}
          </View>
          <GradientButton light title={last ? t('Sign in') : t('Continue')} iconRight="arrow" onPress={next} />
          <Pressable onPress={() => WebBrowser.openBrowserAsync(BASE + '/#/signup')} accessibilityRole="link" style={{ alignItems: 'center', padding: 6 }}>
            <Text style={{ color: '#8F96AE', fontSize: 15 }}>{t('New business?')} <Text style={{ color: '#A9BAFF', fontWeight: '700' }}>{t('Start your 14-day free trial')}</Text></Text>
          </Pressable>
          <PoweredBy dark />
        </View>
      </View>
    </Backdrop>
  );
}
