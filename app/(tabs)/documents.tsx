import { useEffect, useState } from 'react';
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
import { useDocuments, useCreateDocument, useDeleteDocument } from '@/hooks/useDocuments';
import { useFolders, useCreateFolder, useDeleteFolder, useMoveDocumentToFolder } from '@/hooks/useFolders';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { TEMPLATES_BY_TYPE, type DocumentTemplate } from '@/lib/documents/templates';
import { useWorkspaceTemplates, firestoreToDocumentTemplate } from '@/hooks/useTemplates';
import { getQueuedCount } from '@/lib/offlineQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { Document, DocumentType, Folder } from '@/types';

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
  const { data: folders = [] } = useFolders(activeWorkspaceId);
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();
  const moveToFolder = useMoveDocumentToFolder();

  const [filter, setFilter] = useState<DocumentType | 'all'>('all');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [newDocModalVisible, setNewDocModalVisible] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentType>('text');
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [queuedCount, setQueuedCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);

  const { isConnected } = useNetworkStatus();

  useEffect(() => {
    getQueuedCount().then(setQueuedCount);
  }, [isConnected]);

  const filtered = documents.filter((d) => {
    if (searchQuery.trim()) {
      return d.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (filter !== 'all' && d.type !== filter) return false;
    if (activeFolderId !== null) return d.folderId === activeFolderId;
    return !d.folderId; // root level: no folder
  });

  const { data: userTemplates = [] } = useWorkspaceTemplates(activeWorkspaceId);
  const builtInTemplates = TEMPLATES_BY_TYPE[newDocType] ?? [];
  const userTypeTemplates = userTemplates
    .filter((t) => t.type === newDocType)
    .map(firestoreToDocumentTemplate);
  const templates = [...builtInTemplates, ...userTypeTemplates];

  function handleCreate() {
    if (!newDocName.trim() || !activeWorkspaceId) return;
    const template = selectedTemplate ?? templates[0] ?? null;
    const initialContent = template?.getContent();
    createDocument.mutate(
      { name: newDocName.trim(), type: newDocType, workspaceId: activeWorkspaceId, initialContent },
      {
        onSuccess: (doc) => {
          setNewDocName('');
          setSelectedTemplate(null);
          setNewDocModalVisible(false);
          router.push(`/document/${doc.id}` as never);
        },
        onError: () => Alert.alert('Error', 'Failed to create document. Try again.'),
      }
    );
  }

  function handleCreateFolder() {
    if (!newFolderName.trim() || !activeWorkspaceId) return;
    createFolder.mutate(
      { name: newFolderName.trim(), workspaceId: activeWorkspaceId },
      {
        onSuccess: () => { setNewFolderName(''); setNewFolderModalVisible(false); },
        onError: () => Alert.alert('Error', 'Failed to create folder.'),
      }
    );
  }

  function handleDelete(doc: Document) {
    Alert.alert('Delete document', `Delete "${doc.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => deleteDocument.mutate({ id: doc.id, workspaceId: doc.workspaceId, name: doc.name }),
      },
    ]);
  }

  function handleMoveToFolder(doc: Document) {
    if (folders.length === 0) {
      Alert.alert('No folders', 'Create a folder first using the 📁 button.');
      return;
    }
    Alert.alert(
      'Move to folder',
      `Where do you want to move "${doc.name}"?`,
      [
        ...folders.map((f) => ({
          text: `📁 ${f.name}`,
          onPress: () => moveToFolder.mutate({ docId: doc.id, folderId: f.id, workspaceId: doc.workspaceId }),
        })),
        ...(doc.folderId ? [{ text: '↩ Remove from folder', onPress: () => moveToFolder.mutate({ docId: doc.id, folderId: null, workspaceId: doc.workspaceId }) }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }

  function handleFolderLongPress(folder: Folder) {
    Alert.alert(`📁 ${folder.name}`, undefined, [
      {
        text: 'Delete folder',
        style: 'destructive',
        onPress: () => deleteFolder.mutate(folder.id),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          {queuedCount > 0 && (
            <View style={styles.syncBadge}>
              <Text style={styles.syncBadgeText}>↑{queuedCount}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => { setSearchActive((v) => !v); setSearchQuery(''); }}
            style={styles.folderButton}
          >
            <Text style={styles.folderButtonText}>{searchActive ? '✕' : '🔍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setNewFolderModalVisible(true)}
            style={styles.folderButton}
          >
            <Text style={styles.folderButtonText}>📁</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setNewDocModalVisible(true)}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      {searchActive && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search documents..."
            placeholderTextColor={Colors.textDim}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      )}

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

      {/* Folder row */}
      {folders.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.folderRow}
          contentContainerStyle={styles.folderRowContent}
        >
          <TouchableOpacity
            onPress={() => setActiveFolderId(null)}
            style={[styles.folderChip, activeFolderId === null && styles.folderChipActive]}
          >
            <Text style={styles.folderChipText}>🏠 All</Text>
          </TouchableOpacity>
          {folders.map((folder) => (
            <TouchableOpacity
              key={folder.id}
              onPress={() => setActiveFolderId(folder.id)}
              onLongPress={() => handleFolderLongPress(folder)}
              style={[styles.folderChip, activeFolderId === folder.id && styles.folderChipActive]}
            >
              <Text style={styles.folderChipText}>📁 {folder.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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
          title={activeFolderId ? 'Folder is empty' : 'No documents yet'}
          description={activeFolderId ? 'Swipe a document left and tap Move to add it here.' : 'Create your first document to get started.'}
          action={activeFolderId ? undefined : { label: 'Create Document', onPress: () => setNewDocModalVisible(true) }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
          renderItem={({ item }: { item: Document }) => (
            <DocumentCard
              document={item}
              onPress={() => router.push(`/document/${item.id}` as never)}
              onDelete={() => handleDelete(item)}
              onMoveToFolder={() => handleMoveToFolder(item)}
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

            {templates.length > 0 && (
              <View>
                <Text style={styles.templateLabel}>Template</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
                  {builtInTemplates.map((t) => {
                    const active = (selectedTemplate?.id ?? templates[0]?.id) === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => setSelectedTemplate(t)}
                        style={[styles.templateCard, active && styles.templateCardActive]}
                      >
                        <Text style={styles.templateIcon}>{t.icon}</Text>
                        <Text style={styles.templateName}>{t.name}</Text>
                        <Text style={styles.templateDesc} numberOfLines={2}>{t.description}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {userTypeTemplates.length > 0 && (
                    <>
                      <View style={styles.templateDivider} />
                      {userTypeTemplates.map((t) => {
                        const active = (selectedTemplate?.id ?? templates[0]?.id) === t.id;
                        return (
                          <TouchableOpacity
                            key={t.id}
                            onPress={() => setSelectedTemplate(t)}
                            style={[styles.templateCard, active && styles.templateCardActive]}
                          >
                            <Text style={styles.templateIcon}>{t.icon}</Text>
                            <Text style={styles.templateName}>{t.name}</Text>
                            <Text style={styles.templateDesc} numberOfLines={2}>{t.description}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}
                </ScrollView>
              </View>
            )}

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

      {/* New Folder Modal */}
      <Modal
        visible={newFolderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNewFolderModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNewFolderModalVisible(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>New Folder</Text>
            <TextInput
              style={styles.nameInput}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Folder name"
              placeholderTextColor={Colors.textDim}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateFolder}
            />
            <Button
              label="Create Folder"
              onPress={handleCreateFolder}
              loading={createFolder.isPending}
              disabled={!newFolderName.trim()}
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
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  folderButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  folderButtonText: { fontSize: 16 },
  addButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addButtonText: { color: Colors.white, fontSize: 22, lineHeight: 28, fontWeight: '400' },
  filterRow: { maxHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  filterContent: { paddingHorizontal: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.surface },
  filterChipActive: { backgroundColor: Colors.primary },
  filterLabel: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
  filterLabelActive: { color: Colors.white },
  folderRow: { maxHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  folderRowContent: { paddingHorizontal: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  folderChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.surface },
  folderChipActive: { backgroundColor: `${Colors.accent}33`, borderWidth: 1, borderColor: Colors.accent },
  folderChipText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  typeGrid: { flexDirection: 'row', gap: Spacing.sm },
  typeCard: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.xs,
    borderRadius: Radius.md, backgroundColor: Colors.surfaceHigh, borderWidth: 2, borderColor: 'transparent', gap: Spacing.xs,
  },
  typeCardActive: { borderColor: Colors.primary },
  typeIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  typeSymbol: { fontSize: FontSize.lg, fontWeight: '700' },
  typeLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  nameInput: {
    backgroundColor: Colors.surfaceHigh, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4,
    color: Colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border,
  },
  templateLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
  templateRow: { gap: Spacing.sm, paddingVertical: 2 },
  templateCard: { width: 110, padding: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.surfaceHigh, borderWidth: 2, borderColor: 'transparent', gap: 2 },
  templateCardActive: { borderColor: Colors.primary },
  templateIcon: { fontSize: 22 },
  templateName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  templateDesc: { color: Colors.textDim, fontSize: 10, lineHeight: 13 },
  templateDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.xs, alignSelf: 'stretch' },
  syncBadge: { backgroundColor: Colors.warning, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  syncBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  searchBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
