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
import type { DocumentType } from '@/types';
import type {
  TextDocumentContent,
  SpreadsheetContent,
  PresentationContent,
  DocumentContent,
} from '@/lib/documents/schemas';

// Exporters
import {
  exportSpreadsheetAsXlsx,
  exportSpreadsheetAsCsv,
  exportSpreadsheetAsPdf,
  exportTextAsHtml,
  exportTextAsTxt,
  exportTextAsPdf,
  exportTextAsDocx,
  exportPresentationAsHtml,
  exportPresentationAsPdf,
} from '@/lib/exporters';

// Importers
import {
  importSpreadsheetFromXlsx,
  importSpreadsheetFromCsv,
  importTextFromTxt,
  importTextFromHtml,
  importDocx,
  importPptx,
} from '@/lib/importers';

interface ImportExportMenuProps {
  visible: boolean;
  onClose: () => void;
  docType: DocumentType;
  docName: string;
  content: DocumentContent;
  /** Called when an import succeeds — replaces current document content */
  onImport: (newContent: DocumentContent) => void;
}

type FormatOption = {
  label: string;
  ext: string;
  icon: string;
  description: string;
  action: () => Promise<void>;
};

export function ImportExportMenu({
  visible,
  onClose,
  docType,
  docName,
  content,
  onImport,
}: ImportExportMenuProps) {
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(true);
    setBusyLabel(label);
    try {
      await fn();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  }

  // ── Export options per document type ────────────────────────────────────────

  const exportOptions: FormatOption[] = (() => {
    switch (docType) {
      case 'spreadsheet': {
        const sc = content as SpreadsheetContent;
        return [
          {
            label: 'Excel Workbook',
            ext: '.xlsx',
            icon: '📊',
            description: 'Preserves all sheets, formulas, and formatting',
            action: () => exportSpreadsheetAsXlsx(sc, docName),
          },
          {
            label: 'PDF Document',
            ext: '.pdf',
            icon: '🖨️',
            description: 'Print-ready table — opens on any device',
            action: () => exportSpreadsheetAsPdf(sc, docName),
          },
          {
            label: 'CSV (active sheet)',
            ext: '.csv',
            icon: '📋',
            description: 'Plain comma-separated, works in any app',
            action: () => exportSpreadsheetAsCsv(sc, docName),
          },
        ];
      }
      case 'text': {
        const tc = content as TextDocumentContent;
        return [
          {
            label: 'PDF Document',
            ext: '.pdf',
            icon: '🖨️',
            description: 'Print-ready — preserves fonts, headings, and layout',
            action: () => exportTextAsPdf(tc, docName),
          },
          {
            label: 'Word Document',
            ext: '.docx',
            icon: '📝',
            description: 'Opens in Microsoft Word, Pages, and Google Docs',
            action: () => exportTextAsDocx(tc, docName),
          },
          {
            label: 'HTML Document',
            ext: '.html',
            icon: '🌐',
            description: 'Opens in Word, browsers, and most email apps',
            action: () => exportTextAsHtml(tc, docName),
          },
          {
            label: 'Plain Text',
            ext: '.txt',
            icon: '📄',
            description: 'Simple text, works everywhere',
            action: () => exportTextAsTxt(tc, docName),
          },
        ];
      }
      case 'presentation': {
        const pc = content as PresentationContent;
        return [
          {
            label: 'PDF Slides',
            ext: '.pdf',
            icon: '🖨️',
            description: 'Slides as a print-ready PDF document',
            action: () => exportPresentationAsPdf(pc, docName),
          },
          {
            label: 'HTML Slideshow',
            ext: '.html',
            icon: '🖥️',
            description: 'Self-contained slides, keyboard/tap navigation',
            action: () => exportPresentationAsHtml(pc, docName),
          },
        ];
      }
    }
  })();

  // ── Import options per document type ────────────────────────────────────────

  const importOptions: FormatOption[] = (() => {
    switch (docType) {
      case 'spreadsheet':
        return [
          {
            label: 'Excel Workbook',
            ext: '.xlsx',
            icon: '📊',
            description: 'Import cells, formulas, and styles from .xlsx',
            action: async () => {
              const result = await importSpreadsheetFromXlsx();
              if (result) { onImport(result); onClose(); }
            },
          },
          {
            label: 'CSV File',
            ext: '.csv',
            icon: '📋',
            description: 'Import comma-separated values',
            action: async () => {
              const result = await importSpreadsheetFromCsv();
              if (result) { onImport(result); onClose(); }
            },
          },
        ];
      case 'text':
        return [
          {
            label: 'Word Document',
            ext: '.docx',
            icon: '📝',
            description: 'Import headings, paragraphs, and rich formatting from .docx',
            action: async () => {
              const result = await importDocx();
              if (result) { onImport(result); onClose(); }
            },
          },
          {
            label: 'HTML File',
            ext: '.html',
            icon: '🌐',
            description: 'Import headings, lists, and formatting from HTML',
            action: async () => {
              const result = await importTextFromHtml();
              if (result) { onImport(result); onClose(); }
            },
          },
          {
            label: 'Plain Text',
            ext: '.txt',
            icon: '📄',
            description: 'Import plain text as paragraphs',
            action: async () => {
              const result = await importTextFromTxt();
              if (result) { onImport(result); onClose(); }
            },
          },
        ];
      case 'presentation':
        return [
          {
            label: 'PowerPoint',
            ext: '.pptx',
            icon: '🖥️',
            description: 'Import slides and text from .pptx',
            action: async () => {
              const result = await importPptx();
              if (result) { onImport(result); onClose(); }
            },
          },
        ];
    }
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          {/* Handle */}
          <View style={styles.handle} />

          <Text style={styles.title}>Import / Export</Text>

          {busy ? (
            <View style={styles.busyState}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.busyLabel}>{busyLabel}…</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Export section */}
              <Text style={styles.sectionLabel}>Export as</Text>
              {exportOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.ext}
                  style={styles.optionRow}
                  onPress={() => run(`Exporting ${opt.ext}`, opt.action)}
                >
                  <View style={styles.optionIconWrap}>
                    <Text style={styles.optionIcon}>{opt.icon}</Text>
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel}>
                      {opt.label}
                      <Text style={styles.optionExt}> {opt.ext}</Text>
                    </Text>
                    <Text style={styles.optionDesc}>{opt.description}</Text>
                  </View>
                  <Text style={styles.chevron}>↑</Text>
                </TouchableOpacity>
              ))}

              {/* Import section */}
              {importOptions.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>
                    Import from
                  </Text>
                  <View style={styles.importWarning}>
                    <Text style={styles.importWarningText}>
                      ⚠ Importing will replace the current document content.
                    </Text>
                  </View>
                  {importOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.ext}
                      style={styles.optionRow}
                      onPress={() =>
                        Alert.alert(
                          'Replace Content?',
                          `This will replace all current content with the imported ${opt.ext} file. This cannot be undone.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Import',
                              style: 'destructive',
                              onPress: () => run(`Importing ${opt.ext}`, opt.action),
                            },
                          ]
                        )
                      }
                    >
                      <View style={styles.optionIconWrap}>
                        <Text style={styles.optionIcon}>{opt.icon}</Text>
                      </View>
                      <View style={styles.optionText}>
                        <Text style={styles.optionLabel}>
                          {opt.label}
                          <Text style={styles.optionExt}> {opt.ext}</Text>
                        </Text>
                        <Text style={styles.optionDesc}>{opt.description}</Text>
                      </View>
                      <Text style={styles.chevron}>↓</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
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
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIcon: { fontSize: 20 },
  optionText: { flex: 1 },
  optionLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  optionExt: {
    color: Colors.textMuted,
    fontWeight: '400',
    fontSize: FontSize.sm,
  },
  optionDesc: {
    color: Colors.textDim,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  chevron: {
    color: Colors.textMuted,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  importWarning: {
    backgroundColor: `${Colors.warning}18`,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: `${Colors.warning}40`,
  },
  importWarningText: {
    color: Colors.warning,
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  busyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  busyLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
});
