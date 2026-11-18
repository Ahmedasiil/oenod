// 4.1 Meet look: the navy band on top of a main page (logo or back, search, bell, avatar, big title), and the
// body that rises over it. Same top as Home and Meet, so every tab reads as one app.
import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { t } from '../lib/i18n';
import { C } from '../lib/theme';
import { Logo } from './Logo';
import { MTop } from './H';

export function PageTop({ title, sub, kicker, back, search = true, extra, pad }: { title: string; sub?: string; kicker?: string; back?: boolean | (() => void); search?: boolean; extra?: React.ReactNode; pad?: number }) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const name = session?.user?.name || '';
  const initials = (name || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const onBack = back ? (typeof back === 'function' ? back : () => (router.canGoBack() ? router.back() : router.navigate('/'))) : undefined;
  return (
    <MTop top={insets.top} title={title} sub={sub} kicker={kicker} initials={initials} unread={session?.notifications || 0} pad={pad} extra={extra}
      logo={<Logo width={68} color="#FFFFFF" />} onBack={onBack}
      onSearch={search ? () => router.navigate('/all') : undefined} onBell={() => router.push('/notifications')} onMe={() => router.navigate('/me')} />
  );
}

/** The page under PageTop. `lift` pulls the first card up into the band (80); otherwise a white sheet with rounded top. */
export function PageBody({ children, lift, style }: { children: React.ReactNode; lift?: boolean; style?: ViewStyle }) {
  const inner = <View style={[{ width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, gap: 16 }, style]}>{children}</View>;
  if (lift) return <View style={{ marginTop: -80 }}>{inner}</View>;
  return <View style={{ marginTop: -28, paddingTop: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: C.bg }}>{inner}</View>;
}
void t;
