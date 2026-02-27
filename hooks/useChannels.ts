import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  limit,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { useAuthStore } from '@/store/authStore';
import { encryptForWorkspace, decryptForWorkspace } from '@/lib/encryption';
import type { Channel, Message } from '@/types';

// ─── Channel list ─────────────────────────────────────────────────────────────

export function useChannels(workspaceId: string | null) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['channels', workspaceId],
    queryFn: async () => {
      if (!workspaceId || !user?.id) return [];
      const q = query(
        collection(db, COLLECTIONS.CHANNELS),
        where('workspaceId', '==', workspaceId),
        where('members', 'array-contains', user.id)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Channel));
    },
    enabled: !!workspaceId && !!user?.id,
  });
}

export function useDirectMessages() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['direct-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const q = query(
        collection(db, COLLECTIONS.CHANNELS),
        where('type', '==', 'direct'),
        where('members', 'array-contains', user.id)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Channel));
    },
    enabled: !!user?.id,
  });
}

export function useChannel(channelId: string | null) {
  return useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      if (!channelId) return null;
      const snap = await getDoc(doc(db, COLLECTIONS.CHANNELS, channelId));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as Channel) : null;
    },
    enabled: !!channelId,
  });
}

// ─── Real-time messages ───────────────────────────────────────────────────────

interface UseMessagesReturn {
  messages: (Message & { decryptedContent: string })[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  isSending: boolean;
}

export function useMessages(channelId: string | null): UseMessagesReturn {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<(Message & { decryptedContent: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Get workspaceId from channel
  const channelQuery = useChannel(channelId);
  const workspaceId = channelQuery.data?.workspaceId ?? null;

  useEffect(() => {
    if (!channelId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const q = query(
      collection(db, COLLECTIONS.CHANNELS, channelId, COLLECTIONS.MESSAGES),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snap) => {
        const decryptedMessages = await Promise.all(
          snap.docs.map(async (d) => {
            const msg = { id: d.id, ...d.data() } as Message;
            let decryptedContent = msg.content;

            if (workspaceId) {
              try {
                decryptedContent = await decryptForWorkspace(msg.content, workspaceId);
              } catch {
                decryptedContent = '(Unable to decrypt)';
              }
            }

            return { ...msg, decryptedContent };
          })
        );

        setMessages(decryptedMessages);
        setIsLoading(false);
      },
      (err) => {
        console.warn('useMessages: Firestore snapshot error', err);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [channelId, workspaceId]);

  const sendMessage = async (content: string) => {
    if (!channelId || !user || !content.trim()) return;
    setIsSending(true);

    try {
      const encryptedContent = workspaceId
        ? await encryptForWorkspace(content.trim(), workspaceId)
        : content.trim();

      await addDoc(
        collection(db, COLLECTIONS.CHANNELS, channelId, COLLECTIONS.MESSAGES),
        {
          channelId,
          senderId: user.id,
          senderName: user.displayName,
          content: encryptedContent,
          createdAt: serverTimestamp(),
        }
      );
    } finally {
      setIsSending(false);
    }
  };

  return { messages, isLoading, sendMessage, isSending };
}

// ─── Create channel ───────────────────────────────────────────────────────────

export function useCreateChannel() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      workspaceId,
      name,
      type = 'public',
    }: {
      workspaceId: string;
      name: string;
      type?: 'public' | 'private';
    }) => {
      if (!user) throw new Error('Not authenticated');

      const ref = await addDoc(collection(db, COLLECTIONS.CHANNELS), {
        workspaceId,
        name: name.toLowerCase().replace(/\s+/g, '-'),
        type,
        members: [user.id],
        createdAt: serverTimestamp(),
      });

      return ref.id;
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] });
    },
  });
}
