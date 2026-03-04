import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { generateDocumentContent, improveText, summarizeDocument, ClaudeError } from '@/lib/ai/claude';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { DocumentType } from '@/types';

interface AIAssistModalProps {
  visible: boolean;
  onClose: () => void;
  documentType: DocumentType;
  workspaceId?: string;
  selectedText?: string;
  onInsert: (text: string) => void;
  onReplace: (text: string) => void;
}

type QuickAction = 'improve' | 'generate' | 'summarize';

const QUICK_ACTIONS: { type: QuickAction; label: string; icon: string }[] = [
  { type: 'improve', label: 'Improve', icon: '✨' },
  { type: 'generate', label: 'Generate', icon: '🖊️' },
  { type: 'summarize', label: 'Summarize', icon: '📋' },
];

export function AIAssistModal({
  visible,
  onClose,
  documentType,
  workspaceId,
  selectedText,
  onInsert,
  onReplace,
}: AIAssistModalProps) {
  const [instruction, setInstruction] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<QuickAction>('improve');

  async function handleSubmit() {
    if (!instruction.trim() && activeAction !== 'summarize') return;
    setIsLoading(true);
    setResult('');

    try {
      let text = '';
      if (activeAction === 'improve' && selectedText) {
        text = await improveText(selectedText, instruction, documentType, workspaceId);
      } else if (activeAction === 'generate') {
        text = await generateDocumentContent(documentType, instruction, workspaceId);
      } else if (activeAction === 'summarize' && selectedText) {
        text = await summarizeDocument(selectedText, workspaceId);
      }
      setResult(text);
    } catch (err) {
      if (err instanceof ClaudeError) {
        switch (err.code) {
          case 'NO_API_KEY':
            Alert.alert(
              'No API Key',
              'To use AI assistance, add your Claude API key in Profile → Settings.',
              [{ text: 'OK' }]
            );
            break;
          case 'RATE_LIMITED':
            Alert.alert('Rate Limited', 'Too many requests. Please wait a moment and try again.');
            break;
          case 'NETWORK_ERROR':
            Alert.alert('Network Error', 'Check your internet connection and try again.');
            break;
          default:
            Alert.alert('Error', err.message || 'Failed to get AI response. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Failed to get AI response. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setInstruction('');
    setResult('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>AI Writing Assistant</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Quick action chips */}
          <View style={styles.chips}>
            {QUICK_ACTIONS.map(({ type, label, icon }) => (
              <TouchableOpacity
                key={type}
                onPress={() => setActiveAction(type)}
                style={[styles.chip, activeAction === type && styles.chipActive]}
              >
                <Text style={styles.chipText}>{icon} {label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Instruction input */}
          {activeAction !== 'summarize' && (
            <TextInput
              style={styles.instructionInput}
              value={instruction}
              onChangeText={setInstruction}
              placeholder={
                activeAction === 'improve'
                  ? 'e.g. "Make this more professional"'
                  : 'e.g. "Write a business proposal for a mobile app"'
              }
              placeholderTextColor={Colors.textDim}
              multiline
              maxLength={500}
              returnKeyType="done"
            />
          )}

          {activeAction === 'summarize' && selectedText && (
            <View style={styles.selectedTextPreview}>
              <Text style={styles.selectedTextLabel}>Text to summarize:</Text>
              <Text style={styles.selectedText} numberOfLines={3}>{selectedText}</Text>
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading || (!instruction.trim() && activeAction !== 'summarize')}
            style={[
              styles.submitBtn,
              (isLoading || (!instruction.trim() && activeAction !== 'summarize')) && styles.submitBtnDisabled,
            ]}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={Colors.white} />
                <Text style={styles.submitBtnText}>  Claude is thinking...</Text>
              </View>
            ) : (
              <Text style={styles.submitBtnText}>Generate ↑</Text>
            )}
          </TouchableOpacity>

          {/* Result */}
          {result ? (
            <>
              <Text style={styles.resultLabel}>Result:</Text>
              <ScrollView style={styles.resultScroll} nestedScrollEnabled>
                <Text style={styles.resultText}>{result}</Text>
              </ScrollView>

              {/* Insert / Replace actions */}
              <View style={styles.resultActions}>
                <TouchableOpacity
                  onPress={() => { onInsert(result); handleClose(); }}
                  style={styles.insertBtn}
                >
                  <Text style={styles.insertBtnText}>Insert</Text>
                </TouchableOpacity>
                {selectedText && (
                  <TouchableOpacity
                    onPress={() => { onReplace(result); handleClose(); }}
                    style={styles.replaceBtn}
                  >
                    <Text style={styles.replaceBtnText}>Replace Selected</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleSubmit} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  closeBtn: {
    color: Colors.textMuted,
    fontSize: FontSize.lg,
    padding: Spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  instructionInput: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.md,
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    textAlignVertical: 'top',
  },
  selectedTextPreview: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  selectedTextLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  selectedText: {
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  resultScroll: {
    maxHeight: 200,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  resultText: {
    color: Colors.text,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  resultActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  insertBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  insertBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  replaceBtn: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  replaceBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
  retryBtn: {
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  retryBtnText: { color: Colors.textMuted, fontWeight: '600', fontSize: FontSize.sm },
});
