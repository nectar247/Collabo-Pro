import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { useAuthStore } from '@/store/authStore';
import type { DocumentPresenceEntry } from '@/types';

const PRESENCE_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

function userColor(userId: string): string {
  let h = 0;
  for (const c of userId) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PRESENCE_COLORS[h % PRESENCE_COLORS.length];
}

const KEEPALIVE_MS = 30_000;
const STALE_MS = 90_000;

/** Registers the current user in the document's presence subcollection.
 *  Refreshes lastSeen every 30 s and removes the entry on unmount.
 *  Returns updateBlock() to track which block/cell the user is editing. */
export function useWritePresence(docId: string | null): {
  updateBlock: (blockId: string | null) => void;
} {
  const user = useAuthStore((s) => s.user);
  const presenceRefRef = useRef<ReturnType<typeof doc> | null>(null);

  useEffect(() => {
    if (!docId || !user) return;

    const presenceRef = doc(
      db,
      COLLECTIONS.DOCUMENTS,
      docId,
      COLLECTIONS.DOCUMENT_PRESENCE,
      user.id
    );
    presenceRefRef.current = presenceRef;

    const writePresence = () => {
      try {
        setDoc(presenceRef, {
          userId: user.id,
          displayName: user.displayName,
          photoURL: user.photoURL ?? null,
          color: userColor(user.id),
          lastSeen: serverTimestamp(),
          blockId: null,
        }).catch(() => {});
      } catch { /* ignore synchronous throws (Hermes + Firebase 12 edge case) */ }
    };

    writePresence();
    const interval = setInterval(writePresence, KEEPALIVE_MS);

    return () => {
      clearInterval(interval);
      presenceRefRef.current = null;
      try { deleteDoc(presenceRef).catch(() => {}); } catch { /* ignore */ }
    };
  }, [docId, user?.id]);

  const updateBlock = useCallback((blockId: string | null) => {
    if (!presenceRefRef.current) return;
    try {
      updateDoc(presenceRefRef.current, { blockId: blockId ?? null }).catch(() => {});
    } catch { /* ignore */ }
  }, []);

  return { updateBlock };
}

/** Returns the list of other users currently in the document (excluding self).
 *  Entries older than 90 s are filtered as stale. */
export function usePresenceMembers(docId: string | null): DocumentPresenceEntry[] {
  const [members, setMembers] = useState<DocumentPresenceEntry[]>([]);
  const myId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!docId) return;

    const presenceCol = collection(
      db,
      COLLECTIONS.DOCUMENTS,
      docId,
      COLLECTIONS.DOCUMENT_PRESENCE
    );

    return onSnapshot(presenceCol, (snap) => {
      const now = Date.now();
      const fresh: DocumentPresenceEntry[] = snap.docs
        .map((d) => d.data() as DocumentPresenceEntry)
        .filter((m) => {
          if (m.userId === myId) return false;
          const seen = (m.lastSeen as any)?.toMillis?.() ?? 0;
          return now - seen < STALE_MS;
        })
        .sort((a, b) => {
          const aMs = (a.lastSeen as any)?.toMillis?.() ?? 0;
          const bMs = (b.lastSeen as any)?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
      setMembers(fresh);
    }, () => {});
  }, [docId, myId]);

  return members;
}
