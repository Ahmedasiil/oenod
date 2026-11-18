// Terms, Privacy and the other legal documents, read inside the app (4.3). The text comes from oenod.com's legal
// service (GET /api/legal/docs), so it is always the current version. Works signed in or out.
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { get } from '../lib/api';
import { t } from '../lib/i18n';
import { MK } from '../ui/MeetKit';
import { Ph } from '../ui/H';

type Doc = { key: string; title: string; short: string; summary: string; html: string };

export default function Legal() {
  const { doc = 'terms' } = useLocalSearchParams<{ doc?: string }>();
  const insets = useSafeAreaInsets();
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [err, setErr] = useState('');
  const [key, setKey] = useState(String(doc));
  const [eff, setEff] = useState('');
  useEffect(() => { get<{ docs: Doc[]; effective?: string }>('/api/legal/docs').then((r) => { setDocs(r.docs || []); setEff(r.effective || ''); }).catch((e) => setErr(e?.message || t('Could not load. Check your internet and try again.'))); }, []);
  const d = docs?.find((x) => x.key === key) || docs?.[0];
  const html = useMemo(() => d ? `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    body{font:16px/1.6 -apple-system,Roboto,system-ui,sans-serif;color:#0A0B10;margin:0;padding:4px 20px 40px;background:#fff}
    h1,h2,h3{color:#000C58;line-height:1.25;margin:26px 0 8px} h2{font-size:20px} h3{font-size:17px} p,li{color:#2A2E45} a{color:#1A2FCF}
    table{border-collapse:collapse;width:100%;font-size:14px} td,th{border:1px solid #E3E6EF;padding:6px}</style></head><body>${d.html}</body></html>` : '', [d]);
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 14, paddingBottom: 10, backgroundColor: MK.navy, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel={t('Back')} hitSlop={6}
            style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <Ph name="caret-left" size={20} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }} numberOfLines={1}>{d?.title || t('Legal')}</Text>
            {eff ? <Text style={{ color: MK.soft, fontSize: 12 }}>{t('In effect since {d}', { d: eff })}</Text> : null}
          </View>
        </View>
        {docs && docs.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {docs.map((x) => (
              <Pressable key={x.key} onPress={() => setKey(x.key)} accessibilityRole="button" accessibilityState={{ selected: x.key === d?.key }}
                style={{ paddingHorizontal: 14, height: 34, borderRadius: 99, justifyContent: 'center', backgroundColor: x.key === d?.key ? '#FFFFFF' : 'rgba(255,255,255,0.12)' }}>
                <Text style={{ color: x.key === d?.key ? MK.navy : '#FFFFFF', fontWeight: '800', fontSize: 13 }}>{x.short}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>
      {err ? <Text style={{ color: MK.bad, padding: 20, fontSize: 15 }}>{err}</Text>
        : !d ? <ActivityIndicator style={{ marginTop: 40 }} color={MK.navy} />
        : <WebView originWhitelist={['*']} source={{ html }} style={{ flex: 1 }} setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={(r) => {
              const m = r.url.match(/#\/legal\/([a-z]+)/) || r.url.match(/#\/(terms|privacy)$/);
              if (m) { setKey(m[1]); return false; }
              return r.url === 'about:blank' || r.url.startsWith('data:') || r.navigationType !== 'click';
            }} />}
    </View>
  );
}
