import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatRelativeTime } from '@/utils/time';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Channel } from '@/types';

interface ChannelListItemProps {
  channel: Channel;
  onPress: () => void;
  currentUserId: string;
  unreadCount?: number;
}

export function ChannelListItem({
  channel,
  onPress,
  currentUserId,
  unreadCount = 0,
}: ChannelListItemProps) {
  const isDirectMessage = channel.type === 'direct';
  const prefix = isDirectMessage ? '' : '# ';
  const displayName = `${prefix}${channel.name}`;
  const timeLabel = channel.lastMessageAt
    ? formatRelativeTime(channel.lastMessageAt)
    : '';

  return (
    <TouchableOpacity onPress={onPress} style={styles.container} activeOpacity={0.7}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>
          {isDirectMessage ? channel.name.slice(0, 2).toUpperCase() : '#'}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text
            style={[styles.name, unreadCount > 0 && styles.nameBold]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {timeLabel ? (
            <Text style={styles.time}>{timeLabel}</Text>
          ) : null}
        </View>

        {channel.lastMessage ? (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {channel.lastMessage.slice(0, 50)}
          </Text>
        ) : null}
      </View>

      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '500',
    flex: 1,
  },
  nameBold: {
    fontWeight: '700',
  },
  time: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
    marginLeft: Spacing.sm,
  },
  lastMessage: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: Spacing.sm,
  },
  badgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
