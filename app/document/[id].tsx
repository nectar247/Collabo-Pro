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
import { VersionHistorySheet } from '@/components/documents/VersionHistorySheet';
import { CommentsPanel } from '@/components/documents/CommentsPanel';
import { ShareDocumentSheet } from '@/components/documents/ShareDocumentSheet';
import { useRealtimeDocument, useUpdateDocument, useCreateDocument, useSaveConflictDraft } from '@/hooks/useDocuments';
import { useSaveAsTemplate } from '@/hooks/useTemplates';
import { useComments } from '@/hooks/useComments';
import { useDocumentSuggestions, useCreateSuggestion, useRespondToSuggestion } from '@/hooks/useDocumentSuggestions';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useWritePresence, usePresenceMembers } from '@/hooks/useDocumentPresence';
import { useChannels, useCreateChannel } from '@/hooks/useChannels';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { logActivity } from '@/hooks/useActivityLog';
import { debounce } from '@/utils/debounce';
import { enqueueWrite, getQueuedCount } from '@/lib/offlineQueue';
import {
  parseDocumentContent,
  serializeDocumentContent,
  type DocumentContent,
  type TextDocumentContent,
  type SpreadsheetContent,
  type PresentationContent,
} from '@/lib/documents/schemas';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Channel, Document, DocumentSuggestion } from '@/types';

const CHAT_PANEL_HEIGHT = 320;

export default function DocumentEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: document, isLoading, isCached } = useRealtimeDocument(id ?? null);
  const { isConnected } = useNetworkStatus();
  const { mutate: updateDocument } = useUpdateDocument();
  const saveConflictDraft = useSaveConflictDraft();
  const { editorMode, setEditorMode } = useUIStore();
  const user = useAuthStore((s) => s.user);

  // Always-on comment subscription (for inline highlighting)
  const { comments } = useComments(id ?? null);

  // Track changes
  const { suggestions } = useDocumentSuggestions(id ?? null);
  const createSuggestion = useCreateSuggestion();
  const respondToSuggestion = useRespondToSuggestion();

  // Real-time presence
  const { updateBlock: updatePresenceBlock } = useWritePresence(id ?? null);
  const presenceMembers = usePresenceMembers(id ?? null);

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
  const [saveAsTemplateVisible, setSaveAsTemplateVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [conflictToast, setConflictToast] = useState(false);
  const [versionHistoryVisible, setVersionHistoryVisible] = useState(false);
  const [commentsPanelVisible, setCommentsPanelVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [pendingAnchor, setPendingAnchor] = useState<{ blockId: string; text: string; anchorStart?: number; anchorEnd?: number } | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [suggestionMode, setSuggestionMode] = useState(false);

  const isDirtyRef = useRef(false);
  // Ref so debouncedSave (which is memoized once) can always read current connectivity
  const isConnectedRef = useRef(isConnected);

  // ── Undo / Redo ─────────────────────────────────────────────────────────
  const historyRef = useRef<DocumentContent[]>([]);
  const historyIdxRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const createDocument = useCreateDocument();
  const saveAsTemplate = useSaveAsTemplate();

  // Keep connectivity ref up-to-date for use inside memoized debouncedSave
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  // Refresh queue count whenever connectivity changes (global flush is handled by useOfflineSync)
  useEffect(() => {
    getQueuedCount().then(setQueuedCount);
  }, [isConnected]);

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

  // Handle document loads and live remote updates
  useEffect(() => {
    if (!document) return;
    const remoteContent = parseDocumentContent(document.content, document.type);

    if (!content) {
      // First load — always apply
      setContent(remoteContent);
      setTitleValue(document.name);
      return;
    }

    if (!isDirtyRef.current) {
      // No unsaved local edits — apply remote silently
      setContent(remoteContent);
    } else {
      // User has unsaved edits — rescue their version as a conflict-draft, then apply remote
      if (id) {
        saveConflictDraft(id, serializeDocumentContent(content)).catch(() => {});
      }
      setContent(remoteContent);
      isDirtyRef.current = false;
      setConflictToast(true);
      setTimeout(() => setConflictToast(false), 4000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.content]);

  // Auto-save with debounce
  const debouncedSave = useMemo(
    () =>
      debounce((newContent: DocumentContent) => {
        if (!id) return;

        // Offline — enqueue and surface the count
        if (!isConnectedRef.current) {
          enqueueWrite(id, serializeDocumentContent(newContent))
            .then(() => getQueuedCount())
            .then(setQueuedCount)
            .catch(() => {});
          return;
        }

        updateDocument(
          { id, content: serializeDocumentContent(newContent) },
          {
            onSuccess: () => {
              setSaveStatus('saved');
              isDirtyRef.current = false;
            },
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
    isDirtyRef.current = true;

    if (!isUndoRedoRef.current) {
      // Trim any redo history after current position
      historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
      historyRef.current.push(newContent);
      if (historyRef.current.length > 50) {
        historyRef.current.shift();
      } else {
        historyIdxRef.current++;
      }
      setCanUndo(historyIdxRef.current > 0);
      setCanRedo(false);
    }
    isUndoRedoRef.current = false;

    debouncedSave(newContent);
  }

  function handleUndo() {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    const prev = historyRef.current[historyIdxRef.current];
    if (!prev) return;
    isUndoRedoRef.current = true;
    setContent(prev);
    setSaveStatus('saving');
    isDirtyRef.current = true;
    debouncedSave(prev);
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(true);
  }

  function handleRedo() {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    const next = historyRef.current[historyIdxRef.current];
    if (!next) return;
    isUndoRedoRef.current = true;
    setContent(next);
    setSaveStatus('saving');
    isDirtyRef.current = true;
    debouncedSave(next);
    setCanUndo(true);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
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

  function handleSaveAsTemplate() {
    if (!document) return;
    setTemplateName(document.name);
    setTemplateDesc('');
    setSaveAsTemplateVisible(true);
  }

  function confirmSaveAsTemplate() {
    if (!document || !content || !templateName.trim()) return;
    const icon = document.type === 'text' ? '📄' : document.type === 'spreadsheet' ? '⊞' : '▷';
    saveAsTemplate.mutate(
      {
        name: templateName.trim(),
        description: templateDesc.trim() || `${document.type} template`,
        icon,
        type: document.type,
        content: serializeDocumentContent(content),
        workspaceId: document.workspaceId,
      },
      {
        onSuccess: () => {
          setSaveAsTemplateVisible(false);
          setTemplateName('');
          setTemplateDesc('');
          Alert.alert('Saved', 'Template saved. It will appear in the New Document picker.');
        },
        onError: () => Alert.alert('Error', 'Failed to save template. Try again.'),
      }
    );
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

  // ── Comment anchors for inline highlighting ──────────────────────────────
  const commentAnchors = useMemo(
    () =>
      (comments ?? [])
        .filter((c) => c.anchorBlockId && c.anchorText && !c.resolved)
        .map((c) => ({ blockId: c.anchorBlockId!, anchorText: c.anchorText! })),
    [comments]
  );

  // ── Suggestion handlers ───────────────────────────────────────────────────
  function handleSuggestChange(blockId: string, originalText: string, suggestedText: string) {
    if (!document || !user) return;
    createSuggestion.mutate({
      documentId: document.id,
      workspaceId: document.workspaceId,
      blockId,
      originalText,
      suggestedText,
      docOwnerId: document.ownerId,
      docName: document.name,
    });
  }

  function handleAcceptSuggestion(suggestionId: string, blockId: string, suggestedText: string) {
    if (!content || document?.type !== 'text') return;
    const textContent = content as TextDocumentContent;
    const updated: TextDocumentContent = {
      ...textContent,
      blocks: textContent.blocks.map((b) =>
        b.id === blockId ? { ...b, text: suggestedText } : b
      ),
    };
    handleContentChange(updated);
    respondToSuggestion.mutate({ suggestionId, status: 'accepted' });
  }

  function handleRejectSuggestion(suggestionId: string) {
    respondToSuggestion.mutate({ suggestionId, status: 'rejected' });
  }

  // ── Comment request from text selection ──────────────────────────────────
  function handleCommentRequest(blockId: string, selectedText: string, anchorStart?: number, anchorEnd?: number) {
    setPendingAnchor({ blockId, text: selectedText, anchorStart, anchorEnd });
    setCommentsPanelVisible(true);
  }

  // ── Permission resolution ────────────────────────────────────────────────
  const isOwner = document?.ownerId === user?.id;
  const userPermission = (() => {
    if (!document || !user) return 'view' as const;
    if (document.ownerId === user.id) return 'edit' as const;
    const collab = document.collaborators?.find((c) => c.userId === user.id);
    // If no collaborators list exists yet, default to edit (open workspace access)
    if (!collab && (!document.collaborators || document.collaborators.length === 0)) return 'edit' as const;
    return (collab?.permission ?? 'view') as 'view' | 'comment' | 'edit';
  })();

  // Merge explicit view mode toggle with permission gate
  const effectiveReadOnly = editorMode === 'view' || userPermission === 'view' || userPermission === 'comment';
  const canEdit = userPermission === 'edit' || document?.ownerId === user?.id;
  const canComment = userPermission !== 'view' || document?.ownerId === user?.id;

  function renderEditor(doc: Document) {
    if (!content) return null;
    switch (doc.type) {
      case 'text':
        return (
          <TextEditor
            content={content as TextDocumentContent}
            onChange={handleContentChange}
            isReadOnly={effectiveReadOnly}
            onFocusedTextChange={(text) => setSelectedText(text || undefined)}
            onCommentRequest={canComment ? handleCommentRequest : undefined}
            commentAnchors={commentAnchors}
            suggestionMode={suggestionMode}
            suggestions={suggestions}
            onSuggestChange={handleSuggestChange}
            onAcceptSuggestion={canEdit ? handleAcceptSuggestion : undefined}
            onRejectSuggestion={canEdit ? handleRejectSuggestion : undefined}
            canReviewSuggestions={canEdit}
            presenceMembers={presenceMembers}
            onPresenceBlockUpdate={updatePresenceBlock}
            workspaceId={document?.workspaceId}
            comments={comments}
          />
        );
      case 'spreadsheet':
        return (
          <SpreadsheetEditor
            content={content as import('@/lib/documents/schemas').SpreadsheetContent}
            onChange={handleContentChange}
            isReadOnly={effectiveReadOnly}
            presenceMembers={presenceMembers}
            onPresenceBlockUpdate={updatePresenceBlock}
          />
        );
      case 'presentation':
        return (
          <PresentationEditor
            content={content as import('@/lib/documents/schemas').PresentationContent}
            onChange={handleContentChange}
            isReadOnly={effectiveReadOnly}
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
          {/* Permission badge — shown to non-owners with restricted access */}
          {!isOwner && userPermission !== 'edit' && (
            <Text style={styles.permBadge}>
              {userPermission === 'view' ? '👁 View only' : '💬 Comment only'}
            </Text>
          )}
        </View>

        {/* Presence avatars — other users in this document */}
        {presenceMembers.length > 0 && (
          <View style={styles.presenceRow}>
            {presenceMembers.slice(0, 3).map((m, i) => (
              <View
                key={m.userId}
                style={[styles.avatar, { backgroundColor: m.color, marginLeft: i === 0 ? 0 : -6 }]}
              >
                <Text style={styles.avatarText}>{m.displayName[0].toUpperCase()}</Text>
              </View>
            ))}
            {presenceMembers.length > 3 && (
              <View style={[styles.avatar, { backgroundColor: Colors.surfaceHigh, marginLeft: -6 }]}>
                <Text style={[styles.avatarText, { color: Colors.textMuted }]}>
                  +{presenceMembers.length - 3}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actions}>
          {/* Undo / Redo */}
          <TouchableOpacity
            onPress={handleUndo}
            style={[styles.actionBtn, !canUndo && { opacity: 0.35 }]}
            disabled={!canUndo}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIcon}>↩</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRedo}
            style={[styles.actionBtn, !canRedo && { opacity: 0.35 }]}
            disabled={!canRedo}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIcon}>↪</Text>
          </TouchableOpacity>
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
            onPress={handleSaveAsTemplate}
            style={styles.actionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIcon}>🗂</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setVersionHistoryVisible(true)}
            style={styles.actionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIcon}>🕐</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCommentsPanelVisible(true)}
            style={styles.actionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionIcon}>📝</Text>
          </TouchableOpacity>
          {/* Share / Permissions — owner only */}
          {document.ownerId === user?.id && (
            <TouchableOpacity
              onPress={() => setShareSheetVisible(true)}
              style={styles.actionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.actionIcon}>👥</Text>
            </TouchableOpacity>
          )}
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
          {canComment && document.type === 'text' && (
            <TouchableOpacity
              onPress={() => setSuggestionMode((v) => !v)}
              style={[styles.actionBtn, suggestionMode && { backgroundColor: `${Colors.warning}33` }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.actionIcon}>💡</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Offline banner */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            {queuedCount > 0
              ? `✎ ${queuedCount} edit${queuedCount > 1 ? 's' : ''} queued — will sync when online`
              : '⚡ Offline — edits will sync when connected'}
          </Text>
        </View>
      )}

      {/* Conflict toast — shown when remote update overwrites dirty local edits */}
      {conflictToast && (
        <View style={styles.conflictToast}>
          <Text style={styles.conflictToastText}>
            Updated by a collaborator — your edits are in Version History
          </Text>
        </View>
      )}

      {/* Suggestion mode banner */}
      {suggestionMode && (
        <View style={styles.suggestionBanner}>
          <Text style={styles.suggestionBannerText}>
            💡 Suggesting — your edits will be sent for review
          </Text>
        </View>
      )}

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

      {/* Version History */}
      {id && document && (
        <VersionHistorySheet
          visible={versionHistoryVisible}
          onClose={() => setVersionHistoryVisible(false)}
          docId={id}
          docType={document.type}
          onRestore={(restoredContent) => {
            handleContentChange(restoredContent);
            setVersionHistoryVisible(false);
          }}
        />
      )}

      {/* Comments */}
      {id && document && (
        <CommentsPanel
          visible={commentsPanelVisible}
          onClose={() => {
            setCommentsPanelVisible(false);
            setPendingAnchor(null);
          }}
          documentId={id}
          workspaceId={document.workspaceId}
          docOwnerId={document.ownerId}
          docName={document.name}
          canComment={canComment}
          pendingAnchor={pendingAnchor}
        />
      )}

      {/* Share & Permissions */}
      {id && document && shareSheetVisible && (
        <ShareDocumentSheet
          visible={shareSheetVisible}
          onClose={() => setShareSheetVisible(false)}
          docId={id}
          workspaceId={document.workspaceId}
          ownerId={document.ownerId}
          collaborators={document.collaborators ?? []}
        />
      )}

      {/* Save as Template Modal */}
      <Modal
        visible={saveAsTemplateVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveAsTemplateVisible(false)}
      >
        <View style={styles.saveAsOverlay}>
          <View style={styles.saveAsSheet}>
            <Text style={styles.saveAsTitle}>Save as Template</Text>
            <Text style={styles.saveAsSubtitle}>
              Appears in the New Document picker for your workspace.
            </Text>
            <TextInput
              style={styles.saveAsInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name"
              placeholderTextColor={Colors.textDim}
              autoFocus
              selectTextOnFocus
            />
            <TextInput
              style={[styles.saveAsInput, { marginTop: Spacing.sm }]}
              value={templateDesc}
              onChangeText={setTemplateDesc}
              placeholder="Short description (optional)"
              placeholderTextColor={Colors.textDim}
            />
            <View style={styles.saveAsActions}>
              <TouchableOpacity
                style={styles.saveAsCancelBtn}
                onPress={() => setSaveAsTemplateVisible(false)}
              >
                <Text style={styles.saveAsCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveAsSaveBtn,
                  (saveAsTemplate.isPending || !templateName.trim()) && { opacity: 0.5 },
                ]}
                disabled={saveAsTemplate.isPending || !templateName.trim()}
                onPress={confirmSaveAsTemplate}
              >
                <Text style={styles.saveAsSaveText}>
                  {saveAsTemplate.isPending ? 'Saving…' : 'Save Template'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  permBadge: {
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
  // Presence avatars
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  // Offline banner
  offlineBanner: {
    backgroundColor: `${Colors.surfaceHigh}`,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBannerText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  // Conflict toast
  conflictToast: {
    backgroundColor: `${Colors.warning}22`,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.warning}55`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  conflictToastText: {
    color: Colors.warning,
    fontSize: FontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Suggestion mode banner
  suggestionBanner: {
    backgroundColor: `${Colors.warning}22`,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.warning}55`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    alignItems: 'center',
  },
  suggestionBannerText: {
    color: Colors.warning,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
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
