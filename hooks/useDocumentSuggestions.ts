import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { useAuthStore } from '@/store/authStore';
import { sendNotification } from '@/lib/notifications/push';
import type { DocumentSuggestion } from '@/types';

// ─── Real-time suggestions list ──────────────────────────────────────────────

export function useDocumentSuggestions(documentId: string | null) {
  const [suggestions, setSuggestions] = useState<DocumentSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!documentId) { setIsLoading(false); return; }

    const q = query(
      collection(db, COLLECTIONS.DOCUMENT_SUGGESTIONS),
      where('documentId', '==', documentId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'asc'),
    );

    return onSnapshot(q, (snap) => {
      setSuggestions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DocumentSuggestion)));
      setIsLoading(false);
    }, () => { setIsLoading(false); });
  }, [documentId]);

  return { suggestions, isLoading };
}

// ─── Create a suggestion ─────────────────────────────────────────────────────

export function useCreateSuggestion() {
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      documentId,
      workspaceId,
      blockId,
      originalText,
      suggestedText,
      docOwnerId,
      docName,
    }: {
      documentId: string;
      workspaceId: string;
      blockId: string;
      originalText: string;
      suggestedText: string;
      docOwnerId?: string;
      docName?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      await addDoc(collection(db, COLLECTIONS.DOCUMENT_SUGGESTIONS), {
        documentId,
        workspaceId,
        blockId,
        originalText,
        suggestedText,
        userId: user.id,
        userDisplayName: user.displayName,
        createdAt: serverTimestamp(),
        status: 'pending',
      });

      // Notify doc owner if different from suggester
      if (docOwnerId && docOwnerId !== user.id && docName) {
        sendNotification({
          recipientId: docOwnerId,
          type: 'document_edited',
          title: `💡 Suggestion on "${docName}"`,
          body: `${user.displayName} suggested a change.`,
          data: { documentId },
          dedupKey: `${documentId}_suggestion_${user.id}`,
        }).catch(() => {});
      }
    },
  });
}

// ─── Accept or reject a suggestion ───────────────────────────────────────────

export function useRespondToSuggestion() {
  return useMutation({
    mutationFn: async ({
      suggestionId,
      status,
    }: {
      suggestionId: string;
      status: 'accepted' | 'rejected';
    }) => {
      await updateDoc(doc(db, COLLECTIONS.DOCUMENT_SUGGESTIONS, suggestionId), { status });
    },
  });
}
