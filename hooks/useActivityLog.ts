import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import type { ActivityAction, ActivityLogEntry } from '@/types';

// ─── Write (fire-and-forget, safe to call from any mutationFn) ────────────────

interface LogActivityParams {
  workspaceId: string;
  userId: string;
  userDisplayName: string;
  action: ActivityAction;
  resourceType: 'document' | 'channel';
  resourceId: string;
  resourceName: string;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.ACTIVITY_LOG), {
    ...params,
    timestamp: serverTimestamp(),
  });
}

// ─── Read (real-time subscription, last 100 entries desc) ─────────────────────

export function useActivityLog(workspaceId: string | null) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, COLLECTIONS.ACTIVITY_LOG),
      where('workspaceId', '==', workspaceId),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLogEntry)));
      setIsLoading(false);
    }, () => { setIsLoading(false); });

    return unsubscribe;
  }, [workspaceId]);

  return { entries, isLoading };
}
