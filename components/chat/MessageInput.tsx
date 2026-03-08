import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { uploadFileUri, mimeToExt } from '@/lib/firebase/storage';

interface MentionMember {
  id: string;
  displayName: string;
}

interface PendingAttachment {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  isImage: boolean;
}

interface MessageInputProps {
  onSendMessage: (
    content: string,
    replyMeta?: undefined,
    attachments?: { url: string; name: string; size: number; type: 'image' | 'file' | 'document' }[]
  ) => Promise<void> | void;
  isLoading?: boolean;
  placeholder?: string;
  onTyping?: () => void;
  onStopTyping?: () => void;
  mentionMembers?: MentionMember[];
  editingDefaultValue?: string;
  channelId?: string;
}

export function MessageInput({
  onSendMessage,
  isLoading = false,
  placeholder = 'Message...',
  onTyping,
  onStopTyping,
  mentionMembers = [],
  editingDefaultValue,
  channelId,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const inputRef = useRef<TextInput>(null);

  const canSend = (text.trim().length > 0 || pendingAttachments.length > 0) && !isLoading && !sending;

  useEffect(() => {
    if (editingDefaultValue !== undefined && editingDefaultValue !== null) {
      setText(editingDefaultValue);
      inputRef.current?.focus();
    }
  }, [editingDefaultValue]);

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

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library to send images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      const picked: PendingAttachment[] = result.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName ?? `image_${Date.now()}.${mimeToExt(a.mimeType ?? 'image/jpeg')}`,
        size: a.fileSize ?? 0,
        mimeType: a.mimeType ?? 'image/jpeg',
        isImage: true,
      }));
      setPendingAttachments((prev) => [...prev, ...picked]);
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true });
    if (!result.canceled) {
      const picked: PendingAttachment[] = result.assets.map((a) => ({
        uri: a.uri,
        name: a.name,
        size: a.size ?? 0,
        mimeType: a.mimeType ?? 'application/octet-stream',
        isImage: false,
      }));
      setPendingAttachments((prev) => [...prev, ...picked]);
    }
  }

  function showAttachmentPicker() {
    Alert.alert('Add Attachment', undefined, [
      { text: '📷 Photo / Image', onPress: pickImage },
      { text: '📎 File / Document', onPress: pickDocument },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleSend() {
    if (!canSend) return;
    const message = text.trim();
    const toUpload = [...pendingAttachments];
    setText('');
    setMentionQuery(null);
    setPendingAttachments([]);
    onStopTyping?.();
    setSending(true);
    try {
      const uploaded = await Promise.all(
        toUpload.map(async (a) => {
          const path = `chats/${channelId ?? 'unknown'}/attachments/${Date.now()}_${a.name}`;
          const url = await uploadFileUri(a.uri, path);
          return { url, name: a.name, size: a.size, type: (a.isImage ? 'image' : 'file') as 'image' | 'file' };
        })
      );
      await onSendMessage(message, undefined, uploaded.length ? uploaded : undefined);
    } catch {
      Alert.alert('Send Failed', 'Could not send message. Please try again.');
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

      {/* Pending attachment previews */}
      {pendingAttachments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.attachPreviewBar}
          contentContainerStyle={styles.attachPreviewContent}
          keyboardShouldPersistTaps="always"
        >
          {pendingAttachments.map((a, i) => (
            <View key={i} style={styles.attachThumb}>
              {a.isImage ? (
                <Image source={{ uri: a.uri }} style={styles.attachThumbImage} />
              ) : (
                <View style={styles.attachThumbFile}>
                  <Text style={styles.attachThumbFileIcon}>📎</Text>
                  <Text style={styles.attachThumbFileName} numberOfLines={2}>{a.name}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.attachThumbRemove}
                onPress={() => setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Text style={styles.attachThumbRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.container}>
        <TouchableOpacity onPress={showAttachmentPicker} style={styles.attachBtn} activeOpacity={0.7}>
          <Text style={styles.attachBtnText}>＋</Text>
        </TouchableOpacity>
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
  attachPreviewBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    maxHeight: 100,
  },
  attachPreviewContent: {
    padding: Spacing.sm,
    gap: 8,
    flexDirection: 'row',
  },
  attachThumb: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceHigh,
  },
  attachThumbImage: { width: 80, height: 80 },
  attachThumbFile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  attachThumbFileIcon: { fontSize: 22 },
  attachThumbFileName: {
    color: Colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },
  attachThumbRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachThumbRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  attachBtnText: {
    color: Colors.textMuted,
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 24,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.sm,
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
