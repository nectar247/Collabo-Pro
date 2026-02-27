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
import type { TextBlock, TextDocumentContent } from '@/lib/documents/schemas';

interface TextEditorProps {
  content: TextDocumentContent;
  onChange: (content: TextDocumentContent) => void;
  isReadOnly?: boolean;
  dictationAppend?: string; // text to append from dictation
}

type BlockType = TextBlock['type'];

const BLOCK_STYLES: Record<BlockType, { fontSize: number; fontWeight: '400' | '600' | '700'; paddingLeft?: number; color?: string }> = {
  heading1: { fontSize: 26, fontWeight: '700' },
  heading2: { fontSize: 22, fontWeight: '700' },
  heading3: { fontSize: 18, fontWeight: '600' },
  paragraph: { fontSize: 15, fontWeight: '400' },
  bullet: { fontSize: 15, fontWeight: '400', paddingLeft: 20 },
  numbered: { fontSize: 15, fontWeight: '400', paddingLeft: 20 },
  quote: { fontSize: 15, fontWeight: '400', paddingLeft: 16, color: Colors.textMuted },
  code: { fontSize: 13, fontWeight: '400', paddingLeft: 12 },
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function TextEditor({
  content,
  onChange,
  isReadOnly = false,
  dictationAppend,
}: TextEditorProps) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const inputRefs = useRef<Record<string, TextInput | null>>({});

  const blocks = content.blocks;

  function updateBlock(id: string, updates: Partial<TextBlock>) {
    onChange({
      blocks: blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    });
  }

  function addBlockAfter(id: string) {
    const idx = blocks.findIndex((b) => b.id === id);
    const newBlock: TextBlock = { id: generateId(), type: 'paragraph', text: '' };
    const newBlocks = [...blocks];
    newBlocks.splice(idx + 1, 0, newBlock);
    onChange({ blocks: newBlocks });
    // Focus new block
    setTimeout(() => inputRefs.current[newBlock.id]?.focus(), 50);
  }

  function deleteBlock(id: string) {
    if (blocks.length <= 1) return; // keep at least one block
    const idx = blocks.findIndex((b) => b.id === id);
    const newBlocks = blocks.filter((b) => b.id !== id);
    onChange({ blocks: newBlocks });
    // Focus previous block
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
    { type: 'bullet', label: '•' },
    { type: 'numbered', label: '1.' },
    { type: 'quote', label: '"' },
    { type: 'code', label: '</>' },
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

          {/* Bold / Italic / Underline */}
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
        </ScrollView>
      )}

      {/* Blocks */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {blocks.map((block, index) => {
          const blockStyle = BLOCK_STYLES[block.type];
          const prefix =
            block.type === 'bullet'
              ? '• '
              : block.type === 'numbered'
              ? `${index + 1}. `
              : '';

          return (
            <View
              key={block.id}
              style={[
                styles.blockWrapper,
                block.type === 'quote' && styles.quoteBlock,
                block.type === 'code' && styles.codeBlock,
              ]}
            >
              {prefix ? (
                <Text style={[styles.prefix, { fontSize: blockStyle.fontSize }]}>
                  {block.type === 'bullet' ? '•' : `${index + 1}.`}
                </Text>
              ) : null}

              <TextInput
                ref={(r) => { inputRefs.current[block.id] = r; }}
                style={[
                  styles.blockInput,
                  {
                    fontSize: blockStyle.fontSize,
                    fontWeight: blockStyle.fontWeight,
                    paddingLeft: prefix ? 4 : blockStyle.paddingLeft,
                    color: blockStyle.color ?? Colors.text,
                    fontStyle: block.italic ? 'italic' : 'normal',
                    textDecorationLine: block.underline ? 'underline' : 'none',
                  },
                  block.type === 'code' && styles.codeText,
                ]}
                value={block.text}
                onChangeText={(t) => updateBlock(block.id, { text: t })}
                onFocus={() => {
                  setFocusedBlockId(block.id);
                  setShowToolbar(true);
                }}
                onBlur={() => setShowToolbar(false)}
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
                    ? block.type === 'heading1'
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
  addBlockArea: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  addBlockHint: {
    color: Colors.textDim,
    fontSize: FontSize.sm,
  },
});
