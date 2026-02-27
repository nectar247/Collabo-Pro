import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatScreen } from '@/components/chat/ChatScreen';
import { useChannel } from '@/hooks/useChannels';
import { Colors, FontSize, Spacing } from '@/constants/theme';

export default function ChannelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: channel, isLoading } = useChannel(id ?? null);

  const displayName = channel?.type === 'direct'
    ? channel.name
    : `# ${channel?.name ?? ''}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.channelName} numberOfLines={1}>
            {isLoading ? '...' : displayName}
          </Text>
          {channel && (
            <Text style={styles.memberCount}>
              {channel.members.length} member{channel.members.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <View style={{ width: 40 }} />
      </View>

      {id ? (
        <ChatScreen channelId={id} />
      ) : (
        <View style={styles.error}>
          <Text style={styles.errorText}>Channel not found</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  backText: {
    color: Colors.primary,
    fontSize: FontSize.xl,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  channelName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  memberCount: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.textMuted,
  },
});
