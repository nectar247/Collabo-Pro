import { useRef, useState, useMemo } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import {
  useComments,
  useAddComment,
  useAddReply,
  useResolveComment,
  useDeleteComment,
} from '@/hooks/useComments';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUserProfiles } from '@/hooks/useUserProfiles';
import { useAuthStore } from '@/store/authStore';
import type { Comment } from '@/types';

interface CommentsPanelProps {
  visible: boolean;
  onClose: () => void;
  documentId: string;
  workspaceId: string;
  docOwnerId: string;
  docName: string;
  canComment?: boolean;
  pendingAnchor?: { blockId: string; text: string; anchorStart?: number; anchorEnd?: number } | null;
}

function relativeTime(ts: any): string {
  if (!ts) return '';
  const ms = ts.toMillis?.() ?? (typeof ts === 'number' ? ts : 0);
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

function CommentItem({
  comment,
  currentUserId,
  onResolve,
  onDelete,
  addReply,
}: {
  comment: Comment;
  currentUserId: string;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  addReply: (id: string, text: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  function submitReply() {
    if (!replyText.trim()) return;
    addReply(comment.id, replyText.trim());
    setReplyText('');
    setReplyOpen(false);
  }

  return (
    <View style={[styles.commentCard, comment.resolved && styles.commentCardResolved]}>
      {/* Header */}
      <View style={styles.commentHeader}>
        <Avatar name={comment.userDisplayName} size={28} />
        <View style={styles.commentMeta}>
          <Text style={styles.commentAuthor}>{comment.userDisplayName}</Text>
          <Text style={styles.commentTime}>{relativeTime(comment.createdAt)}</Text>
        </View>
        {comment.resolved && (
          <View style={styles.resolvedBadge}>
            <Text style={styles.resolvedBadgeText}>✓ Resolved</Text>
          </View>
        )}
      </View>

      {/* Anchor quote */}
      {comment.anchorText && (
        <View style={styles.commentAnchor}>
          <Text style={styles.commentAnchorText} numberOfLines={2}>"{comment.anchorText}"</Text>
        </View>
      )}

      {/* Body */}
      <Text style={[styles.commentText, comment.resolved && styles.commentTextResolved]}>
        {comment.text}
      </Text>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <View key={reply.id} style={styles.replyRow}>
              <Avatar name={reply.userDisplayName} size={20} />
              <View style={styles.replyContent}>
                <Text style={styles.replyAuthor}>{reply.userDisplayName}</Text>
                <Text style={styles.replyText}>{reply.text}</Text>
              </View>
              <Text style={styles.replyTime}>{relativeTime(reply.createdAt)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Reply input */}
      {replyOpen && (
        <View style={styles.replyInputRow}>
          <TextInput
            style={styles.replyInput}
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Write a reply…"
            placeholderTextColor={Colors.textDim}
            autoFocus
            onSubmitEditing={submitReply}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={submitReply} style={styles.sendBtn} disabled={!replyText.trim()}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      <View style={styles.commentActions}>
        <TouchableOpacity
          onPress={() => setReplyOpen((v) => !v)}
          style={styles.actionChip}
        >
          <Text style={styles.actionChipText}>↩ Reply</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onResolve(comment.id, !comment.resolved)}
          style={[styles.actionChip, comment.resolved && styles.actionChipActive]}
        >
          <Text style={[styles.actionChipText, comment.resolved && styles.actionChipTextActive]}>
            {comment.resolved ? '↩ Reopen' : '✓ Resolve'}
          </Text>
        </TouchableOpacity>

        {comment.userId === currentUserId && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Delete comment?', 'This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(comment.id) },
              ])
            }
            style={styles.actionChip}
          >
            <Text style={[styles.actionChipText, { color: Colors.danger }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function CommentsPanel({
  visible,
  onClose,
  documentId,
  workspaceId,
  docOwnerId,
  docName,
  canComment = true,
  pendingAnchor,
}: CommentsPanelProps) {
  const { comments, isLoading } = useComments(visible ? documentId : null);
  const { data: workspace } = useWorkspace(workspaceId);
  const addComment = useAddComment();
  const addReply = useAddReply();
  const resolveComment = useResolveComment();
  const deleteComment = useDeleteComment();
  const user = useAuthStore((s) => s.user);

  const [newText, setNewText] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  // ── @mention state ──────────────────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Fetch real display names for workspace members
  const memberIds = useMemo(
    () => (workspace?.members ?? []).filter((m) => m.userId !== user?.id).map((m) => m.userId),
    [workspace?.members, user?.id]
  );
  const profileMap = useUserProfiles(memberIds);

  // Build a list of { userId, displayName } for workspace members (excluding self)
  const mentionCandidates = (workspace?.members ?? [])
    .filter((m) => m.userId !== user?.id)
    .map((m) => ({
      userId: m.userId,
      displayName: profileMap.get(m.userId) ?? `User ${m.userId.slice(0, 6)}`,
    }));

  const filteredMentions =
    mentionQuery !== null
      ? mentionCandidates.filter((m) =>
          m.displayName.toLowerCase().includes(mentionQuery.toLowerCase())
        )
      : [];

  function handleTextChange(text: string) {
    setNewText(text);
    // Detect trailing `@word` — show suggestions
    const match = text.match(/@(\w*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function insertMention(displayName: string) {
    // Replace trailing @partial with @DisplayName
    const replaced = newText.replace(/@\w*$/, `@${displayName} `);
    setNewText(replaced);
    setMentionQuery(null);
    inputRef.current?.focus();
  }

  // Extract mentioned userId list from the final text
  function extractMentionedIds(text: string): string[] {
    const ids: string[] = [];
    for (const m of mentionCandidates) {
      if (text.includes(`@${m.displayName}`)) ids.push(m.userId);
    }
    return ids;
  }

  const open = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);
  const displayed = showResolved ? comments : open;
  const unresolvedCount = open.length;

  async function handleSend() {
    if (!newText.trim()) return;
    const mentionedUserIds = extractMentionedIds(newText.trim());
    await addComment({
      documentId,
      workspaceId,
      text: newText.trim(),
      docOwnerId,
      docName,
      mentionedUserIds,
      anchorBlockId: pendingAnchor?.blockId,
      anchorText: pendingAnchor?.text,
      anchorStart: pendingAnchor?.anchorStart,
      anchorEnd: pendingAnchor?.anchorEnd,
    });
    setNewText('');
    setMentionQuery(null);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheet}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Comments</Text>
              {unresolvedCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unresolvedCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowResolved((v) => !v)} style={styles.filterBtn}>
              <Text style={styles.filterBtnText}>
                {showResolved ? 'Hide resolved' : `+${resolved.length} resolved`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* New comment input — hidden for view-only users */}
          {canComment ? (
            <>
            {/* Anchor pull-quote (when opened from a text selection) */}
            {pendingAnchor && (
              <View style={styles.anchorQuote}>
                <Text style={styles.anchorQuoteLabel}>Commenting on:</Text>
                <Text style={styles.anchorQuoteText} numberOfLines={2}>"{pendingAnchor.text}"</Text>
              </View>
            )}

            {/* @mention suggestions */}
            {filteredMentions.length > 0 && (
              <View style={styles.mentionList}>
                {filteredMentions.slice(0, 5).map((m) => (
                  <TouchableOpacity
                    key={m.userId}
                    onPress={() => insertMention(m.displayName)}
                    style={styles.mentionRow}
                  >
                    <View style={styles.mentionAvatar}>
                      <Text style={styles.mentionAvatarText}>{m.displayName[0]?.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.mentionName}>{m.displayName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.inputRow}>
              {user && <Avatar name={user.displayName} size={28} />}
              <TextInput
                ref={inputRef}
                style={styles.commentInput}
                value={newText}
                onChangeText={handleTextChange}
                placeholder="Add a comment… (@ to mention)"
                placeholderTextColor={Colors.textDim}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={handleSend}
                style={[styles.sendBtn, !newText.trim() && { opacity: 0.4 }]}
                disabled={!newText.trim()}
              >
                <Text style={styles.sendBtnText}>Send</Text>
              </TouchableOpacity>
            </View>
            </>
          ) : (
            <View style={styles.viewOnlyBanner}>
              <Text style={styles.viewOnlyText}>👁 View only — you cannot add comments</Text>
            </View>
          )}

          {/* Comments list */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          >
            {isLoading ? (
              <Text style={styles.emptyText}>Loading…</Text>
            ) : displayed.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyText}>No comments yet</Text>
                <Text style={styles.emptySubtext}>Be the first to leave a comment.</Text>
              </View>
            ) : (
              displayed.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.id ?? ''}
                  onResolve={resolveComment}
                  onDelete={deleteComment}
                  addReply={addReply}
                />
              ))
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
    maxHeight: '85%',
    minHeight: 300,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.xs },
  headerTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  filterBtn: { marginRight: Spacing.md },
  filterBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
  closeBtn: { paddingLeft: Spacing.sm },
  closeBtnText: { color: Colors.textMuted, fontSize: FontSize.lg },

  // New comment input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.surfaceHigh,
    color: Colors.text,
    fontSize: FontSize.sm,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sendBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },

  // List
  list: { flex: 1 },
  listContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl ?? 40 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl ?? 40 },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.md, fontWeight: '600' },
  emptySubtext: { color: Colors.textDim, fontSize: FontSize.sm, marginTop: 4 },

  // Comment card
  commentCard: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentCardResolved: { opacity: 0.65 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  commentMeta: { flex: 1 },
  commentAuthor: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  commentTime: { color: Colors.textDim, fontSize: FontSize.xs },
  resolvedBadge: {
    backgroundColor: `${Colors.accent}22`,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  resolvedBadgeText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '700' },
  commentText: { color: Colors.text, fontSize: FontSize.sm, lineHeight: 20 },
  commentTextResolved: { textDecorationLine: 'line-through', color: Colors.textMuted },

  // Replies
  repliesContainer: {
    marginTop: Spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border,
    paddingLeft: Spacing.sm,
    gap: Spacing.xs,
  },
  replyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
  replyContent: { flex: 1 },
  replyAuthor: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
  replyText: { color: Colors.text, fontSize: FontSize.xs, lineHeight: 16 },
  replyTime: { color: Colors.textDim, fontSize: 10 },

  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  replyInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontSize: FontSize.xs,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Action chips
  commentActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    flexWrap: 'wrap',
  },
  actionChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionChipActive: { borderColor: Colors.accent, backgroundColor: `${Colors.accent}22` },
  actionChipText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  actionChipTextActive: { color: Colors.accent },

  // Avatar
  avatar: { backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.white, fontWeight: '700' },

  viewOnlyBanner: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceHigh,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  viewOnlyText: { color: Colors.textMuted, fontSize: FontSize.xs },

  // @mention suggestions
  mentionList: {
    backgroundColor: Colors.surfaceHigh,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  mentionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionAvatarText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.xs },
  mentionName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },

  // Anchor pull-quote (above comment input)
  anchorQuote: {
    backgroundColor: `${Colors.primary}12`,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  anchorQuoteLabel: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', marginBottom: 2 },
  anchorQuoteText: { color: Colors.textMuted, fontSize: FontSize.xs, fontStyle: 'italic', lineHeight: 16 },

  // Anchor quote inside a comment card
  commentAnchor: {
    backgroundColor: `${Colors.primary}10`,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
  },
  commentAnchorText: { color: Colors.textMuted, fontSize: FontSize.xs, fontStyle: 'italic', lineHeight: 16 },
});
