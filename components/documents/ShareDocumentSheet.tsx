import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useUpdateDocumentCollaborators } from '@/hooks/useDocuments';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUserProfiles } from '@/hooks/useUserProfiles';
import { useAuthStore } from '@/store/authStore';
import type { DocumentCollaborator } from '@/types';

type Permission = 'view' | 'comment' | 'edit';

const PERMISSION_LABELS: Record<Permission, string> = {
  view: '👁 View',
  comment: '💬 Comment',
  edit: '✏️ Edit',
};
const PERMISSIONS: Permission[] = ['view', 'comment', 'edit'];

interface MemberProfile {
  userId: string;
  displayName: string;
  role: string;
}

interface ShareDocumentSheetProps {
  visible: boolean;
  onClose: () => void;
  docId: string;
  workspaceId: string;
  ownerId: string;
  collaborators: DocumentCollaborator[];
  /** Called with the full updated collaborators list so the parent can optimistically update */
  onCollaboratorsChange?: (next: DocumentCollaborator[]) => void;
}

export function ShareDocumentSheet({
  visible,
  onClose,
  docId,
  workspaceId,
  ownerId,
  collaborators,
  onCollaboratorsChange,
}: ShareDocumentSheetProps) {
  const { data: workspace, isLoading } = useWorkspace(workspaceId);
  const updateCollaborators = useUpdateDocumentCollaborators();
  const currentUser = useAuthStore((s) => s.user);

  const [local, setLocal] = useState<DocumentCollaborator[]>(collaborators);
  const [saving, setSaving] = useState(false);
  const [permPickerId, setPermPickerId] = useState<string | null>(null);

  // Fetch real display names for all non-owner members
  const memberIds = (workspace?.members ?? [])
    .filter((m) => m.userId !== ownerId)
    .map((m) => m.userId);
  const profileMap = useUserProfiles(memberIds);

  // Build a profile list from workspace members, excluding the owner
  const memberProfiles: MemberProfile[] = (workspace?.members ?? [])
    .filter((m) => m.userId !== ownerId)
    .map((m) => ({
      userId: m.userId,
      displayName: profileMap.get(m.userId) ?? `User ${m.userId.slice(0, 6)}`,
      role: m.role,
    }));

  function getCollab(userId: string): DocumentCollaborator | undefined {
    return local.find((c) => c.userId === userId);
  }

  function setPermission(userId: string, permission: Permission) {
    const exists = local.find((c) => c.userId === userId);
    const next = exists
      ? local.map((c) => (c.userId === userId ? { ...c, permission } : c))
      : [...local, { userId, permission }];
    setLocal(next);
    setPermPickerId(null);
  }

  function removeAccess(userId: string) {
    setLocal(local.filter((c) => c.userId !== userId));
    setPermPickerId(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateCollaborators.mutateAsync({ docId, collaborators: local });
      onCollaboratorsChange?.(local);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Share & Permissions</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Owner row */}
          <View style={styles.ownerRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>★</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>Owner</Text>
              <Text style={styles.memberSub}>Full access — cannot be changed</Text>
            </View>
            <View style={styles.permBadge}>
              <Text style={styles.permBadgeText}>✏️ Edit</Text>
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>WORKSPACE MEMBERS</Text>

          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
          ) : (
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {memberProfiles.length === 0 && (
                <Text style={styles.emptyText}>No other workspace members.</Text>
              )}
              {memberProfiles.map((member) => {
                const collab = getCollab(member.userId);
                const hasAccess = !!collab;
                const perm: Permission = collab?.permission ?? 'view';
                const isPickerOpen = permPickerId === member.userId;

                return (
                  <View key={member.userId}>
                    <View style={styles.memberRow}>
                      <View style={[styles.memberAvatar, { backgroundColor: Colors.surfaceHigh }]}>
                        <Text style={styles.memberAvatarText}>
                          {member.displayName[0]?.toUpperCase() ?? '?'}
                        </Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.displayName}</Text>
                        <Text style={styles.memberSub}>{member.role}</Text>
                      </View>

                      {hasAccess ? (
                        <TouchableOpacity
                          onPress={() => setPermPickerId(isPickerOpen ? null : member.userId)}
                          style={styles.permBtn}
                        >
                          <Text style={styles.permBtnText}>{PERMISSION_LABELS[perm]} ▾</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => setPermission(member.userId, 'view')}
                          style={styles.addAccessBtn}
                        >
                          <Text style={styles.addAccessBtnText}>+ Add</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Inline permission picker */}
                    {isPickerOpen && (
                      <View style={styles.permPicker}>
                        {PERMISSIONS.map((p) => (
                          <TouchableOpacity
                            key={p}
                            onPress={() => setPermission(member.userId, p)}
                            style={[styles.permPickerRow, perm === p && styles.permPickerRowActive]}
                          >
                            <Text style={[styles.permPickerLabel, perm === p && styles.permPickerLabelActive]}>
                              {PERMISSION_LABELS[p]}
                            </Text>
                            {perm === p && <Text style={styles.permPickerCheck}>✓</Text>}
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          onPress={() => removeAccess(member.userId)}
                          style={styles.permPickerRow}
                        >
                          <Text style={[styles.permPickerLabel, { color: Colors.danger }]}>
                            ✕ Remove access
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Permissions</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Spacing.xxl ?? 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  closeBtn: { color: Colors.textMuted, fontSize: FontSize.lg },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  sectionLabel: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: 4,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  memberInfo: { flex: 1 },
  memberName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  memberSub: { color: Colors.textDim, fontSize: FontSize.xs },
  permBadge: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  permBadgeText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  permBtn: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  permBtnText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: '600' },
  addAccessBtn: {
    backgroundColor: `${Colors.primary}22`,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  addAccessBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700' },
  permPicker: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  permPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  permPickerRowActive: { backgroundColor: `${Colors.primary}18` },
  permPickerLabel: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  permPickerLabelActive: { color: Colors.primary, fontWeight: '700' },
  permPickerCheck: { color: Colors.primary, fontWeight: '700' },
  list: { flex: 1 },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  saveBtn: {
    margin: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
});
