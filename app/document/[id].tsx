import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
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
import { ImportExportMenu } from '@/components/documents/ImportExportMenu';
import { ChatScreen } from '@/components/chat/ChatScreen';
import { useDocument, useUpdateDocument, useCreateDocument } from '@/hooks/useDocuments';
import { useChannels, useCreateChannel } from '@/hooks/useChannels';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { logActivity } from '@/hooks/useActivityLog';
import { debounce } from '@/utils/debounce';
import {
  parseDocumentContent,
  serializeDocumentContent,
  type DocumentContent,
  type TextDocumentContent,
  type SpreadsheetContent,
  type PresentationContent,
} from '@/lib/documents/schemas';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Channel, Document } from '@/types';

const CHAT_PANEL_HEIGHT = 320;

export default function DocumentEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: document, isLoading } = useDocument(id ?? null);
  const { mutate: updateDocument } = useUpdateDocument();
  const { editorMode, setEditorMode } = useUIStore();
  const user = useAuthStore((s) => s.user);

  const [content, setContent] = useState<DocumentContent | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [channelPanelOpen, setChannelPanelOpen] = useState(false);
  const [activeChatChannelId, setActiveChatChannelId] = useState<string | null>(null);
  const [channelPickerVisible, setChannelPickerVisible] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [selectedText, setSelectedText] = useState<string | undefined>(undefined);
  const [importExportVisible, setImportExportVisible] = useState(false);
  const [saveAsVisible, setSaveAsVisible] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');

  const createDocument = useCreateDocument();

  const { data: channels = [] } = useChannels(document?.workspaceId ?? null);
  const createChannel = useCreateChannel();
  const creatingChannelRef = useRef(false);

  // Auto-select or auto-create the document's dedicated chat channel,
  // e.g. "AML Screening Guideline chat".
  useEffect(() => {
    if (!document?.workspaceId || !document?.name || activeChatChannelId || creatingChannelRef.current) return;

    const normalize = (s: string) => s.toLowerCase().replace(/[-\s]+/g, '');
    const target = normalize(`${document.name} chat`);
    const docChannel = channels.find((c) => normalize(c.name) === target);

    if (docChannel) {
      setActiveChatChannelId(docChannel.id);
    } else if (channels.length > 0 || !document?.workspaceId) {
      // Channels have loaded but none matched — create the dedicated channel.
      creatingChannelRef.current = true;
      createChannel.mutate(
        { workspaceId: document.workspaceId, name: `${document.name} chat` },
        {
          onSuccess: (newId) => setActiveChatChannelId(newId),
          onSettled: () => { creatingChannelRef.current = false; },
        }
      );
    }
  }, [channels, document?.name, document?.workspaceId]);

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
    updateDocument({ id, name: titleValue.trim(), workspaceId: document?.workspaceId });
    setIsEditingTitle(false);
  }

  function handleDictationStop(transcript: string) {
    setEditorMode('edit');
    if (!content || document?.type !== 'text' || !transcript.trim()) return;
    const textContent = content as TextDocumentContent;
    if (textContent.blocks.length === 0) return;
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

  function buildShareText(doc: Document, docContent: DocumentContent): string {
    const divider = '─'.repeat(40);
    let body = '';

    if (doc.type === 'text') {
      const tc = docContent as TextDocumentContent;
      body = tc.blocks.map((b) => b.text).filter(Boolean).join('\n\n');
    } else if (doc.type === 'spreadsheet') {
      const sc = docContent as SpreadsheetContent;
      // Export all sheets, each headed by its name
      sc.sheets.forEach((sheet, sheetIdx) => {
        if (sc.sheets.length > 1) {
          body += `\n── ${sheet.name} ──\n`;
        }
        for (let r = 0; r < sheet.rows; r++) {
          const row = Array.from({ length: sheet.cols }, (_, c) => {
            const key = `${String.fromCharCode(65 + c)}${r + 1}`;
            return sheet.cells[key]?.computed ?? sheet.cells[key]?.raw ?? '';
          });
          // Skip completely empty rows
          if (row.some((v) => v !== '')) {
            body += row.join('\t') + '\n';
          }
        }
      });
    } else if (doc.type === 'presentation') {
      const pc = docContent as PresentationContent;
      pc.slides.forEach((s, i) => {
        body += `[Slide ${i + 1}]\n`;
        s.elements
          .filter((el) => el.type === 'text' && el.content)
          .forEach((el) => { body += `${el.content}\n`; });
        if (s.notes) body += `Notes: ${s.notes}\n`;
        body += '\n';
      });
    }

    return `${doc.name}\n${divider}\n${body.trim()}`;
  }

  function handleSaveAs() {
    if (!document) return;
    setSaveAsName(`${document.name} (copy)`);
    setSaveAsVisible(true);
  }

  function confirmSaveAs() {
    if (!document || !content || !saveAsName.trim()) return;
    const serialized = serializeDocumentContent(content);
    createDocument.mutate(
      {
        name: saveAsName.trim(),
        type: document.type,
        workspaceId: document.workspaceId,
        initialContent: serialized,
      },
      {
        onSuccess: (newDoc) => {
          setSaveAsVisible(false);
          setSaveAsName('');
          router.replace(`/document/${newDoc.id}`);
        },
        onError: (err: any) =>
          Alert.alert('Error', err?.message ?? 'Could not save a copy.'),
      }
    );
  }

  async function handleShare() {
    if (!document || !content) return;
    const text = buildShareText(document, content);
    try {
      await Share.share({ title: document.name, message: text });
      if (user) {
        logActivity({
          workspaceId: document.workspaceId,
          userId: user.id,
          userDisplayName: user.displayName,
          action: 'document_shared',
          resourceType: 'document',
          resourceId: document.id,
          resourceName: document.name,
        }).catch(() => {});
      }
    } catch {
      // User dismissed the share sheet — no action needed
    }
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
            onFocusedTextChange={(text) => setSelectedText(text || undefined)}
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

  const activeChannel = channels.find((c) => c.id === activeChatChannelId);
  // Convert stored "aml-screening-guideline-chat" → "AML Screening Guideline chat" for display
  const formatChannelName = (name: string) =>
    name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const channelLabel = activeChannel
    ? activeChannel.type === 'direct'
      ? activeChannel.name
      : formatChannelName(activeChannel.name)
    : createChannel.isPending
    ? 'Creating channel…'
    : 'Select channel';

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

        <View style={styles.actions}>
          {document.type === 'text' && (
            <TouchableOpacity
              onPress={() => setEditorMode(editorMode === 'dictate' ? 'edit' : 'dictate')}
              style={[styles.actionBtn, editorMode === 'dictate' && styles.actionBtnDictateActive]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.actionIcon}>🎤</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSaveAs}
            style={styles.actionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIcon}>⧉</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setImportExportVisible(true)}
            style={styles.actionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIcon}>⇅</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.actionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIcon}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setChannelPanelOpen((v) => !v)}
            style={[styles.actionBtn, channelPanelOpen && styles.actionBtnChatActive]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIcon}>💬</Text>
          </TouchableOpacity>
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

      {/* Split layout: document on top, channel chat on bottom */}
      <KeyboardAvoidingView
        style={styles.splitContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.editorContainer}>
          {renderEditor(document)}
        </View>

        {channelPanelOpen && (
          <View style={styles.channelPanel}>
            {/* Panel header with channel picker */}
            <View style={styles.channelPanelHeader}>
              <TouchableOpacity
                style={styles.channelPickerBtn}
                onPress={() => setChannelPickerVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.channelPickerLabel} numberOfLines={1}>
                  {channelLabel}
                </Text>
                <Text style={styles.channelChevron}>▾</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setChannelPanelOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.channelPanelClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {activeChatChannelId ? (
              <ChatScreen channelId={activeChatChannelId} />
            ) : (
              <View style={styles.noChannelState}>
                <Text style={styles.noChannelText}>
                  {channels.length === 0
                    ? 'No channels in this workspace.'
                    : 'Select a channel above.'}
                </Text>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Voice dictation overlay */}
      {editorMode === 'dictate' && (
        <VoiceDictationBar
          onStop={handleDictationStop}
          onCancel={() => setEditorMode('edit')}
        />
      )}

      {/* Channel picker bottom sheet */}
      <Modal
        visible={channelPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChannelPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setChannelPickerVisible(false)}
        >
          <View style={styles.pickerSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerTitle}>Switch Channel</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {channels.map((ch: Channel) => (
                <TouchableOpacity
                  key={ch.id}
                  style={[styles.pickerRow, ch.id === activeChatChannelId && styles.pickerRowActive]}
                  onPress={() => {
                    setActiveChatChannelId(ch.id);
                    setChannelPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerRowText}>
                    {ch.type === 'direct' ? ch.name : `# ${ch.name}`}
                  </Text>
                  {ch.id === activeChatChannelId && (
                    <Text style={styles.pickerCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Import / Export */}
      {content && (
        <ImportExportMenu
          visible={importExportVisible}
          onClose={() => setImportExportVisible(false)}
          docType={document.type}
          docName={document.name}
          content={content}
          onImport={(newContent) => {
            handleContentChange(newContent);
            setImportExportVisible(false);
          }}
        />
      )}

      {/* Save As Modal */}
      <Modal
        visible={saveAsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveAsVisible(false)}
      >
        <View style={styles.saveAsOverlay}>
          <View style={styles.saveAsSheet}>
            <Text style={styles.saveAsTitle}>Save a Copy</Text>
            <Text style={styles.saveAsSubtitle}>
              A new document will be created with the current content.
            </Text>
            <TextInput
              style={styles.saveAsInput}
              value={saveAsName}
              onChangeText={setSaveAsName}
              placeholder="New document name"
              placeholderTextColor={Colors.textDim}
              maxLength={120}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.saveAsActions}>
              <TouchableOpacity
                style={styles.saveAsCancelBtn}
                onPress={() => setSaveAsVisible(false)}
              >
                <Text style={styles.saveAsCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveAsSaveBtn,
                  (createDocument.isPending || !saveAsName.trim()) && { opacity: 0.5 },
                ]}
                disabled={createDocument.isPending || !saveAsName.trim()}
                onPress={confirmSaveAs}
              >
                <Text style={styles.saveAsSaveText}>
                  {createDocument.isPending ? 'Saving…' : 'Save Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Writing Assistant */}
      <AIAssistModal
        visible={aiModalVisible}
        onClose={() => { setAiModalVisible(false); setSelectedText(undefined); }}
        documentType={document.type}
        workspaceId={document.workspaceId}
        selectedText={selectedText}
        onInsert={handleAIInsert}
        onReplace={(text) => {
          if (selectedText && content && document.type === 'text') {
            const textContent = content as TextDocumentContent;
            const updatedContent: TextDocumentContent = {
              blocks: textContent.blocks.map((b) =>
                b.text.includes(selectedText)
                  ? { ...b, text: b.text.replace(selectedText, text) }
                  : b
              ),
            };
            handleContentChange(updatedContent);
          } else {
            handleAIInsert(text);
          }
          setSelectedText(undefined);
        }}
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
  actionBtnDictateActive: {
    backgroundColor: `${Colors.danger}33`,
  },
  actionBtnChatActive: {
    backgroundColor: `${Colors.primary}22`,
  },
  actionIcon: { fontSize: 18 },
  // Split layout
  splitContainer: { flex: 1 },
  editorContainer: { flex: 1 },
  // Inline channel panel
  channelPanel: {
    height: CHAT_PANEL_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  channelPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  channelPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  channelPickerLabel: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
    flexShrink: 1,
  },
  channelChevron: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  channelPanelClose: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    paddingLeft: Spacing.md,
  },
  noChannelState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noChannelText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  // Channel picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '60%',
  },
  pickerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  pickerRowActive: {
    backgroundColor: `${Colors.primary}22`,
  },
  pickerRowText: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  pickerCheckmark: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  // Save As modal
  saveAsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  saveAsSheet: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveAsTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  saveAsSubtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: -Spacing.xs,
  },
  saveAsInput: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    color: Colors.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveAsActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  saveAsCancelBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveAsCancelText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  saveAsSaveBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  saveAsSaveText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
