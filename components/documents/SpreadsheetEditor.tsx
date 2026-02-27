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

export function SpreadsheetEditor({ content, onChange, isReadOnly = false }: SpreadsheetEditorProps) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editInputRef = useRef<TextInput>(null);

  const { rows, cols, cells, colWidths } = content;

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
    onChange({ ...content, cells: newCells });
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
                        { width: getColWidth(c), height: CELL_HEIGHT },
                        selected && styles.cellSelected,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          cellData?.bold && { fontWeight: '700' },
                          cellData?.italic && { fontStyle: 'italic' },
                          { textAlign: cellData?.align ?? 'left' },
                        ]}
                        numberOfLines={1}
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
    backgroundColor: Colors.background,
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
});
