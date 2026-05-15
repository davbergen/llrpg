import { useCallback, useEffect, useState } from 'react';
import { cancelDeletion, fetchScheduledDeletion, type ScheduledDeletion } from './index';

export interface ScheduledDeletionHook {
  scheduled: ScheduledDeletion | null;
  cancel: () => Promise<void>;
  refresh: () => void;
}

export function useScheduledDeletion(userId: string | null): ScheduledDeletionHook {
  const [scheduled, setScheduled] = useState<ScheduledDeletion | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      setScheduled(null);
      return;
    }
    let cancelled = false;
    fetchScheduledDeletion(userId)
      .then((s) => {
        if (!cancelled) setScheduled(s);
      })
      .catch(() => {
        /* silent */
      });
    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  const cancel = useCallback(async () => {
    await cancelDeletion();
    setScheduled(null);
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { scheduled, cancel, refresh };
}
