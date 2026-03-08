import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useDocumentVersions } from '@/hooks/useDocuments';
import { parseDocumentContent, type DocumentContent } from '@/lib/documents/schemas';
import type { DocumentType, DocumentVersion } from '@/types';

interface VersionHistorySheetProps {
  visible: boolean;
  onClose: () => void;
  docId: string;
  docType: DocumentType;
  onRestore: (content: DocumentContent) => void;
}

const LABEL_CONFIG: Record<DocumentVersion['label'], { text: string; color: string }> = {
  initial:        { text: 'Created',       color: Colors.accent },
  'auto-save':    { text: 'Auto-save',     color: Colors.textDim },
  'conflict-draft': { text: 'Your Draft',  color: Colors.warning },
  manual:         { text: 'Manual save',   color: Colors.primary },
};

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function VersionHistorySheet({
  visible,
  onClose,
  docId,
  docType,
  onRestore,
}: VersionHistorySheetProps) {
  const { data: versions = [], isLoading } = useDocumentVersions(visible ? docId : null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleRestore(version: DocumentVersion) {
    Alert.alert(
      'Restore this version?',
      `This will replace the current document with the ${LABEL_CONFIG[version.label].text} version saved by ${version.savedByName}. The current content will be auto-saved first.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => {
            const restored = parseDocumentContent(version.content, docType);
            onRestore(restored);
          },
        },
      ]
    );
  }

  function getPreview(version: DocumentVersion): string {
    try {
      const parsed = parseDocumentContent(version.content, docType);
      if (docType === 'text') {
        const tc = parsed as any;
        return (tc.blocks ?? [])
          .slice(0, 3)
          .map((b: any) => b.text)
          .filter(Boolean)
          .join(' · ') || '(empty document)';
      }
      if (docType === 'spreadsheet') {
        const sc = parsed as any;
        const sheet = sc.sheets?.[0];
        return sheet ? `${sheet.rows} rows × ${sheet.cols} cols — ${sheet.name}` : '(empty)';
      }
      if (docType === 'presentation') {
        const pc = parsed as any;
        return `${pc.slides?.length ?? 0} slide(s)`;
      }
    } catch {
      return '(unable to preview)';
    }
    return '';
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          {/* Handle */}
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Version History</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : versions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No versions saved yet.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {versions.map((v) => {
                const labelCfg = LABEL_CONFIG[v.label] ?? LABEL_CONFIG['auto-save'];
                const savedMs = (v.savedAt as any)?.toMillis?.() ?? 0;
                const isExpanded = expandedId === v.id;

                return (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.versionRow}
                    onPress={() => setExpandedId(isExpanded ? null : v.id)}
                    activeOpacity={0.7}
                  >
                    {/* Label badge + meta */}
                    <View style={styles.versionMeta}>
                      <View style={[styles.badge, { backgroundColor: `${labelCfg.color}22`, borderColor: `${labelCfg.color}55` }]}>
                        <Text style={[styles.badgeText, { color: labelCfg.color }]}>
                          {labelCfg.text}
                        </Text>
                      </View>
                      <Text style={styles.versionWho} numberOfLines={1}>
                        {v.savedByName}
                      </Text>
                      <Text style={styles.versionTime}>
                        {savedMs ? formatRelativeTime(savedMs) : '—'}
                      </Text>
                    </View>

                    {/* Expanded: preview + restore */}
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        <Text style={styles.previewText} numberOfLines={3}>
                          {getPreview(v)}
                        </Text>
                        <TouchableOpacity
                          style={styles.restoreBtn}
                          onPress={() => handleRestore(v)}
                        >
                          <Text style={styles.restoreBtnText}>Restore this version</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  closeBtn: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  versionRow: {
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  versionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badge: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  versionWho: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  versionTime: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
  },
  expandedContent: {
    marginTop: Spacing.sm,
    paddingLeft: Spacing.xs,
    gap: Spacing.sm,
  },
  previewText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  restoreBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.sm,
  },
  restoreBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
