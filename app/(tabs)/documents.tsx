import { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useDocuments, useCreateDocument } from '@/hooks/useDocuments';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Document, DocumentType } from '@/types';

const DOC_TYPES: { type: DocumentType; label: string; icon: string; color: string }[] = [
  { type: 'text', label: 'Document', icon: 'T', color: '#2563EB' },
  { type: 'spreadsheet', label: 'Spreadsheet', icon: '⊞', color: '#10B981' },
  { type: 'presentation', label: 'Presentation', icon: '▷', color: '#7C3AED' },
];

const FILTER_OPTIONS: { value: DocumentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'text', label: 'Docs' },
  { value: 'spreadsheet', label: 'Sheets' },
  { value: 'presentation', label: 'Slides' },
];

export default function DocumentsTab() {
  const { activeWorkspaceId } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const { data: documents = [], isLoading } = useDocuments(activeWorkspaceId);
  const createDocument = useCreateDocument();

  const [filter, setFilter] = useState<DocumentType | 'all'>('all');
  const [newDocModalVisible, setNewDocModalVisible] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentType>('text');

  const filtered = documents.filter((d) => filter === 'all' || d.type === filter);

  function handleCreate() {
    if (!newDocName.trim() || !activeWorkspaceId) return;
    createDocument.mutate(
      { name: newDocName.trim(), type: newDocType, workspaceId: activeWorkspaceId },
      {
        onSuccess: (doc) => {
          setNewDocName('');
          setNewDocModalVisible(false);
          router.push(`/document/${doc.id}` as never);
        },
        onError: () => Alert.alert('Error', 'Failed to create document. Try again.'),
      }
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <TouchableOpacity
          onPress={() => setNewDocModalVisible(true)}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {FILTER_OPTIONS.map(({ value, label }) => (
          <TouchableOpacity
            key={value}
            onPress={() => setFilter(value)}
            style={[styles.filterChip, filter === value && styles.filterChipActive]}
          >
            <Text style={[styles.filterLabel, filter === value && styles.filterLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Document list */}
      {!activeWorkspaceId ? (
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>📂</Text>}
          title="No workspace selected"
          description="Create or join a workspace to start working on documents."
        />
      ) : filtered.length === 0 && !isLoading ? (
        <EmptyState
          icon={<Text style={{ fontSize: 48 }}>📄</Text>}
          title="No documents yet"
          description="Create your first document to get started."
          action={{ label: 'Create Document', onPress: () => setNewDocModalVisible(true) }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
          renderItem={({ item }: { item: Document }) => (
            <DocumentCard
              document={item}
              onPress={() => router.push(`/document/${item.id}` as never)}
              onLongPress={() =>
                Alert.alert(item.name, undefined, [
                  { text: 'Open', onPress: () => router.push(`/document/${item.id}` as never) },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* New Document Modal */}
      <Modal
        visible={newDocModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNewDocModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNewDocModalVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>New Document</Text>

            {/* Type selection */}
            <View style={styles.typeGrid}>
              {DOC_TYPES.map(({ type, label, icon, color }) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setNewDocType(type)}
                  style={[styles.typeCard, newDocType === type && styles.typeCardActive]}
                >
                  <View style={[styles.typeIcon, { backgroundColor: `${color}22` }]}>
                    <Text style={[styles.typeSymbol, { color }]}>{icon}</Text>
                  </View>
                  <Text style={styles.typeLabel}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name input */}
            <TextInput
              style={styles.nameInput}
              value={newDocName}
              onChangeText={setNewDocName}
              placeholder="Document name"
              placeholderTextColor={Colors.textDim}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />

            <Button
              label="Create"
              onPress={handleCreate}
              loading={createDocument.isPending}
              disabled={!newDocName.trim()}
              fullWidth
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '400',
  },
  filterRow: {
    maxHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  filterContent: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  filterChipActive: { backgroundColor: Colors.primary },
  filterLabel: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
  filterLabelActive: { color: Colors.white },
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
  typeGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: Spacing.xs,
  },
  typeCardActive: { borderColor: Colors.primary },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeSymbol: { fontSize: FontSize.lg, fontWeight: '700' },
  typeLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  nameInput: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    color: Colors.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
