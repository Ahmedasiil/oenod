// 4.5: short meeting links oenod.com/j/<10-digit code> (and oenod://j/<code>) open that meeting in the app.
import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import Guest, { openMeeting, resolveMeeting } from '../guest';

export default function ShortMeetingLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  useEffect(() => { resolveMeeting(String(code || '')).then((id) => openMeeting(id, true)).catch(() => {}); }, [code]);
  return <Guest />;
}
