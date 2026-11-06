// Deep link oenod://m/CODE (from a meeting invite): open that meeting straight away, then show the join screen.
import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import Guest, { meetingId, openMeeting } from '../guest';

export default function MeetingLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  useEffect(() => { const id = meetingId(String(code || '')); if (id) openMeeting(id).finally(() => { if (router.canGoBack()) router.back(); }); }, [code]);
  return <Guest />;
}
