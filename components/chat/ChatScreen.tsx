import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { useMessages, useReactToMessage, useChannel } from '@/hooks/useChannels';
import { useAuthStore } from '@/store/authStore';
import { useWorkspaceMembers } from '@/hooks/useWorkspace';
import { useUserProfiles } from '@/hooks/useUserProfiles';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import type { Message } from '@/types';

interface ChatScreenProps {
  channelId: string;
}

export function ChatScreen({ channelId }: ChatScreenProps) {
  const { messages, isLoading, sendMessage, isSending } = useMessages(channelId);
  const user = useAuthStore((s) => s.user);
  const flatListRef = useRef<FlatList>(null);
  const reactToMessage = useReactToMessage(channelId);

  // Reply state
  const [replyTo, setReplyTo] = useState<(Message & { decryptedContent: string }) | null>(null);

  // @ mention members
  const channelData = useChannel(channelId);
  const workspaceId = channelData.data?.workspaceId ?? null;
  const { data: memberEntries = [] } = useWorkspaceMembers(workspaceId);
  const memberIds = memberEntries.map((m: any) => (typeof m === 'string' ? m : m.userId));
  const profileMap = useUserProfiles(memberIds);
  const mentionMembers = memberIds
    .filter((uid: string) => uid !== user?.id)
    .map((uid: string) => ({ id: uid, displayName: profileMap.get(uid) ?? uid.slice(0, 8) }));

  // ── Typing indicators ─────────────────────────────────────────────────────
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const writeTypingDoc = useCallback(() => {
    if (!user || !channelId) return;
    setDoc(doc(db, COLLECTIONS.TYPING, channelId, 'users', user.id), {
      displayName: user.displayName,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }, [channelId, user]);

  const deleteTypingDoc = useCallback(() => {
    if (!user || !channelId) return;
    deleteDoc(doc(db, COLLECTIONS.TYPING, channelId, 'users', user.id)).catch(() => {});
  }, [channelId, user]);

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      writeTypingDoc();
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { writeTypingDoc(); }, 2000);
  }, [writeTypingDoc]);

  const handleStopTyping = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    isTypingRef.current = false;
    deleteTypingDoc();
  }, [deleteTypingDoc]);

  useEffect(() => {
    if (!channelId || !user) return;
    const colRef = collection(db, COLLECTIONS.TYPING, channelId, 'users');
    const unsub = onSnapshot(colRef, (snap) => {
      const now = Date.now();
      const names: string[] = [];
      snap.docs.forEach((d) => {
        if (d.id === user.id) return;
        const ts: Timestamp | undefined = d.data().updatedAt;
        if (now - (ts?.toMillis?.() ?? 0) < 5000) names.push(d.data().displayName as string);
      });
      setTypingUsers(names);
    });
    return () => { unsub(); deleteTypingDoc(); if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [channelId, user, deleteTypingDoc]);

  const typingLabel = typingUsers.length === 0 ? null
    : typingUsers.length === 1 ? `${typingUsers[0]} is typing...`
    : typingUsers.length === 2 ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
    : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function handleSendMessage(content: string) {
    await sendMessage(content, replyTo
      ? {
        replyToId: replyTo.id,
        replyToSenderName: replyTo.senderName ?? replyTo.senderId.slice(0, 8),
        replyToPreview: replyTo.decryptedContent.slice(0, 80),
      }
      : undefined);
    setReplyTo(null);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item, index }) => {
          const isOwn = item.senderId === user?.id;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showSender = !prevMessage || prevMessage.senderId !== item.senderId;

          return (
            <MessageBubble
              message={item}
              isOwn={isOwn}
              sender={
                !isOwn
                  ? { displayName: item.senderName ?? item.senderId.slice(0, 8), photoURL: undefined }
                  : undefined
              }
              showSender={showSender && !isOwn}
              currentUserId={user?.id}
              onReact={(msgId, emoji) => reactToMessage(msgId, emoji).catch(() => {})}
              onReply={setReplyTo}
            />
          );
        }}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet.</Text>
            <Text style={styles.emptySubtext}>Be the first to say something!</Text>
          </View>
        }
      />

      {typingLabel ? (
        <Text style={styles.typingIndicator}>{typingLabel}</Text>
      ) : null}

      {/* Reply preview bar */}
      {replyTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarLabel}>Replying to {replyTo.senderName ?? 'message'}</Text>
            <Text style={styles.replyBarPreview} numberOfLines={1}>{replyTo.decryptedContent}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyBarClose}>
            <Text style={styles.replyBarCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <MessageInput
        onSendMessage={handleSendMessage}
        isLoading={isSending}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
        mentionMembers={mentionMembers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textMuted,
  },
  messageList: {
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    color: Colors.textDim,
    fontSize: 14,
  },
  typingIndicator: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    paddingHorizontal: Spacing.md,
    paddingBottom: 4,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  replyBarContent: {
    flex: 1,
  },
  replyBarLabel: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyBarPreview: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  replyBarClose: {
    padding: 4,
    marginLeft: Spacing.sm,
  },
  replyBarCloseText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
});
