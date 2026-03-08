import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, withSpring } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { uploadImageBase64, mimeToExt } from '@/lib/firebase/storage';
import { useAuthStore } from '@/store/authStore';
import type { BlockType, TextBlock, TextDocumentContent } from '@/lib/documents/schemas';
import type { Suggestion } from '@/lib/documents/schemas';
import type { Comment, DocumentSuggestion } from '@/types';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUserProfiles } from '@/hooks/useUserProfiles';
import { translateDocument, TRANSLATE_LANGUAGES, type TranslateLanguage } from '@/lib/ai/claude';
import { DrawingCanvas } from './DrawingCanvas';
import type { DocumentPresenceEntry } from '@/types';

interface TextEditorProps {
  content: TextDocumentContent;
  onChange: (content: TextDocumentContent) => void;
  isReadOnly?: boolean;
  dictationAppend?: string;
  onFocusedTextChange?: (text: string) => void;
  /** Called when user selects text and taps the 💬 comment button */
  onCommentRequest?: (blockId: string, selectedText: string, anchorStart?: number, anchorEnd?: number) => void;
  /** Anchored comment spans for inline yellow highlighting */
  commentAnchors?: { blockId: string; anchorText: string }[];
  /** When true, edits become suggestions instead of direct changes */
  suggestionMode?: boolean;
  suggestions?: DocumentSuggestion[];
  onSuggestChange?: (blockId: string, originalText: string, suggestedText: string) => void;
  onAcceptSuggestion?: (suggestionId: string, blockId: string, suggestedText: string) => void;
  onRejectSuggestion?: (suggestionId: string) => void;
  canReviewSuggestions?: boolean;
  presenceMembers?: DocumentPresenceEntry[];
  onPresenceBlockUpdate?: (blockId: string | null) => void;
  workspaceId?: string;
  comments?: Comment[];
}

type BlockStyle = {
  fontSize: number;
  fontWeight: '400' | '600' | '700';
  paddingLeft?: number;
  color?: string;
};

const BLOCK_STYLES: Record<BlockType, BlockStyle> = {
  heading:    { fontSize: 22, fontWeight: '700' },
  list_item:  { fontSize: 15, fontWeight: '400', paddingLeft: 20 },
  code_block: { fontSize: 13, fontWeight: '400', paddingLeft: 12 },
  divider:    { fontSize: 15, fontWeight: '400' },
  page_break: { fontSize: 15, fontWeight: '400' },
  image:      { fontSize: 15, fontWeight: '400' },
  table:      { fontSize: 13, fontWeight: '400' },
  heading1:   { fontSize: 26, fontWeight: '700' },
  heading2:   { fontSize: 22, fontWeight: '700' },
  heading3:   { fontSize: 18, fontWeight: '600' },
  paragraph:  { fontSize: 15, fontWeight: '400' },
  bullet:     { fontSize: 15, fontWeight: '400', paddingLeft: 20 },
  numbered:   { fontSize: 15, fontWeight: '400', paddingLeft: 20 },
  quote:      { fontSize: 15, fontWeight: '400', paddingLeft: 16, color: Colors.textMuted },
  code:       { fontSize: 13, fontWeight: '400', paddingLeft: 12 },
};

const HEADING_SIZES: Record<number, number> = {
  1: 26, 2: 22, 3: 18, 4: 16, 5: 15, 6: 14,
};

const A4_WIDTH_PX = 320;
const A4_HEIGHT_PX = 453;
const A4_MARGIN_H = 24;
const A4_MARGIN_V = 32;
const CONTENT_HEIGHT = A4_HEIGHT_PX - A4_MARGIN_V * 2;

// 320px = A4 width at screen scale. Scale factor: 320 / 595pt ≈ 0.537
const PT_TO_PX = 320 / 595;

function getPageStyle(
  pageSize?: 'A4' | 'Letter' | 'Legal',
  margins?: { top: number; right: number; bottom: number; left: number }
) {
  const heightPx =
    pageSize === 'Letter' ? Math.round(320 * (11 / 8.5))
    : pageSize === 'Legal' ? Math.round(320 * (14 / 8.5))
    : 453;
  const ph = margins ? Math.round(((margins.left + margins.right) / 2) * PT_TO_PX) : A4_MARGIN_H;
  const pv = margins ? Math.round(((margins.top + margins.bottom) / 2) * PT_TO_PX) : A4_MARGIN_V;
  return {
    minHeight: heightPx,
    paddingHorizontal: Math.max(8, ph),
    paddingTop: Math.max(8, pv),
    paddingBottom: Math.max(8, pv) + 24,
  };
}

function estimateBlockHeight(block: TextBlock): number {
  if (block.type === 'image') return 200;
  if (block.type === 'divider') return 20;
  if (block.type === 'page_break') return 0;
  if (block.type === 'table') return ((block.tableData?.rows ?? 2) + 1) * 32;
  const baseSize = block.fontSize ?? (BLOCK_STYLES[block.type as keyof typeof BLOCK_STYLES]?.fontSize ?? 15);
  const lineHeight = baseSize * 1.5;
  const charsPerLine = Math.floor((A4_WIDTH_PX - A4_MARGIN_H * 2) / (baseSize * 0.55));
  const lines = Math.max(1, Math.ceil(block.text.length / Math.max(1, charsPerLine)));
  return lines * lineHeight + 8;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function TextEditor({
  content,
  onChange,
  isReadOnly = false,
  dictationAppend,
  onFocusedTextChange,
  onCommentRequest,
  commentAnchors,
  suggestionMode,
  suggestions,
  onSuggestChange,
  onAcceptSuggestion,
  onRejectSuggestion,
  canReviewSuggestions,
  presenceMembers,
  onPresenceBlockUpdate,
  workspaceId,
  comments,
}: TextEditorProps) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  // ── Find & Replace state ──────────────────────────────────────────────────
  const [findBarOpen, setFindBarOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{ blockId: string; row: number; col: number } | null>(null);
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState('');
  const [selectionState, setSelectionState] = useState<{ blockId: string; start: number; end: number } | null>(null);

  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const user = useAuthStore((s) => s.user);

  // ── Workspace members for @mention autocomplete ───────────────────────────
  const { data: workspace } = useWorkspace(workspaceId ?? null);
  const memberIds = useMemo(() => (workspace?.members ?? []).map((m) => m.userId), [workspace?.members]);
  const profileMap = useUserProfiles(memberIds);
  const mentionCandidates = useMemo(() =>
    (workspace?.members ?? []).map((m) => ({
      userId: m.userId,
      displayName: profileMap.get(m.userId) ?? m.userId.slice(0, 6),
    })),
    [workspace?.members, profileMap]
  );

  // ── Suggestion drafts (local buffer in suggestion mode) ───────────────────
  const [suggestionDrafts, setSuggestionDrafts] = useState<Record<string, string>>({});

  // ── Image resize state ────────────────────────────────────────────────────
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<Record<string, { width: number; height: number }>>({});

  // ── Format painter state ──────────────────────────────────────────────────
  type CopiedFormat = Pick<TextBlock, 'bold' | 'italic' | 'underline' | 'strikethrough' | 'color' | 'highlight' | 'fontFamily' | 'fontSize' | 'align'>;
  const [copiedFormat, setCopiedFormat] = useState<CopiedFormat | null>(null);
  const [formatPainterActive, setFormatPainterActive] = useState(false);

  // ── Document outline state & refs ─────────────────────────────────────────
  const [outlineVisible, setOutlineVisible] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const blockLayouts = useRef<Record<string, number>>({});

  // ── Line spacing / highlight / font / special chars / list style picker ───
  const [spacingPickerOpen, setSpacingPickerOpen] = useState(false);
  const [highlightPickerOpen, setHighlightPickerOpen] = useState(false);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [specialCharsOpen, setSpecialCharsOpen] = useState(false);
  const [listStylePickerOpen, setListStylePickerOpen] = useState(false);

  // ── Bookmark input state ───────────────────────────────────────────────────
  const [bookmarkInputOpen, setBookmarkInputOpen] = useState(false);
  const [bookmarkInputValue, setBookmarkInputValue] = useState('');

  // ── Scroll tracking (for sticky header) ───────────────────────────────────
  const [scrollY, setScrollY] = useState(0);

  // ── Text zoom ─────────────────────────────────────────────────────────────
  const ZOOM_LEVELS = [0.75, 0.9, 1.0, 1.1, 1.25];
  const [zoomIdx, setZoomIdx] = useState(2);
  const zoom = ZOOM_LEVELS[zoomIdx];

  // ── Named paragraph styles + divider style picker ─────────────────────────
  const [paraStyleOpen, setParaStyleOpen] = useState(false);
  const [selectedDividerId, setSelectedDividerId] = useState<string | null>(null);

  // ── Drag to reorder ────────────────────────────────────────────────────────
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const dropTargetIdxRef = useRef<number | null>(null);

  // ── Word count modal ───────────────────────────────────────────────────────
  const [wordCountModalOpen, setWordCountModalOpen] = useState(false);

  // ── Focus mode ─────────────────────────────────────────────────────────────
  const [focusMode, setFocusMode] = useState(false);

  // ── Paragraph shading picker ───────────────────────────────────────────────
  const [shadingPickerOpen, setShadingPickerOpen] = useState(false);

  // ── Table cell color picker ────────────────────────────────────────────────
  const [cellColorPickerOpen, setCellColorPickerOpen] = useState(false);
  const [cellColorTarget, setCellColorTarget] = useState<{ blockId: string; ri: number; ci: number } | null>(null);

  // ── Page view / footnote / translate / drawing state ──────────────────────
  const [pageViewMode, setPageViewMode] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [editingFooter, setEditingFooter] = useState(false);
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [pendingPageSize, setPendingPageSize] = useState<'A4' | 'Letter' | 'Legal'>('A4');
  const [pendingMarginTop, setPendingMarginTop] = useState('36');
  const [pendingMarginRight, setPendingMarginRight] = useState('36');
  const [pendingMarginBottom, setPendingMarginBottom] = useState('36');
  const [pendingMarginLeft, setPendingMarginLeft] = useState('36');
  const [footnoteModalOpen, setFootnoteModalOpen] = useState(false);
  const [footnoteText, setFootnoteText] = useState('');
  const [translateLoading, setTranslateLoading] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);

  // ── Voice / read aloud ─────────────────────────────────────────────────────
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── Track changes (internal suggest mode) ─────────────────────────────────
  const [trackChangesMode, setTrackChangesMode] = useState(false);
  const [internalSuggestions, setInternalSuggestions] = useState<Suggestion[]>(content.suggestions ?? []);

  // ── @mention autocomplete ──────────────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionBlockId, setMentionBlockId] = useState<string | null>(null);

  // Clear suggestion drafts when leaving suggestion mode
  useEffect(() => {
    if (!suggestionMode) setSuggestionDrafts({});
  }, [suggestionMode]);

  // Sync internal suggestions into content whenever they change
  useEffect(() => {
    const current = content.suggestions ?? [];
    const sameLength = current.length === internalSuggestions.length;
    const allMatch = sameLength && internalSuggestions.every((s, i) => current[i]?.id === s.id && current[i]?.proposedText === s.proposedText);
    if (!allMatch) {
      onChange({ ...content, suggestions: internalSuggestions.length > 0 ? internalSuggestions : undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalSuggestions]);

  // Wire dictationAppend: when parent passes new speech text, append it to the focused block
  useEffect(() => {
    if (!dictationAppend || !focusedBlockId) return;
    const block = content.blocks.find((b) => b.id === focusedBlockId);
    if (!block || block.type === 'image' || block.type === 'divider' || block.type === 'table') return;
    const separator = block.text?.endsWith(' ') ? '' : ' ';
    updateBlock(focusedBlockId, { text: (block.text ?? '') + separator + dictationAppend });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictationAppend]);

  const blocks = content.blocks;

  // ── Find match computation ────────────────────────────────────────────────
  const matchedBlockIds = useMemo(() => {
    if (!findText) return [];
    const lower = findText.toLowerCase();
    return blocks
      .filter((b) => b.type !== 'image' && b.type !== 'divider' && b.type !== 'page_break' && b.type !== 'table')
      .filter((b) => b.text.toLowerCase().includes(lower))
      .map((b) => b.id);
  }, [blocks, findText]);

  const safeMatchIdx = matchedBlockIds.length > 0
    ? currentMatchIdx % matchedBlockIds.length
    : 0;

  const currentMatchId = matchedBlockIds[safeMatchIdx] ?? null;

  // ── Word count / reading time / page count / detailed stats ─────────────
  const { wordCount, charCount, readingTime, pageCount, charCountNoSpaces, paragraphCount, headingCount, tableCount, imageCount } = useMemo(() => {
    const textBlocks = blocks.filter(
      (b) => b.type !== 'image' && b.type !== 'divider' && b.type !== 'page_break' && b.type !== 'table'
    );
    const allText = textBlocks.map((b) => b.text).join(' ');
    const words = allText.trim() ? allText.trim().split(/\s+/).length : 0;
    const chars = textBlocks.reduce((acc, b) => acc + b.text.length, 0);
    const charsNoSp = textBlocks.reduce((acc, b) => acc + b.text.replace(/\s/g, '').length, 0);
    const headings = blocks.filter((b) => ['heading', 'heading1', 'heading2', 'heading3'].includes(b.type));
    const paragraphs = blocks.filter((b) => b.type === 'paragraph' && b.text.trim());
    return {
      wordCount: words,
      charCount: chars,
      charCountNoSpaces: charsNoSp,
      readingTime: Math.max(1, Math.round(words / 200)),
      pageCount: Math.max(1, Math.ceil(words / 300)),
      paragraphCount: paragraphs.length,
      headingCount: headings.length,
      tableCount: blocks.filter((b) => b.type === 'table').length,
      imageCount: blocks.filter((b) => b.type === 'image').length,
    };
  }, [blocks]);

  // ── Page grouping (for page view mode) ───────────────────────────────────
  const pages = useMemo<TextBlock[][]>(() => {
    if (!pageViewMode) return [];
    const result: TextBlock[][] = [[]];
    let currentHeight = 0;
    for (const block of blocks) {
      if (block.type === 'page_break') { result.push([]); currentHeight = 0; continue; }
      const h = estimateBlockHeight(block);
      if (currentHeight + h > CONTENT_HEIGHT && result[result.length - 1].length > 0) {
        result.push([]); currentHeight = 0;
      }
      result[result.length - 1].push(block);
      currentHeight += h;
    }
    return result;
  }, [blocks, pageViewMode]);

  // ── Block update helpers ──────────────────────────────────────────────────
  function updateBlock(id: string, updates: Partial<TextBlock>) {
    onChange({
      ...content,
      blocks: blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    });
  }

  function addBlockAfter(id: string) {
    const idx = blocks.findIndex((b) => b.id === id);
    const newBlock: TextBlock = { id: generateId(), type: 'paragraph', text: '' };
    const newBlocks = [...blocks];
    newBlocks.splice(idx + 1, 0, newBlock);
    onChange({ ...content, blocks: newBlocks });
    setTimeout(() => inputRefs.current[newBlock.id]?.focus(), 50);
  }

  function deleteBlock(id: string) {
    if (blocks.length <= 1) return;
    const idx = blocks.findIndex((b) => b.id === id);
    const newBlocks = blocks.filter((b) => b.id !== id);
    onChange({ ...content, blocks: newBlocks });
    if (idx > 0) {
      setTimeout(() => inputRefs.current[newBlocks[idx - 1].id]?.focus(), 50);
    }
  }

  function changeBlockType(id: string, type: BlockType, listType?: 'bullet' | 'ordered' | 'task') {
    updateBlock(id, { type, ...(listType !== undefined ? { listType } : {}) });
  }

  function moveBlock(id: string, toIdx: number) {
    const fromIdx = blocks.findIndex((b) => b.id === id);
    if (fromIdx < 0 || fromIdx === toIdx || fromIdx === toIdx - 1) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(fromIdx, 1);
    const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
    newBlocks.splice(insertAt, 0, moved);
    onChange({ ...content, blocks: newBlocks });
  }

  // ── Find & Replace actions ────────────────────────────────────────────────
  function findNext() {
    if (matchedBlockIds.length === 0) return;
    const nextIdx = (safeMatchIdx + 1) % matchedBlockIds.length;
    setCurrentMatchIdx(nextIdx);
    inputRefs.current[matchedBlockIds[nextIdx]]?.focus();
  }

  function findPrev() {
    if (matchedBlockIds.length === 0) return;
    const prevIdx = (safeMatchIdx - 1 + matchedBlockIds.length) % matchedBlockIds.length;
    setCurrentMatchIdx(prevIdx);
    inputRefs.current[matchedBlockIds[prevIdx]]?.focus();
  }

  function handleReplace() {
    if (!currentMatchId || !findText) return;
    const block = blocks.find((b) => b.id === currentMatchId);
    if (!block) return;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    updateBlock(currentMatchId, { text: block.text.replace(regex, replaceText) });
  }

  function handleReplaceAll() {
    if (!findText) return;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const count = matchedBlockIds.length;
    onChange({
      ...content,
      blocks: blocks.map((b) =>
        matchedBlockIds.includes(b.id)
          ? { ...b, text: b.text.replace(regex, replaceText) }
          : b
      ),
    });
    Alert.alert('Replace All', `${count} occurrence${count !== 1 ? 's' : ''} replaced.`);
    setFindText('');
    setReplaceText('');
    setFindBarOpen(false);
  }

  // ── Image insertion ───────────────────────────────────────────────────────
  async function handleInsertImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library to insert images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('Error', 'Could not read image data.');
      return;
    }

    setUploadingImage(true);
    try {
      const ext = mimeToExt(asset.mimeType ?? 'image/jpeg');
      const path = `documents/${user?.id ?? 'unknown'}/images/${generateId()}.${ext}`;
      const downloadUrl = await uploadImageBase64(asset.base64, path);

      const imageBlock: TextBlock = {
        id: generateId(),
        type: 'image',
        text: '',
        imageUri: downloadUrl,
      };

      const anchorId = focusedBlockId ?? blocks[blocks.length - 1].id;
      const anchorIdx = blocks.findIndex((b) => b.id === anchorId);
      const newBlocks = [...blocks];
      newBlocks.splice(anchorIdx + 1, 0, imageBlock);
      onChange({ ...content, blocks: newBlocks });
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message ?? 'Could not upload image.');
    } finally {
      setUploadingImage(false);
    }
  }

  // ── Table helpers ─────────────────────────────────────────────────────────
  function handleInsertDivider() {
    const block: TextBlock = { id: generateId(), type: 'divider', text: '' };
    const anchorId = focusedBlockId ?? blocks[blocks.length - 1].id;
    const anchorIdx = blocks.findIndex((b) => b.id === anchorId);
    const newBlocks = [...blocks];
    newBlocks.splice(anchorIdx + 1, 0, block);
    onChange({ ...content, blocks: newBlocks });
  }

  function handleInsertPageBreak() {
    const block: TextBlock = { id: generateId(), type: 'page_break', text: '' };
    const anchorId = focusedBlockId ?? blocks[blocks.length - 1].id;
    const anchorIdx = blocks.findIndex((b) => b.id === anchorId);
    const newBlocks = [...blocks];
    newBlocks.splice(anchorIdx + 1, 0, block);
    onChange({ ...content, blocks: newBlocks });
  }

  function handleInsertTable() {
    const ROWS = 2;
    const COLS = 3;
    const tableBlock: TextBlock = {
      id: generateId(),
      type: 'table',
      text: '',
      tableData: {
        rows: ROWS,
        cols: COLS,
        cells: Array.from({ length: ROWS }, () => Array(COLS).fill('')),
      },
    };
    const anchorId = focusedBlockId ?? blocks[blocks.length - 1].id;
    const anchorIdx = blocks.findIndex((b) => b.id === anchorId);
    const newBlocks = [...blocks];
    newBlocks.splice(anchorIdx + 1, 0, tableBlock);
    onChange({ ...content, blocks: newBlocks });
  }

  function updateTableCell(blockId: string, row: number, col: number, text: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.tableData) return;
    const newCells = block.tableData.cells.map((r, ri) =>
      ri === row ? r.map((c, ci) => (ci === col ? text : c)) : r
    );
    updateBlock(blockId, { tableData: { ...block.tableData, cells: newCells } });
  }

  function addTableRow(blockId: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.tableData) return;
    const newCells = [...block.tableData.cells, Array(block.tableData.cols).fill('')];
    updateBlock(blockId, {
      tableData: { ...block.tableData, rows: block.tableData.rows + 1, cells: newCells },
    });
  }

  function deleteTableRow(blockId: string, rowIdx: number) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.tableData || block.tableData.rows <= 1) return;
    const newCells = block.tableData.cells.filter((_, ri) => ri !== rowIdx);
    updateBlock(blockId, {
      tableData: { ...block.tableData, rows: block.tableData.rows - 1, cells: newCells },
    });
  }

  function addTableColumn(blockId: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.tableData) return;
    const newCells = block.tableData.cells.map((row) => [...row, '']);
    updateBlock(blockId, {
      tableData: { ...block.tableData, cols: block.tableData.cols + 1, cells: newCells },
    });
  }

  function deleteTableColumn(blockId: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.tableData || block.tableData.cols <= 1) return;
    const newCells = block.tableData.cells.map((row) => row.slice(0, -1));
    updateBlock(blockId, {
      tableData: { ...block.tableData, cols: block.tableData.cols - 1, cells: newCells },
    });
  }

  function getMerge(block: TextBlock, ri: number, ci: number) {
    return block.tableData?.merges?.find((m) => m.row === ri && m.col === ci) ?? null;
  }

  function isCoveredByMerge(block: TextBlock, ri: number, ci: number): boolean {
    return !!block.tableData?.merges?.some(
      (m) => m.row === ri && ci > m.col && ci < m.col + m.colSpan
    );
  }

  function mergeCellRight(blockId: string, ri: number, ci: number) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.tableData) return;
    const existing = getMerge(block, ri, ci);
    const currentSpan = existing?.colSpan ?? 1;
    if (ci + currentSpan >= block.tableData.cols) return;
    const merges = block.tableData.merges?.filter((m) => !(m.row === ri && m.col === ci)) ?? [];
    merges.push({ row: ri, col: ci, colSpan: currentSpan + 1 });
    updateBlock(blockId, { tableData: { ...block.tableData, merges } });
  }

  function splitCell(blockId: string, ri: number, ci: number) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.tableData) return;
    const merges = (block.tableData.merges ?? []).filter((m) => !(m.row === ri && m.col === ci));
    updateBlock(blockId, { tableData: { ...block.tableData, merges } });
  }

  function updateTableColWidth(blockId: string, ci: number, width: number) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.tableData) return;
    const newWidths = [...(block.tableData.colWidths ?? Array(block.tableData.cols).fill(110))];
    newWidths[ci] = Math.max(50, Math.round(width));
    updateBlock(blockId, { tableData: { ...block.tableData, colWidths: newWidths } });
  }

  function updateTableCellStyle(blockId: string, ri: number, ci: number, bgColor: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.tableData) return;
    const key = `${ri},${ci}`;
    const newStyles = { ...(block.tableData.cellStyles ?? {}), [key]: { bgColor: bgColor || undefined } };
    updateBlock(blockId, { tableData: { ...block.tableData, cellStyles: newStyles } });
  }

  // ── Comment request ───────────────────────────────────────────────────────
  function handleRequestComment() {
    if (!selectionState || !onCommentRequest) return;
    const block = blocks.find((b) => b.id === selectionState.blockId);
    if (!block) return;
    const selected = block.text.slice(selectionState.start, selectionState.end);
    if (!selected.trim()) return;
    onCommentRequest(selectionState.blockId, selected, selectionState.start, selectionState.end);
  }

  // ── Track changes helpers ─────────────────────────────────────────────────
  function acceptInternalSuggestion(s: Suggestion) {
    if (s.type === 'text_change') updateBlock(s.blockId, { text: s.proposedText ?? '' });
    setInternalSuggestions((prev) => prev.filter((x) => x.id !== s.id));
  }

  function rejectInternalSuggestion(s: Suggestion) {
    setInternalSuggestions((prev) => prev.filter((x) => x.id !== s.id));
  }

  // ── @mention insert ────────────────────────────────────────────────────────
  function insertMention(candidate: { userId: string; displayName: string }) {
    const block = blocks.find((b) => b.id === mentionBlockId);
    if (!block) return;
    const newText = block.text.replace(/@(\w*)$/, `@${candidate.displayName} `);
    const start = newText.indexOf(`@${candidate.displayName}`);
    const end = start + candidate.displayName.length + 1;
    updateBlock(mentionBlockId!, {
      text: newText,
      mentions: [
        ...(block.mentions ?? []),
        { userId: candidate.userId, displayName: candidate.displayName, start, end },
      ],
    });
    setMentionQuery(null);
    setMentionBlockId(null);
  }

  // ── Table of contents insertion ───────────────────────────────────────────
  function handleInsertTOC() {
    const headings = blocks.filter(
      (b) => ['heading', 'heading1', 'heading2', 'heading3'].includes(b.type) && b.text.trim()
    );
    if (!headings.length) {
      Alert.alert('No headings', 'Add some headings first to generate a table of contents.');
      return;
    }
    const tocBlocks: TextBlock[] = headings.map((h) => ({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      type: 'paragraph' as BlockType,
      text:
        h.type === 'heading3'
          ? `      • ${h.text}`
          : h.type === 'heading2'
          ? `  • ${h.text}`
          : `• ${h.text}`,
      bold: h.type === 'heading' || h.type === 'heading1',
    }));
    const insertAfter = focusedBlockId ?? blocks[0]?.id;
    const insertIdx = insertAfter ? blocks.findIndex((b) => b.id === insertAfter) + 1 : 0;
    const newBlocks = [
      ...blocks.slice(0, insertIdx),
      ...tocBlocks,
      ...blocks.slice(insertIdx),
    ];
    onChange({ ...content, blocks: newBlocks });
  }

  // ── Footnote insertion ────────────────────────────────────────────────────
  function handleInsertFootnote() {
    if (!focusedBlockId) return;
    const nextMarker = String((content.footnotes?.length ?? 0) + 1);
    const newFootnote = { id: Date.now().toString(36), marker: nextMarker, text: footnoteText.trim() };
    onChange({
      ...content,
      blocks: blocks.map((b) => b.id === focusedBlockId ? { ...b, footnoteRef: nextMarker } : b),
      footnotes: [...(content.footnotes ?? []), newFootnote],
    });
    setFootnoteModalOpen(false);
    setFootnoteText('');
  }

  // ── Voice typing (keyboard dictation) ─────────────────────────────────────
  function handleVoiceType() {
    Alert.alert(
      'Voice Typing',
      'Tap the microphone \uD83C\uDFA4 on your keyboard to dictate. Text will be inserted at your cursor.',
      [
        {
          text: 'Got it', onPress: () => {
            const lastBlock = blocks[blocks.length - 1];
            if (lastBlock && !isReadOnly) addBlockAfter(lastBlock.id);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  // ── Read aloud ─────────────────────────────────────────────────────────────
  async function handleReadAloud() {
    if (isSpeaking) {
      await Speech.stop();
      setIsSpeaking(false);
      return;
    }
    const text = blocks
      .filter((b) => b.type !== 'divider' && b.type !== 'page_break' && b.type !== 'image' && b.type !== 'table')
      .map((b) => b.text)
      .join('. ');
    if (!text.trim()) return;
    setIsSpeaking(true);
    Speech.speak(text, {
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }

  // ── Paste plain text from clipboard ──────────────────────────────────────
  async function handlePastePlainText() {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text?.trim()) { Alert.alert('Empty clipboard', 'No text found.'); return; }
      const anchorIdx = focusedBlockId ? blocks.findIndex((b) => b.id === focusedBlockId) : blocks.length - 1;
      const newBlocks: TextBlock[] = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => ({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        type: 'paragraph' as const,
        text: p.replace(/\n/g, ' '),
      }));
      if (!newBlocks.length) return;
      const updated = [...blocks];
      updated.splice(anchorIdx + 1, 0, ...newBlocks);
      onChange({ ...content, blocks: updated });
    } catch { Alert.alert('Paste failed', 'Could not read clipboard.'); }
  }

  // ── Translate document ────────────────────────────────────────────────────
  function handleTranslate() {
    Alert.alert('Translate Document', 'Select target language:', [
      ...TRANSLATE_LANGUAGES.map((lang) => ({
        text: lang,
        onPress: async () => {
          setTranslateLoading(true);
          try {
            const textBlocks = blocks.filter((b) => b.text.trim());
            const fullText = textBlocks.map((b) => b.text).join('\n\n');
            const translated = await translateDocument(fullText, lang);
            const paragraphs = translated.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
            const newBlocks = blocks.map((block) => {
              if (!block.text.trim()) return block;
              const idx = textBlocks.findIndex((b) => b.id === block.id);
              const newText = paragraphs[idx];
              return newText ? { ...block, text: newText } : block;
            });
            onChange({ ...content, blocks: newBlocks });
          } catch (err: any) {
            Alert.alert('Translation failed', err?.message ?? 'Could not translate.');
          } finally {
            setTranslateLoading(false);
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // ── Inline highlight segments ─────────────────────────────────────────────
  function getHighlightSegments(text: string, blockId: string) {
    const anchors = (commentAnchors ?? []).filter((a) => a.blockId === blockId);
    if (!anchors.length) return null;
    const ranges: { start: number; end: number }[] = [];
    for (const a of anchors) {
      const idx = text.indexOf(a.anchorText);
      if (idx !== -1) ranges.push({ start: idx, end: idx + a.anchorText.length });
    }
    if (!ranges.length) return null;
    ranges.sort((a, b) => a.start - b.start);
    const segs: { text: string; highlighted: boolean }[] = [];
    let pos = 0;
    for (const r of ranges) {
      if (r.start > pos) segs.push({ text: text.slice(pos, r.start), highlighted: false });
      segs.push({ text: text.slice(r.start, r.end), highlighted: true });
      pos = r.end;
    }
    if (pos < text.length) segs.push({ text: text.slice(pos), highlighted: false });
    return segs;
  }

  // ── Image resize ──────────────────────────────────────────────────────────
  function adjustImageSize(blockId: string, delta: number) {
    setImageSize((prev) => {
      const current = prev[blockId] ?? { width: 320, height: 220 };
      const newWidth = Math.min(600, Math.max(100, current.width + delta));
      const ratio = current.height / current.width;
      return { ...prev, [blockId]: { width: newWidth, height: Math.round(newWidth * ratio) } };
    });
  }

  // ── Toolbar options ───────────────────────────────────────────────────────
  const toolbarTypes: { type: BlockType; label: string; listType?: 'bullet' | 'ordered' | 'task' }[] = [
    { type: 'heading1', label: 'H1' },
    { type: 'heading2', label: 'H2' },
    { type: 'heading3', label: 'H3' },
    { type: 'paragraph', label: 'P' },
    { type: 'bullet',   label: '•' },
    { type: 'numbered', label: '1.' },
    { type: 'list_item', label: '☑', listType: 'task' },
    { type: 'quote',    label: '"' },
    { type: 'code',     label: '</>' },
  ];

  const SPECIAL_CHARS = [
    '©', '®', '™', '§', '¶', '†', '‡', '°', '±', '×', '÷',
    '≤', '≥', '≠', '≈', '∞', '√', 'π', 'Σ', 'Δ', 'Ω',
    '←', '→', '↑', '↓', '↔', '↵',
    '♦', '♠', '♣', '♥', '★', '☆',
    '✓', '✗', '•', '◦', '▸', '▪',
    '\u201C', '\u201D', '\u2018', '\u2019', '«', '»', '…', '—', '–',
  ];

  const alignOptions: { align: 'left' | 'center' | 'right'; label: string }[] = [
    { align: 'left',   label: '⬅' },
    { align: 'center', label: '↔' },
    { align: 'right',  label: '➡' },
  ];

  const TEXT_COLORS = [
    { hex: '', label: 'Default' },
    { hex: '#FFFFFF', label: 'White' },
    { hex: '#EF4444', label: 'Red' },
    { hex: '#F97316', label: 'Orange' },
    { hex: '#EAB308', label: 'Yellow' },
    { hex: '#22C55E', label: 'Green' },
    { hex: '#3B82F6', label: 'Blue' },
    { hex: '#8B5CF6', label: 'Purple' },
    { hex: '#EC4899', label: 'Pink' },
    { hex: '#6B7280', label: 'Gray' },
  ];

  const HIGHLIGHT_COLORS = [
    { hex: '', label: 'None' },
    { hex: '#FFFF00', label: 'Yellow' },
    { hex: '#90EE90', label: 'Green' },
    { hex: '#ADD8E6', label: 'Blue' },
    { hex: '#FFB6C1', label: 'Pink' },
    { hex: '#FFA500', label: 'Orange' },
    { hex: '#E0B0FF', label: 'Lavender' },
  ];

  const FONT_FAMILIES = [
    { key: '', label: 'Default' },
    { key: 'serif', label: 'Serif' },
    { key: 'monospace', label: 'Mono' },
    { key: 'Georgia', label: 'Georgia' },
    { key: 'Courier', label: 'Courier' },
  ];

  const PARA_STYLES: { label: string; description: string; updates: Partial<TextBlock> }[] = [
    { label: 'Normal',     description: 'Default body text',       updates: { type: 'paragraph', fontSize: undefined, bold: undefined, italic: undefined, color: undefined } },
    { label: 'Title',      description: 'H1 — main document title',updates: { type: 'heading1',  fontSize: undefined, bold: true,      italic: undefined, color: undefined } },
    { label: 'Subtitle',   description: 'H2 — subtitle / section', updates: { type: 'heading2',  fontSize: undefined, bold: undefined,  italic: true,      color: Colors.textMuted } },
    { label: 'Heading',    description: 'H2 — section heading',    updates: { type: 'heading2',  fontSize: undefined, bold: true,      italic: undefined, color: undefined } },
    { label: 'Subheading', description: 'H3 — subsection',         updates: { type: 'heading3',  fontSize: undefined, bold: undefined,  italic: undefined, color: undefined } },
    { label: 'Caption',    description: 'Small italic note',        updates: { type: 'paragraph', fontSize: 12,       bold: undefined,  italic: true,      color: Colors.textMuted } },
    { label: 'Code',       description: 'Monospace code block',     updates: { type: 'code',      fontSize: undefined, bold: undefined,  italic: undefined, color: undefined } },
  ];

  // ── Roman numeral helper ──────────────────────────────────────────────────
  function toRoman(n: number): string {
    const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let result = '';
    for (let i = 0; i < vals.length; i++) {
      while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
    }
    return result || 'I';
  }

  // ── Ordered list index for a block (count preceding ordered siblings) ─────
  function getOrderedIndex(blockIdx: number, level: number): number {
    let count = 0;
    for (let i = 0; i < blockIdx; i++) {
      const b = blocks[i];
      const bIsOrdered = b.type === 'numbered' ||
        (b.type === 'list_item' && b.listType === 'ordered');
      if (bIsOrdered && (b.listLevel ?? 0) === level) count++;
    }
    return count + 1;
  }

  const focusedBlock = blocks.find((b) => b.id === focusedBlockId);
  const currentFontSize = focusedBlock?.fontSize ?? (
    focusedBlock?.type === 'heading' ? (HEADING_SIZES[focusedBlock.level ?? 1] ?? 22)
    : (BLOCK_STYLES[focusedBlock?.type ?? 'paragraph']?.fontSize ?? 15)
  );

  return (
    <View style={[styles.container, focusMode && styles.containerFocusMode]}>
      {/* ── Focus mode exit bar ── */}
      {focusMode && !isReadOnly && (
        <TouchableOpacity style={styles.focusModeBar} onPress={() => setFocusMode(false)}>
          <Text style={styles.focusModeBarText}>🎯 Focus Mode — tap to exit</Text>
        </TouchableOpacity>
      )}

      {/* ── Static action bar (always visible when editable) ── */}
      {!isReadOnly && !focusMode && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.actionBarWrap}
          contentContainerStyle={styles.actionBar}
        >
          <TouchableOpacity
            onPress={() => { setFindBarOpen((v) => !v); setFindText(''); setReplaceText(''); }}
            style={[styles.actionBarBtn, findBarOpen && styles.actionBarBtnActive]}
          >
            <Text style={[styles.actionBarBtnText, findBarOpen && styles.actionBarBtnTextActive]}>
              🔍
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleInsertImage}
            style={styles.actionBarBtn}
            disabled={uploadingImage}
          >
            <Text style={styles.actionBarBtnText}>{uploadingImage ? '⏳' : '🖼'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleInsertTable} style={styles.actionBarBtn}>
            <Text style={styles.actionBarBtnText}>⊞</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOutlineVisible(true)} style={styles.actionBarBtn}>
            <Text style={styles.actionBarBtnText}>☰</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleInsertTOC} style={styles.actionBarBtn}>
            <Text style={styles.actionBarBtnText}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleInsertDivider} style={styles.actionBarBtn}>
            <Text style={styles.actionBarBtnText}>—</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleInsertPageBreak} style={styles.actionBarBtn}>
            <Text style={styles.actionBarBtnText}>⊟</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSpecialCharsOpen((v) => !v)}
            style={[styles.actionBarBtn, specialCharsOpen && styles.actionBarBtnActive]}
          >
            <Text style={[styles.actionBarBtnText, specialCharsOpen && styles.actionBarBtnTextActive]}>Ω</Text>
          </TouchableOpacity>

          {/* Named paragraph styles */}
          <TouchableOpacity
            onPress={() => setParaStyleOpen(true)}
            style={styles.actionBarBtn}
          >
            <Text style={styles.actionBarBtnText}>Aa</Text>
          </TouchableOpacity>

          {/* Text zoom */}
          <TouchableOpacity
            onPress={() => setZoomIdx((i) => Math.max(0, i - 1))}
            style={[styles.actionBarBtn, zoomIdx === 0 && styles.actionBarBtnDisabled]}
            disabled={zoomIdx === 0}
          >
            <Text style={styles.actionBarBtnText}>A−</Text>
          </TouchableOpacity>
          <Text style={styles.actionBarZoomLabel}>{Math.round(zoom * 100)}%</Text>
          <TouchableOpacity
            onPress={() => setZoomIdx((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
            style={[styles.actionBarBtn, zoomIdx === ZOOM_LEVELS.length - 1 && styles.actionBarBtnDisabled]}
            disabled={zoomIdx === ZOOM_LEVELS.length - 1}
          >
            <Text style={styles.actionBarBtnText}>A+</Text>
          </TouchableOpacity>

          {/* Text case change */}
          <TouchableOpacity
            onPress={() => {
              if (!focusedBlockId || !focusedBlock) return;
              Alert.alert('Change Case', undefined, [
                { text: 'UPPERCASE', onPress: () => updateBlock(focusedBlockId!, { text: focusedBlock!.text.toUpperCase() }) },
                { text: 'lowercase', onPress: () => updateBlock(focusedBlockId!, { text: focusedBlock!.text.toLowerCase() }) },
                { text: 'Title Case', onPress: () => updateBlock(focusedBlockId!, { text: focusedBlock!.text.replace(/\b\w/g, (c) => c.toUpperCase()) }) },
                { text: 'Sentence case', onPress: () => {
                  const t = focusedBlock!.text;
                  updateBlock(focusedBlockId!, { text: t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() });
                }},
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
            style={styles.actionBarBtn}
          >
            <Text style={styles.actionBarBtnText}>Aa↕</Text>
          </TouchableOpacity>

          {/* Word count dialog */}
          <TouchableOpacity onPress={() => setWordCountModalOpen(true)} style={styles.actionBarBtn}>
            <Text style={styles.actionBarBtnText}>Σ</Text>
          </TouchableOpacity>

          {/* Focus mode */}
          <TouchableOpacity
            onPress={() => setFocusMode((v) => !v)}
            style={[styles.actionBarBtn, focusMode && styles.actionBarBtnActive]}
          >
            <Text style={[styles.actionBarBtnText, focusMode && styles.actionBarBtnTextActive]}>🎯</Text>
          </TouchableOpacity>

          {/* Page view mode */}
          <TouchableOpacity onPress={() => setPageViewMode((v) => !v)} style={[styles.actionBarBtn, pageViewMode && styles.actionBarBtnActive]}>
            <Text style={[styles.actionBarBtnText, pageViewMode && styles.actionBarBtnTextActive]}>📄</Text>
          </TouchableOpacity>

          {/* Header edit (only shown in page view mode) */}
          {pageViewMode && !isReadOnly && (
            <TouchableOpacity
              onPress={() => { setEditingHeader((v) => !v); setEditingFooter(false); }}
              style={[styles.actionBarBtn, editingHeader && styles.actionBarBtnActive]}
            >
              <Text style={[styles.actionBarBtnText, editingHeader && styles.actionBarBtnTextActive]}>⬆H</Text>
            </TouchableOpacity>
          )}

          {/* Footer edit (only shown in page view mode) */}
          {pageViewMode && !isReadOnly && (
            <TouchableOpacity
              onPress={() => { setEditingFooter((v) => !v); setEditingHeader(false); }}
              style={[styles.actionBarBtn, editingFooter && styles.actionBarBtnActive]}
            >
              <Text style={[styles.actionBarBtnText, editingFooter && styles.actionBarBtnTextActive]}>⬇F</Text>
            </TouchableOpacity>
          )}

          {/* Page numbers toggle (only shown in page view mode) */}
          {pageViewMode && !isReadOnly && (
            <TouchableOpacity
              onPress={() => onChange({ ...content, showPageNumbers: !content.showPageNumbers })}
              style={[styles.actionBarBtn, content.showPageNumbers && styles.actionBarBtnActive]}
            >
              <Text style={[styles.actionBarBtnText, content.showPageNumbers && styles.actionBarBtnTextActive]}>#pg</Text>
            </TouchableOpacity>
          )}

          {/* Page settings (only in page view) */}
          {pageViewMode && !isReadOnly && (
            <TouchableOpacity
              onPress={() => {
                setPendingPageSize((content.pageSize as 'A4' | 'Letter' | 'Legal') ?? 'A4');
                setPendingMarginTop(String(content.margins?.top ?? 36));
                setPendingMarginRight(String(content.margins?.right ?? 36));
                setPendingMarginBottom(String(content.margins?.bottom ?? 36));
                setPendingMarginLeft(String(content.margins?.left ?? 36));
                setPageSettingsOpen(true);
              }}
              style={styles.actionBarBtn}
            >
              <Text style={styles.actionBarBtnText}>📐</Text>
            </TouchableOpacity>
          )}

          {/* Insert footnote */}
          <TouchableOpacity onPress={() => setFootnoteModalOpen(true)} style={styles.actionBarBtn}>
            <Text style={styles.actionBarBtnText}>fn</Text>
          </TouchableOpacity>

          {/* Paste plain text */}
          <TouchableOpacity onPress={handlePastePlainText} style={styles.actionBarBtn}>
            <Text style={styles.actionBarBtnText}>⊕</Text>
          </TouchableOpacity>

          {/* Translate */}
          <TouchableOpacity onPress={handleTranslate} style={styles.actionBarBtn} disabled={translateLoading}>
            <Text style={styles.actionBarBtnText}>{translateLoading ? '⏳' : '🌐'}</Text>
          </TouchableOpacity>

          {/* Drawing mode */}
          <TouchableOpacity onPress={() => setDrawingMode((v) => !v)} style={[styles.actionBarBtn, drawingMode && styles.actionBarBtnActive]}>
            <Text style={[styles.actionBarBtnText, drawingMode && styles.actionBarBtnTextActive]}>✏️</Text>
          </TouchableOpacity>

          {/* Track changes toggle */}
          {!isReadOnly && (
            <TouchableOpacity
              onPress={() => setTrackChangesMode((v) => !v)}
              style={[styles.actionBarBtn, trackChangesMode && styles.actionBarBtnActive]}
            >
              <Text style={[styles.actionBarBtnText, trackChangesMode && styles.actionBarBtnTextActive]}>✓±</Text>
            </TouchableOpacity>
          )}

          {/* Voice typing */}
          {!isReadOnly && (
            <TouchableOpacity onPress={handleVoiceType} style={styles.actionBarBtn}>
              <Text style={styles.actionBarBtnText}>🎤</Text>
            </TouchableOpacity>
          )}

          {/* Read aloud */}
          <TouchableOpacity
            onPress={handleReadAloud}
            style={[styles.actionBarBtn, isSpeaking && styles.actionBarBtnActive]}
          >
            <Text style={[styles.actionBarBtnText, isSpeaking && styles.actionBarBtnTextActive]}>
              {isSpeaking ? '⏹' : '🔊'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Header edit bar ── */}
      {editingHeader && pageViewMode && (
        <View style={styles.headerEditBar}>
          <Text style={styles.headerEditLabel}>Header:</Text>
          <TextInput
            value={content.header ?? ''}
            onChangeText={(t) => onChange({ ...content, header: t })}
            placeholder="Document header text…"
            placeholderTextColor={Colors.textDim}
            style={styles.headerEditInput}
          />
        </View>
      )}

      {/* ── Footer edit bar ── */}
      {editingFooter && pageViewMode && (
        <View style={styles.headerEditBar}>
          <Text style={styles.headerEditLabel}>Footer:</Text>
          <TextInput
            value={content.footer ?? ''}
            onChangeText={(t) => onChange({ ...content, footer: t })}
            placeholder="Document footer text…"
            placeholderTextColor={Colors.textDim}
            style={styles.headerEditInput}
          />
        </View>
      )}

      {/* ── Special characters picker ── */}
      {specialCharsOpen && !isReadOnly && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorPickerBar}
          contentContainerStyle={[styles.colorPickerContent, { gap: 2 }]}
        >
          {SPECIAL_CHARS.map((char) => (
            <TouchableOpacity
              key={char}
              onPress={() => {
                if (!focusedBlockId || !focusedBlock) return;
                updateBlock(focusedBlockId, { text: focusedBlock.text + char });
              }}
              style={[styles.toolbarButton, { minWidth: 28 }]}
            >
              <Text style={[styles.toolbarLabel, { fontSize: 16 }]}>{char}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── @mention dropdown ── */}
      {mentionQuery !== null && mentionCandidates.length > 0 && (
        <View style={styles.mentionDropdown}>
          {mentionCandidates
            .filter((c) => c.displayName.toLowerCase().startsWith(mentionQuery.toLowerCase()))
            .slice(0, 5)
            .map((c) => (
              <TouchableOpacity key={c.userId} onPress={() => insertMention(c)} style={styles.mentionItem}>
                <Text style={styles.mentionItemText}>@{c.displayName}</Text>
              </TouchableOpacity>
            ))}
        </View>
      )}

      {/* ── Find & Replace bar ── */}
      {findBarOpen && !isReadOnly && (
        <View style={styles.findBar}>
          {/* Row 1: Find */}
          <View style={styles.findRow}>
            <TextInput
              style={styles.findInput}
              value={findText}
              onChangeText={(t) => { setFindText(t); setCurrentMatchIdx(0); }}
              placeholder="Find…"
              placeholderTextColor={Colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={findNext}
            />
            <Text style={styles.matchCount}>
              {matchedBlockIds.length > 0 ? `${safeMatchIdx + 1}/${matchedBlockIds.length}` : findText ? '0/0' : ''}
            </Text>
            <TouchableOpacity onPress={findPrev} style={styles.findNavBtn}>
              <Text style={styles.findNavBtnText}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={findNext} style={styles.findNavBtn}>
              <Text style={styles.findNavBtnText}>▼</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setFindBarOpen(false); setFindText(''); setReplaceText(''); }}
              style={styles.findNavBtn}
            >
              <Text style={styles.findNavBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          {/* Row 2: Replace */}
          <View style={styles.findRow}>
            <TextInput
              style={[styles.findInput, { flex: 1 }]}
              value={replaceText}
              onChangeText={setReplaceText}
              placeholder="Replace with…"
              placeholderTextColor={Colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={handleReplace}
              style={[styles.replaceBtn, !currentMatchId && styles.replaceBtnDisabled]}
              disabled={!currentMatchId}
            >
              <Text style={styles.replaceBtnText}>Replace</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleReplaceAll}
              style={[styles.replaceBtn, matchedBlockIds.length === 0 && styles.replaceBtnDisabled]}
              disabled={matchedBlockIds.length === 0}
            >
              <Text style={styles.replaceBtnText}>All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Formatting toolbar (only when a block is focused) ── */}
      {(showToolbar || linkInputOpen) && !isReadOnly && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.toolbar}
          contentContainerStyle={styles.toolbarContent}
        >
          {toolbarTypes.map(({ type, label, listType }) => {
            const isActive = focusedBlock?.type === type &&
              (!listType || focusedBlock?.listType === listType);
            return (
              <TouchableOpacity
                key={`${type}-${listType ?? ''}`}
                onPress={() => focusedBlockId && changeBlockType(focusedBlockId, type, listType)}
                style={[styles.toolbarButton, isActive && styles.toolbarButtonActive]}
              >
                <Text style={[styles.toolbarLabel, isActive && styles.toolbarLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.toolbarDivider} />

          {(['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript'] as const).map((fmt) => {
            const fmtLabel: Record<string, string> = {
              bold: 'B', italic: 'I', underline: 'U', strikethrough: 'S',
              superscript: 'x²', subscript: 'x₂',
            };
            return (
              <TouchableOpacity
                key={fmt}
                onPress={() =>
                  focusedBlockId &&
                  updateBlock(focusedBlockId, { [fmt]: !focusedBlock?.[fmt] })
                }
                style={[
                  styles.toolbarButton,
                  focusedBlock?.[fmt] && styles.toolbarButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.toolbarLabel,
                    focusedBlock?.[fmt] && styles.toolbarLabelActive,
                    fmt === 'bold' && { fontWeight: '700' },
                    fmt === 'italic' && { fontStyle: 'italic' },
                    fmt === 'underline' && { textDecorationLine: 'underline' },
                    fmt === 'strikethrough' && { textDecorationLine: 'line-through' },
                  ]}
                >
                  {fmtLabel[fmt]}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Text color picker toggle */}
          <TouchableOpacity
            onPress={() => { setColorPickerOpen((v) => !v); setLinkInputOpen(false); setSpacingPickerOpen(false); setHighlightPickerOpen(false); setFontPickerOpen(false); setListStylePickerOpen(false); setBookmarkInputOpen(false); }}
            style={[styles.toolbarButton, colorPickerOpen && styles.toolbarButtonActive]}
          >
            <Text style={[styles.toolbarLabel, colorPickerOpen && styles.toolbarLabelActive]}>
              A{focusedBlock?.color ? '●' : ''}
            </Text>
          </TouchableOpacity>

          {/* Highlight color picker toggle */}
          <TouchableOpacity
            onPress={() => { setHighlightPickerOpen((v) => !v); setColorPickerOpen(false); setShadingPickerOpen(false); setSpacingPickerOpen(false); setFontPickerOpen(false); setLinkInputOpen(false); setListStylePickerOpen(false); setBookmarkInputOpen(false); }}
            style={[styles.toolbarButton, highlightPickerOpen && styles.toolbarButtonActive]}
          >
            <Text style={[styles.toolbarLabel, highlightPickerOpen && styles.toolbarLabelActive]}>
              H{focusedBlock?.highlight ? '●' : ''}
            </Text>
          </TouchableOpacity>

          {/* Paragraph shading toggle */}
          <TouchableOpacity
            onPress={() => { setShadingPickerOpen((v) => !v); setHighlightPickerOpen(false); setColorPickerOpen(false); setSpacingPickerOpen(false); setFontPickerOpen(false); setLinkInputOpen(false); setListStylePickerOpen(false); setBookmarkInputOpen(false); }}
            style={[styles.toolbarButton, shadingPickerOpen && styles.toolbarButtonActive]}
          >
            <Text style={[styles.toolbarLabel, shadingPickerOpen && styles.toolbarLabelActive]}>
              ¶{focusedBlock?.shading ? '●' : ''}
            </Text>
          </TouchableOpacity>

          {/* Font family picker toggle */}
          <TouchableOpacity
            onPress={() => { setFontPickerOpen((v) => !v); setColorPickerOpen(false); setHighlightPickerOpen(false); setSpacingPickerOpen(false); setLinkInputOpen(false); setListStylePickerOpen(false); setBookmarkInputOpen(false); }}
            style={[styles.toolbarButton, fontPickerOpen && styles.toolbarButtonActive]}
          >
            <Text style={[styles.toolbarLabel, fontPickerOpen && styles.toolbarLabelActive]}>Ff</Text>
          </TouchableOpacity>

          {/* Line spacing picker toggle */}
          <TouchableOpacity
            onPress={() => { setSpacingPickerOpen((v) => !v); setColorPickerOpen(false); setHighlightPickerOpen(false); setFontPickerOpen(false); setLinkInputOpen(false); setListStylePickerOpen(false); setBookmarkInputOpen(false); }}
            style={[styles.toolbarButton, spacingPickerOpen && styles.toolbarButtonActive]}
          >
            <Text style={[styles.toolbarLabel, spacingPickerOpen && styles.toolbarLabelActive]}>≡</Text>
          </TouchableOpacity>

          <View style={styles.toolbarDivider} />

          {/* Font size controls */}
          <TouchableOpacity
            onPress={() => focusedBlockId && updateBlock(focusedBlockId, { fontSize: Math.max(8, currentFontSize - 2) })}
            style={styles.toolbarButton}
          >
            <Text style={styles.toolbarLabel}>A-</Text>
          </TouchableOpacity>
          <Text style={[styles.toolbarLabel, { minWidth: 24, textAlign: 'center' }]}>
            {currentFontSize}
          </Text>
          <TouchableOpacity
            onPress={() => focusedBlockId && updateBlock(focusedBlockId, { fontSize: Math.min(72, currentFontSize + 2) })}
            style={styles.toolbarButton}
          >
            <Text style={styles.toolbarLabel}>A+</Text>
          </TouchableOpacity>

          <View style={styles.toolbarDivider} />

          {alignOptions.map(({ align, label }) => (
            <TouchableOpacity
              key={align}
              onPress={() => focusedBlockId && updateBlock(focusedBlockId, { align })}
              style={[
                styles.toolbarButton,
                (focusedBlock?.align ?? 'left') === align && styles.toolbarButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toolbarLabel,
                  (focusedBlock?.align ?? 'left') === align && styles.toolbarLabelActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* RTL text direction toggle */}
          <View style={styles.toolbarDivider} />
          <TouchableOpacity
            onPress={() => focusedBlockId && updateBlock(focusedBlockId, {
              textDirection: focusedBlock?.textDirection === 'rtl' ? undefined : 'rtl',
            })}
            style={[styles.toolbarButton, focusedBlock?.textDirection === 'rtl' && styles.toolbarButtonActive]}
          >
            <Text style={[styles.toolbarLabel, focusedBlock?.textDirection === 'rtl' && styles.toolbarLabelActive]}>⇆</Text>
          </TouchableOpacity>

          {/* List indent/outdent + style — only for list blocks */}
          {focusedBlock && ['bullet', 'numbered', 'list_item'].includes(focusedBlock.type) && (
            <>
              <View style={styles.toolbarDivider} />
              <TouchableOpacity
                onPress={() => focusedBlockId && updateBlock(focusedBlockId, {
                  listLevel: Math.max(0, (focusedBlock.listLevel ?? 0) - 1),
                })}
                style={styles.toolbarButton}
              >
                <Text style={styles.toolbarLabel}>⇤</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => focusedBlockId && updateBlock(focusedBlockId, {
                  listLevel: Math.min(4, (focusedBlock.listLevel ?? 0) + 1),
                })}
                style={styles.toolbarButton}
              >
                <Text style={styles.toolbarLabel}>⇥</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setListStylePickerOpen((v) => !v); setColorPickerOpen(false); setHighlightPickerOpen(false); setFontPickerOpen(false); setSpacingPickerOpen(false); setLinkInputOpen(false); setBookmarkInputOpen(false); }}
                style={[styles.toolbarButton, listStylePickerOpen && styles.toolbarButtonActive]}
              >
                <Text style={[styles.toolbarLabel, listStylePickerOpen && styles.toolbarLabelActive]}>⊙</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.toolbarDivider} />

          {/* Hyperlink toggle */}
          <TouchableOpacity
            onPress={() => {
              const next = !linkInputOpen;
              setLinkInputOpen(next);
              setColorPickerOpen(false);
              setListStylePickerOpen(false);
              setBookmarkInputOpen(false);
              if (next) setLinkInputValue(focusedBlock?.linkUrl ?? '');
            }}
            style={[
              styles.toolbarButton,
              (linkInputOpen || !!focusedBlock?.linkUrl) && styles.toolbarButtonActive,
            ]}
          >
            <Text
              style={[
                styles.toolbarLabel,
                (linkInputOpen || !!focusedBlock?.linkUrl) && styles.toolbarLabelActive,
              ]}
            >
              🔗
            </Text>
          </TouchableOpacity>

          {/* Bookmark */}
          <TouchableOpacity
            onPress={() => {
              const next = !bookmarkInputOpen;
              setBookmarkInputOpen(next);
              setLinkInputOpen(false);
              setListStylePickerOpen(false);
              setColorPickerOpen(false);
              if (next) setBookmarkInputValue(focusedBlock?.bookmark ?? '');
            }}
            style={[styles.toolbarButton, (bookmarkInputOpen || !!focusedBlock?.bookmark) && styles.toolbarButtonActive]}
          >
            <Text style={[styles.toolbarLabel, (bookmarkInputOpen || !!focusedBlock?.bookmark) && styles.toolbarLabelActive]}>
              🔖
            </Text>
          </TouchableOpacity>

          {/* Format painter */}
          <View style={styles.toolbarDivider} />
          <TouchableOpacity
            onPress={() => {
              if (!focusedBlockId) return;
              const b = blocks.find((bl) => bl.id === focusedBlockId);
              if (!b) return;
              setCopiedFormat({
                bold: b.bold, italic: b.italic, underline: b.underline,
                strikethrough: b.strikethrough, color: b.color, highlight: b.highlight,
                fontFamily: b.fontFamily, fontSize: b.fontSize, align: b.align,
              });
              setFormatPainterActive(true);
            }}
            style={[styles.toolbarButton, formatPainterActive && styles.toolbarButtonActive]}
          >
            <Text style={[styles.toolbarLabel, formatPainterActive && styles.toolbarLabelActive]}>🖌</Text>
          </TouchableOpacity>

          {/* Clear formatting */}
          <TouchableOpacity
            onPress={() =>
              focusedBlockId &&
              updateBlock(focusedBlockId, {
                bold: undefined, italic: undefined, underline: undefined,
                strikethrough: undefined, superscript: undefined, subscript: undefined,
                color: undefined, highlight: undefined, fontFamily: undefined, fontSize: undefined,
              })
            }
            style={styles.toolbarButton}
          >
            <Text style={styles.toolbarLabel}>T×</Text>
          </TouchableOpacity>

          {/* Comment on selection — only shown when there's an active text selection */}
          {onCommentRequest && selectionState && selectionState.start !== selectionState.end && (
            <>
              <View style={styles.toolbarDivider} />
              <TouchableOpacity onPress={handleRequestComment} style={styles.toolbarButton}>
                <Text style={styles.toolbarLabel}>💬</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Voice input hint — focuses block then shows OS keyboard mic tip */}
          {focusedBlockId && (
            <>
              <View style={styles.toolbarDivider} />
              <TouchableOpacity
                onPress={() => Alert.alert('Voice Input', 'Tap the microphone key on your keyboard to dictate text into this block.', [{ text: 'OK' }])}
                style={styles.toolbarButton}
              >
                <Text style={styles.toolbarLabel}>🎤</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {/* ── Color picker row (shown when colorPickerOpen) ── */}
      {colorPickerOpen && (showToolbar || linkInputOpen) && !isReadOnly && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorPickerBar}
          contentContainerStyle={styles.colorPickerContent}
        >
          {TEXT_COLORS.map(({ hex, label }) => (
            <TouchableOpacity
              key={label}
              onPress={() => focusedBlockId && updateBlock(focusedBlockId, { color: hex || undefined })}
              style={[
                styles.colorSwatch,
                { backgroundColor: hex || Colors.surfaceHigh },
                (focusedBlock?.color ?? '') === hex && styles.colorSwatchActive,
              ]}
            >
              {!hex && (
                <Text style={styles.colorSwatchDefault}>✕</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Highlight color picker row ── */}
      {highlightPickerOpen && (showToolbar || linkInputOpen) && !isReadOnly && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorPickerBar}
          contentContainerStyle={styles.colorPickerContent}
        >
          {HIGHLIGHT_COLORS.map(({ hex, label }) => (
            <TouchableOpacity
              key={label}
              onPress={() => focusedBlockId && updateBlock(focusedBlockId, { highlight: hex || undefined })}
              style={[
                styles.colorSwatch,
                { backgroundColor: hex || Colors.surfaceHigh },
                (focusedBlock?.highlight ?? '') === hex && styles.colorSwatchActive,
              ]}
            >
              {!hex && <Text style={styles.colorSwatchDefault}>✕</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Paragraph shading color picker row ── */}
      {shadingPickerOpen && (showToolbar || linkInputOpen) && !isReadOnly && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorPickerBar}
          contentContainerStyle={styles.colorPickerContent}
        >
          {[
            { hex: '', label: 'None' },
            { hex: '#FFF9C4', label: 'Yellow' },
            { hex: '#E8F5E9', label: 'Green' },
            { hex: '#E3F2FD', label: 'Blue' },
            { hex: '#FCE4EC', label: 'Pink' },
            { hex: '#F3E5F5', label: 'Purple' },
            { hex: '#FBE9E7', label: 'Orange' },
            { hex: '#F5F5F5', label: 'Gray' },
          ].map(({ hex, label }) => (
            <TouchableOpacity
              key={label}
              onPress={() => focusedBlockId && updateBlock(focusedBlockId, { shading: hex || undefined })}
              style={[
                styles.colorSwatch,
                { backgroundColor: hex || Colors.surfaceHigh },
                (focusedBlock?.shading ?? '') === hex && styles.colorSwatchActive,
              ]}
            >
              {!hex && <Text style={styles.colorSwatchDefault}>✕</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Font family picker row ── */}
      {fontPickerOpen && (showToolbar || linkInputOpen) && !isReadOnly && (
        <View style={styles.spacingPickerBar}>
          {FONT_FAMILIES.map(({ key, label }) => (
            <TouchableOpacity
              key={key || 'default'}
              onPress={() => focusedBlockId && updateBlock(focusedBlockId, { fontFamily: key || undefined })}
              style={[
                styles.spacingOption,
                (focusedBlock?.fontFamily ?? '') === key && styles.spacingOptionActive,
              ]}
            >
              <Text style={[
                styles.spacingOptionText,
                (focusedBlock?.fontFamily ?? '') === key && styles.spacingOptionTextActive,
                key ? { fontFamily: key } : {},
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Spacing picker (line + before/after) ── */}
      {spacingPickerOpen && (showToolbar || linkInputOpen) && !isReadOnly && (
        <View style={styles.spacingPickerPanel}>
          {/* Line spacing */}
          <View style={styles.spacingRow}>
            <Text style={styles.spacingRowLabel}>≡</Text>
            {([
              { label: '1×', line: 1.0 },
              { label: '1.15×', line: 1.15 },
              { label: '1.5×', line: 1.5 },
              { label: '2×', line: 2.0 },
            ] as const).map(({ label, line }) => (
              <TouchableOpacity
                key={label}
                onPress={() => focusedBlockId && updateBlock(focusedBlockId, {
                  spacing: { before: focusedBlock?.spacing?.before ?? 0, after: focusedBlock?.spacing?.after ?? 0, line },
                })}
                style={[styles.spacingOption, (focusedBlock?.spacing?.line ?? 1) === line && styles.spacingOptionActive]}
              >
                <Text style={[styles.spacingOptionText, (focusedBlock?.spacing?.line ?? 1) === line && styles.spacingOptionTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Space before */}
          <View style={styles.spacingRow}>
            <Text style={styles.spacingRowLabel}>↑</Text>
            {[0, 6, 12, 18].map((pt) => (
              <TouchableOpacity
                key={pt}
                onPress={() => focusedBlockId && updateBlock(focusedBlockId, {
                  spacing: { line: focusedBlock?.spacing?.line ?? 1, after: focusedBlock?.spacing?.after ?? 0, before: pt },
                })}
                style={[styles.spacingOption, (focusedBlock?.spacing?.before ?? 0) === pt && styles.spacingOptionActive]}
              >
                <Text style={[styles.spacingOptionText, (focusedBlock?.spacing?.before ?? 0) === pt && styles.spacingOptionTextActive]}>
                  {pt === 0 ? 'None' : `${pt}pt`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Space after */}
          <View style={styles.spacingRow}>
            <Text style={styles.spacingRowLabel}>↓</Text>
            {[0, 6, 12, 18].map((pt) => (
              <TouchableOpacity
                key={pt}
                onPress={() => focusedBlockId && updateBlock(focusedBlockId, {
                  spacing: { line: focusedBlock?.spacing?.line ?? 1, before: focusedBlock?.spacing?.before ?? 0, after: pt },
                })}
                style={[styles.spacingOption, (focusedBlock?.spacing?.after ?? 0) === pt && styles.spacingOptionActive]}
              >
                <Text style={[styles.spacingOptionText, (focusedBlock?.spacing?.after ?? 0) === pt && styles.spacingOptionTextActive]}>
                  {pt === 0 ? 'None' : `${pt}pt`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── List style picker row ── */}
      {listStylePickerOpen && (showToolbar || linkInputOpen) && !isReadOnly &&
        focusedBlock && ['bullet', 'numbered', 'list_item'].includes(focusedBlock.type) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorPickerBar}
          contentContainerStyle={[styles.colorPickerContent, { gap: Spacing.xs }]}
        >
          {(focusedBlock.type === 'bullet' || (focusedBlock.type === 'list_item' && focusedBlock.listType !== 'ordered')
            ? [
                { value: 'disc' as const, label: '•' },
                { value: 'circle' as const, label: '◦' },
                { value: 'square' as const, label: '▪' },
              ]
            : [
                { value: 'decimal' as const, label: '1.' },
                { value: 'lower-alpha' as const, label: 'a.' },
                { value: 'upper-alpha' as const, label: 'A.' },
                { value: 'lower-roman' as const, label: 'i.' },
                { value: 'upper-roman' as const, label: 'I.' },
              ]
          ).map(({ value, label }) => {
            const isActive = (focusedBlock.listStyle ?? 'disc') === value ||
              (!focusedBlock.listStyle && value === 'disc') ||
              (!focusedBlock.listStyle && value === 'decimal' &&
                (focusedBlock.type === 'numbered' || focusedBlock.listType === 'ordered'));
            return (
              <TouchableOpacity
                key={value}
                onPress={() => focusedBlockId && updateBlock(focusedBlockId, { listStyle: value })}
                style={[styles.spacingOption, isActive && styles.spacingOptionActive]}
              >
                <Text style={[styles.spacingOptionText, isActive && styles.spacingOptionTextActive, { fontSize: 14 }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Bookmark input row ── */}
      {bookmarkInputOpen && !isReadOnly && (
        <View style={styles.linkInputRow}>
          <TextInput
            style={styles.linkInput}
            value={bookmarkInputValue}
            onChangeText={setBookmarkInputValue}
            placeholder="Bookmark name…"
            placeholderTextColor={Colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (focusedBlockId) updateBlock(focusedBlockId, { bookmark: bookmarkInputValue.trim() || undefined });
              setBookmarkInputOpen(false);
            }}
          />
          <TouchableOpacity
            onPress={() => {
              if (focusedBlockId) updateBlock(focusedBlockId, { bookmark: bookmarkInputValue.trim() || undefined });
              setBookmarkInputOpen(false);
            }}
            style={styles.linkApplyBtn}
          >
            <Text style={styles.linkApplyBtnText}>Set</Text>
          </TouchableOpacity>
          {focusedBlock?.bookmark ? (
            <TouchableOpacity
              onPress={() => {
                if (focusedBlockId) updateBlock(focusedBlockId, { bookmark: undefined });
                setBookmarkInputOpen(false);
              }}
              style={styles.linkRemoveBtn}
            >
              <Text style={styles.linkRemoveBtnText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* ── Link URL input row ── */}
      {linkInputOpen && !isReadOnly && (
        <View style={styles.linkInputRow}>
          <TextInput
            style={styles.linkInput}
            value={linkInputValue}
            onChangeText={setLinkInputValue}
            placeholder="https://..."
            placeholderTextColor={Colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            onSubmitEditing={() => {
              if (focusedBlockId) updateBlock(focusedBlockId, { linkUrl: linkInputValue.trim() || undefined });
              setLinkInputOpen(false);
            }}
          />
          <TouchableOpacity
            onPress={() => {
              if (focusedBlockId) updateBlock(focusedBlockId, { linkUrl: linkInputValue.trim() || undefined });
              setLinkInputOpen(false);
            }}
            style={styles.linkApplyBtn}
          >
            <Text style={styles.linkApplyBtnText}>Apply</Text>
          </TouchableOpacity>
          {focusedBlock?.linkUrl ? (
            <TouchableOpacity
              onPress={() => {
                if (focusedBlockId) updateBlock(focusedBlockId, { linkUrl: undefined });
                setLinkInputOpen(false);
              }}
              style={styles.linkRemoveBtn}
            >
              <Text style={styles.linkRemoveBtnText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* ── Sticky header (shows first H1 text when scrolled past it) ── */}
      {(() => {
        const h1Block = blocks.find(
          (b) => b.type === 'heading1' || (b.type === 'heading' && (b.level ?? 1) === 1)
        );
        const h1Y = h1Block ? (blockLayouts.current[h1Block.id] ?? Infinity) : Infinity;
        if (!h1Block || scrollY <= h1Y + 40 || !h1Block.text.trim()) return null;
        return (
          <View style={styles.stickyHeader}>
            <Text style={styles.stickyHeaderText} numberOfLines={1}>{h1Block.text}</Text>
          </View>
        );
      })()}

      {/* ── Blocks ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={pageViewMode ? styles.pageScrollContent : styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onScroll={({ nativeEvent }) => setScrollY(nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {pageViewMode ? (
          pages.map((pageBlocks, pageIdx) => (
            <View key={pageIdx} style={[styles.page, getPageStyle(content.pageSize, content.margins)]}>
              {(content.header || editingHeader) && (
                <View style={styles.pageHeaderArea}>
                  <Text style={styles.pageHeaderText}>{content.header ?? ''}</Text>
                </View>
              )}
              {pageBlocks.map((block) => {
                const bs = BLOCK_STYLES[block.type] ?? BLOCK_STYLES.paragraph;
                const isList = block.type === 'bullet' || block.type === 'numbered' || block.type === 'list_item';
                return (
                  <Text
                    key={block.id}
                    selectable
                    style={{
                      fontSize: bs.fontSize,
                      fontWeight: bs.fontWeight as any,
                      color: block.color ?? Colors.text,
                      fontStyle: block.italic ? 'italic' : 'normal',
                      textDecorationLine: block.underline ? 'underline' : block.strikethrough ? 'line-through' : 'none',
                      paddingLeft: isList ? 20 : 0,
                      marginBottom: block.spacing?.after ?? 4,
                      textAlign: (block.align ?? 'left') as any,
                    }}
                  >
                    {isList ? '• ' : ''}{block.text}
                  </Text>
                );
              })}
              <View style={styles.pageFooterArea}>
                {content.footer ? <Text style={styles.pageFooterText}>{content.footer}</Text> : <View />}
                {content.showPageNumbers && <Text style={styles.pageNumberText}>{pageIdx + 1}</Text>}
              </View>
            </View>
          ))
        ) : (
          <>
        {blocks.map((block, index) => {
          const isHighlighted = findBarOpen && block.id === currentMatchId;

          // ── Divider ───────────────────────────────────────────────────────
          if (block.type === 'divider') {
            const isDivSelected = selectedDividerId === block.id;
            const divStyle = block.dividerStyle ?? 'thin';
            return (
              <React.Fragment key={block.id}>
                {dropTargetIdx === index && draggingBlockId && <View style={styles.dropIndicator} />}
                <DraggableBlockWrapper
                  blockId={block.id} index={index} isReadOnly={isReadOnly}
                  draggingBlockId={draggingBlockId} setDraggingBlockId={setDraggingBlockId}
                  setDropTargetIdx={setDropTargetIdx} dropTargetIdxRef={dropTargetIdxRef}
                  blockLayouts={blockLayouts} blocks={blocks} moveBlock={moveBlock}
                >
                  <View>
                    <TouchableOpacity
                      style={styles.dividerRow}
                      onPress={() => !isReadOnly && setSelectedDividerId(isDivSelected ? null : block.id)}
                      activeOpacity={isReadOnly ? 1 : 0.7}
                    >
                      <View style={[
                        styles.dividerLine,
                        divStyle === 'thick' && styles.dividerLineThick,
                        divStyle === 'dashed' && styles.dividerLineDashed,
                        divStyle === 'dotted' && styles.dividerLineDotted,
                      ]} />
                    </TouchableOpacity>
                    {isDivSelected && !isReadOnly && (
                      <View style={styles.dividerStyleBar}>
                        {(['thin', 'thick', 'dashed', 'dotted'] as const).map((s) => (
                          <TouchableOpacity
                            key={s}
                            onPress={() => updateBlock(block.id, { dividerStyle: s })}
                            style={[styles.dividerStyleBtn, divStyle === s && styles.dividerStyleBtnActive]}
                          >
                            <Text style={[styles.dividerStyleBtnText, divStyle === s && styles.dividerStyleBtnTextActive]}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          onPress={() => { deleteBlock(block.id); setSelectedDividerId(null); }}
                          style={[styles.dividerStyleBtn, styles.dividerStyleDeleteBtn]}
                        >
                          <Text style={[styles.dividerStyleBtnText, { color: Colors.danger }]}>✕ Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </DraggableBlockWrapper>
              </React.Fragment>
            );
          }

          // ── Page break ────────────────────────────────────────────────────
          if (block.type === 'page_break') {
            return (
              <React.Fragment key={block.id}>
                {dropTargetIdx === index && draggingBlockId && <View style={styles.dropIndicator} />}
                <DraggableBlockWrapper
                  blockId={block.id} index={index} isReadOnly={isReadOnly}
                  draggingBlockId={draggingBlockId} setDraggingBlockId={setDraggingBlockId}
                  setDropTargetIdx={setDropTargetIdx} dropTargetIdxRef={dropTargetIdxRef}
                  blockLayouts={blockLayouts} blocks={blocks} moveBlock={moveBlock}
                >
                  <View style={styles.pageBreakRow}>
                    <View style={styles.pageBreakLine} />
                    <Text style={styles.pageBreakLabel}>Page Break</Text>
                    <View style={styles.pageBreakLine} />
                  </View>
                </DraggableBlockWrapper>
              </React.Fragment>
            );
          }

          // ── Image block ───────────────────────────────────────────────────
          if (block.type === 'image') {
            const isImgSelected = selectedImageId === block.id;
            const imgSize = imageSize[block.id] ?? { width: 320, height: 220 };
            return (
              <React.Fragment key={block.id}>
                {dropTargetIdx === index && draggingBlockId && <View style={styles.dropIndicator} />}
                <DraggableBlockWrapper
                  blockId={block.id} index={index} isReadOnly={isReadOnly}
                  draggingBlockId={draggingBlockId} setDraggingBlockId={setDraggingBlockId}
                  setDropTargetIdx={setDropTargetIdx} dropTargetIdxRef={dropTargetIdxRef}
                  blockLayouts={blockLayouts} blocks={blocks} moveBlock={moveBlock}
                >
                  <View style={[styles.imageBlockWrapper, isImgSelected && styles.imageBlockSelected]}>
                    <TouchableOpacity onPress={() => setSelectedImageId(isImgSelected ? null : block.id)} activeOpacity={0.9}>
                      {block.imageUri ? (
                        <Image
                          source={{ uri: block.imageUri }}
                          style={{ width: imgSize.width, height: imgSize.height, borderRadius: 8, backgroundColor: Colors.surface }}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Text style={styles.imagePlaceholderText}>Image loading…</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {isImgSelected && !isReadOnly && (
                      <View style={styles.imageResizeBar}>
                        <TouchableOpacity onPress={() => adjustImageSize(block.id, -40)} style={styles.resizeBtn}>
                          <Text style={styles.resizeBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.resizeSizeLabel}>{imgSize.width}px</Text>
                        <TouchableOpacity onPress={() => adjustImageSize(block.id, +40)} style={styles.resizeBtn}>
                          <Text style={styles.resizeBtnText}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteBlock(block.id)} style={[styles.resizeBtn, styles.resizeDeleteBtn]}>
                          <Text style={[styles.resizeBtnText, { color: Colors.danger }]}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {/* Image caption */}
                    {!isReadOnly ? (
                      <TextInput
                        style={styles.imageCaptionInput}
                        value={block.imageCaption ?? ''}
                        onChangeText={(t) => updateBlock(block.id, { imageCaption: t || undefined })}
                        placeholder="Add caption…"
                        placeholderTextColor={Colors.textDim}
                        multiline
                      />
                    ) : block.imageCaption ? (
                      <Text style={styles.imageCaptionText}>{block.imageCaption}</Text>
                    ) : null}
                  </View>
                </DraggableBlockWrapper>
              </React.Fragment>
            );
          }

          // ── Table block ───────────────────────────────────────────────────
          if (block.type === 'table' && block.tableData) {
            const { cells, colWidths: tdColWidths, cellStyles: tdCellStyles } = block.tableData;
            const getColW = (ci: number) => tdColWidths?.[ci] ?? 110;
            return (
              <React.Fragment key={block.id}>
                {dropTargetIdx === index && draggingBlockId && <View style={styles.dropIndicator} />}
                <DraggableBlockWrapper
                  blockId={block.id} index={index} isReadOnly={isReadOnly}
                  draggingBlockId={draggingBlockId} setDraggingBlockId={setDraggingBlockId}
                  setDropTargetIdx={setDropTargetIdx} dropTargetIdxRef={dropTargetIdxRef}
                  blockLayouts={blockLayouts} blocks={blocks} moveBlock={moveBlock}
                >
                  <View style={styles.tableBlock}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View>
                        {cells.map((row, ri) => (
                          <View key={ri} style={styles.tableRow}>
                            {row.map((cellText, ci) => {
                              if (isCoveredByMerge(block, ri, ci)) return null;
                              const merge = getMerge(block, ri, ci);
                              const colSpan = merge?.colSpan ?? 1;
                              const mergedWidth = Array.from({ length: colSpan }, (_, k) => getColW(ci + k)).reduce((a, b) => a + b, 0) + (colSpan - 1);
                              const isFocusedCell = focusedCell?.blockId === block.id && focusedCell?.row === ri && focusedCell?.col === ci;
                              const cellBg = tdCellStyles?.[`${ri},${ci}`]?.bgColor ?? (ri === 0 ? Colors.surfaceHigh : Colors.background);
                              return (
                                <View
                                  key={ci}
                                  style={[
                                    styles.tableCell,
                                    { width: mergedWidth, backgroundColor: cellBg },
                                    isFocusedCell && styles.tableCellFocused,
                                    !!merge && styles.tableCellMerged,
                                  ]}
                                >
                                  {isReadOnly ? (
                                    <Text style={styles.tableCellText}>{cellText}</Text>
                                  ) : (
                                    <TouchableOpacity
                                      activeOpacity={1}
                                      onLongPress={() => {
                                        setCellColorTarget({ blockId: block.id, ri, ci });
                                        setCellColorPickerOpen(true);
                                      }}
                                    >
                                      <TextInput
                                        style={styles.tableCellInput}
                                        value={cellText}
                                        onChangeText={(t) => updateTableCell(block.id, ri, ci, t)}
                                        onFocus={() => {
                                          setFocusedCell({ blockId: block.id, row: ri, col: ci });
                                          setFocusedBlockId(block.id);
                                          setShowToolbar(false);
                                          setLinkInputOpen(false);
                                        }}
                                        onBlur={() => setFocusedCell(null)}
                                        multiline={false}
                                        returnKeyType="next"
                                        selectTextOnFocus
                                      />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              );
                            })}
                            {!isReadOnly && block.tableData!.rows > 1 && (
                              <TouchableOpacity onPress={() => deleteTableRow(block.id, ri)} style={styles.tableRowDeleteBtn}>
                                <Text style={styles.tableRowDeleteBtnText}>✕</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                    {!isReadOnly && (
                      <View style={styles.tableActions}>
                        <TouchableOpacity onPress={() => addTableRow(block.id)} style={styles.tableActionBtn}>
                          <Text style={styles.tableActionBtnText}>+ Row</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => addTableColumn(block.id)} style={styles.tableActionBtn}>
                          <Text style={styles.tableActionBtnText}>+ Col</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => deleteTableColumn(block.id)}
                          style={[styles.tableActionBtn, block.tableData!.cols <= 1 && styles.tableDeleteBtn]}
                          disabled={block.tableData!.cols <= 1}
                        >
                          <Text style={[styles.tableActionBtnText, { color: block.tableData!.cols <= 1 ? Colors.textDim : Colors.textMuted }]}>− Col</Text>
                        </TouchableOpacity>
                        {/* Column width / merge controls — shown when a cell is focused */}
                        {focusedCell?.blockId === block.id && (
                          <>
                            <TouchableOpacity
                              onPress={() => { const ci = focusedCell!.col; updateTableColWidth(block.id, ci, getColW(ci) - 10); }}
                              style={styles.tableActionBtn}
                            >
                              <Text style={styles.tableActionBtnText}>◁W</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => { const ci = focusedCell!.col; updateTableColWidth(block.id, ci, getColW(ci) + 10); }}
                              style={styles.tableActionBtn}
                            >
                              <Text style={styles.tableActionBtnText}>W▷</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => mergeCellRight(block.id, focusedCell!.row, focusedCell!.col)}
                              style={styles.tableActionBtn}
                              disabled={focusedCell!.col + (getMerge(block, focusedCell!.row, focusedCell!.col)?.colSpan ?? 1) >= block.tableData!.cols}
                            >
                              <Text style={styles.tableActionBtnText}>⊞→</Text>
                            </TouchableOpacity>
                            {getMerge(block, focusedCell!.row, focusedCell!.col) && (
                              <TouchableOpacity
                                onPress={() => splitCell(block.id, focusedCell!.row, focusedCell!.col)}
                                style={styles.tableActionBtn}
                              >
                                <Text style={styles.tableActionBtnText}>⊟</Text>
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                        <TouchableOpacity onPress={() => deleteBlock(block.id)} style={[styles.tableActionBtn, styles.tableDeleteBtn]}>
                          <Text style={[styles.tableActionBtnText, { color: Colors.danger }]}>✕ Remove</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </DraggableBlockWrapper>
              </React.Fragment>
            );
          }

          // ── Regular text block ────────────────────────────────────────────
          const baseStyle = BLOCK_STYLES[block.type] ?? BLOCK_STYLES.paragraph;
          const fontSize = block.type === 'heading' ? (HEADING_SIZES[block.level ?? 1] ?? 22) : baseStyle.fontSize;
          const effectiveFontSize = Math.round((block.fontSize ?? fontSize) * zoom);
          const isList = block.type === 'bullet' || block.type === 'numbered' || block.type === 'list_item';
          const listIndent = isList ? (block.listLevel ?? 0) * 16 : 0;
          const isBulletBlock = block.type === 'bullet' || (block.type === 'list_item' && block.listType !== 'ordered' && block.listType !== 'task');
          const isOrderedBlock = block.type === 'numbered' || (block.type === 'list_item' && block.listType === 'ordered');

          const prefix = (() => {
            if (block.type === 'list_item' && block.listType === 'task') return block.checked ? '☑' : '☐';
            if (isBulletBlock) {
              if (block.listStyle === 'circle') return '◦';
              if (block.listStyle === 'square') return '▪';
              return '•';
            }
            if (isOrderedBlock) {
              const n = getOrderedIndex(index, block.listLevel ?? 0);
              if (block.listStyle === 'lower-alpha') return `${String.fromCharCode(96 + Math.min(n, 26))}.`;
              if (block.listStyle === 'upper-alpha') return `${String.fromCharCode(64 + Math.min(n, 26))}.`;
              if (block.listStyle === 'lower-roman') return `${toRoman(n).toLowerCase()}.`;
              if (block.listStyle === 'upper-roman') return `${toRoman(n)}.`;
              return `${n}.`;
            }
            return '';
          })();

          const highlightSegs = (!isReadOnly && focusedBlockId !== block.id && (commentAnchors ?? []).some((a) => a.blockId === block.id))
            ? getHighlightSegments(block.text, block.id) : null;
          const pendingSuggestions = (suggestions ?? []).filter((s) => s.blockId === block.id);

          return (
            <React.Fragment key={block.id}>
              {dropTargetIdx === index && draggingBlockId && <View style={styles.dropIndicator} />}
              {(presenceMembers ?? []).filter((m) => m.blockId === block.id).map((m) => (
                <View key={m.userId} style={[styles.cursorBadge, { backgroundColor: m.color }]} pointerEvents="none">
                  <Text style={styles.cursorBadgeText}>{m.displayName.split(' ')[0]}</Text>
                </View>
              ))}
              <DraggableBlockWrapper
                blockId={block.id} index={index} isReadOnly={isReadOnly}
                draggingBlockId={draggingBlockId} setDraggingBlockId={setDraggingBlockId}
                setDropTargetIdx={setDropTargetIdx} dropTargetIdxRef={dropTargetIdxRef}
                blockLayouts={blockLayouts} blocks={blocks} moveBlock={moveBlock}
              >
                <View>
                  {block.bookmark ? (
                    <View style={styles.bookmarkBadge}>
                      <Text style={styles.bookmarkBadgeText}>🔖 {block.bookmark}</Text>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.blockWrapper,
                      block.type === 'quote' && styles.quoteBlock,
                      (block.type === 'code' || block.type === 'code_block') && styles.codeBlock,
                      { paddingLeft: listIndent },
                      isHighlighted && styles.blockHighlighted,
                      block.spacing?.before ? { marginTop: block.spacing.before } : null,
                      block.spacing?.after ? { marginBottom: block.spacing.after } : null,
                      block.shading ? { backgroundColor: block.shading, borderRadius: 4, paddingHorizontal: 4 } : null,
                      (comments ?? []).some((c) => c.anchorBlockId === block.id && !c.resolved) &&
                        { borderLeftWidth: 2, borderLeftColor: '#F59E0B' },
                    ]}
                  >
                    {prefix ? (
                      block.type === 'list_item' && block.listType === 'task' && !isReadOnly ? (
                        <TouchableOpacity
                          onPress={() => updateBlock(block.id, { checked: !block.checked })}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          style={{ paddingTop: 2 }}
                        >
                          <Text style={[styles.prefix, { fontSize: Math.round(fontSize * zoom) }]}>{prefix}</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={[styles.prefix, { fontSize: Math.round(fontSize * zoom) }]}>{prefix}</Text>
                      )
                    ) : null}

                    {isReadOnly && block.linkUrl ? (
                      <TouchableOpacity onPress={() => Linking.openURL(block.linkUrl!).catch(() => {})} style={{ flex: 1 }}>
                        <Text style={[styles.blockInput, { fontSize: effectiveFontSize, fontWeight: baseStyle.fontWeight, paddingLeft: prefix ? 4 : baseStyle.paddingLeft, color: Colors.primary, textDecorationLine: 'underline', textAlign: block.align ?? 'left' }]}>
                          {block.text}
                        </Text>
                      </TouchableOpacity>
                    ) : highlightSegs ? (
                      <TouchableOpacity
                        onPress={() => { setFocusedBlockId(block.id); setShowToolbar(true); setTimeout(() => inputRefs.current[block.id]?.focus(), 50); }}
                        activeOpacity={1} style={{ flex: 1 }}
                      >
                        <Text style={[styles.blockInput, { fontSize: effectiveFontSize, fontWeight: block.bold ? '700' : baseStyle.fontWeight, paddingLeft: prefix ? 4 : baseStyle.paddingLeft, color: block.color ?? baseStyle.color ?? Colors.text, fontStyle: block.italic ? 'italic' : 'normal', textDecorationLine: block.strikethrough ? 'line-through' : block.underline ? 'underline' : 'none', textAlign: block.align ?? 'left' }]}>
                          {highlightSegs.map((seg, i) =>
                            seg.highlighted ? <Text key={i} style={{ backgroundColor: '#FFE06699' }}>{seg.text}</Text> : <Text key={i}>{seg.text}</Text>
                          )}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TextInput
                        ref={(r) => { inputRefs.current[block.id] = r; }}
                        style={[
                          styles.blockInput,
                          {
                            fontSize: (block.superscript || block.subscript) ? Math.round(effectiveFontSize * 0.65) : effectiveFontSize,
                            fontWeight: baseStyle.fontWeight,
                            paddingLeft: prefix ? 4 : baseStyle.paddingLeft,
                            color: block.linkUrl ? Colors.primary : (block.color ?? baseStyle.color ?? Colors.text),
                            fontStyle: block.italic ? 'italic' : 'normal',
                            textDecorationLine: block.strikethrough ? 'line-through' : (block.underline || block.linkUrl) ? 'underline' : 'none',
                            textAlign: block.align ?? 'left',
                            ...(block.spacing?.line ? { lineHeight: block.spacing.line * effectiveFontSize * 1.4 } : {}),
                            ...(block.highlight ? { backgroundColor: block.highlight } : {}),
                            ...(block.fontFamily ? { fontFamily: block.fontFamily } : {}),
                            ...(block.textDirection ? { writingDirection: block.textDirection } : {}),
                          },
                          (block.type === 'code' || block.type === 'code_block') && styles.codeText,
                          block.bold && { fontWeight: '700' },
                        ]}
                        value={
                          trackChangesMode
                            ? (internalSuggestions.find((s) => s.blockId === block.id && s.type === 'text_change')?.proposedText ?? block.text)
                            : suggestionMode
                            ? (suggestionDrafts[block.id] ?? block.text)
                            : block.text
                        }
                        onChangeText={(t) => {
                          // @mention detection
                          const atMatch = t.match(/@(\w*)$/);
                          if (atMatch) {
                            setMentionQuery(atMatch[1]);
                            setMentionBlockId(block.id);
                          } else {
                            setMentionQuery(null);
                            setMentionBlockId(null);
                          }
                          // track changes routing
                          if (trackChangesMode) {
                            const existing = internalSuggestions.find((s) => s.blockId === block.id && s.type === 'text_change');
                            if (existing) {
                              setInternalSuggestions((prev) => prev.map((s) => s.id === existing.id ? { ...s, proposedText: t } : s));
                            } else {
                              const newSugg: Suggestion = {
                                id: Math.random().toString(36).slice(2, 10),
                                userId: user?.id ?? '',
                                displayName: user?.displayName ?? 'Unknown',
                                timestamp: Date.now(),
                                blockId: block.id,
                                type: 'text_change',
                                originalText: block.text,
                                proposedText: t,
                              };
                              setInternalSuggestions((prev) => [...prev, newSugg]);
                            }
                          } else if (suggestionMode) {
                            setSuggestionDrafts((prev) => ({ ...prev, [block.id]: t }));
                          } else {
                            updateBlock(block.id, { text: t });
                          }
                        }}
                        onFocus={() => {
                          setFocusedBlockId(block.id);
                          setShowToolbar(true);
                          setFocusedCell(null);
                          setLinkInputOpen(false);
                          setSelectedDividerId(null);
                          onFocusedTextChange?.(block.text);
                          onPresenceBlockUpdate?.(block.id);
                          if (formatPainterActive && copiedFormat) {
                            updateBlock(block.id, copiedFormat);
                            setFormatPainterActive(false);
                            setCopiedFormat(null);
                          }
                        }}
                        onBlur={() => {
                          setShowToolbar(false);
                          onFocusedTextChange?.(block.text);
                          onPresenceBlockUpdate?.(null);
                          if (suggestionMode) {
                            const draft = suggestionDrafts[block.id];
                            if (draft !== undefined && draft !== block.text) {
                              onSuggestChange?.(block.id, block.text, draft);
                              setSuggestionDrafts((prev) => { const n = { ...prev }; delete n[block.id]; return n; });
                            }
                          }
                        }}
                        onSelectionChange={({ nativeEvent: { selection } }) => {
                          setSelectionState(selection.start !== selection.end ? { blockId: block.id, start: selection.start, end: selection.end } : null);
                        }}
                        multiline
                        blurOnSubmit={false}
                        onSubmitEditing={() => addBlockAfter(block.id)}
                        onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace' && block.text === '') deleteBlock(block.id); }}
                        editable={!isReadOnly}
                        spellCheck={!isReadOnly}
                        placeholder={index === 0 && block.text === '' ? (block.type === 'heading1' || (block.type === 'heading' && block.level === 1) ? 'Title' : 'Start typing...') : undefined}
                        placeholderTextColor={Colors.textDim}
                      />
                    )}
                    {block.footnoteRef && (
                      <Text style={styles.footnoteMarker}>[{block.footnoteRef}]</Text>
                    )}
                    {/* Comment badge */}
                    {(() => {
                      const blockCommentCount = (comments ?? []).filter(
                        (c) => c.anchorBlockId === block.id && !c.resolved
                      ).length;
                      if (!blockCommentCount) return null;
                      return (
                        <TouchableOpacity style={styles.commentCountBadge}>
                          <Text style={styles.commentCountBadgeText}>💬 {blockCommentCount}</Text>
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
                  {/* Internal track-changes accept/reject */}
                  {(() => {
                    const intSugg = internalSuggestions.find((s) => s.blockId === block.id && s.type === 'text_change');
                    if (!intSugg) return null;
                    return (
                      <View style={styles.internalSuggRow}>
                        <Text style={styles.internalSuggLabel} numberOfLines={1}>
                          Original: {intSugg.originalText}
                        </Text>
                        <View style={styles.internalSuggBtns}>
                          <TouchableOpacity onPress={() => acceptInternalSuggestion(intSugg)} style={styles.internalAcceptBtn}>
                            <Text style={styles.internalAcceptBtnText}>✓ Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => rejectInternalSuggestion(intSugg)} style={styles.internalRejectBtn}>
                            <Text style={styles.internalRejectBtnText}>✗ Reject</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })()}
                  {pendingSuggestions.map((s) => (
                    <View key={s.id} style={styles.suggestionCard}>
                      <Text style={styles.suggestionOriginal}>{s.originalText}</Text>
                      <Text style={styles.suggestionNew}>{s.suggestedText}</Text>
                      <View style={styles.suggestionActions}>
                        {canReviewSuggestions && (
                          <>
                            <TouchableOpacity onPress={() => onAcceptSuggestion?.(s.id, s.blockId, s.suggestedText)}>
                              <Text style={styles.acceptBtn}>✓ Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onRejectSuggestion?.(s.id)}>
                              <Text style={styles.rejectBtn}>✕ Reject</Text>
                            </TouchableOpacity>
                          </>
                        )}
                        <Text style={styles.suggestionMeta}>{s.userDisplayName}'s suggestion</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </DraggableBlockWrapper>
            </React.Fragment>
          );
        })}
        {dropTargetIdx === blocks.length && draggingBlockId && <View style={styles.dropIndicator} />}

        {!isReadOnly && (
          <TouchableOpacity
            style={styles.addBlockArea}
            onPress={() => addBlockAfter(blocks[blocks.length - 1].id)}
          >
            <Text style={styles.addBlockHint}>Tap to add content</Text>
          </TouchableOpacity>
        )}

        {/* Footnotes section */}
        {(content.footnotes?.length ?? 0) > 0 && (
          <View style={styles.footnotesSection}>
            <View style={styles.footnotesDivider} />
            <Text style={styles.footnotesTitle}>Footnotes</Text>
            {content.footnotes!.map((fn) => (
              <View key={fn.id} style={styles.footnoteRow}>
                <Text style={styles.footnoteMarkerLabel}>[{fn.marker}]</Text>
                {isReadOnly ? (
                  <Text style={styles.footnoteText}>{fn.text}</Text>
                ) : (
                  <TextInput
                    style={styles.footnoteInput}
                    value={fn.text}
                    onChangeText={(t) => onChange({ ...content, footnotes: content.footnotes!.map((f) => f.id === fn.id ? { ...f, text: t } : f) })}
                    placeholder="Footnote text..."
                    placeholderTextColor={Colors.textDim}
                    multiline
                  />
                )}
              </View>
            ))}
          </View>
        )}
          </>
        )}
      </ScrollView>

      {/* ── Word count status bar ── */}
      {!focusMode && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {wordCount} word{wordCount !== 1 ? 's' : ''} · {charCount} char{charCount !== 1 ? 's' : ''} · ~{readingTime} min read · ~{pageCount} page{pageCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* ── Named Paragraph Styles Modal ── */}
      <Modal
        visible={paraStyleOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setParaStyleOpen(false)}
      >
        <TouchableOpacity
          style={styles.outlineOverlay}
          activeOpacity={1}
          onPress={() => setParaStyleOpen(false)}
        />
        <View style={styles.outlineSheet}>
          <Text style={styles.outlineTitle}>Paragraph Style</Text>
          <ScrollView>
            {PARA_STYLES.map((ps) => {
              const isCurrent = focusedBlock && focusedBlock.type === ps.updates.type &&
                !!focusedBlock.bold === !!ps.updates.bold &&
                !!focusedBlock.italic === !!ps.updates.italic;
              return (
                <TouchableOpacity
                  key={ps.label}
                  style={[styles.paraStyleItem, isCurrent && styles.paraStyleItemActive]}
                  onPress={() => {
                    if (focusedBlockId) updateBlock(focusedBlockId, ps.updates);
                    setParaStyleOpen(false);
                  }}
                >
                  <Text style={[styles.paraStyleLabel, isCurrent && styles.paraStyleLabelActive]}>
                    {ps.label}
                  </Text>
                  <Text style={styles.paraStyleDesc}>{ps.description}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Word Count Modal ── */}
      <Modal visible={wordCountModalOpen} transparent animationType="slide" onRequestClose={() => setWordCountModalOpen(false)}>
        <TouchableOpacity style={styles.outlineOverlay} activeOpacity={1} onPress={() => setWordCountModalOpen(false)} />
        <View style={styles.outlineSheet}>
          <Text style={styles.outlineTitle}>Word Count</Text>
          <View style={styles.wcRow}><Text style={styles.wcLabel}>Words</Text><Text style={styles.wcValue}>{wordCount.toLocaleString()}</Text></View>
          <View style={styles.wcRow}><Text style={styles.wcLabel}>Characters</Text><Text style={styles.wcValue}>{charCount.toLocaleString()}</Text></View>
          <View style={styles.wcRow}><Text style={styles.wcLabel}>Characters (no spaces)</Text><Text style={styles.wcValue}>{charCountNoSpaces.toLocaleString()}</Text></View>
          <View style={styles.wcRow}><Text style={styles.wcLabel}>Paragraphs</Text><Text style={styles.wcValue}>{paragraphCount}</Text></View>
          <View style={styles.wcRow}><Text style={styles.wcLabel}>Headings</Text><Text style={styles.wcValue}>{headingCount}</Text></View>
          <View style={styles.wcRow}><Text style={styles.wcLabel}>Tables</Text><Text style={styles.wcValue}>{tableCount}</Text></View>
          <View style={styles.wcRow}><Text style={styles.wcLabel}>Images</Text><Text style={styles.wcValue}>{imageCount}</Text></View>
          <View style={styles.wcRow}><Text style={styles.wcLabel}>Reading time</Text><Text style={styles.wcValue}>~{readingTime} min</Text></View>
          <View style={styles.wcRow}><Text style={styles.wcLabel}>Estimated pages</Text><Text style={styles.wcValue}>~{pageCount}</Text></View>
          <TouchableOpacity style={styles.wcCloseBtn} onPress={() => setWordCountModalOpen(false)}>
            <Text style={styles.wcCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Table Cell Color Picker Modal ── */}
      <Modal visible={cellColorPickerOpen} transparent animationType="fade" onRequestClose={() => setCellColorPickerOpen(false)}>
        <TouchableOpacity style={styles.outlineOverlay} activeOpacity={1} onPress={() => setCellColorPickerOpen(false)} />
        <View style={[styles.outlineSheet, { maxHeight: 260 }]}>
          <Text style={styles.outlineTitle}>Cell Background Color</Text>
          <View style={styles.cellColorGrid}>
            {[
              '', '#FFFF00', '#90EE90', '#ADD8E6', '#FFB6C1', '#FFA500',
              '#E0B0FF', '#FFE4B5', '#C0C0C0', '#FF6B6B', '#4ECDC4', '#95E1D3',
            ].map((hex, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.cellColorSwatch, { backgroundColor: hex || Colors.surfaceHigh }]}
                onPress={() => {
                  if (cellColorTarget) updateTableCellStyle(cellColorTarget.blockId, cellColorTarget.ri, cellColorTarget.ci, hex);
                  setCellColorPickerOpen(false);
                  setCellColorTarget(null);
                }}
              >
                {!hex && <Text style={styles.colorSwatchDefault}>✕</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── Footnote Insert Modal ── */}
      <Modal visible={footnoteModalOpen} transparent animationType="slide" onRequestClose={() => setFootnoteModalOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFootnoteModalOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Insert Footnote</Text>
          <TextInput
            style={[styles.modalInput, { minHeight: 60 }]}
            value={footnoteText}
            onChangeText={setFootnoteText}
            placeholder="Footnote text..."
            placeholderTextColor={Colors.textDim}
            multiline
            autoFocus
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setFootnoteModalOpen(false)} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleInsertFootnote} style={styles.modalConfirmBtn}>
              <Text style={styles.modalConfirmBtnText}>Insert</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Document Outline Modal ── */}
      <Modal
        visible={outlineVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOutlineVisible(false)}
      >
        <TouchableOpacity
          style={styles.outlineOverlay}
          activeOpacity={1}
          onPress={() => setOutlineVisible(false)}
        />
        <View style={styles.outlineSheet}>
          <Text style={styles.outlineTitle}>Document Outline</Text>
          <ScrollView>
            {blocks
              .filter((b) =>
                (['heading', 'heading1', 'heading2', 'heading3'].includes(b.type) && b.text.trim()) ||
                !!b.bookmark
              )
              .map((b) => {
                const isBookmark = !!b.bookmark && !['heading', 'heading1', 'heading2', 'heading3'].includes(b.type);
                const indent = isBookmark
                  ? Spacing.sm
                  : b.type === 'heading3' ? Spacing.lg : b.type === 'heading2' ? Spacing.sm : 0;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.outlineItem, { paddingLeft: indent }]}
                    onPress={() => {
                      setOutlineVisible(false);
                      const y = blockLayouts.current[b.id] ?? 0;
                      setTimeout(() => scrollRef.current?.scrollTo({ y, animated: true }), 150);
                    }}
                  >
                    <Text style={[styles.outlineItemText, isBookmark && { color: Colors.primary }]} numberOfLines={1}>
                      {b.bookmark ? `🔖 ${b.bookmark}` : b.text}
                    </Text>
                  </TouchableOpacity>
                );
              })
            }
          </ScrollView>
        </View>
      </Modal>
      {/* ── Page Settings Modal ── */}
      <Modal visible={pageSettingsOpen} transparent animationType="slide" onRequestClose={() => setPageSettingsOpen(false)}>
        <TouchableOpacity style={styles.outlineOverlay} activeOpacity={1} onPress={() => setPageSettingsOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Page Settings</Text>

          <Text style={styles.modalLabel}>Page Size</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.sm }}>
            {(['A4', 'Letter', 'Legal'] as const).map((size) => (
              <TouchableOpacity
                key={size}
                onPress={() => setPendingPageSize(size)}
                style={[styles.cfChip, pendingPageSize === size && styles.cfChipActive]}
              >
                <Text style={[styles.cfChipText, pendingPageSize === size && styles.cfChipTextActive]}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.modalLabel}>Margins (pt)</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.md }}>
            {([
              ['Top', pendingMarginTop, setPendingMarginTop],
              ['Right', pendingMarginRight, setPendingMarginRight],
              ['Bottom', pendingMarginBottom, setPendingMarginBottom],
              ['Left', pendingMarginLeft, setPendingMarginLeft],
            ] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([label, val, setter]) => (
              <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.modalLabel}>{label}</Text>
                <TextInput
                  style={[styles.modalInput, { textAlign: 'center' }]}
                  value={val}
                  onChangeText={setter}
                  keyboardType="numeric"
                  placeholder="36"
                  placeholderTextColor={Colors.textDim}
                />
              </View>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setPageSettingsOpen(false)} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onChange({
                  ...content,
                  pageSize: pendingPageSize,
                  margins: {
                    top: Number(pendingMarginTop) || 36,
                    right: Number(pendingMarginRight) || 36,
                    bottom: Number(pendingMarginBottom) || 36,
                    left: Number(pendingMarginLeft) || 36,
                  },
                });
                setPageSettingsOpen(false);
              }}
              style={styles.modalConfirmBtn}
            >
              <Text style={styles.modalConfirmBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Drawing Canvas overlay ── */}
      {drawingMode && (
        <DrawingCanvas
          annotations={content.annotations ?? []}
          onChange={(annotations) => onChange({ ...content, annotations })}
          onClose={() => setDrawingMode(false)}
        />
      )}
    </View>
  );
}

// ── Draggable block wrapper ────────────────────────────────────────────────────
// Defined as a function declaration so it's hoisted and accessible inside TextEditor
function DraggableBlockWrapper({
  blockId, index, isReadOnly, draggingBlockId, setDraggingBlockId,
  setDropTargetIdx, dropTargetIdxRef, blockLayouts, blocks, moveBlock, children,
}: {
  blockId: string;
  index: number;
  isReadOnly: boolean;
  draggingBlockId: string | null;
  setDraggingBlockId: (id: string | null) => void;
  setDropTargetIdx: (idx: number | null) => void;
  dropTargetIdxRef: React.MutableRefObject<number | null>;
  blockLayouts: React.MutableRefObject<Record<string, number>>;
  blocks: import('@/lib/documents/schemas').TextBlock[];
  moveBlock: (id: string, toIdx: number) => void;
  children: React.ReactNode;
}) {
  const dragY = useSharedValue(0);
  const isActive = useSharedValue(false);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
    opacity: isActive.value ? 0.85 : 1,
    zIndex: isActive.value ? 999 : 0,
    shadowColor: '#000',
    shadowOpacity: isActive.value ? 0.18 : 0,
    shadowRadius: isActive.value ? 8 : 0,
    elevation: isActive.value ? 8 : 0,
  }));

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(350)
    .onStart(() => {
      isActive.value = true;
      runOnJS(setDraggingBlockId)(blockId);
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;
      const myY = blockLayouts.current[blockId] ?? 0;
      const absY = myY + e.translationY;
      const sorted = Object.entries(blockLayouts.current).sort(([, a], [, b]) => a - b);
      let tIdx = 0;
      for (const [bid, y] of sorted) {
        const bidBlockIdx = blocks.findIndex((b) => b.id === bid);
        if (absY > y && bidBlockIdx >= 0) tIdx = bidBlockIdx + 1;
      }
      dropTargetIdxRef.current = tIdx;
      runOnJS(setDropTargetIdx)(tIdx);
    })
    .onEnd(() => {
      isActive.value = false;
      dragY.value = withSpring(0, { damping: 20, stiffness: 300 });
      const tIdx = dropTargetIdxRef.current;
      if (tIdx !== null) runOnJS(moveBlock)(blockId, tIdx);
      runOnJS(setDraggingBlockId)(null);
      runOnJS(setDropTargetIdx)(null);
      dropTargetIdxRef.current = null;
    });

  const blockOnLayout = (e: any) => {
    blockLayouts.current[blockId] = e.nativeEvent.layout.y;
  };

  if (isReadOnly) {
    return <View onLayout={blockOnLayout}>{children}</View>;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animStyle} onLayout={blockOnLayout}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={styles.dragHandle}>
            <Text style={styles.dragHandleText}>⠿</Text>
          </View>
          <View style={{ flex: 1 }}>{children}</View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Static action bar (contentContainerStyle of horizontal ScrollView)
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  actionBarBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  actionBarBtnActive: { backgroundColor: Colors.primary },
  actionBarBtnText: { fontSize: 16 },
  actionBarBtnTextActive: { color: Colors.white },

  // Find & Replace bar
  findBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  findRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  findInput: {
    flex: 1,
    backgroundColor: Colors.surfaceHigh,
    color: Colors.text,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    minWidth: 100,
  },
  matchCount: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    minWidth: 32,
    textAlign: 'center',
  },
  findNavBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceHigh,
  },
  findNavBtnText: { color: Colors.text, fontSize: FontSize.sm },
  replaceBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
  },
  replaceBtnDisabled: { backgroundColor: Colors.surfaceHigh },
  replaceBtnText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },

  // Formatting toolbar
  toolbar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    maxHeight: 44,
  },
  toolbarContent: {
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  toolbarButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    minWidth: 32,
    alignItems: 'center',
  },
  toolbarButtonActive: { backgroundColor: Colors.primary },
  toolbarLabel: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
  toolbarLabelActive: { color: Colors.white },
  toolbarDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },

  // Color picker
  colorPickerBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    maxHeight: 40,
  },
  colorPickerContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 6,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchActive: {
    borderColor: Colors.primary,
    borderWidth: 2.5,
  },
  colorSwatchDefault: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },

  // Blocks
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: 60,
  },
  blockWrapper: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  blockHighlighted: {
    backgroundColor: `${Colors.warning}22`,
    borderRadius: Radius.sm,
    marginHorizontal: -Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  quoteBlock: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingLeft: Spacing.sm,
  },
  codeBlock: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
  },
  prefix: {
    color: Colors.textMuted,
    marginRight: Spacing.xs,
    paddingTop: 2,
    minWidth: 20,
  },
  blockInput: {
    flex: 1,
    color: Colors.text,
    lineHeight: 24,
    paddingVertical: 2,
    minHeight: 28,
  },
  codeText: {
    fontFamily: 'monospace',
    backgroundColor: Colors.surface,
    color: Colors.accent,
  },

  // Image blocks
  imageBlockWrapper: {
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  imageBlockSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    padding: 2,
  },
  imageResizeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resizeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.sm,
  },
  resizeBtnText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  resizeDeleteBtn: {
    marginLeft: Spacing.sm,
    backgroundColor: `${Colors.danger}18`,
  },
  resizeSizeLabel: {
    flex: 1,
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  imageBlock: {
    width: '100%',
    height: 220,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },

  // Suggestion cards
  suggestionCard: {
    marginBottom: Spacing.xs,
    marginLeft: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  suggestionOriginal: {
    color: Colors.danger,
    fontSize: FontSize.xs,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  suggestionNew: {
    color: '#16a34a',
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  suggestionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  acceptBtn: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  rejectBtn: {
    color: Colors.danger,
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  suggestionMeta: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
    flex: 1,
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: { color: Colors.textMuted, fontSize: FontSize.sm },
  imageDeleteBtn: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: `${Colors.danger}22`,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  imageDeleteBtnText: { color: Colors.danger, fontSize: FontSize.xs, fontWeight: '600' },

  // Divider / page break
  dividerRow: {
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  dividerLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  pageBreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  pageBreakLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  pageBreakLabel: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Add block
  addBlockArea: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  addBlockHint: { color: Colors.textDim, fontSize: FontSize.sm },

  // Table
  tableBlock: {
    marginBottom: Spacing.sm,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    width: 110,
    minHeight: 36,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  tableCellHeader: {
    backgroundColor: Colors.surfaceHigh,
  },
  tableCellFocused: {
    backgroundColor: `${Colors.primary}18`,
  },
  tableCellMerged: {
    borderRightWidth: 2,
    borderRightColor: Colors.primary,
  },
  tableCellText: {
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  tableCellInput: {
    color: Colors.text,
    fontSize: FontSize.sm,
    padding: 0,
    minHeight: 24,
  },
  tableActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    backgroundColor: Colors.surface,
  },
  tableActionBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tableDeleteBtn: {
    borderColor: `${Colors.danger}55`,
  },
  tableActionBtnText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },

  // Hyperlink input
  linkInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  linkInput: {
    flex: 1,
    backgroundColor: Colors.surfaceHigh,
    color: Colors.text,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  linkApplyBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
  },
  linkApplyBtnText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  linkRemoveBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.danger}22`,
    borderRadius: Radius.sm,
  },
  linkRemoveBtnText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },

  // Word count status bar
  statusBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  statusText: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
    textAlign: 'right',
  },

  // Spacing picker (line + before/after)
  spacingPickerPanel: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  spacingPickerBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  spacingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  spacingRowLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
    width: 16,
    textAlign: 'center',
  },
  spacingOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  spacingOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  spacingOptionText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  spacingOptionTextActive: { color: Colors.white },

  // Table row delete button
  tableRowDeleteBtn: {
    width: 24,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.danger}15`,
  },
  tableRowDeleteBtnText: {
    color: Colors.danger,
    fontSize: 10,
    fontWeight: '700',
  },

  // Sticky header
  stickyHeader: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  stickyHeaderText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },

  // Bookmark badge (shown above bookmarked blocks)
  bookmarkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  bookmarkBadgeText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },

  // Action bar (now a horizontal ScrollView)
  actionBarWrap: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    maxHeight: 38,
  },
  actionBarBtnDisabled: { opacity: 0.35 },
  actionBarZoomLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '600',
    alignSelf: 'center',
    minWidth: 32,
    textAlign: 'center',
  },

  // Divider style picker
  dividerLineThick: { height: 3, backgroundColor: Colors.border },
  dividerLineDashed: {
    height: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderStyle: 'dashed',
  },
  dividerLineDotted: {
    height: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderStyle: 'dotted',
  },
  dividerStyleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  dividerStyleBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dividerStyleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dividerStyleBtnText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  dividerStyleBtnTextActive: { color: Colors.white },
  dividerStyleDeleteBtn: { borderColor: `${Colors.danger}55`, marginLeft: Spacing.sm },

  // Named paragraph styles modal
  paraStyleItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: 2,
  },
  paraStyleItemActive: { backgroundColor: `${Colors.primary}18` },
  paraStyleLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  paraStyleLabelActive: { color: Colors.primary },
  paraStyleDesc: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
    marginTop: 1,
  },

  // Document outline modal
  outlineOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  outlineSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: Dimensions.get('window').height * 0.6,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  outlineTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  outlineItem: { paddingVertical: Spacing.sm },
  outlineItemText: { color: Colors.textMuted, fontSize: FontSize.sm },

  // Drag to reorder
  dragHandle: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    paddingRight: 2,
  },
  dragHandleText: { color: Colors.border, fontSize: 14 },
  dropIndicator: {
    height: 2,
    backgroundColor: Colors.primary,
    marginVertical: 2,
    borderRadius: 1,
    marginHorizontal: 18,
  },

  // Focus mode
  containerFocusMode: { backgroundColor: '#FAFAFA' },
  focusModeBar: {
    backgroundColor: `${Colors.primary}18`,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  focusModeBarText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },

  // Image caption
  imageCaptionInput: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 4,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  imageCaptionText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },

  // Word count modal rows
  wcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  wcLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  wcValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  wcCloseBtn: {
    marginTop: Spacing.md,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
  },
  wcCloseBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },

  // Cell color picker
  cellColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  cellColorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Presence cursor badges
  cursorBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 2,
  },
  cursorBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  // Page view
  page: {
    width: A4_WIDTH_PX,
    minHeight: A4_HEIGHT_PX,
    backgroundColor: '#FFFFFF',
    marginVertical: 12,
    alignSelf: 'center',
    paddingHorizontal: A4_MARGIN_H,
    paddingTop: A4_MARGIN_V,
    paddingBottom: A4_MARGIN_V + 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  pageScrollContent: { backgroundColor: '#E0E0E0', paddingVertical: 12, paddingHorizontal: 0 },
  headerEditBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  headerEditLabel: { color: Colors.textMuted, fontSize: FontSize.xs, marginRight: 6, minWidth: 44 },
  headerEditInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  pageHeaderArea: { marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd' },
  pageHeaderInput: { color: '#888', fontSize: 11, textAlign: 'center', paddingVertical: 4 },
  pageHeaderText: { color: '#aaa', fontSize: 11, textAlign: 'center', fontStyle: 'italic', paddingVertical: 4 },
  pageFooterArea: { position: 'absolute', bottom: 8, left: A4_MARGIN_H, right: A4_MARGIN_H, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageFooterText: { color: '#aaa', fontSize: 10 },
  pageNumberText: { color: '#aaa', fontSize: 10 },

  // Footnotes section
  footnotesSection: { marginTop: 24, paddingTop: 8 },
  footnotesDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 8 },
  footnotesTitle: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  footnoteRow: { flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'flex-start' },
  footnoteMarker: { color: Colors.primary, fontSize: 9, lineHeight: 12, marginLeft: 4, marginTop: 2 },
  footnoteMarkerLabel: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', minWidth: 24 },
  footnoteText: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 18, flex: 1 },
  footnoteInput: { color: Colors.text, fontSize: FontSize.xs, flex: 1, lineHeight: 18 },

  // Modal overlay + sheet (for footnote modal)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  modalInput: {
    backgroundColor: Colors.surfaceHigh,
    color: Colors.text,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  modalCancelBtn: { flex: 1, padding: 10, borderRadius: Radius.sm, backgroundColor: Colors.surface, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  modalCancelBtnText: { color: Colors.text, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, padding: 10, borderRadius: Radius.sm, backgroundColor: Colors.primary, alignItems: 'center' },
  modalConfirmBtnText: { color: Colors.white, fontWeight: '700' },

  mentionDropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 200,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  mentionItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  mentionItemText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  internalSuggRow: {
    backgroundColor: `${'#22C55E'}18`,
    borderRadius: Radius.sm,
    padding: Spacing.xs,
    marginTop: 4,
    gap: 4,
  },
  internalSuggLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontStyle: 'italic',
  },
  internalSuggBtns: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  internalAcceptBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  internalAcceptBtnText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  internalRejectBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  internalRejectBtnText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  commentCountBadge: {
    position: 'absolute',
    top: 2,
    right: -4,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  commentCountBadgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
});
