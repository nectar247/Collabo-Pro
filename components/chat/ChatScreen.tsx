import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { useMessages } from '@/hooks/useChannels';
import { useAuthStore } from '@/store/authStore';
import { Colors, FontSize, Spacing } from '@/constants/theme';

interface ChatScreenProps {
  channelId: string;
}

export function ChatScreen({ channelId }: ChatScreenProps) {
  const { messages, isLoading, sendMessage, isSending } = useMessages(channelId);
  const user = useAuthStore((s) => s.user);
  const flatListRef = useRef<FlatList>(null);

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

      <MessageInput
        onSendMessage={sendMessage}
        isLoading={isSending}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
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
});
