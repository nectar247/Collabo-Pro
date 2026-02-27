import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void> | void;
  isLoading?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSendMessage,
  isLoading = false,
  placeholder = 'Message...',
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = text.trim().length > 0 && !isLoading && !sending;

  async function handleSend() {
    if (!canSend) return;
    const message = text.trim();
    setText('');
    setSending(true);
    try {
      await onSendMessage(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textDim}
          multiline
          maxLength={2000}
          returnKeyType="default"
          blurOnSubmit={false}
        />
      </View>

      <TouchableOpacity
        onPress={handleSend}
        disabled={!canSend}
        style={[styles.sendButton, canSend ? styles.sendButtonActive : styles.sendButtonInactive]}
        activeOpacity={0.7}
      >
        {sending ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.sendIcon}>↑</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    minHeight: 40,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    color: Colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: Colors.surfaceHigh,
  },
  sendIcon: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
