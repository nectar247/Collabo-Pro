import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatScreen } from '@/components/chat/ChatScreen';
import { AIChatScreen } from '@/components/chat/AIChatScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useChannels, useCreateChannel } from '@/hooks/useChannels';
import { useUIStore } from '@/store/uiStore';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Channel } from '@/types';

const AI_CHANNEL_ID = '__ai_assistant__';

export default function ChatTab() {
  const { activeWorkspaceId } = useUIStore();
  const { data: channels = [] } = useChannels(activeWorkspaceId);
  const createChannel = useCreateChannel();

  // Active channel — default to first available (usually #general)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [channelPickerVisible, setChannelPickerVisible] = useState(false);
  const [newChannelModalVisible, setNewChannelModalVisible] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  // Auto-select #general (or first channel) when channels load
  useEffect(() => {
    if (channels.length === 0) {
      setActiveChannelId(null);
      return;
    }
    // Keep current selection if it still exists
    if (activeChannelId && channels.some((c) => c.id === activeChannelId)) return;
    const general = channels.find((c) => c.name === 'general') ?? channels[0];
    setActiveChannelId(general.id);
  }, [channels]);

  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null;

  function handleCreateChannel() {
    if (!newChannelName.trim() || !activeWorkspaceId) return;
    createChannel.mutate(
      { workspaceId: activeWorkspaceId, name: newChannelName.trim() },
      {
        onSuccess: (newId) => {
          setNewChannelName('');
          setNewChannelModalVisible(false);
          setActiveChannelId(newId);
        },
        onError: () => Alert.alert('Error', 'Failed to create channel. Try again.'),
      }
    );
  }

  // ── No workspace selected ──────────────────────────────────────────────────
  if (!activeWorkspaceId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>🏢</Text>}
          title="No workspace selected"
          description="Go to the Home tab to create or select a workspace first."
        />
      </SafeAreaView>
    );
  }

  // ── No channels yet ────────────────────────────────────────────────────────
  if (channels.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setNewChannelModalVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>💬</Text>}
          title="No channels yet"
          description="Create a channel to start encrypted conversations with your team."
          action={{ label: 'Create Channel', onPress: () => setNewChannelModalVisible(true) }}
        />
        <NewChannelModal
          visible={newChannelModalVisible}
          name={newChannelName}
          onChangeName={setNewChannelName}
          onSubmit={handleCreateChannel}
          onClose={() => setNewChannelModalVisible(false)}
          loading={createChannel.isPending}
        />
      </SafeAreaView>
    );
  }

  // ── Channel header ─────────────────────────────────────────────────────────
  const isAIChannel = activeChannelId === AI_CHANNEL_ID;
  const channelLabel = isAIChannel
    ? '✨ AI Assistant'
    : activeChannel
    ? activeChannel.type === 'direct' ? activeChannel.name : `# ${activeChannel.name}`
    : '…';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header with channel picker */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.channelPicker}
          onPress={() => setChannelPickerVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.channelPickerLabel} numberOfLines={1}>
            {channelLabel}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setNewChannelModalVisible(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Inline chat */}
      {isAIChannel ? (
        <AIChatScreen workspaceId={activeWorkspaceId ?? undefined} />
      ) : activeChannelId ? (
        <ChatScreen channelId={activeChannelId} />
      ) : (
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>💬</Text>}
          title="Select a channel"
          description="Tap the channel name above to switch channels."
        />
      )}

      {/* Channel picker modal */}
      <Modal
        visible={channelPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChannelPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setChannelPickerVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Channels</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* AI Assistant entry */}
              <TouchableOpacity
                style={[
                  styles.channelRow,
                  activeChannelId === AI_CHANNEL_ID && styles.channelRowActive,
                ]}
                onPress={() => {
                  setActiveChannelId(AI_CHANNEL_ID);
                  setChannelPickerVisible(false);
                }}
              >
                <Text style={[styles.channelRowText, styles.aiChannelText]}>
                  ✨ AI Assistant
                </Text>
                <View style={styles.aiChannelBadge}>
                  <Text style={styles.aiChannelBadgeText}>Claude</Text>
                </View>
                {activeChannelId === AI_CHANNEL_ID && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>

              <View style={styles.pickerDivider} />

              {channels.map((ch: Channel) => (
                <TouchableOpacity
                  key={ch.id}
                  style={[
                    styles.channelRow,
                    ch.id === activeChannelId && styles.channelRowActive,
                  ]}
                  onPress={() => {
                    setActiveChannelId(ch.id);
                    setChannelPickerVisible(false);
                  }}
                >
                  <Text style={styles.channelRowText}>
                    {ch.type === 'direct' ? ch.name : `# ${ch.name}`}
                  </Text>
                  {ch.id === activeChannelId && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.newChannelRow}
              onPress={() => {
                setChannelPickerVisible(false);
                setNewChannelModalVisible(true);
              }}
            >
              <Text style={styles.newChannelText}>+ New Channel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <NewChannelModal
        visible={newChannelModalVisible}
        name={newChannelName}
        onChangeName={setNewChannelName}
        onSubmit={handleCreateChannel}
        onClose={() => setNewChannelModalVisible(false)}
        loading={createChannel.isPending}
      />
    </SafeAreaView>
  );
}

function NewChannelModal({
  visible, name, onChangeName, onSubmit, onClose, loading,
}: {
  visible: boolean;
  name: string;
  onChangeName: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.modalTitle}>New Channel</Text>
          <TextInput
            style={styles.modalInput}
            value={name}
            onChangeText={onChangeName}
            placeholder="channel-name"
            placeholderTextColor={Colors.textDim}
            autoFocus
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />
          <Button
            label="Create Channel"
            onPress={onSubmit}
            loading={loading}
            disabled={!name.trim()}
            fullWidth
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  channelPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  channelPickerLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    flexShrink: 1,
  },
  chevron: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '400',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  channelRowActive: {
    backgroundColor: `${Colors.primary}22`,
  },
  channelRowText: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  checkmark: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  aiChannelText: {
    color: Colors.secondary,
  },
  aiChannelBadge: {
    backgroundColor: `${Colors.secondary}22`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginRight: Spacing.xs,
  },
  aiChannelBadgeText: {
    color: Colors.secondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  pickerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
    marginHorizontal: Spacing.sm,
  },
  newChannelRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  newChannelText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    color: Colors.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
