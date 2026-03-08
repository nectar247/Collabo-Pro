import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { useAuthStore } from '@/store/authStore';
import { sendNotification } from '@/lib/notifications/push';
import type { Comment, CommentReply } from '@/types';

// ─── Real-time comments list ──────────────────────────────────────────────────

export function useComments(documentId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!documentId) { setIsLoading(false); return; }

    const q = query(
      collection(db, COLLECTIONS.COMMENTS),
      where('documentId', '==', documentId),
      orderBy('createdAt', 'desc'),
    );

    return onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Comment)));
      setIsLoading(false);
    }, () => { setIsLoading(false); });
  }, [documentId]);

  return { comments, isLoading };
}

// ─── Add a new comment ────────────────────────────────────────────────────────

export function useAddComment() {
  const user = useAuthStore((s) => s.user);

  return async ({
    documentId,
    workspaceId,
    text,
    docOwnerId,
    docName,
    mentionedUserIds = [],
    anchorBlockId,
    anchorText,
    anchorStart,
    anchorEnd,
  }: {
    documentId: string;
    workspaceId: string;
    text: string;
    docOwnerId: string;
    docName: string;
    mentionedUserIds?: string[];
    anchorBlockId?: string;
    anchorText?: string;
    anchorStart?: number;
    anchorEnd?: number;
  }): Promise<void> => {
    if (!user || !text.trim()) return;

    await addDoc(collection(db, COLLECTIONS.COMMENTS), {
      documentId,
      workspaceId,
      userId: user.id,
      userDisplayName: user.displayName,
      text: text.trim(),
      resolved: false,
      replies: [],
      createdAt: serverTimestamp(),
      anchorBlockId: anchorBlockId ?? null,
      anchorText: anchorText ?? null,
      ...(anchorStart !== undefined ? { anchorStart } : {}),
      ...(anchorEnd !== undefined ? { anchorEnd } : {}),
    });

    const notified = new Set<string>([user.id]);

    // Notify document owner
    if (docOwnerId !== user.id) {
      notified.add(docOwnerId);
      sendNotification({
        recipientId: docOwnerId,
        type: 'comment_added',
        title: `💬 New comment on "${docName}"`,
        body: `${user.displayName}: ${text.trim().slice(0, 80)}`,
        data: { documentId },
        dedupKey: documentId,
      }).catch(() => {});
    }

    // Notify @mentioned users (skip those already notified)
    for (const mentionedId of mentionedUserIds) {
      if (notified.has(mentionedId)) continue;
      notified.add(mentionedId);
      sendNotification({
        recipientId: mentionedId,
        type: 'comment_added',
        title: `🔔 You were mentioned in "${docName}"`,
        body: `${user.displayName}: ${text.trim().slice(0, 80)}`,
        data: { documentId },
        dedupKey: `${documentId}_mention_${mentionedId}`,
      }).catch(() => {});
    }
  };
}

// ─── Add a reply to a comment ─────────────────────────────────────────────────

export function useAddReply() {
  const user = useAuthStore((s) => s.user);

  return async (commentId: string, text: string): Promise<void> => {
    if (!user || !text.trim()) return;

    const reply: Omit<CommentReply, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
      id: Math.random().toString(36).slice(2, 10),
      userId: user.id,
      userDisplayName: user.displayName,
      text: text.trim(),
      createdAt: serverTimestamp(),
    };

    await updateDoc(doc(db, COLLECTIONS.COMMENTS, commentId), {
      replies: arrayUnion(reply),
    });
  };
}

// ─── Resolve / unresolve ──────────────────────────────────────────────────────

export function useResolveComment() {
  const user = useAuthStore((s) => s.user);

  return async (commentId: string, resolved: boolean): Promise<void> => {
    if (!user) return;
    await updateDoc(doc(db, COLLECTIONS.COMMENTS, commentId), {
      resolved,
      resolvedBy: resolved ? user.id : null,
      resolvedAt: resolved ? serverTimestamp() : null,
    });
  };
}

// ─── Delete a comment ─────────────────────────────────────────────────────────

export function useDeleteComment() {
  const user = useAuthStore((s) => s.user);

  return async (commentId: string): Promise<void> => {
    if (!user) return;
    await deleteDoc(doc(db, COLLECTIONS.COMMENTS, commentId));
  };
}
