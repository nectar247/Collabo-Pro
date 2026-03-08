import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

interface MentionMember {
  id: string;
  displayName: string;
}

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void> | void;
  isLoading?: boolean;
  placeholder?: string;
  onTyping?: () => void;
  onStopTyping?: () => void;
  mentionMembers?: MentionMember[];
}

export function MessageInput({
  onSendMessage,
  isLoading = false,
  placeholder = 'Message...',
  onTyping,
  onStopTyping,
  mentionMembers = [],
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const canSend = text.trim().length > 0 && !isLoading && !sending;

  const filteredMentions = mentionQuery !== null
    ? mentionMembers.filter((m) =>
        m.displayName.toLowerCase().startsWith(mentionQuery.toLowerCase())
      )
    : [];

  function handleChangeText(value: string) {
    setText(value);

    // Detect @ trigger: find last @ not preceded by a word char
    const match = value.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
    }

    if (value.length > 0) {
      onTyping?.();
    } else {
      onStopTyping?.();
    }
  }

  function insertMention(member: MentionMember) {
    const replaced = text.replace(/@(\w*)$/, `@${member.displayName} `);
    setText(replaced);
    setMentionQuery(null);
    inputRef.current?.focus();
  }

  async function handleSend() {
    if (!canSend) return;
    const message = text.trim();
    setText('');
    setMentionQuery(null);
    onStopTyping?.();
    setSending(true);
    try {
      await onSendMessage(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <View>
      {/* @ mention autocomplete dropdown */}
      {filteredMentions.length > 0 && (
        <View style={styles.mentionList}>
          <FlatList
            data={filteredMentions}
            keyExtractor={(m) => m.id}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.mentionItem} onPress={() => insertMention(item)}>
                <Text style={styles.mentionName}>@{item.displayName}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.container}>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={handleChangeText}
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
    </View>
  );
}

const styles = StyleSheet.create({
  mentionList: {
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    maxHeight: 160,
  },
  mentionItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  mentionName: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
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
