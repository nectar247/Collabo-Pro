import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MessageInput } from './MessageInput';
import { chatWithClaude, ClaudeError, type AIChatMessage } from '@/lib/ai/claude';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  isTyping?: boolean;
}

const SUGGESTED_PROMPTS = [
  'Draft a quick status update for my team',
  'Help me write a professional email',
  'Summarize key points from our discussion',
  'Give me tips for better team communication',
];

export function AIChatScreen({ workspaceId }: { workspaceId?: string } = {}) {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function handleSend(userText: string) {
    const userMsg: LocalMessage = {
      id: Math.random().toString(36).slice(2, 10),
      role: 'user',
      content: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    // Build history for Claude (exclude error messages)
    const history: AIChatMessage[] = [...messages, userMsg]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    try {
      const reply = await chatWithClaude(history, workspaceId);
      const assistantMsg: LocalMessage = {
        id: Math.random().toString(36).slice(2, 10),
        role: 'assistant',
        content: reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      if (err instanceof ClaudeError && err.code === 'NO_API_KEY') {
        Alert.alert(
          'API Key Required',
          'To use the AI assistant, add your Claude API key in Profile → AI Assistance.\n\nGet a free key at console.anthropic.com',
          [{ text: 'OK' }]
        );
        // Remove the user message so they can retry after setting up the key
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      } else {
        const errorMsg: LocalMessage = {
          id: Math.random().toString(36).slice(2, 10),
          role: 'error',
          content: err instanceof ClaudeError ? err.message : 'Something went wrong. Please try again.',
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsThinking(false);
    }
  }

  function handleClearChat() {
    Alert.alert('Clear Chat', 'Start a new conversation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setMessages([]) },
    ]);
  }

  return (
    <View style={styles.container}>
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.aiIcon}>✨</Text>
          <Text style={styles.emptyTitle}>AI Assistant</Text>
          <Text style={styles.emptySubtext}>
            Ask me anything — drafting, summarizing, brainstorming, or general questions.
          </Text>

          <View style={styles.suggestionsGrid}>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                style={styles.suggestionChip}
                onPress={() => handleSend(prompt)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <AIMessageBubble message={item} />}
            ListFooterComponent={
              isThinking ? (
                <View style={styles.typingRow}>
                  <View style={styles.typingBubble}>
                    <ActivityIndicator size="small" color={Colors.textMuted} />
                    <Text style={styles.typingText}>Claude is thinking…</Text>
                  </View>
                </View>
              ) : null
            }
          />

          <TouchableOpacity style={styles.clearBtn} onPress={handleClearChat}>
            <Text style={styles.clearBtnText}>Clear conversation</Text>
          </TouchableOpacity>
        </>
      )}

      <MessageInput
        onSendMessage={handleSend}
        isLoading={isThinking}
        placeholder="Ask Claude anything..."
      />
    </View>
  );
}

function AIMessageBubble({ message }: { message: LocalMessage }) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarIcon}>✨</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : isError ? styles.bubbleError : styles.bubbleAI,
        ]}
      >
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Empty / welcome state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  aiIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  suggestionsGrid: {
    width: '100%',
    gap: Spacing.sm,
  },
  suggestionChip: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionText: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  // Message list
  messageList: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAI: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: `${Colors.secondary}33`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiAvatarIcon: {
    fontSize: 14,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleError: {
    backgroundColor: `${Colors.danger}22`,
    borderWidth: 1,
    borderColor: `${Colors.danger}44`,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: Colors.white,
  },
  bubbleTextAI: {
    color: Colors.text,
  },
  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typingText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  // Clear button
  clearBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  clearBtnText: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
    textDecorationLine: 'underline',
  },
});
