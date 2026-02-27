import { Alert, Clipboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { formatTime } from '@/utils/time';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Message, User } from '@/types';

interface MessageBubbleProps {
  message: Message & { decryptedContent: string };
  isOwn: boolean;
  sender?: Pick<User, 'displayName' | 'photoURL'>;
  showSender: boolean;
}

export function MessageBubble({ message, isOwn, sender, showSender }: MessageBubbleProps) {
  function handleLongPress() {
    Alert.alert('Message', undefined, [
      {
        text: 'Copy',
        onPress: () => Clipboard.setString(message.decryptedContent),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

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

        <TouchableOpacity
          onLongPress={handleLongPress}
          activeOpacity={0.85}
          style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
        >
          <Text style={[styles.content, isOwn && styles.contentOwn]}>
            {message.decryptedContent}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.time, isOwn && styles.timeOwn]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
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
  time: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: 2,
    marginHorizontal: Spacing.sm,
  },
  timeOwn: {
    textAlign: 'right',
  },
});
