import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated());

  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAppStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
