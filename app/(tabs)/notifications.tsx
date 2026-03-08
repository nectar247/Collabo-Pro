import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useNotifications } from '@/hooks/useNotifications';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { formatTime } from '@/utils/time';
import type { Notification } from '@/types';

const TYPE_ICONS: Record<string, string> = {
  message: '💬',
  mention: '@',
  approval_request: '✅',
  approval_response: '📋',
  document_shared: '📄',
  document_edited: '✏️',
  comment_added: '💭',
};

function NotificationItem({ item, onPress }: { item: Notification; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.itemUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{TYPE_ICONS[item.type] ?? '🔔'}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.time}>{item.createdAt ? formatTime(item.createdAt) : ''}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  function handlePress(n: Notification) {
    markAsRead(n.id).catch(() => {});
    // Navigate based on data
    if (n.data?.documentId) {
      router.push(`/document/${n.data.documentId}` as never);
    } else if (n.data?.channelId) {
      router.push(`/channel/${n.data.channelId}` as never);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => markAllAsRead().catch(() => {})} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={() => handlePress(item)} />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  markAllBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  markAllText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  list: { paddingVertical: Spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  itemUnread: {
    backgroundColor: Colors.primary + '10',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  icon: { fontSize: 18 },
  content: { flex: 1, marginRight: Spacing.sm },
  title: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  body: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginBottom: 4,
  },
  time: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.md },
});
