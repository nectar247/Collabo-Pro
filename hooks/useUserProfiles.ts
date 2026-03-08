import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import type { User } from '@/types';

/**
 * Batch-fetches display names for a list of user IDs.
 * Returns a Map<userId, displayName> so callers can replace
 * short-ID fallbacks with real names.
 */
export function useUserProfiles(userIds: string[]): Map<string, string> {
  const sorted = [...userIds].sort();

  const { data } = useQuery({
    queryKey: ['user-profiles', ...sorted],
    queryFn: async () => {
      const results = await Promise.all(
        sorted.map((uid) => getDoc(doc(db, COLLECTIONS.USERS, uid)))
      );
      const map = new Map<string, string>();
      for (const snap of results) {
        if (snap.exists()) {
          const user = snap.data() as User;
          map.set(snap.id, user.displayName);
        }
      }
      return map;
    },
    enabled: sorted.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min — display names rarely change
  });

  return data ?? new Map();
}
