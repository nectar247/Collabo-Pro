import { useState } from 'react';
import { Alert, Clipboard, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { formatTime } from '@/utils/time';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Message, User } from '@/types';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const ALL_EMOJIS = ['👍', '👎', '❤️', '😂', '😮', '😢', '🙏', '🔥', '✅', '🎉', '👀', '💯'];

interface MessageBubbleProps {
  message: Message & { decryptedContent: string };
  isOwn: boolean;
  sender?: Pick<User, 'displayName' | 'photoURL'>;
  showSender: boolean;
  currentUserId?: string;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message & { decryptedContent: string }) => void;
}

export function MessageBubble({
  message,
  isOwn,
  sender,
  showSender,
  currentUserId,
  onReact,
  onReply,
}: MessageBubbleProps) {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  function handleLongPress() {
    Alert.alert('Message', undefined, [
      {
        text: 'React',
        onPress: () => setEmojiPickerOpen(true),
      },
      {
        text: 'Reply',
        onPress: () => onReply?.(message),
      },
      {
        text: 'Copy',
        onPress: () => Clipboard.setString(message.decryptedContent),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const reactions = message.reactions ?? {};
  const reactionEntries = Object.entries(reactions).filter(([, uids]) => uids.length > 0);

  return (
    <View style={[styles.wrapper, isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
      {!isOwn && (
        <View style={styles.avatarCol}>
          {showSender && sender ? (
            <Avatar user={sender} size={32} />
          ) : (
            <View style={{ width: 32 }} />
          )}
        </View>
      )}

      <View style={[styles.bubbleCol, isOwn && styles.bubbleColOwn]}>
        {!isOwn && showSender && sender && (
          <Text style={styles.senderName}>{sender.displayName}</Text>
        )}

        {/* Reply quote */}
        {message.replyToId && (
          <View style={[styles.replyQuote, isOwn && styles.replyQuoteOwn]}>
            <Text style={styles.replyQuoteSender}>{message.replyToSenderName ?? 'Unknown'}</Text>
            <Text style={styles.replyQuoteText} numberOfLines={1}>
              {message.replyToPreview ?? '...'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onLongPress={handleLongPress}
          activeOpacity={0.85}
          style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
        >
          <Text style={[styles.content, isOwn && styles.contentOwn]}>
            {message.decryptedContent}
          </Text>
        </TouchableOpacity>

        {/* Reactions row */}
        {reactionEntries.length > 0 && (
          <View style={[styles.reactionsRow, isOwn && styles.reactionsRowOwn]}>
            {reactionEntries.map(([emoji, uids]) => {
              const reacted = currentUserId ? uids.includes(currentUserId) : false;
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.reactionChip, reacted && styles.reactionChipOwn]}
                  onPress={() => onReact?.(message.id, emoji)}
                >
                  <Text style={styles.reactionText}>{emoji} {uids.length}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.addReactionBtn}
              onPress={() => setEmojiPickerOpen(true)}
            >
              <Text style={styles.addReactionText}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.time, isOwn && styles.timeOwn]}>
          {formatTime(message.createdAt)}
          {message.editedAt ? '  (edited)' : ''}
        </Text>
      </View>

      {/* Quick emoji picker modal */}
      <Modal visible={emojiPickerOpen} transparent animationType="fade" onRequestClose={() => setEmojiPickerOpen(false)}>
        <TouchableOpacity style={styles.emojiOverlay} activeOpacity={1} onPress={() => setEmojiPickerOpen(false)}>
          <View style={styles.emojiSheet}>
            <ScrollView contentContainerStyle={styles.emojiGrid}>
              {ALL_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={styles.emojiBtn}
                  onPress={() => {
                    onReact?.(message.id, e);
                    setEmojiPickerOpen(false);
                  }}
                >
                  <Text style={styles.emojiBtnText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: Spacing.md,
  },
  wrapperOwn: {
    justifyContent: 'flex-end',
  },
  wrapperOther: {
    justifyContent: 'flex-start',
  },
  avatarCol: {
    marginRight: Spacing.sm,
    justifyContent: 'flex-end',
  },
  bubbleCol: {
    maxWidth: '75%',
  },
  bubbleColOwn: {
    alignItems: 'flex-end',
  },
  senderName: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: Spacing.sm,
  },
  replyQuote: {
    backgroundColor: Colors.surfaceHigh,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginBottom: 4,
    maxWidth: '100%',
  },
  replyQuoteOwn: {
    alignSelf: 'flex-end',
  },
  replyQuoteSender: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginBottom: 1,
  },
  replyQuoteText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  bubble: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleOwn: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.sm,
  },
  bubbleOther: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: Radius.sm,
  },
  content: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  contentOwn: {
    color: Colors.white,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionsRowOwn: {
    justifyContent: 'flex-end',
  },
  reactionChip: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reactionChipOwn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '22',
  },
  reactionText: {
    fontSize: 13,
    color: Colors.text,
  },
  addReactionBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addReactionText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: 2,
    marginHorizontal: Spacing.sm,
  },
  timeOwn: {
    textAlign: 'right',
  },
  emojiOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  emojiSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.md,
    maxHeight: 220,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  emojiBtn: {
    padding: 8,
  },
  emojiBtnText: {
    fontSize: 28,
  },
});
