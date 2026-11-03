import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from './i18n';
import { useFocusEffect } from 'expo-router';

/** Load data from the API, reload when the screen comes back into view, and support pull-to-refresh. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async (mode: 'first' | 'refresh' | 'quiet' = 'quiet') => {
    if (mode === 'refresh') setRefreshing(true);
    try {
      const d = await fnRef.current();
      setData(d);
      setError(null);
    } catch (e: any) {
      setError(e?.message || t('Could not load.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLoading(true); load('first'); }, deps);
  useFocusEffect(useCallback(() => { load('quiet'); }, [load]));

  return { data, setData, error, loading, refreshing, refresh: () => load('refresh'), reload: () => load('quiet') };
}
