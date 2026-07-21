import { useAdventures } from '@/context/adventures-context';
import { useFragments } from '@/context/fragments-context';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

const RETRY_INTERVAL_MS = 30000;

export function ConnectionSync() {
  const { isOffline: adventuresOffline, refreshAdventures } = useAdventures();
  const { isOffline: fragmentsOffline, refreshLoadedFragments } = useFragments();
  const synchronizingRef = useRef(false);
  const isOffline = adventuresOffline || fragmentsOffline;

  const synchronize = useCallback(async () => {
    if (!isOffline || synchronizingRef.current) return;
    synchronizingRef.current = true;
    try {
      await Promise.all([refreshAdventures(), refreshLoadedFragments()]);
    } finally {
      synchronizingRef.current = false;
    }
  }, [isOffline, refreshAdventures, refreshLoadedFragments]);

  useEffect(() => {
    if (!isOffline) return;
    const interval = setInterval(() => void synchronize(), RETRY_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void synchronize();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [isOffline, synchronize]);

  return null;
}
