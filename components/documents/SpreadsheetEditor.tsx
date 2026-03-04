import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import {
  cellKey,
  evaluateFormula,
  type CellValue,
  type Sheet,
  type SpreadsheetContent,
} from '@/lib/documents/schemas';

interface SpreadsheetEditorProps {
  content: SpreadsheetContent;
  onChange: (content: SpreadsheetContent) => void;
  isReadOnly?: boolean;
}

const CELL_HEIGHT = 36;
const ROW_HEADER_WIDTH = 40;
const DEFAULT_COL_WIDTH = 80;
const COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function SpreadsheetEditor({ content, onChange, isReadOnly = false }: SpreadsheetEditorProps) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editInputRef = useRef<TextInput>(null);

  // Active sheet derived from content
  const activeIndex = content.activeSheet ?? 0;
  const sheet: Sheet = content.sheets[activeIndex] ?? content.sheets[0];
  const { rows, cols, cells, colWidths } = sheet;

  // Helper: write changes back to the active sheet and call onChange
  function updateSheet(sheetUpdates: Partial<Sheet>) {
    const newSheets = content.sheets.map((s, i) =>
      i === activeIndex ? { ...s, ...sheetUpdates } : s
    );
    onChange({ ...content, sheets: newSheets });
  }

  function switchSheet(index: number) {
    setSelectedCell(null);
    setEditingValue('');
    onChange({ ...content, activeSheet: index });
  }

  function addSheet() {
    const name = `Sheet ${content.sheets.length + 1}`;
    const newSheet: Sheet = {
      name,
      rows: 20,
      cols: 10,
      colWidths: Array(10).fill(DEFAULT_COL_WIDTH),
      cells: {},
    };
    const newSheets = [...content.sheets, newSheet];
    onChange({ ...content, sheets: newSheets, activeSheet: newSheets.length - 1 });
  }

  function renameSheet(index: number, name: string) {
    const newSheets = content.sheets.map((s, i) => (i === index ? { ...s, name } : s));
    onChange({ ...content, sheets: newSheets });
  }

  function getColWidth(col: number): number {
    return colWidths[col] ?? DEFAULT_COL_WIDTH;
  }

  function getCellDisplay(row: number, col: number): string {
    const key = cellKey(row, col);
    const cell = cells[key];
    if (!cell) return '';
    if (cell.raw.startsWith('=')) return cell.computed ?? evaluateFormula(cell.raw, cells);
    return cell.raw;
  }

  function selectCell(row: number, col: number) {
    if (isReadOnly) return;
    setSelectedCell({ row, col });
    const key = cellKey(row, col);
    setEditingValue(cells[key]?.raw ?? '');
    setTimeout(() => editInputRef.current?.focus(), 50);
  }

  function commitEdit() {
    if (!selectedCell) return;
    const key = cellKey(selectedCell.row, selectedCell.col);
    const newCells = { ...cells };
    const computed = editingValue.startsWith('=')
      ? evaluateFormula(editingValue, newCells)
      : editingValue;

    if (editingValue === '') {
      delete newCells[key];
    } else {
      newCells[key] = { ...newCells[key], raw: editingValue, computed };
    }
    updateSheet({ cells: newCells });
  }

  // Apply formatting to the selected cell
  function applyFormat(update: Partial<CellValue>) {
    if (!selectedCell) return;
    const key = cellKey(selectedCell.row, selectedCell.col);
    const existing = cells[key] ?? { raw: '' };
    updateSheet({ cells: { ...cells, [key]: { ...existing, ...update } } });
  }

  const isSelected = (r: number, c: number) =>
    selectedCell?.row === r && selectedCell?.col === c;

  const selectedKey = selectedCell ? cellKey(selectedCell.row, selectedCell.col) : null;
  const selectedCellData = selectedKey ? cells[selectedKey] : null;

  return (
    <View style={styles.container}>
      {/* Formula / edit bar */}
      {!isReadOnly && (
        <View style={styles.formulaBar}>
          <Text style={styles.cellAddress}>
            {selectedCell ? `${COL_LETTERS[selectedCell.col]}${selectedCell.row + 1}` : ''}
          </Text>
          <View style={styles.formulaInputWrapper}>
            <TextInput
              ref={editInputRef}
              style={styles.formulaInput}
              value={editingValue}
              onChangeText={setEditingValue}
              onEndEditing={commitEdit}
              onSubmitEditing={commitEdit}
              placeholderTextColor={Colors.textDim}
              placeholder="Type a value or formula (=A1+B1)"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
      )}

      {/* Cell formatting toolbar */}
      {!isReadOnly && selectedCell && (
        <View style={styles.formatBar}>
          {(['bold', 'italic', 'underline'] as const).map((fmt) => (
            <TouchableOpacity
              key={fmt}
              style={[styles.fmtBtn, selectedCellData?.[fmt] && styles.fmtBtnActive]}
              onPress={() => applyFormat({ [fmt]: !selectedCellData?.[fmt] })}
            >
              <Text style={[
                styles.fmtBtnText,
                selectedCellData?.[fmt] && styles.fmtBtnTextActive,
                fmt === 'bold' && { fontWeight: '700' },
                fmt === 'italic' && { fontStyle: 'italic' },
                fmt === 'underline' && { textDecorationLine: 'underline' },
              ]}>
                {fmt === 'bold' ? 'B' : fmt === 'italic' ? 'I' : 'U'}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.fmtDivider} />

          {/* Alignment */}
          {(['left', 'center', 'right'] as const).map((a) => (
            <TouchableOpacity
              key={a}
              style={[styles.fmtBtn, (selectedCellData?.align ?? 'left') === a && styles.fmtBtnActive]}
              onPress={() => applyFormat({ align: a })}
            >
              <Text style={[styles.fmtBtnText, (selectedCellData?.align ?? 'left') === a && styles.fmtBtnTextActive]}>
                {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.fmtDivider} />

          {/* Wrap text toggle */}
          <TouchableOpacity
            style={[styles.fmtBtn, selectedCellData?.wrapText && styles.fmtBtnActive]}
            onPress={() => applyFormat({ wrapText: !selectedCellData?.wrapText })}
          >
            <Text style={[styles.fmtBtnText, selectedCellData?.wrapText && styles.fmtBtnTextActive]}>
              ↵
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Column headers */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
        <View>
          {/* Column header row */}
          <View style={styles.headerRow}>
            <View style={[styles.cornerCell, { width: ROW_HEADER_WIDTH }]} />
            {Array.from({ length: cols }, (_, c) => (
              <View
                key={c}
                style={[styles.colHeader, { width: getColWidth(c) }]}
              >
                <Text style={styles.headerText}>{COL_LETTERS[c]}</Text>
              </View>
            ))}
          </View>

          {/* Data rows */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.dataScroll}
            nestedScrollEnabled
          >
            {Array.from({ length: rows }, (_, r) => (
              <View key={r} style={styles.dataRow}>
                {/* Row header */}
                <View style={[styles.rowHeader, { width: ROW_HEADER_WIDTH }]}>
                  <Text style={styles.headerText}>{r + 1}</Text>
                </View>

                {/* Cells */}
                {Array.from({ length: cols }, (_, c) => {
                  const selected = isSelected(r, c);
                  const display = getCellDisplay(r, c);
                  const cellData = cells[cellKey(r, c)];

                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => selectCell(r, c)}
                      style={[
                        styles.cell,
                        {
                          width: getColWidth(c),
                          height: CELL_HEIGHT,
                          backgroundColor: cellData?.bgColor ?? Colors.background,
                        },
                        selected && styles.cellSelected,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          cellData?.bold && { fontWeight: '700' },
                          cellData?.italic && { fontStyle: 'italic' },
                          cellData?.underline && { textDecorationLine: 'underline' },
                          cellData?.strikethrough && { textDecorationLine: 'line-through' },
                          { textAlign: cellData?.align ?? 'left' },
                          cellData?.color ? { color: cellData.color } : {},
                          cellData?.fontSize ? { fontSize: cellData.fontSize } : {},
                        ]}
                        numberOfLines={cellData?.wrapText ? undefined : 1}
                      >
                        {display}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Sheet tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sheetTabsBar}
        contentContainerStyle={styles.sheetTabsContent}
      >
        {content.sheets.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.sheetTab, i === activeIndex && styles.sheetTabActive]}
            onPress={() => switchSheet(i)}
          >
            <Text style={[styles.sheetTabText, i === activeIndex && styles.sheetTabTextActive]}>
              {s.name}
            </Text>
          </TouchableOpacity>
        ))}
        {!isReadOnly && (
          <TouchableOpacity style={styles.addSheetBtn} onPress={addSheet}>
            <Text style={styles.addSheetText}>+</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  formulaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    height: 40,
  },
  cellAddress: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '700',
    width: 48,
  },
  formulaInputWrapper: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    paddingLeft: Spacing.sm,
  },
  formulaInput: {
    color: Colors.text,
    fontSize: FontSize.sm,
    flex: 1,
  },
  formatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    gap: 2,
  },
  fmtBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  fmtBtnActive: { backgroundColor: Colors.primary },
  fmtBtnText: { color: Colors.textMuted, fontSize: FontSize.sm },
  fmtBtnTextActive: { color: Colors.white },
  fmtDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cornerCell: {
    height: CELL_HEIGHT,
    backgroundColor: Colors.surfaceHigh,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  colHeader: {
    height: CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.border,
  },
  headerText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  dataScroll: { maxHeight: 500 },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowHeader: {
    height: CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  cell: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.border,
    paddingHorizontal: Spacing.xs,
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: `${Colors.primary}22`,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  cellText: {
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  // Sheet tabs
  sheetTabsBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    maxHeight: 36,
  },
  sheetTabsContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    gap: 2,
  },
  sheetTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 4,
    marginVertical: 4,
  },
  sheetTabActive: {
    backgroundColor: Colors.primary,
  },
  sheetTabText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  sheetTabTextActive: {
    color: Colors.white,
  },
  addSheetBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  addSheetText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
