import { useEffect } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { flushQueue } from '@/lib/offlineQueue';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Global hook that flushes queued offline writes whenever connectivity is restored.
 * Mount once at the root layout so it fires regardless of which screen is active.
 */
export function useOfflineSync() {
  const { isConnected } = useNetworkStatus();

  useEffect(() => {
    if (!isConnected) return;
    flushQueue(async (docId, content) => {
      await updateDoc(doc(db, COLLECTIONS.DOCUMENTS, docId), {
        content,
        updatedAt: serverTimestamp(),
      });
    }).catch(() => {});
  }, [isConnected]);

  return { isConnected };
}
