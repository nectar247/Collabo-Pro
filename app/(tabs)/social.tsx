import { useState } from 'react';
import {
  ActivityIndicator,
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
import { useUIStore } from '@/store/uiStore';
import { useWorkspace, useWorkspaceMembers, useAddWorkspaceMember } from '@/hooks/useWorkspace';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { WorkspaceMember } from '@/types';

export default function SocialScreen() {
  const { activeWorkspaceId } = useUIStore();
  const currentUser = useAuthStore((s) => s.user);
  const { data: workspace, isLoading: loadingWorkspace } = useWorkspace(activeWorkspaceId);
  const { data: members = [], isLoading: loadingMembers } = useWorkspaceMembers(activeWorkspaceId);
  const addMember = useAddWorkspaceMember();

  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const isLoading = loadingWorkspace || loadingMembers;

  function handleInvite() {
    if (!inviteEmail.trim() || !activeWorkspaceId) return;
    addMember.mutate(
      { workspaceId: activeWorkspaceId, email: inviteEmail.trim() },
      {
        onSuccess: (user) => {
          setInviteEmail('');
          setInviteVisible(false);
          Alert.alert('Done', `${user.displayName} has been added to the workspace.`);
        },
        onError: (err) => {
          Alert.alert('Error', err instanceof Error ? err.message : 'Could not add member.');
        },
      }
    );
  }

  if (!activeWorkspaceId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Team</Text>
        </View>
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>👥</Text>}
          title="No workspace selected"
          description="Go to the Home tab to create or select a workspace first."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Team</Text>
          {workspace && (
            <Text style={styles.subtitle}>{workspace.name}</Text>
          )}
        </View>
        <View style={styles.memberCountBadge}>
          <Text style={styles.memberCountText}>{members.length}</Text>
        </View>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => setInviteVisible(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.inviteButtonText}>+ Invite</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={{ marginTop: Spacing.xxl }}
        />
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>👤</Text>}
          title="No members yet"
          description="Invite colleagues to collaborate in this workspace."
          action={{ label: 'Invite Member', onPress: () => setInviteVisible(true) }}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          <Text style={styles.sectionLabel}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </Text>

          {members.map((member) => (
            <MemberCard
              key={member.userId}
              member={member}
              isCurrentUser={member.userId === currentUser?.id}
            />
          ))}

          {workspace && (
            <View style={styles.workspaceInfo}>
              <Text style={styles.workspaceInfoLabel}>Workspace</Text>
              <Text style={styles.workspaceInfoName}>{workspace.name}</Text>
              {workspace.description ? (
                <Text style={styles.workspaceInfoDesc}>{workspace.description}</Text>
              ) : null}
            </View>
          )}
        </ScrollView>
      )}

      {/* Invite Member Modal */}
      <Modal
        visible={inviteVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setInviteVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Invite Member</Text>
            <Text style={styles.modalSubtitle}>
              Enter the email address of the person you'd like to add. They must already have an account.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="colleague@example.com"
              placeholderTextColor={Colors.textDim}
              autoFocus
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handleInvite}
            />
            <Button
              label="Add to Workspace"
              onPress={handleInvite}
              loading={addMember.isPending}
              disabled={!inviteEmail.trim()}
              fullWidth
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function MemberCard({
  member,
  isCurrentUser,
}: {
  member: WorkspaceMember;
  isCurrentUser: boolean;
}) {
  const roleColor =
    member.role === 'owner'
      ? Colors.secondary
      : member.role === 'admin'
      ? Colors.primary
      : Colors.textDim;

  return (
    <View style={styles.memberCard}>
      <Avatar
        user={{
          displayName: isCurrentUser ? 'You' : member.userId.slice(0, 8),
          photoURL: undefined,
        }}
        size={44}
      />
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>
            {isCurrentUser ? 'You' : `${member.userId.slice(0, 14)}…`}
          </Text>
          {isCurrentUser && (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>You</Text>
            </View>
          )}
        </View>
        <View style={styles.roleRow}>
          <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
          <Text style={[styles.roleText, { color: roleColor }]}>
            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
          </Text>
        </View>
      </View>
    </View>
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
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 1,
  },
  memberCountBadge: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.full,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    marginRight: Spacing.sm,
  },
  memberCountText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  inviteButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  inviteButtonText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
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
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
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
  list: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberInfo: { flex: 1 },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  youBadge: {
    backgroundColor: `${Colors.primary}33`,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  youBadgeText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  workspaceInfo: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  workspaceInfoLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  workspaceInfoName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  workspaceInfoDesc: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
  },
});
