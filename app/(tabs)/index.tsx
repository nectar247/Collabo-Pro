import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useWorkspaces, useWorkspace } from '@/hooks/useWorkspace';
import { useDocuments } from '@/hooks/useDocuments';
import { useChannels } from '@/hooks/useChannels';
import { useNotifications } from '@/hooks/useNotifications';
import { CreateWorkspaceSheet } from '@/components/workspace/CreateWorkspaceSheet';
import { Avatar } from '@/components/ui/Avatar';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/time';
import type { Document, Channel } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { activeWorkspaceId, setActiveWorkspace } = useUIStore();
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);

  const { data: workspaces = [], isLoading: loadingWorkspaces } = useWorkspaces();
  const { data: activeWorkspace } = useWorkspace(activeWorkspaceId);
  const { data: documents = [], isLoading: loadingDocs } = useDocuments(activeWorkspaceId ?? '');
  const { data: channels = [] } = useChannels(activeWorkspaceId ?? '');
  const { notifications = [], unreadCount } = useNotifications();

  const recentDocs = documents.slice(0, 5);
  const recentChannels = channels.slice(0, 4);
  const pendingApprovals = notifications.filter(
    (n) => !n.read && n.type === 'approval_request'
  ).length;

  const greeting = getGreeting();

  // If workspaces loaded but none exist, show onboarding
  if (!loadingWorkspaces && workspaces.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{user?.displayName ?? 'there'} 👋</Text>
          </View>
          {user && (
            <Avatar
              user={{ displayName: user.displayName, photoURL: user.photoURL }}
              size={40}
            />
          )}
        </View>

        {/* Onboarding card */}
        <View style={styles.onboardingCard}>
          <Text style={styles.onboardingIcon}>🏢</Text>
          <Text style={styles.onboardingTitle}>Create your first workspace</Text>
          <Text style={styles.onboardingDesc}>
            A workspace is a shared space for your team or organisation. Invite members, create channels, and collaborate on documents.
          </Text>
          <TouchableOpacity
            style={styles.onboardingBtn}
            onPress={() => setShowCreateSheet(true)}
          >
            <Text style={styles.onboardingBtnText}>Create Workspace</Text>
          </TouchableOpacity>
        </View>

        <CreateWorkspaceSheet
          visible={showCreateSheet}
          onClose={() => setShowCreateSheet(false)}
          onCreated={(id) => {
            setShowCreateSheet(false);
            setActiveWorkspace(id);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.userName}>{user?.displayName ?? 'there'}</Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.notifBadge}>
            <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
        {user && (
          <Avatar
            user={{ displayName: user.displayName, photoURL: user.photoURL }}
            size={40}
          />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Workspace Selector */}
        <TouchableOpacity
          style={styles.workspaceSelector}
          onPress={() => setShowWorkspacePicker(!showWorkspacePicker)}
          activeOpacity={0.7}
        >
          <View style={styles.workspaceIconContainer}>
            <Text style={styles.workspaceIcon}>🏢</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.workspaceSelectorLabel}>Active Workspace</Text>
            <Text style={styles.workspaceName} numberOfLines={1}>
              {activeWorkspace?.name ?? 'Select a workspace'}
            </Text>
          </View>
          <Text style={styles.chevron}>{showWorkspacePicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {/* Workspace picker dropdown */}
        {showWorkspacePicker && (
          <View style={styles.workspaceDropdown}>
            {workspaces.map((ws) => (
              <TouchableOpacity
                key={ws.id}
                style={[
                  styles.workspaceDropdownItem,
                  ws.id === activeWorkspaceId && styles.workspaceDropdownItemActive,
                ]}
                onPress={() => {
                  setActiveWorkspace(ws.id);
                  setShowWorkspacePicker(false);
                }}
              >
                <Text style={styles.workspaceDropdownName}>{ws.name}</Text>
                {ws.id === activeWorkspaceId && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.workspaceDropdownNew}
              onPress={() => {
                setShowWorkspacePicker(false);
                setShowCreateSheet(true);
              }}
            >
              <Text style={styles.workspaceDropdownNewText}>+ New Workspace</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats row */}
        {pendingApprovals > 0 && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>⏳</Text>
            <Text style={styles.alertText}>
              You have {pendingApprovals} pending approval{pendingApprovals > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickActionCard
            icon="💬"
            label="New Message"
            onPress={() => router.push('/(tabs)/chat')}
          />
          <QuickActionCard
            icon="📄"
            label="New Document"
            onPress={() => router.push('/(tabs)/documents')}
          />
          <QuickActionCard
            icon="👥"
            label="Team"
            onPress={() => router.push('/(tabs)/team')}
          />
        </View>

        {/* Recent documents */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Documents</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/documents')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {loadingDocs ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
        ) : recentDocs.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>No documents yet</Text>
          </View>
        ) : (
          recentDocs.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              onPress={() => router.push(`/document/${doc.id}`)}
            />
          ))
        )}

        {/* Recent channels */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Channels</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/chat')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentChannels.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>No channels yet</Text>
          </View>
        ) : (
          recentChannels.map((channel) => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              onPress={() => router.push(`/channel/${channel.id}`)}
            />
          ))
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      <CreateWorkspaceSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onCreated={(id) => {
          setShowCreateSheet(false);
          setActiveWorkspace(id);
        }}
      />
    </View>
  );
}

// Sub-components

function QuickActionCard({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function DocumentRow({ doc, onPress }: { doc: Document; onPress: () => void }) {
  const typeIcon = doc.type === 'text' ? '📄' : doc.type === 'spreadsheet' ? '⊞' : '▷';
  const statusColor =
    doc.status === 'approved'
      ? Colors.accent
      : doc.status === 'review'
      ? Colors.warning
      : doc.status === 'archived'
      ? Colors.danger
      : Colors.textDim;

  return (
    <TouchableOpacity style={styles.docRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.docIcon}>{typeIcon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
        {doc.updatedAt && (
          <Text style={styles.docMeta}>{formatRelativeTime(doc.updatedAt)}</Text>
        )}
      </View>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
    </TouchableOpacity>
  );
}

function ChannelRow({ channel, onPress }: { channel: Channel; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.channelRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.channelIcon}>
        <Text style={styles.channelIconText}>{channel.type === 'direct' ? '👤' : '#'}</Text>
      </View>
      <Text style={styles.channelName} numberOfLines={1}>{channel.name}</Text>
    </TouchableOpacity>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  greeting: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  userName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  notifBadge: {
    backgroundColor: Colors.danger,
    borderRadius: Radius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  notifBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  // Workspace selector
  workspaceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workspaceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: `${Colors.primary}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspaceIcon: { fontSize: 18 },
  workspaceSelectorLabel: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workspaceName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  chevron: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  workspaceDropdown: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  workspaceDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  workspaceDropdownItemActive: {
    backgroundColor: `${Colors.primary}22`,
  },
  workspaceDropdownName: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
  },
  checkmark: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  workspaceDropdownNew: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  workspaceDropdownNewText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  // Alert
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.warning}22`,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: `${Colors.warning}55`,
    gap: Spacing.sm,
  },
  alertIcon: { fontSize: 16 },
  alertText: {
    color: Colors.warning,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  seeAll: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionIcon: { fontSize: 22 },
  quickActionLabel: {
    color: Colors.text,
    fontSize: FontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Documents
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  docIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  docName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  docMeta: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Channels
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  channelIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelIconText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  channelName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  // Empty
  emptySection: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptySectionText: {
    color: Colors.textDim,
    fontSize: FontSize.sm,
  },
  // Onboarding
  onboardingCard: {
    margin: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  onboardingIcon: { fontSize: 48 },
  onboardingTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  onboardingDesc: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  onboardingBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  onboardingBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
