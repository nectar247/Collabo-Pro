import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useUIStore } from '@/store/uiStore';
import { useWorkspace } from '@/hooks/useWorkspace';
import { formatRelativeTime, formatDate } from '@/utils/time';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { ActivityAction, ActivityLogEntry } from '@/types';
import { Timestamp } from 'firebase/firestore';

// ─── Action display config ────────────────────────────────────────────────────

const ACTION_CONFIG: Record<ActivityAction, { icon: string; color: string; verb: string }> = {
  document_created: { icon: '✦', color: Colors.accent,    verb: 'created'  },
  document_renamed: { icon: '✎', color: '#2563EB',        verb: 'renamed'  },
  document_deleted: { icon: '✕', color: '#EF4444',        verb: 'deleted'  },
  document_shared:  { icon: '↗', color: '#7C3AED',        verb: 'shared'   },
  channel_created:  { icon: '#', color: '#F59E0B',        verb: 'created'  },
};

// ─── Date grouping helpers ────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function getDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────

type ListItem =
  | { kind: 'header'; label: string; key: string }
  | { kind: 'entry'; entry: ActivityLogEntry; key: string };

export default function WorkspaceLogScreen() {
  const { activeWorkspaceId } = useUIStore();
  const { data: workspace } = useWorkspace(activeWorkspaceId);
  const { entries, isLoading } = useActivityLog(activeWorkspaceId);

  // Build grouped list items
  const listItems: ListItem[] = [];
  let lastDateLabel = '';
  for (const entry of entries) {
    const ts = entry.timestamp as Timestamp | null;
    const date = ts ? ts.toDate() : new Date();
    const dateLabel = getDateLabel(date);
    if (dateLabel !== lastDateLabel) {
      listItems.push({ kind: 'header', label: dateLabel, key: `header-${dateLabel}` });
      lastDateLabel = dateLabel;
    }
    listItems.push({ kind: 'entry', entry, key: entry.id });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Activity Log</Text>
          {workspace && (
            <Text style={styles.subtitle} numberOfLines={1}>{workspace.name}</Text>
          )}
        </View>
        {/* Spacer to keep title centered */}
        <View style={styles.backBtn} />
      </View>

      {/* Read-only badge */}
      <View style={styles.readOnlyBanner}>
        <Text style={styles.readOnlyText}>Read-only · All times are server-recorded</Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptyDesc}>
            Actions like creating documents, renaming, sharing, and adding channels will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return (
                <View style={styles.dateHeaderRow}>
                  <View style={styles.dateHeaderLine} />
                  <Text style={styles.dateHeaderText}>{item.label}</Text>
                  <View style={styles.dateHeaderLine} />
                </View>
              );
            }
            return <LogEntryRow entry={item.entry} />;
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Entry row ────────────────────────────────────────────────────────────────

function LogEntryRow({ entry }: { entry: ActivityLogEntry }) {
  const config = ACTION_CONFIG[entry.action] ?? { icon: '•', color: Colors.textMuted, verb: entry.action };
  const ts = entry.timestamp as Timestamp | null;
  const timeStr = ts ? formatRelativeTime(ts) : '';

  const resourceLabel = entry.resourceType === 'channel' ? `#${entry.resourceName}` : `"${entry.resourceName}"`;

  return (
    <View style={styles.entryRow}>
      {/* Action icon */}
      <View style={[styles.iconBadge, { backgroundColor: `${config.color}22` }]}>
        <Text style={[styles.iconBadgeText, { color: config.color }]}>{config.icon}</Text>
      </View>

      {/* Content */}
      <View style={styles.entryContent}>
        <Text style={styles.entryText} numberOfLines={2}>
          <Text style={styles.entryUser}>{entry.userDisplayName} </Text>
          <Text style={styles.entryVerb}>{config.verb} </Text>
          <Text style={styles.entryResource}>{resourceLabel}</Text>
        </Text>
        <Text style={styles.entryTime}>{timeStr}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    minHeight: 52,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  backText: { color: Colors.primary, fontSize: FontSize.xl },
  titleBlock: { flex: 1, alignItems: 'center' },
  title: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 1 },
  readOnlyBanner: {
    backgroundColor: `${Colors.accent}12`,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${Colors.accent}30`,
    alignItems: 'center',
  },
  readOnlyText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  emptyDesc: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.md },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  dateHeaderLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  dateHeaderText: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  iconBadgeText: { fontSize: 14, fontWeight: '700' },
  entryContent: { flex: 1 },
  entryText: { fontSize: FontSize.sm, lineHeight: 20 },
  entryUser: { color: Colors.text, fontWeight: '700' },
  entryVerb: { color: Colors.textMuted },
  entryResource: { color: Colors.text },
  entryTime: { color: Colors.textDim, fontSize: FontSize.xs, marginTop: 2 },
});
