// Deep link oenod://m/CODE (from a meeting invite): open that meeting straight away, then show the join screen.
import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import Guest, { openMeeting, resolveMeeting } from '../guest';

export default function MeetingLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  useEffect(() => { resolveMeeting(String(code || '')).then((id) => openMeeting(id, true)).catch(() => {}); }, [code]);
  return <Guest />;
}
