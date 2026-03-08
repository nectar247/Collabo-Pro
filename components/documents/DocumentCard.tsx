import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { formatRelativeTime } from '@/utils/time';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Document } from '@/types';

interface DocumentCardProps {
  document: Document;
  onPress: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
  onMoveToFolder?: () => void;
}

const TYPE_ICONS: Record<Document['type'], { symbol: string; color: string }> = {
  text: { symbol: 'T', color: '#2563EB' },
  spreadsheet: { symbol: '⊞', color: '#10B981' },
  presentation: { symbol: '▷', color: '#7C3AED' },
};

const STATUS_COLORS: Record<Document['status'], string> = {
  draft: Colors.textDim,
  review: Colors.warning,
  approved: Colors.accent,
  archived: Colors.border,
};

export function DocumentCard({ document, onPress, onLongPress, onDelete, onMoveToFolder }: DocumentCardProps) {
  const typeInfo = TYPE_ICONS[document.type];

  function renderRightActions() {
    return (
      <View style={styles.rightActions}>
        {onMoveToFolder && (
          <TouchableOpacity style={styles.moveAction} onPress={onMoveToFolder}>
            <Text style={styles.moveActionIcon}>📁</Text>
            <Text style={styles.moveActionText}>Move</Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity style={styles.deleteAction} onPress={onDelete}>
            <Text style={styles.deleteActionIcon}>🗑</Text>
            <Text style={styles.deleteActionText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <Swipeable renderRightActions={renderRightActions} friction={2} overshootRight={false}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.container}
        activeOpacity={0.75}
      >
        {/* Type icon */}
        <View style={[styles.typeIcon, { backgroundColor: `${typeInfo.color}22` }]}>
          <Text style={[styles.typeSymbol, { color: typeInfo.color }]}>
            {typeInfo.symbol}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>
            {document.name}
          </Text>
          <Text style={styles.meta}>
            {document.type} · {formatRelativeTime(document.updatedAt)}
          </Text>
        </View>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[document.status]}33` }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[document.status] }]}>
            {document.status}
          </Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  typeSymbol: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  name: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  meta: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginLeft: Spacing.sm,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  rightActions: {
    flexDirection: 'row',
  },
  moveAction: {
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    gap: 2,
  },
  moveActionIcon: { fontSize: 18 },
  moveActionText: { color: '#FFFFFF', fontSize: FontSize.xs, fontWeight: '700' },
  deleteAction: {
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    gap: 2,
  },
  deleteActionIcon: { fontSize: 18 },
  deleteActionText: { color: '#FFFFFF', fontSize: FontSize.xs, fontWeight: '700' },
});
