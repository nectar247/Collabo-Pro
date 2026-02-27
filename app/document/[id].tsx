import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextEditor } from '@/components/documents/TextEditor';
import { SpreadsheetEditor } from '@/components/documents/SpreadsheetEditor';
import { PresentationEditor } from '@/components/documents/PresentationEditor';
import { VoiceDictationBar } from '@/components/documents/VoiceDictationBar';
import { AIAssistModal } from '@/components/documents/AIAssistModal';
import { useDocument, useUpdateDocument } from '@/hooks/useDocuments';
import { useUIStore } from '@/store/uiStore';
import { debounce } from '@/utils/debounce';
import {
  parseDocumentContent,
  serializeDocumentContent,
  type DocumentContent,
  type TextDocumentContent,
} from '@/lib/documents/schemas';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import type { Document } from '@/types';

export default function DocumentEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: document, isLoading } = useDocument(id ?? null);
  const { mutate: updateDocument } = useUpdateDocument();
  const { editorMode, setEditorMode } = useUIStore();

  const [content, setContent] = useState<DocumentContent | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  // Parse content once document loads
  useEffect(() => {
    if (document) {
      setContent(parseDocumentContent(document.content, document.type));
      setTitleValue(document.name);
    }
  }, [document?.id]);

  // Auto-save with debounce
  const debouncedSave = useMemo(
    () =>
      debounce((newContent: DocumentContent) => {
        if (!id) return;
        updateDocument(
          { id, content: serializeDocumentContent(newContent) },
          {
            onSuccess: () => setSaveStatus('saved'),
            onError: () => setSaveStatus('unsaved'),
          }
        );
      }, 1500),
    [id]
  );

  // Flush on unmount
  useEffect(() => () => debouncedSave.flush(), [debouncedSave]);

  function handleContentChange(newContent: DocumentContent) {
    setContent(newContent);
    setSaveStatus('saving');
    debouncedSave(newContent);
  }

  function handleTitleSave() {
    if (!id || !titleValue.trim()) { setIsEditingTitle(false); return; }
    updateDocument({ id, name: titleValue.trim() });
    setIsEditingTitle(false);
  }

  // Dictation handler: append transcript to text document
  function handleDictationStop(transcript: string) {
    setEditorMode('edit');
    if (!content || document?.type !== 'text' || !transcript.trim()) return;
    const textContent = content as TextDocumentContent;
    const lastBlock = textContent.blocks[textContent.blocks.length - 1];
    const updatedContent: TextDocumentContent = {
      blocks: textContent.blocks.map((b) =>
        b.id === lastBlock.id
          ? { ...b, text: b.text + (b.text ? ' ' : '') + transcript }
          : b
      ),
    };
    handleContentChange(updatedContent);
  }

  // AI insert/replace
  function handleAIInsert(text: string) {
    if (!content || document?.type !== 'text') return;
    const textContent = content as TextDocumentContent;
    const updatedContent: TextDocumentContent = {
      blocks: [
        ...textContent.blocks,
        { id: Math.random().toString(36).slice(2, 10), type: 'paragraph', text },
      ],
    };
    handleContentChange(updatedContent);
  }

  function renderEditor(doc: Document) {
    if (!content) return null;
    switch (doc.type) {
      case 'text':
        return (
          <TextEditor
            content={content as TextDocumentContent}
            onChange={handleContentChange}
            isReadOnly={editorMode === 'view'}
          />
        );
      case 'spreadsheet':
        return (
          <SpreadsheetEditor
            content={content as import('@/lib/documents/schemas').SpreadsheetContent}
            onChange={handleContentChange}
            isReadOnly={editorMode === 'view'}
          />
        );
      case 'presentation':
        return (
          <PresentationEditor
            content={content as import('@/lib/documents/schemas').PresentationContent}
            onChange={handleContentChange}
            isReadOnly={editorMode === 'view'}
          />
        );
    }
  }

  if (isLoading || !document) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        {/* Editable title */}
        <View style={styles.titleWrapper}>
          {isEditingTitle ? (
            <TextInput
              style={styles.titleInput}
              value={titleValue}
              onChangeText={setTitleValue}
              onBlur={handleTitleSave}
              onSubmitEditing={handleTitleSave}
              autoFocus
              returnKeyType="done"
            />
          ) : (
            <TouchableOpacity onPress={() => setIsEditingTitle(true)}>
              <Text style={styles.titleText} numberOfLines={1}>
                {document.name}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={styles.saveStatus}>
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved ✓' : '● Unsaved'}
          </Text>
        </View>

        {/* Toolbar actions */}
        <View style={styles.actions}>
          {document.type === 'text' && (
            <TouchableOpacity
              onPress={() => setEditorMode(editorMode === 'dictate' ? 'edit' : 'dictate')}
              style={[styles.actionBtn, editorMode === 'dictate' && styles.actionBtnActive]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.actionIcon}>🎤</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setAiModalVisible(true)}
            style={styles.actionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIcon}>✨</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setEditorMode(editorMode === 'view' ? 'edit' : 'view')}
            style={styles.actionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIcon}>{editorMode === 'view' ? '✏️' : '👁'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Editor */}
      <View style={styles.editorContainer}>
        {renderEditor(document)}
      </View>

      {/* Voice dictation overlay */}
      {editorMode === 'dictate' && (
        <VoiceDictationBar
          onStop={handleDictationStop}
          onCancel={() => setEditorMode('edit')}
        />
      )}

      {/* AI Assist modal */}
      <AIAssistModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        documentType={document.type}
        onInsert={handleAIInsert}
        onReplace={(text) => handleAIInsert(text)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
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
  titleWrapper: { flex: 1, paddingHorizontal: Spacing.sm },
  titleText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  titleInput: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: 2,
  },
  saveStatus: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  actionBtnActive: {
    backgroundColor: `${Colors.danger}33`,
  },
  actionIcon: { fontSize: 18 },
  editorContainer: { flex: 1 },
});
