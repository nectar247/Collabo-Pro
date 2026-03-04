import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { BlockType, TextBlock, TextDocumentContent } from '@/lib/documents/schemas';

interface TextEditorProps {
  content: TextDocumentContent;
  onChange: (content: TextDocumentContent) => void;
  isReadOnly?: boolean;
  dictationAppend?: string; // text to append from dictation
  onFocusedTextChange?: (text: string) => void;
}

// Resolve display style for any block type (legacy + new unified types).
// For the new `heading` type the caller overrides fontSize using block.level.
type BlockStyle = {
  fontSize: number;
  fontWeight: '400' | '600' | '700';
  paddingLeft?: number;
  color?: string;
};

const BLOCK_STYLES: Record<BlockType, BlockStyle> = {
  // ── New unified types ────────────────────────────────────────────────────
  heading:   { fontSize: 22, fontWeight: '700' },       // overridden by level below
  list_item: { fontSize: 15, fontWeight: '400', paddingLeft: 20 },
  code_block: { fontSize: 13, fontWeight: '400', paddingLeft: 12 },
  divider:   { fontSize: 15, fontWeight: '400' },
  page_break: { fontSize: 15, fontWeight: '400' },
  // ── Legacy types ─────────────────────────────────────────────────────────
  heading1:  { fontSize: 26, fontWeight: '700' },
  heading2:  { fontSize: 22, fontWeight: '700' },
  heading3:  { fontSize: 18, fontWeight: '600' },
  paragraph: { fontSize: 15, fontWeight: '400' },
  bullet:    { fontSize: 15, fontWeight: '400', paddingLeft: 20 },
  numbered:  { fontSize: 15, fontWeight: '400', paddingLeft: 20 },
  quote:     { fontSize: 15, fontWeight: '400', paddingLeft: 16, color: Colors.textMuted },
  code:      { fontSize: 13, fontWeight: '400', paddingLeft: 12 },
};

// Font size for new `heading` type based on level (1-6).
const HEADING_SIZES: Record<number, number> = {
  1: 26, 2: 22, 3: 18, 4: 16, 5: 15, 6: 14,
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function TextEditor({
  content,
  onChange,
  isReadOnly = false,
  dictationAppend,
  onFocusedTextChange,
}: TextEditorProps) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const inputRefs = useRef<Record<string, TextInput | null>>({});

  const blocks = content.blocks;

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

  function changeBlockType(id: string, type: BlockType) {
    updateBlock(id, { type });
  }

  const toolbarTypes: { type: BlockType; label: string }[] = [
    { type: 'heading1', label: 'H1' },
    { type: 'heading2', label: 'H2' },
    { type: 'heading3', label: 'H3' },
    { type: 'paragraph', label: 'P' },
    { type: 'bullet',   label: '•' },
    { type: 'numbered', label: '1.' },
    { type: 'quote',    label: '"' },
    { type: 'code',     label: '</>' },
  ];

  const alignOptions: { align: 'left' | 'center' | 'right'; label: string }[] = [
    { align: 'left',   label: '⬅' },
    { align: 'center', label: '↔' },
    { align: 'right',  label: '➡' },
  ];

  const focusedBlock = blocks.find((b) => b.id === focusedBlockId);

  return (
    <View style={styles.container}>
      {/* Formatting toolbar */}
      {showToolbar && !isReadOnly && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.toolbar}
          contentContainerStyle={styles.toolbarContent}
        >
          {/* Block type buttons */}
          {toolbarTypes.map(({ type, label }) => (
            <TouchableOpacity
              key={type}
              onPress={() => focusedBlockId && changeBlockType(focusedBlockId, type)}
              style={[
                styles.toolbarButton,
                focusedBlock?.type === type && styles.toolbarButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toolbarLabel,
                  focusedBlock?.type === type && styles.toolbarLabelActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.toolbarDivider} />

          {/* Inline formatting: Bold / Italic / Underline */}
          {(['bold', 'italic', 'underline'] as const).map((fmt) => (
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
                ]}
              >
                {fmt === 'bold' ? 'B' : fmt === 'italic' ? 'I' : 'U'}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.toolbarDivider} />

          {/* Text alignment */}
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
        </ScrollView>
      )}

      {/* Blocks */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {blocks.map((block, index) => {
          // Resolve style — unified `heading` type uses level for font size.
          const baseStyle = BLOCK_STYLES[block.type] ?? BLOCK_STYLES.paragraph;
          const fontSize =
            block.type === 'heading'
              ? (HEADING_SIZES[block.level ?? 1] ?? 22)
              : baseStyle.fontSize;

          const isList =
            block.type === 'bullet' ||
            block.type === 'numbered' ||
            block.type === 'list_item';

          const listIndent = isList ? (block.listLevel ?? 0) * 16 : 0;

          const prefix = (() => {
            if (block.type === 'bullet') return '•';
            if (block.type === 'numbered') return `${index + 1}.`;
            if (block.type === 'list_item') {
              if (block.listType === 'ordered') return `${index + 1}.`;
              if (block.listType === 'task') return block.checked ? '☑' : '☐';
              return '•';
            }
            return '';
          })();

          const isDivider = block.type === 'divider';
          const isPageBreak = block.type === 'page_break';

          if (isDivider) {
            return (
              <View key={block.id} style={styles.dividerRow}>
                <View style={styles.dividerLine} />
              </View>
            );
          }

          if (isPageBreak) {
            return (
              <View key={block.id} style={styles.pageBreakRow}>
                <View style={styles.pageBreakLine} />
                <Text style={styles.pageBreakLabel}>Page Break</Text>
                <View style={styles.pageBreakLine} />
              </View>
            );
          }

          return (
            <View
              key={block.id}
              style={[
                styles.blockWrapper,
                block.type === 'quote' && styles.quoteBlock,
                (block.type === 'code' || block.type === 'code_block') && styles.codeBlock,
                { paddingLeft: listIndent },
              ]}
            >
              {prefix ? (
                <Text style={[styles.prefix, { fontSize }]}>{prefix}</Text>
              ) : null}

              <TextInput
                ref={(r) => { inputRefs.current[block.id] = r; }}
                style={[
                  styles.blockInput,
                  {
                    fontSize,
                    fontWeight: baseStyle.fontWeight,
                    paddingLeft: prefix ? 4 : baseStyle.paddingLeft,
                    color: baseStyle.color ?? Colors.text,
                    fontStyle: block.italic ? 'italic' : 'normal',
                    textDecorationLine: block.underline ? 'underline' : 'none',
                    textAlign: block.align ?? 'left',
                  },
                  (block.type === 'code' || block.type === 'code_block') && styles.codeText,
                  block.bold && { fontWeight: '700' },
                ]}
                value={block.text}
                onChangeText={(t) => updateBlock(block.id, { text: t })}
                onFocus={() => {
                  setFocusedBlockId(block.id);
                  setShowToolbar(true);
                  onFocusedTextChange?.(block.text);
                }}
                onBlur={() => {
                  setShowToolbar(false);
                  onFocusedTextChange?.(block.text);
                }}
                multiline
                blurOnSubmit={false}
                onSubmitEditing={() => addBlockAfter(block.id)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace' && block.text === '') {
                    deleteBlock(block.id);
                  }
                }}
                editable={!isReadOnly}
                placeholder={
                  index === 0 && block.text === ''
                    ? block.type === 'heading1' || (block.type === 'heading' && block.level === 1)
                      ? 'Title'
                      : 'Start typing...'
                    : undefined
                }
                placeholderTextColor={Colors.textDim}
              />
            </View>
          );
        })}

        {/* Tap below content to add new block */}
        {!isReadOnly && (
          <TouchableOpacity
            style={styles.addBlockArea}
            onPress={() => addBlockAfter(blocks[blocks.length - 1].id)}
          >
            <Text style={styles.addBlockHint}>Tap to add content</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  toolbarButtonActive: {
    backgroundColor: Colors.primary,
  },
  toolbarLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  toolbarLabelActive: {
    color: Colors.white,
  },
  toolbarDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: 100,
  },
  blockWrapper: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
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
  addBlockArea: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  addBlockHint: {
    color: Colors.textDim,
    fontSize: FontSize.sm,
  },
});
