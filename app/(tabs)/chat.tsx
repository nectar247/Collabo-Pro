import { useState } from 'react';
import {
  Alert,
  Modal,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChannelListItem } from '@/components/chat/ChannelListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useChannels, useDirectMessages, useCreateChannel } from '@/hooks/useChannels';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Channel } from '@/types';

export default function ChatTab() {
  const { activeWorkspaceId } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const { data: channels = [] } = useChannels(activeWorkspaceId);
  const { data: dms = [] } = useDirectMessages();
  const createChannel = useCreateChannel();

  const [newChannelModalVisible, setNewChannelModalVisible] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  const publicChannels = channels.filter((c) => c.type !== 'direct');

  const sections = [
    { title: 'Channels', data: publicChannels },
    { title: 'Direct Messages', data: dms },
  ].filter((s) => s.data.length > 0);

  function handleCreateChannel() {
    if (!newChannelName.trim() || !activeWorkspaceId) return;
    createChannel.mutate(
      { workspaceId: activeWorkspaceId, name: newChannelName.trim() },
      {
        onSuccess: () => {
          setNewChannelName('');
          setNewChannelModalVisible(false);
        },
        onError: () => Alert.alert('Error', 'Failed to create channel. Try again.'),
      }
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          onPress={() => setNewChannelModalVisible(true)}
          style={styles.addButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {sections.length === 0 ? (
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>💬</Text>}
          title="No channels yet"
          description="Create a channel to start encrypted conversations with your team."
          action={
            activeWorkspaceId
              ? { label: 'Create Channel', onPress: () => setNewChannelModalVisible(true) }
              : undefined
          }
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: Channel }) => (
            <ChannelListItem
              channel={item}
              onPress={() => router.push(`/channel/${item.id}` as never)}
              currentUserId={user?.id ?? ''}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* New Channel Modal */}
      <Modal
        visible={newChannelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNewChannelModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNewChannelModalVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>New Channel</Text>
            <TextInput
              style={styles.modalInput}
              value={newChannelName}
              onChangeText={setNewChannelName}
              placeholder="channel-name"
              placeholderTextColor={Colors.textDim}
              autoFocus
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleCreateChannel}
            />
            <Button
              label="Create Channel"
              onPress={handleCreateChannel}
              loading={createChannel.isPending}
              fullWidth
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
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
  sectionHeader: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sectionTitle: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
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
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
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
