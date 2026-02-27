import { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { useMessages } from '@/hooks/useChannels';
import { useAuthStore } from '@/store/authStore';
import { Colors, Spacing } from '@/constants/theme';

interface ChatScreenProps {
  channelId: string;
}

export function ChatScreen({ channelId }: ChatScreenProps) {
  const { messages, isLoading, sendMessage, isSending } = useMessages(channelId);
  const user = useAuthStore((s) => s.user);
  const flatListRef = useRef<FlatList>(null);

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

      <MessageInput onSendMessage={sendMessage} isLoading={isSending} />
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
});
