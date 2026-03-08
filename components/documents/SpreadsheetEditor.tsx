import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import type { DocumentPresenceEntry } from '@/types';
import {
  cellKey,
  parseCellKey,
  type CellValue,
  type ChartDef,
  type ConditionalFormat,
  type DataValidation,
  type MergedCell,
  type NamedRange,
  type PivotTableDef,
  type Sheet,
  type SpreadsheetContent,
} from '@/lib/documents/schemas';
import { SpreadsheetChart } from './SpreadsheetChart';

// ── HyperFormula: recalculate all formula cells after any cell change ─────────
function recalcSheet(
  cells: Record<string, CellValue>,
  rows: number,
  cols: number,
): Record<string, CellValue> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { HyperFormula } = require('hyperformula') as typeof import('hyperformula');
  const sheetData: (string | number | boolean | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: (string | number | boolean | null)[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(cells[cellKey(r, c)]?.raw ?? null);
    }
    sheetData.push(row);
  }
  const hf = HyperFormula.buildFromSheetContent(sheetData, { licenseKey: 'gpl-v3' });
  const newCells = { ...cells };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = cellKey(r, c);
      if (newCells[key]?.raw?.startsWith('=')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const val = hf.getCellValue({ sheet: 0, row: r, col: c }) as any;
        let computed = '';
        if (val !== null && val !== undefined) {
          computed =
            typeof val === 'object' && 'type' in val
              ? `#${val.type}!`
              : String(val);
        }
        newCells[key] = { ...newCells[key], computed };
      }
    }
  }
  hf.destroy();
  return newCells;
}

// ── Conditional format helpers ────────────────────────────────────────────────

function isInRange(keyStr: string, range: string): boolean {
  const parts = range.toUpperCase().split(':');
  if (parts.length !== 2) return keyStr.toUpperCase() === range.toUpperCase();
  try {
    const { row: minR, col: minC } = parseCellKey(parts[0]);
    const { row: maxR, col: maxC } = parseCellKey(parts[1]);
    const { row, col } = parseCellKey(keyStr);
    return row >= minR && row <= maxR && col >= minC && col <= maxC;
  } catch { return false; }
}

function evalCondition(
  val: string,
  condition: ConditionalFormat['condition'],
  cfVal?: string,
): boolean {
  const num = parseFloat(val);
  const cfNum = cfVal ? parseFloat(cfVal) : 0;
  switch (condition) {
    case 'gt':        return !isNaN(num) && num > cfNum;
    case 'lt':        return !isNaN(num) && num < cfNum;
    case 'eq':        return val === (cfVal ?? '');
    case 'ne':        return val !== (cfVal ?? '');
    case 'not_empty': return val.trim() !== '';
    case 'contains':  return val.includes(cfVal ?? '');
    default:          return false;
  }
}

interface SpreadsheetEditorProps {
  content: SpreadsheetContent;
  onChange: (content: SpreadsheetContent) => void;
  isReadOnly?: boolean;
  presenceMembers?: DocumentPresenceEntry[];
  onPresenceBlockUpdate?: (cellId: string | null) => void;
}

const CELL_HEIGHT = 36;
const ROW_HEADER_WIDTH = 40;
const DEFAULT_COL_WIDTH = 80;
const COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const FN_HINTS = [
  'SUM(', 'AVERAGE(', 'COUNT(', 'IF(', 'MAX(', 'MIN(',
  'VLOOKUP(', 'COUNTIF(', 'CONCAT(', 'ROUND(', 'ABS(', 'LEN(',
];

const CF_CONDITIONS: { value: ConditionalFormat['condition']; label: string }[] = [
  { value: 'gt',        label: '> Greater than' },
  { value: 'lt',        label: '< Less than' },
  { value: 'eq',        label: '= Equal to' },
  { value: 'ne',        label: '≠ Not equal' },
  { value: 'not_empty', label: '✓ Not empty' },
  { value: 'contains',  label: '⊂ Contains' },
];

const SWATCH_COLORS = [
  '', '#FFE066', '#90EE90', '#ADD8E6', '#FFB6C1',
  '#FFA500', '#E0B0FF', '#FF6B6B', '#4CAF50',
];

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Number format display helper ──────────────────────────────────────────────
function formatCellValue(raw: string, fmt: string): string {
  const n = Number(raw);
  if (isNaN(n)) return raw;
  if (fmt === '0%' || fmt === 'percent')     return `${(n * 100).toFixed(0)}%`;
  if (fmt === '0.00%')                        return `${(n * 100).toFixed(2)}%`;
  if (fmt === '$#,##0' || fmt === 'currency') return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  if (fmt === '$#,##0.00')                    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (fmt === '#,##0')                        return n.toLocaleString('en-US', { minimumFractionDigits: 0 });
  if (fmt === '0.00')                         return n.toFixed(2);
  if (fmt === '0.0')                          return n.toFixed(1);
  if (fmt === 'date' || fmt === 'dd/mm/yyyy') {
    const d = new Date(n * 86400000);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }
  return raw;
}

const NUM_FORMATS: { label: string; fmt: string }[] = [
  { label: 'General',   fmt: 'general' },
  { label: '1,234',     fmt: '#,##0' },
  { label: '1,234.56',  fmt: '0.00' },
  { label: '1,234.5',   fmt: '0.0' },
  { label: '$1,234',    fmt: '$#,##0' },
  { label: '$1,234.56', fmt: '$#,##0.00' },
  { label: '12%',       fmt: '0%' },
  { label: '12.34%',    fmt: '0.00%' },
  { label: 'Date',      fmt: 'dd/mm/yyyy' },
];

export function SpreadsheetEditor({ content, onChange, isReadOnly = false, presenceMembers, onPresenceBlockUpdate }: SpreadsheetEditorProps) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<{ row: number; col: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editInputRef = useRef<TextInput>(null);

  // ── Filter / sort state ───────────────────────────────────────────────────
  const [sortConfig, setSortConfig] = useState<{ col: number; dir: 'asc' | 'desc' } | null>(null);
  const [filterConfig, setFilterConfig] = useState<{ col: number; value: string } | null>(null);
  const [filterInputOpen, setFilterInputOpen] = useState(false);
  const [sortFilterModalOpen, setSortFilterModalOpen] = useState(false);
  const [sfSelectedCol, setSfSelectedCol] = useState(0);
  const [sfFilterValue, setSfFilterValue] = useState('');

  // ── Conditional format modal state ────────────────────────────────────────
  const [cfModalOpen, setCfModalOpen] = useState(false);
  const [cfRange, setCfRange] = useState('');
  const [cfCondition, setCfCondition] = useState<ConditionalFormat['condition']>('gt');
  const [cfValue, setCfValue] = useState('');
  const [cfColor, setCfColor] = useState('');
  const [cfBgColor, setCfBgColor] = useState('#FFE066');

  // ── Chart modal state ─────────────────────────────────────────────────────
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [chartType, setChartType] = useState<ChartDef['type']>('bar');
  const [chartDataRange, setChartDataRange] = useState('');
  const [chartLabelRange, setChartLabelRange] = useState('');
  const [chartTitle, setChartTitle] = useState('');

  // ── Data validation modal state ───────────────────────────────────────────
  const [dvModalOpen, setDvModalOpen] = useState(false);
  const [dvRange, setDvRange] = useState('');
  const [dvType, setDvType] = useState<'list' | 'number_range'>('list');
  const [dvValues, setDvValues] = useState('');   // comma-separated for list
  const [dvMin, setDvMin] = useState('');
  const [dvMax, setDvMax] = useState('');
  const [dvError, setDvError] = useState('');
  const [dvPickerOpen, setDvPickerOpen] = useState(false);
  const [dvPickerCell, setDvPickerCell] = useState<{ r: number; c: number } | null>(null);

  // ── Named ranges modal state ──────────────────────────────────────────────
  const [namedRangesOpen, setNamedRangesOpen] = useState(false);
  const [newRangeName, setNewRangeName] = useState('');
  const [newRangeRef, setNewRangeRef] = useState('');

  // ── Number format picker state ────────────────────────────────────────────
  const [numFmtPickerOpen, setNumFmtPickerOpen] = useState(false);

  // ── Pivot table modal state ───────────────────────────────────────────────
  const [pivotModalOpen, setPivotModalOpen] = useState(false);
  const [pivotName, setPivotName] = useState('Pivot 1');
  const [pivotRowField, setPivotRowField] = useState('A');
  const [pivotValueField, setPivotValueField] = useState('B');
  const [pivotAgg, setPivotAgg] = useState<'sum' | 'count' | 'avg' | 'max' | 'min'>('sum');

  // ── Column / row resize state ─────────────────────────────────────────────
  const resizeColStartX = useRef(0);
  const resizeColStartWidth = useRef(0);
  const resizeRowStartY = useRef(0);
  const resizeRowStartHeight = useRef(0);

  // Active sheet derived from content
  const activeIndex = content.activeSheet ?? 0;
  const sheet: Sheet = content.sheets[activeIndex] ?? content.sheets[0];
  const { rows, cols, cells, colWidths } = sheet;
  const frozenRows = sheet.frozenRows ?? 0;
  const frozenCols = sheet.frozenCols ?? 0;

  // ── Helper: write changes back to the active sheet ────────────────────────
  function updateSheet(sheetUpdates: Partial<Sheet>) {
    const newSheets = content.sheets.map((s, i) =>
      i === activeIndex ? { ...s, ...sheetUpdates } : s
    );
    onChange({ ...content, sheets: newSheets });
  }

  function switchSheet(index: number) {
    setSelectedCell(null);
    setEditingValue('');
    setSortConfig(null);
    setFilterConfig(null);
    setFilterInputOpen(false);
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

  function renameSheet(index: number) {
    Alert.prompt(
      'Rename Sheet',
      'Enter a new name:',
      (newName) => {
        if (!newName?.trim()) return;
        const newSheets = content.sheets.map((s, i) =>
          i === index ? { ...s, name: newName.trim() } : s
        );
        onChange({ ...content, sheets: newSheets });
      },
      'plain-text',
      content.sheets[index]?.name,
    );
  }

  function deleteSheet(index: number) {
    if (content.sheets.length <= 1) {
      Alert.alert('Cannot Delete', 'A spreadsheet must have at least one sheet.');
      return;
    }
    Alert.alert('Delete Sheet', `Delete "${content.sheets[index]?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          const newSheets = content.sheets.filter((_, i) => i !== index);
          const newActive = Math.min(activeIndex, newSheets.length - 1);
          onChange({ ...content, sheets: newSheets, activeSheet: newActive });
        },
      },
    ]);
  }

  function handleSheetLongPress(index: number) {
    if (isReadOnly) return;
    Alert.alert(content.sheets[index]?.name ?? 'Sheet', undefined, [
      { text: 'Rename', onPress: () => renameSheet(index) },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSheet(index) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function getColWidth(col: number): number {
    return colWidths[col] ?? DEFAULT_COL_WIDTH;
  }

  function getRowHeight(row: number): number {
    return sheet.rowHeights?.[row] ?? CELL_HEIGHT;
  }

  function parseRef(ref: string): { row: number; col: number } | null {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) return null;
    const col = COL_LETTERS.indexOf(m[1]);
    const row = parseInt(m[2], 10) - 1;
    return col >= 0 ? { row, col } : null;
  }

  function getMergeForCell(r: number, c: number): MergedCell | null {
    const merges = sheet.merges ?? [];
    for (const m of merges) {
      const from = parseRef(m.from);
      const to = parseRef(m.to);
      if (!from || !to) continue;
      const minR = Math.min(from.row, to.row);
      const maxR = Math.max(from.row, to.row);
      const minC = Math.min(from.col, to.col);
      const maxC = Math.max(from.col, to.col);
      if (r >= minR && r <= maxR && c >= minC && c <= maxC) return m;
    }
    return null;
  }

  function isMergeOrigin(r: number, c: number): boolean {
    const m = getMergeForCell(r, c);
    if (!m) return false;
    const from = parseRef(m.from);
    return from?.row === r && from?.col === c;
  }

  function isMergedNonOrigin(r: number, c: number): boolean {
    const m = getMergeForCell(r, c);
    if (!m) return false;
    const from = parseRef(m.from);
    return !(from?.row === r && from?.col === c);
  }

  function getMergedCellWidth(r: number, c: number): number {
    const m = getMergeForCell(r, c);
    if (!m) return getColWidth(c);
    const from = parseRef(m.from);
    const to = parseRef(m.to);
    if (!from || !to) return getColWidth(c);
    let total = 0;
    for (let ci = Math.min(from.col, to.col); ci <= Math.max(from.col, to.col); ci++) {
      total += getColWidth(ci);
    }
    return total;
  }

  function getMergedCellHeight(r: number, c: number): number {
    const m = getMergeForCell(r, c);
    if (!m) return getRowHeight(r);
    const from = parseRef(m.from);
    const to = parseRef(m.to);
    if (!from || !to) return getRowHeight(r);
    let total = 0;
    for (let ri = Math.min(from.row, to.row); ri <= Math.max(from.row, to.row); ri++) {
      total += getRowHeight(ri);
    }
    return total;
  }

  function getCellDisplay(row: number, col: number): string {
    const key = cellKey(row, col);
    const cell = cells[key];
    if (!cell) return '';
    const raw = cell.raw.startsWith('=') ? (cell.computed ?? '') : cell.raw;
    if (cell.numberFormat && cell.numberFormat !== 'general') {
      return formatCellValue(raw, cell.numberFormat);
    }
    return raw;
  }

  function selectCell(row: number, col: number) {
    if (isReadOnly) return;
    setSelectedCell({ row, col });
    const key = cellKey(row, col);
    setEditingValue(cells[key]?.raw ?? '');
    onPresenceBlockUpdate?.(key);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }

  function commitEdit() {
    if (!selectedCell) return;
    const key = cellKey(selectedCell.row, selectedCell.col);
    let newCells = { ...cells };
    if (editingValue === '') {
      delete newCells[key];
    } else {
      newCells[key] = { ...newCells[key], raw: editingValue, computed: '' };
    }
    newCells = recalcSheet(newCells, rows, cols);
    updateSheet({ cells: newCells });
  }

  function computePivot(rowField: string, valueField: string, agg: 'sum' | 'count' | 'avg' | 'max' | 'min') {
    const rowColIdx = rowField.toUpperCase().charCodeAt(0) - 65;
    const valColIdx = valueField.toUpperCase().charCodeAt(0) - 65;
    const groups: Record<string, number[]> = {};
    for (let r = 1; r < rows; r++) {
      const rowKey = cells[cellKey(r, rowColIdx)]?.raw ?? '';
      if (!rowKey) continue;
      const rawVal = cells[cellKey(r, valColIdx)]?.computed ?? cells[cellKey(r, valColIdx)]?.raw ?? '0';
      const val = Number(rawVal);
      (groups[rowKey] = groups[rowKey] ?? []).push(isNaN(val) ? 0 : val);
    }
    const result: Record<string, number> = {};
    for (const [k, vals] of Object.entries(groups)) {
      if (agg === 'sum')   result[k] = vals.reduce((a, b) => a + b, 0);
      if (agg === 'count') result[k] = vals.length;
      if (agg === 'avg')   result[k] = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (agg === 'max')   result[k] = Math.max(...vals);
      if (agg === 'min')   result[k] = Math.min(...vals);
    }
    return { groupKeys: Object.keys(groups), values: result };
  }

  function applyFormat(update: Partial<CellValue>) {
    if (!selectedCell) return;
    const key = cellKey(selectedCell.row, selectedCell.col);
    const existing = cells[key] ?? { raw: '' };
    updateSheet({ cells: { ...cells, [key]: { ...existing, ...update } } });
  }

  // ── Row / column operations ───────────────────────────────────────────────

  function insertRowBelow() {
    if (!selectedCell) return;
    const rowIdx = selectedCell.row;
    const newCells: Record<string, CellValue> = {};
    Object.entries(cells).forEach(([key, val]) => {
      const { row, col } = parseCellKey(key);
      newCells[row > rowIdx ? cellKey(row + 1, col) : key] = val;
    });
    updateSheet({ rows: rows + 1, cells: newCells });
  }

  function deleteSelectedRow() {
    if (!selectedCell) return;
    const rowIdx = selectedCell.row;
    const newCells: Record<string, CellValue> = {};
    Object.entries(cells).forEach(([key, val]) => {
      const { row, col } = parseCellKey(key);
      if (row < rowIdx) newCells[key] = val;
      else if (row > rowIdx) newCells[cellKey(row - 1, col)] = val;
    });
    updateSheet({ rows: Math.max(1, rows - 1), cells: newCells });
    setSelectedCell(null);
  }

  function insertColRight() {
    if (!selectedCell) return;
    const colIdx = selectedCell.col;
    const newCells: Record<string, CellValue> = {};
    Object.entries(cells).forEach(([key, val]) => {
      const { row, col } = parseCellKey(key);
      newCells[col > colIdx ? cellKey(row, col + 1) : key] = val;
    });
    const newWidths = [...colWidths];
    newWidths.splice(colIdx + 1, 0, DEFAULT_COL_WIDTH);
    updateSheet({ cols: cols + 1, cells: newCells, colWidths: newWidths });
  }

  function deleteSelectedCol() {
    if (!selectedCell) return;
    const colIdx = selectedCell.col;
    const newCells: Record<string, CellValue> = {};
    Object.entries(cells).forEach(([key, val]) => {
      const { row, col } = parseCellKey(key);
      if (col < colIdx) newCells[key] = val;
      else if (col > colIdx) newCells[cellKey(row, col - 1)] = val;
    });
    const newWidths = colWidths.filter((_, i) => i !== colIdx);
    updateSheet({ cols: Math.max(1, cols - 1), cells: newCells, colWidths: newWidths });
    setSelectedCell(null);
  }

  // ── Conditional format helpers ────────────────────────────────────────────

  function getCellConditionalStyle(r: number, c: number): { color?: string; bgColor?: string } | null {
    const cfs = sheet.conditionalFormats;
    if (!cfs?.length) return null;
    const key = cellKey(r, c);
    const val = cells[key]?.computed ?? cells[key]?.raw ?? '';
    for (const cf of cfs) {
      if (!isInRange(key, cf.range)) continue;
      if (evalCondition(val, cf.condition, cf.value)) {
        return { color: cf.color, bgColor: cf.bgColor };
      }
    }
    return null;
  }

  // ── Data validation helpers ───────────────────────────────────────────────

  function getCellValidation(r: number, c: number): DataValidation | null {
    const validations = sheet.validations;
    if (!validations?.length) return null;
    const key = cellKey(r, c);
    return validations.find((v) => isInRange(key, v.range)) ?? null;
  }

  function saveDataValidation() {
    if (!dvRange.trim()) return;
    const newDv: DataValidation = {
      range: dvRange.trim().toUpperCase(),
      type: dvType,
      values: dvType === 'list' ? dvValues.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      min: dvType === 'number_range' && dvMin ? Number(dvMin) : undefined,
      max: dvType === 'number_range' && dvMax ? Number(dvMax) : undefined,
      errorMessage: dvError || undefined,
    };
    const existing = sheet.validations ?? [];
    updateSheet({ validations: [...existing, newDv] });
    setDvModalOpen(false);
    setDvRange(''); setDvValues(''); setDvMin(''); setDvMax(''); setDvError('');
  }

  function handleCellValidationTap(r: number, c: number, validation: DataValidation) {
    if (validation.type !== 'list' || !validation.values?.length) return;
    setDvPickerCell({ r, c });
    setDvPickerOpen(true);
  }

  function applyValidationValue(value: string) {
    if (!dvPickerCell) return;
    const { r, c } = dvPickerCell;
    const key = cellKey(r, c);
    let newCells = { ...cells, [key]: { ...(cells[key] ?? { raw: '' }), raw: value, computed: '' } };
    newCells = recalcSheet(newCells, rows, cols);
    updateSheet({ cells: newCells });
    setDvPickerOpen(false);
    setDvPickerCell(null);
  }

  function saveConditionalFormat() {
    if (!cfRange.trim()) return;
    const newCf: ConditionalFormat = {
      range: cfRange.trim().toUpperCase(),
      condition: cfCondition,
      value: cfValue || undefined,
      color: cfColor || undefined,
      bgColor: cfBgColor || undefined,
    };
    const existing = sheet.conditionalFormats ?? [];
    updateSheet({ conditionalFormats: [...existing, newCf] });
    setCfModalOpen(false);
    setCfRange(''); setCfValue(''); setCfColor(''); setCfBgColor('#FFE066');
  }

  // ── Chart helpers ─────────────────────────────────────────────────────────

  function insertChart() {
    if (!chartDataRange.trim()) return;
    const newChart: ChartDef = {
      id: generateId(),
      type: chartType,
      title: chartTitle || undefined,
      dataRange: chartDataRange.trim().toUpperCase(),
      labelRange: chartLabelRange.trim().toUpperCase() || undefined,
    };
    const existing = sheet.charts ?? [];
    updateSheet({ charts: [...existing, newChart] });
    setChartModalOpen(false);
    setChartDataRange(''); setChartLabelRange(''); setChartTitle('');
  }

  function deleteChart(id: string) {
    updateSheet({ charts: (sheet.charts ?? []).filter(c => c.id !== id) });
  }

  // ── Column header long-press → sort/filter Alert ─────────────────────────

  function handleColHeaderLongPress(c: number) {
    if (isReadOnly) return;
    const label = COL_LETTERS[c] ?? String(c + 1);
    const isHidden = (sheet.hiddenCols ?? []).includes(c);
    Alert.alert(`Column ${label}`, undefined, [
      { text: 'Sort A → Z', onPress: () => setSortConfig({ col: c, dir: 'asc' }) },
      { text: 'Sort Z → A', onPress: () => setSortConfig({ col: c, dir: 'desc' }) },
      {
        text: 'Filter…',
        onPress: () => {
          setFilterConfig({ col: c, value: filterConfig?.col === c ? (filterConfig?.value ?? '') : '' });
          setFilterInputOpen(true);
        },
      },
      { text: 'Clear Sort/Filter', onPress: () => { setSortConfig(null); setFilterConfig(null); setFilterInputOpen(false); } },
      isHidden
        ? { text: 'Show All Hidden Cols', onPress: () => updateSheet({ hiddenCols: [] }) }
        : { text: 'Hide Column', onPress: () => updateSheet({ hiddenCols: [...(sheet.hiddenCols ?? []), c] }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleRowHeaderLongPress(r: number) {
    if (isReadOnly) return;
    Alert.alert(`Row ${r + 1}`, undefined, [
      { text: 'Hide Row', onPress: () => updateSheet({ hiddenRows: [...(sheet.hiddenRows ?? []), r] }) },
      ...(sheet.hiddenRows?.length ? [{ text: 'Show All Hidden Rows', onPress: () => updateSheet({ hiddenRows: [] }) }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // ── Named range helpers ────────────────────────────────────────────────────
  function addNamedRange() {
    if (!newRangeName.trim() || !newRangeRef.trim()) return;
    const nr: NamedRange = { name: newRangeName.trim(), sheetIndex: activeIndex, ref: newRangeRef.trim() };
    onChange({ ...content, namedRanges: [...(content.namedRanges ?? []).filter(r => r.name !== nr.name), nr] });
    setNewRangeName('');
    setNewRangeRef('');
  }

  function deleteNamedRange(name: string) {
    onChange({ ...content, namedRanges: (content.namedRanges ?? []).filter(r => r.name !== name) });
  }

  // ── Merge / unmerge ───────────────────────────────────────────────────────

  function handleMergeCells() {
    if (!selectedCell || !selectionAnchor) {
      // Check if selected cell is part of a merge — offer unmerge
      if (selectedCell && getMergeForCell(selectedCell.row, selectedCell.col)) {
        const merge = getMergeForCell(selectedCell.row, selectedCell.col)!;
        const newMerges = (sheet.merges ?? []).filter((m) => m !== merge);
        updateSheet({ merges: newMerges });
      }
      return;
    }
    // Merge range from selectedCell to selectionAnchor
    const from = cellKey(
      Math.min(selectedCell.row, selectionAnchor.row),
      Math.min(selectedCell.col, selectionAnchor.col)
    );
    const to = cellKey(
      Math.max(selectedCell.row, selectionAnchor.row),
      Math.max(selectedCell.col, selectionAnchor.col)
    );
    // Remove any existing merges that overlap this range
    const minR = Math.min(selectedCell.row, selectionAnchor.row);
    const maxR = Math.max(selectedCell.row, selectionAnchor.row);
    const minC = Math.min(selectedCell.col, selectionAnchor.col);
    const maxC = Math.max(selectedCell.col, selectionAnchor.col);
    const filteredMerges = (sheet.merges ?? []).filter((m) => {
      const mFrom = parseRef(m.from);
      const mTo = parseRef(m.to);
      if (!mFrom || !mTo) return true;
      return (
        Math.max(mFrom.row, mTo.row) < minR ||
        Math.min(mFrom.row, mTo.row) > maxR ||
        Math.max(mFrom.col, mTo.col) < minC ||
        Math.min(mFrom.col, mTo.col) > maxC
      );
    });
    updateSheet({ merges: [...filteredMerges, { from, to }] });
    setSelectionAnchor(null);
  }

  // ── Computed display rows (after filter + sort) ───────────────────────────

  const displayRows = useMemo(() => {
    let idxs = Array.from({ length: rows }, (_, i) => i)
      .filter(i => !(sheet.hiddenRows ?? []).includes(i));
    if (filterConfig?.value) {
      idxs = idxs.filter(r => {
        const val = (cells[cellKey(r, filterConfig.col)]?.computed ?? cells[cellKey(r, filterConfig.col)]?.raw ?? '').toLowerCase();
        return val.includes(filterConfig.value.toLowerCase());
      });
    }
    if (sortConfig) {
      idxs.sort((a, b) => {
        const va = cells[cellKey(a, sortConfig.col)]?.computed ?? cells[cellKey(a, sortConfig.col)]?.raw ?? '';
        const vb = cells[cellKey(b, sortConfig.col)]?.computed ?? cells[cellKey(b, sortConfig.col)]?.raw ?? '';
        const na = Number(va), nb = Number(vb);
        const cmp = !isNaN(na) && !isNaN(nb) ? na - nb : va.localeCompare(vb);
        return sortConfig.dir === 'asc' ? cmp : -cmp;
      });
    }
    return idxs;
  }, [rows, cells, filterConfig, sortConfig, sheet.hiddenRows]);

  const visibleCols = useMemo(
    () => Array.from({ length: cols }, (_, i) => i).filter(c => !(sheet.hiddenCols ?? []).includes(c)),
    [cols, sheet.hiddenCols]
  );

  const frozenDisplayRows = displayRows.filter(r => r < frozenRows);
  const scrollableDisplayRows = displayRows.filter(r => r >= frozenRows);
  const frozenVisibleCols = visibleCols.filter(c => c < frozenCols);
  const scrollableVisibleCols = frozenCols > 0 ? visibleCols.filter(c => c >= frozenCols) : visibleCols;

  const isSelected = (r: number, c: number) =>
    selectedCell?.row === r && selectedCell?.col === c;

  const selectedKey = selectedCell ? cellKey(selectedCell.row, selectedCell.col) : null;
  const selectedCellData = selectedKey ? cells[selectedKey] : null;

  // ── Row renderer ──────────────────────────────────────────────────────────

  function renderRow(r: number) {
    return (
      <View key={r} style={styles.dataRow}>
        <TouchableOpacity
          style={[styles.rowHeader, { width: ROW_HEADER_WIDTH, height: getRowHeight(r) }]}
          onLongPress={() => handleRowHeaderLongPress(r)}
          delayLongPress={400}
          activeOpacity={isReadOnly ? 1 : 0.7}
        >
          <Text style={styles.headerText}>{r + 1}</Text>
          {!isReadOnly && (
            <View
              style={styles.rowResizeHandle}
              {...PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onPanResponderGrant: (_, gs) => {
                  resizeRowStartY.current = gs.y0;
                  resizeRowStartHeight.current = getRowHeight(r);
                },
                onPanResponderMove: (_, gs) => {
                  const newHeight = Math.max(20, resizeRowStartHeight.current + gs.dy);
                  const updated = [...(sheet.rowHeights ?? Array(rows).fill(CELL_HEIGHT))];
                  updated[r] = newHeight;
                  updateSheet({ rowHeights: updated });
                },
              }).panHandlers}
            />
          )}
        </TouchableOpacity>
        {(() => {
          function renderCell(c: number) {
            // Skip non-origin merged cells — they are visually covered by the origin cell
            if (isMergedNonOrigin(r, c)) return null;
            const selected = isSelected(r, c);
            const display = getCellDisplay(r, c);
            const ck = cellKey(r, c);
            const cellData = cells[ck];
            const cfStyle = getCellConditionalStyle(r, c);
            const dv = getCellValidation(r, c);
            const hasList = dv?.type === 'list' && !isReadOnly;
            const cellPresence = (presenceMembers ?? []).find((m) => m.blockId === ck);
            return (
              <TouchableOpacity
                key={c}
                onPress={() => {
                  selectCell(r, c);
                  if (hasList) handleCellValidationTap(r, c, dv!);
                }}
                onLongPress={() => {
                  if (!isReadOnly && selectedCell) {
                    setSelectionAnchor({ row: r, col: c });
                    Alert.alert(
                      'Merge Range',
                      `Merge from ${cellKey(Math.min(selectedCell.row, r), Math.min(selectedCell.col, c))} to ${cellKey(Math.max(selectedCell.row, r), Math.max(selectedCell.col, c))}?`,
                      [
                        { text: 'Merge', onPress: () => {
                          const anchor = { row: r, col: c };
                          // inline merge since state may not have updated
                          const from = cellKey(Math.min(selectedCell.row, anchor.row), Math.min(selectedCell.col, anchor.col));
                          const to = cellKey(Math.max(selectedCell.row, anchor.row), Math.max(selectedCell.col, anchor.col));
                          const minR2 = Math.min(selectedCell.row, anchor.row);
                          const maxR2 = Math.max(selectedCell.row, anchor.row);
                          const minC2 = Math.min(selectedCell.col, anchor.col);
                          const maxC2 = Math.max(selectedCell.col, anchor.col);
                          const filtered = (sheet.merges ?? []).filter((m) => {
                            const mFrom = parseRef(m.from);
                            const mTo = parseRef(m.to);
                            if (!mFrom || !mTo) return true;
                            return (Math.max(mFrom.row, mTo.row) < minR2 || Math.min(mFrom.row, mTo.row) > maxR2 || Math.max(mFrom.col, mTo.col) < minC2 || Math.min(mFrom.col, mTo.col) > maxC2);
                          });
                          updateSheet({ merges: [...filtered, { from, to }] });
                          setSelectionAnchor(null);
                        }},
                        { text: 'Cancel', style: 'cancel', onPress: () => setSelectionAnchor(null) },
                      ]
                    );
                  }
                }}
                delayLongPress={600}
                style={[
                  styles.cell,
                  {
                    width: isMergeOrigin(r, c) ? getMergedCellWidth(r, c) : getColWidth(c),
                    height: isMergeOrigin(r, c) ? getMergedCellHeight(r, c) : getRowHeight(r),
                    backgroundColor: cfStyle?.bgColor ?? cellData?.bgColor ?? Colors.background,
                  },
                  selected && styles.cellSelected,
                  cellPresence && { borderWidth: 2, borderColor: cellPresence.color },
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
                    cfStyle?.color ? { color: cfStyle.color } : cellData?.color ? { color: cellData.color } : {},
                    cellData?.fontSize ? { fontSize: cellData.fontSize } : {},
                    hasList && { paddingRight: 14 },
                  ]}
                  numberOfLines={cellData?.wrapText ? undefined : 1}
                >
                  {display}
                </Text>
                {hasList && (
                  <Text style={styles.dvIndicator}>▼</Text>
                )}
              </TouchableOpacity>
            );
          }
          return (
            <>
              {frozenVisibleCols.length > 0 && (
                <View style={styles.frozenColsStrip}>
                  {frozenVisibleCols.map((c) => renderCell(c))}
                </View>
              )}
              {scrollableVisibleCols.map((c) => renderCell(c))}
            </>
          );
        })()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Action bar (global sheet actions) ── */}
      {!isReadOnly && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.actionBarWrap}
          contentContainerStyle={styles.actionBar}
        >
          <TouchableOpacity style={styles.actionBtn} onPress={() => setChartModalOpen(true)}>
            <Text style={styles.actionBtnText}>📊 Chart</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              const range = selectedCell
                ? `${COL_LETTERS[selectedCell.col]}${selectedCell.row + 1}:${COL_LETTERS[selectedCell.col]}${Math.min(selectedCell.row + 9, rows - 1) + 1}`
                : 'A1:A10';
              setDvRange(range);
              setDvModalOpen(true);
            }}
          >
            <Text style={styles.actionBtnText}>✓ Validate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              const range = selectedCell
                ? `${COL_LETTERS[selectedCell.col]}${selectedCell.row + 1}:${COL_LETTERS[Math.min(selectedCell.col + 2, cols - 1)]}${Math.min(selectedCell.row + 4, rows - 1) + 1}`
                : 'A1:B5';
              setCfRange(range);
              setCfModalOpen(true);
            }}
          >
            <Text style={styles.actionBtnText}>🎨 Cond. Format</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, (sortConfig || filterConfig) ? styles.actionBtnActive : undefined]}
            onPress={() => {
              setSfSelectedCol(selectedCell?.col ?? 0);
              setSfFilterValue(filterConfig?.col === (selectedCell?.col ?? 0) ? filterConfig.value : '');
              setSortFilterModalOpen(true);
            }}
          >
            <Text style={[styles.actionBtnText, (sortConfig || filterConfig) ? styles.actionBtnTextActive : undefined]}>⇅ Sort/Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, (selectedCell && getMergeForCell(selectedCell.row, selectedCell.col)) ? styles.actionBtnActive : undefined]}
            onPress={() => {
              if (selectedCell && !selectionAnchor) {
                // If in a merge, offer unmerge
                if (getMergeForCell(selectedCell.row, selectedCell.col)) {
                  Alert.alert('Unmerge Cells', 'Remove this cell merge?', [
                    { text: 'Unmerge', onPress: () => handleMergeCells() },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                } else {
                  Alert.alert('Merge Cells', 'Long-press another cell to set the merge range, then tap ⊡ Merge again.', [{ text: 'OK' }]);
                }
              } else {
                handleMergeCells();
              }
            }}
          >
            <Text style={[styles.actionBtnText, (selectedCell && getMergeForCell(selectedCell.row, selectedCell.col)) ? styles.actionBtnTextActive : undefined]}>⊡ Merge</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, (!!sheet.frozenRows || !!sheet.frozenCols) && styles.actionBtnActive]}
            onPress={() => {
              const hasFrozen = sheet.frozenRows || sheet.frozenCols;
              if (hasFrozen) {
                updateSheet({ frozenRows: undefined, frozenCols: undefined });
                return;
              }
              Alert.alert('Freeze Panes', 'What would you like to freeze?', [
                {
                  text: 'Rows',
                  onPress: () => updateSheet({ frozenRows: selectedCell ? selectedCell.row + 1 : 1 }),
                },
                {
                  text: 'Columns',
                  onPress: () => updateSheet({ frozenCols: selectedCell ? selectedCell.col + 1 : 1 }),
                },
                {
                  text: 'Both',
                  onPress: () => updateSheet({
                    frozenRows: selectedCell ? selectedCell.row + 1 : 1,
                    frozenCols: selectedCell ? selectedCell.col + 1 : 1,
                  }),
                },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          >
            <Text style={[styles.actionBtnText, (!!sheet.frozenRows || !!sheet.frozenCols) && styles.actionBtnTextActive]}>
              {sheet.frozenRows || sheet.frozenCols ? '❄ Unfreeze' : '❄ Freeze'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              if (selectedCell) {
                setNewRangeRef(`${COL_LETTERS[selectedCell.col]}${selectedCell.row + 1}`);
              }
              setNamedRangesOpen(true);
            }}
          >
            <Text style={styles.actionBtnText}>📌 Ranges</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setPivotName(`Pivot ${(sheet.pivotTables ?? []).length + 1}`);
              setPivotRowField('A');
              setPivotValueField('B');
              setPivotAgg('sum');
              setPivotModalOpen(true);
            }}
          >
            <Text style={styles.actionBtnText}>📊 Pivot</Text>
          </TouchableOpacity>
          {(sortConfig || filterConfig) && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: Colors.warning }]}
              onPress={() => { setSortConfig(null); setFilterConfig(null); setFilterInputOpen(false); }}
            >
              <Text style={[styles.actionBtnText, { color: Colors.warning }]}>✕ Clear Filter</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* ── Formula / edit bar ── */}
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
              placeholder="Type a value or formula (=SUM(A1:A5))"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
      )}

      {/* ── Formula function hints (when formula starts with =) ── */}
      {!isReadOnly && editingValue.startsWith('=') && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.fnHintBar}
          contentContainerStyle={styles.fnHintContent}
        >
          {FN_HINTS.map(fn => (
            <TouchableOpacity
              key={fn}
              onPress={() => setEditingValue(v => v + fn)}
              style={styles.fnHintChip}
            >
              <Text style={styles.fnHintText}>{fn.replace('(', '')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Filter input bar ── */}
      {filterInputOpen && filterConfig && !isReadOnly && (
        <View style={styles.filterBar}>
          <Text style={styles.filterLabel}>
            Filter Col {COL_LETTERS[filterConfig.col]}:
          </Text>
          <TextInput
            style={styles.filterInput}
            value={filterConfig.value}
            onChangeText={(v) => setFilterConfig({ col: filterConfig.col, value: v })}
            placeholder="Filter value…"
            placeholderTextColor={Colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={() => { setFilterConfig(null); setFilterInputOpen(false); }}
            style={styles.filterClearBtn}
          >
            <Text style={styles.filterClearText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Cell formatting toolbar ── */}
      {!isReadOnly && selectedCell && (
        <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.formatBarWrap}
          contentContainerStyle={styles.formatBar}
        >
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

          <TouchableOpacity
            style={[styles.fmtBtn, selectedCellData?.wrapText && styles.fmtBtnActive]}
            onPress={() => applyFormat({ wrapText: !selectedCellData?.wrapText })}
          >
            <Text style={[styles.fmtBtnText, selectedCellData?.wrapText && styles.fmtBtnTextActive]}>↵</Text>
          </TouchableOpacity>

          <View style={styles.fmtDivider} />

          <TouchableOpacity style={styles.fmtBtn} onPress={insertRowBelow}>
            <Text style={styles.fmtBtnText}>+Row</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fmtBtn} onPress={deleteSelectedRow}>
            <Text style={styles.fmtBtnText}>-Row</Text>
          </TouchableOpacity>

          <View style={styles.fmtDivider} />

          <TouchableOpacity style={styles.fmtBtn} onPress={insertColRight}>
            <Text style={styles.fmtBtnText}>+Col</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fmtBtn} onPress={deleteSelectedCol}>
            <Text style={styles.fmtBtnText}>-Col</Text>
          </TouchableOpacity>

          <View style={styles.fmtDivider} />

          {/* Number format picker toggle */}
          <TouchableOpacity
            style={[styles.fmtBtn, numFmtPickerOpen && styles.fmtBtnActive]}
            onPress={() => setNumFmtPickerOpen((v) => !v)}
          >
            <Text style={[styles.fmtBtnText, numFmtPickerOpen && styles.fmtBtnTextActive]}>#</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Number format picker row */}
        {numFmtPickerOpen && selectedCell && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.formatBarWrap}
            contentContainerStyle={[styles.formatBar, { gap: Spacing.xs }]}
          >
            {NUM_FORMATS.map(({ label, fmt }) => {
              const isActive = (selectedCellData?.numberFormat ?? 'general') === fmt;
              return (
                <TouchableOpacity
                  key={fmt}
                  style={[styles.fmtBtn, isActive && styles.fmtBtnActive]}
                  onPress={() => applyFormat({ numberFormat: fmt })}
                >
                  <Text style={[styles.fmtBtnText, isActive && styles.fmtBtnTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        </>
      )}

      {/* ── Frozen rows + scrollable grid ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
        <View>
          {/* Column header row */}
          <View style={styles.headerRow}>
            <View style={[styles.cornerCell, { width: ROW_HEADER_WIDTH }]} />
            {visibleCols.map((c, ci) => {
              const isSorted = sortConfig?.col === c;
              const isFiltered = filterConfig?.col === c && filterConfig.value;
              const prevVisCol = ci > 0 ? visibleCols[ci - 1] : -1;
              const hiddenBefore = c - (prevVisCol + 1);
              return (
                <React.Fragment key={c}>
                  {hiddenBefore > 0 && (
                    <TouchableOpacity
                      style={styles.hiddenColBar}
                      onPress={() => updateSheet({ hiddenCols: [] })}
                    >
                      <Text style={styles.hiddenBarText}>◀{hiddenBefore}▶</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.colHeader, { width: getColWidth(c) }]}
                    onLongPress={() => handleColHeaderLongPress(c)}
                    delayLongPress={400}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.headerText}>
                      {COL_LETTERS[c]}
                      {isSorted ? (sortConfig!.dir === 'asc' ? '▲' : '▼') : ''}
                      {isFiltered ? '🔽' : ''}
                    </Text>
                    {!isReadOnly && (
                      <View
                        style={styles.colResizeHandle}
                        {...PanResponder.create({
                          onStartShouldSetPanResponder: () => true,
                          onPanResponderGrant: (_, gs) => {
                            resizeColStartX.current = gs.x0;
                            resizeColStartWidth.current = getColWidth(c);
                          },
                          onPanResponderMove: (_, gs) => {
                            const newWidth = Math.max(40, resizeColStartWidth.current + gs.dx);
                            const updated = [...colWidths];
                            updated[c] = newWidth;
                            updateSheet({ colWidths: updated });
                          },
                        }).panHandlers}
                      />
                    )}
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>

          {/* Frozen rows */}
          {frozenDisplayRows.length > 0 && (
            <View style={styles.frozenRowsContainer}>
              {frozenDisplayRows.map((r, ri) => {
                const prevR = ri > 0 ? frozenDisplayRows[ri - 1] : -1;
                const hiddenBefore = r - (prevR + 1);
                return (
                  <React.Fragment key={r}>
                    {hiddenBefore > 0 && (
                      <TouchableOpacity style={styles.hiddenBar} onPress={() => updateSheet({ hiddenRows: [] })}>
                        <Text style={styles.hiddenBarText}>▶ {hiddenBefore} hidden — tap to show all</Text>
                      </TouchableOpacity>
                    )}
                    {renderRow(r)}
                  </React.Fragment>
                );
              })}
            </View>
          )}

          {/* Scrollable data rows */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.dataScroll}
            nestedScrollEnabled
          >
            {scrollableDisplayRows.map((r, ri) => {
              const prevR = ri > 0
                ? scrollableDisplayRows[ri - 1]
                : frozenDisplayRows.length > 0 ? frozenDisplayRows[frozenDisplayRows.length - 1] : -1;
              const hiddenBefore = r - (prevR + 1);
              return (
                <React.Fragment key={r}>
                  {hiddenBefore > 0 && (
                    <TouchableOpacity style={styles.hiddenBar} onPress={() => updateSheet({ hiddenRows: [] })}>
                      <Text style={styles.hiddenBarText}>▶ {hiddenBefore} hidden — tap to show all</Text>
                    </TouchableOpacity>
                  )}
                  {renderRow(r)}
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>

      {/* ── Charts panel ── */}
      {(sheet.charts?.length ?? 0) > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chartsPanel}
          contentContainerStyle={styles.chartsPanelContent}
        >
          {(sheet.charts ?? []).map(chart => (
            <SpreadsheetChart
              key={chart.id}
              chart={chart}
              cells={cells}
              onDelete={!isReadOnly ? () => deleteChart(chart.id) : undefined}
              isReadOnly={isReadOnly}
            />
          ))}
        </ScrollView>
      )}

      {/* ── Sheet tabs ── */}
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
            onLongPress={() => handleSheetLongPress(i)}
            delayLongPress={500}
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

      {/* ── Sort/Filter Modal ── */}
      <Modal visible={sortFilterModalOpen} transparent animationType="slide" onRequestClose={() => setSortFilterModalOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortFilterModalOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Sort / Filter</Text>

          <Text style={styles.modalLabel}>Column</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {visibleCols.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSfSelectedCol(c)}
                  style={[styles.cfConditionChip, sfSelectedCol === c && styles.cfConditionChipActive]}
                >
                  <Text style={[styles.cfConditionText, sfSelectedCol === c && styles.cfConditionTextActive]}>
                    {COL_LETTERS[c] ?? String(c + 1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.modalLabel}>Sort</Text>
          <View style={styles.chartTypeRow}>
            <TouchableOpacity
              style={[styles.chartTypeBtn, sortConfig?.col === sfSelectedCol && sortConfig?.dir === 'asc' && styles.chartTypeBtnActive]}
              onPress={() => setSortConfig({ col: sfSelectedCol, dir: 'asc' })}
            >
              <Text style={[styles.chartTypeBtnText, sortConfig?.col === sfSelectedCol && sortConfig?.dir === 'asc' && styles.chartTypeBtnTextActive]}>
                A → Z
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartTypeBtn, sortConfig?.col === sfSelectedCol && sortConfig?.dir === 'desc' && styles.chartTypeBtnActive]}
              onPress={() => setSortConfig({ col: sfSelectedCol, dir: 'desc' })}
            >
              <Text style={[styles.chartTypeBtnText, sortConfig?.col === sfSelectedCol && sortConfig?.dir === 'desc' && styles.chartTypeBtnTextActive]}>
                Z → A
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Filter value</Text>
          <TextInput
            style={styles.modalInput}
            value={sfFilterValue}
            onChangeText={setSfFilterValue}
            placeholder="Type to filter…"
            placeholderTextColor={Colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={() => {
                setSortConfig(null);
                setFilterConfig(null);
                setFilterInputOpen(false);
                setSfFilterValue('');
                setSortFilterModalOpen(false);
              }}
              style={styles.modalCancelBtn}
            >
              <Text style={styles.modalCancelText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (sfFilterValue.trim()) {
                  setFilterConfig({ col: sfSelectedCol, value: sfFilterValue.trim() });
                } else {
                  setFilterConfig(null);
                }
                setFilterInputOpen(false);
                setSortFilterModalOpen(false);
              }}
              style={styles.modalSaveBtn}
            >
              <Text style={styles.modalSaveText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Conditional Format Modal ── */}
      <Modal visible={cfModalOpen} transparent animationType="slide" onRequestClose={() => setCfModalOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCfModalOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Conditional Format</Text>

          <Text style={styles.modalLabel}>Range (e.g. A1:C10)</Text>
          <TextInput
            style={styles.modalInput}
            value={cfRange}
            onChangeText={setCfRange}
            placeholder="A1:B10"
            placeholderTextColor={Colors.textDim}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Text style={styles.modalLabel}>Condition</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {CF_CONDITIONS.map(c => (
                <TouchableOpacity
                  key={c.value}
                  onPress={() => setCfCondition(c.value)}
                  style={[styles.cfConditionChip, cfCondition === c.value && styles.cfConditionChipActive]}
                >
                  <Text style={[styles.cfConditionText, cfCondition === c.value && styles.cfConditionTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {cfCondition !== 'not_empty' && (
            <>
              <Text style={styles.modalLabel}>Value</Text>
              <TextInput
                style={styles.modalInput}
                value={cfValue}
                onChangeText={setCfValue}
                placeholder="100"
                placeholderTextColor={Colors.textDim}
                keyboardType="default"
              />
            </>
          )}

          <Text style={styles.modalLabel}>Background Color</Text>
          <View style={styles.swatchRow}>
            {SWATCH_COLORS.map(hex => (
              <TouchableOpacity
                key={hex || 'none'}
                onPress={() => setCfBgColor(hex)}
                style={[
                  styles.swatch,
                  { backgroundColor: hex || Colors.surfaceHigh },
                  cfBgColor === hex && styles.swatchActive,
                ]}
              >
                {!hex && <Text style={styles.swatchNone}>✕</Text>}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setCfModalOpen(false)} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveConditionalFormat} style={styles.modalSaveBtn}>
              <Text style={styles.modalSaveText}>Apply</Text>
            </TouchableOpacity>
          </View>

          {/* Existing rules */}
          {(sheet.conditionalFormats?.length ?? 0) > 0 && (
            <>
              <Text style={[styles.modalLabel, { marginTop: Spacing.md }]}>Active rules</Text>
              {(sheet.conditionalFormats ?? []).map((cf, i) => (
                <View key={i} style={styles.cfRuleRow}>
                  <Text style={styles.cfRuleText} numberOfLines={1}>
                    {cf.range}: {cf.condition}{cf.value ? ` ${cf.value}` : ''}
                  </Text>
                  <View style={[styles.cfRuleSwatch, { backgroundColor: cf.bgColor || Colors.surfaceHigh }]} />
                  <TouchableOpacity
                    onPress={() => updateSheet({ conditionalFormats: sheet.conditionalFormats!.filter((_, j) => j !== i) })}
                  >
                    <Text style={styles.cfRuleDelete}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </View>
      </Modal>

      {/* ── Data Validation Modal ── */}
      <Modal visible={dvModalOpen} transparent animationType="slide" onRequestClose={() => setDvModalOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDvModalOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Data Validation</Text>
          <Text style={styles.modalLabel}>Range</Text>
          <TextInput
            style={styles.modalInput}
            value={dvRange}
            onChangeText={setDvRange}
            placeholder="e.g. A1:A10"
            placeholderTextColor={Colors.textDim}
            autoCapitalize="characters"
          />
          <Text style={styles.modalLabel}>Type</Text>
          <View style={styles.modalRow}>
            {(['list', 'number_range'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.cfChip, dvType === t && styles.cfChipActive]}
                onPress={() => setDvType(t)}
              >
                <Text style={[styles.cfChipText, dvType === t && styles.cfChipTextActive]}>
                  {t === 'list' ? 'List' : 'Number Range'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {dvType === 'list' ? (
            <>
              <Text style={styles.modalLabel}>Allowed Values (comma-separated)</Text>
              <TextInput
                style={styles.modalInput}
                value={dvValues}
                onChangeText={setDvValues}
                placeholder="e.g. Yes, No, Maybe"
                placeholderTextColor={Colors.textDim}
              />
            </>
          ) : (
            <View style={styles.modalRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginRight: 4 }]}
                value={dvMin}
                onChangeText={setDvMin}
                placeholder="Min"
                placeholderTextColor={Colors.textDim}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.modalInput, { flex: 1, marginLeft: 4 }]}
                value={dvMax}
                onChangeText={setDvMax}
                placeholder="Max"
                placeholderTextColor={Colors.textDim}
                keyboardType="numeric"
              />
            </View>
          )}
          <Text style={styles.modalLabel}>Error Message (optional)</Text>
          <TextInput
            style={styles.modalInput}
            value={dvError}
            onChangeText={setDvError}
            placeholder="Invalid value"
            placeholderTextColor={Colors.textDim}
          />
          <TouchableOpacity style={styles.modalSaveBtn} onPress={saveDataValidation}>
            <Text style={styles.modalSaveText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Data Validation List Picker Modal ── */}
      <Modal visible={dvPickerOpen} transparent animationType="slide" onRequestClose={() => setDvPickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDvPickerOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Select Value</Text>
          {dvPickerCell && (getCellValidation(dvPickerCell.r, dvPickerCell.c)?.values ?? []).map((val) => (
            <TouchableOpacity key={val} style={styles.dvPickerRow} onPress={() => applyValidationValue(val)}>
              <Text style={styles.dvPickerText}>{val}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: Colors.surface }]} onPress={() => setDvPickerOpen(false)}>
            <Text style={[styles.modalSaveText, { color: Colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Named Ranges Modal ── */}
      <Modal visible={namedRangesOpen} transparent animationType="slide" onRequestClose={() => setNamedRangesOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setNamedRangesOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Named Ranges</Text>
          <ScrollView style={{ maxHeight: 200 }}>
            {(content.namedRanges ?? []).length === 0 && (
              <Text style={[styles.modalLabel, { marginBottom: Spacing.sm }]}>No named ranges yet.</Text>
            )}
            {(content.namedRanges ?? []).map(nr => (
              <View key={nr.name} style={styles.namedRangeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.namedRangeName}>{nr.name}</Text>
                  <Text style={styles.namedRangeRef}>{nr.ref} · Sheet {nr.sheetIndex + 1}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteNamedRange(nr.name)} style={styles.namedRangeDelete}>
                  <Text style={styles.cfRuleDelete}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <Text style={[styles.modalLabel, { marginTop: Spacing.md }]}>Add New Range</Text>
          <TextInput
            style={styles.modalInput}
            value={newRangeName}
            onChangeText={setNewRangeName}
            placeholder="Name (e.g. SalesData)"
            placeholderTextColor={Colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.modalInput}
            value={newRangeRef}
            onChangeText={setNewRangeRef}
            placeholder="Range (e.g. B2:D10)"
            placeholderTextColor={Colors.textDim}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setNamedRangesOpen(false)} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={addNamedRange} style={styles.modalSaveBtn}>
              <Text style={styles.modalSaveText}>Add Range</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Chart Config Modal ── */}
      <Modal visible={chartModalOpen} transparent animationType="slide" onRequestClose={() => setChartModalOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setChartModalOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Insert Chart</Text>

          <Text style={styles.modalLabel}>Chart type</Text>
          <View style={styles.chartTypeRow}>
            {(['bar', 'line', 'pie'] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setChartType(t)}
                style={[styles.chartTypeBtn, chartType === t && styles.chartTypeBtnActive]}
              >
                <Text style={[styles.chartTypeBtnText, chartType === t && styles.chartTypeBtnTextActive]}>
                  {t === 'bar' ? '📊 Bar' : t === 'line' ? '📈 Line' : '🥧 Pie'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.modalLabel}>Data range (e.g. B2:B8)</Text>
          <TextInput
            style={styles.modalInput}
            value={chartDataRange}
            onChangeText={setChartDataRange}
            placeholder="B2:B8"
            placeholderTextColor={Colors.textDim}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Text style={styles.modalLabel}>Label range (optional, e.g. A2:A8)</Text>
          <TextInput
            style={styles.modalInput}
            value={chartLabelRange}
            onChangeText={setChartLabelRange}
            placeholder="A2:A8"
            placeholderTextColor={Colors.textDim}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Text style={styles.modalLabel}>Chart title (optional)</Text>
          <TextInput
            style={styles.modalInput}
            value={chartTitle}
            onChangeText={setChartTitle}
            placeholder="Sales by Month"
            placeholderTextColor={Colors.textDim}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setChartModalOpen(false)} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={insertChart} style={styles.modalSaveBtn}>
              <Text style={styles.modalSaveText}>Insert</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Pivot Table Modal ── */}
      {(() => {
        const pivotResult = computePivot(pivotRowField, pivotValueField, pivotAgg);
        return (
          <Modal visible={pivotModalOpen} transparent animationType="slide" onRequestClose={() => setPivotModalOpen(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPivotModalOpen(false)} />
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Pivot Table</Text>

              <Text style={styles.modalLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                value={pivotName}
                onChangeText={setPivotName}
                placeholder="Pivot 1"
                placeholderTextColor={Colors.textDim}
              />

              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Row field (col letter)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={pivotRowField}
                    onChangeText={(t) => setPivotRowField(t.toUpperCase().slice(0, 1) || 'A')}
                    autoCapitalize="characters"
                    maxLength={1}
                    placeholderTextColor={Colors.textDim}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Value field (col letter)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={pivotValueField}
                    onChangeText={(t) => setPivotValueField(t.toUpperCase().slice(0, 1) || 'B')}
                    autoCapitalize="characters"
                    maxLength={1}
                    placeholderTextColor={Colors.textDim}
                  />
                </View>
              </View>

              <Text style={styles.modalLabel}>Aggregation</Text>
              <View style={styles.chartTypeRow}>
                {(['sum', 'count', 'avg', 'max', 'min'] as const).map((a) => (
                  <TouchableOpacity
                    key={a}
                    onPress={() => setPivotAgg(a)}
                    style={[styles.chartTypeBtn, pivotAgg === a && styles.chartTypeBtnActive]}
                  >
                    <Text style={[styles.chartTypeBtnText, pivotAgg === a && styles.chartTypeBtnTextActive]}>
                      {a.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Live preview */}
              {pivotResult.groupKeys.length > 0 && (
                <View style={styles.pivotPreview}>
                  <View style={styles.pivotHeaderRow}>
                    <Text style={[styles.pivotCell, styles.pivotHeaderCell]}>{pivotRowField}</Text>
                    <Text style={[styles.pivotCell, styles.pivotHeaderCell]}>{pivotAgg.toUpperCase()}({pivotValueField})</Text>
                  </View>
                  <ScrollView style={{ maxHeight: 120 }}>
                    {pivotResult.groupKeys.map((k) => (
                      <View key={k} style={styles.pivotDataRow}>
                        <Text style={styles.pivotCell}>{k}</Text>
                        <Text style={styles.pivotCell}>{pivotResult.values[k]?.toFixed(2)}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
              {pivotResult.groupKeys.length === 0 && (
                <Text style={styles.modalLabel}>No data found — check column letters match your data.</Text>
              )}

              {/* Existing pivot tables */}
              {(sheet.pivotTables ?? []).length > 0 && (
                <>
                  <Text style={[styles.modalLabel, { marginTop: Spacing.sm }]}>Saved Pivot Tables</Text>
                  {(sheet.pivotTables ?? []).map((pt) => (
                    <View key={pt.id} style={styles.namedRangeRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.namedRangeName}>{pt.name}</Text>
                        <Text style={styles.namedRangeRef}>{pt.aggregation.toUpperCase()}({pt.valueField}) grouped by {pt.rowField}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => updateSheet({ pivotTables: (sheet.pivotTables ?? []).filter((p) => p.id !== pt.id) })}
                        style={styles.namedRangeDelete}
                      >
                        <Text style={{ color: Colors.danger, fontSize: FontSize.sm }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setPivotModalOpen(false)} style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (!pivotName.trim()) return;
                    const newPt: PivotTableDef = {
                      id: generateId(),
                      name: pivotName.trim(),
                      sourceSheet: activeIndex,
                      rowField: pivotRowField,
                      valueField: pivotValueField,
                      aggregation: pivotAgg,
                    };
                    updateSheet({ pivotTables: [...(sheet.pivotTables ?? []), newPt] });
                    setPivotModalOpen(false);
                  }}
                  style={styles.modalSaveBtn}
                >
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Action bar
  actionBarWrap: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    maxHeight: 36,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  actionBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  actionBtnText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  actionBtnTextActive: { color: Colors.white },

  // Formula bar
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
  formulaInput: { color: Colors.text, fontSize: FontSize.sm, flex: 1 },

  // Function hints
  fnHintBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    maxHeight: 32,
  },
  fnHintContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, gap: 4 },
  fnHintChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fnHintText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700' },

  // Filter bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}10`,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    gap: Spacing.xs,
  },
  filterLabel: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', minWidth: 70 },
  filterInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  filterClearBtn: {
    width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${Colors.danger}22`, borderRadius: Radius.sm,
  },
  filterClearText: { color: Colors.danger, fontWeight: '700', fontSize: 12 },

  // Data validation
  dvIndicator: {
    position: 'absolute', right: 2, bottom: 2,
    fontSize: 8, color: Colors.primary, lineHeight: 10,
  },
  dvPickerRow: {
    paddingVertical: 10, paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dvPickerText: { color: Colors.text, fontSize: FontSize.sm },

  // Format bar
  formatBarWrap: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    maxHeight: 36,
  },
  formatBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
  fmtDivider: { width: 1, height: 16, backgroundColor: Colors.border, marginHorizontal: 2 },

  // Column headers
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
    position: 'relative',
  },
  colResizeHandle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: 'transparent',
  },
  rowResizeHandle: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 6,
    backgroundColor: 'transparent',
  },
  headerText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },

  // Frozen rows
  frozenRowsContainer: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  frozenColsStrip: {
    flexDirection: 'row',
    borderRightWidth: 2,
    borderRightColor: Colors.primary,
  },

  // Data grid
  dataScroll: { maxHeight: 420 },
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
    position: 'relative',
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
  cellText: { color: Colors.text, fontSize: FontSize.sm },

  // Charts panel
  chartsPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    maxHeight: 280,
  },
  chartsPanelContent: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },

  // Sheet tabs
  sheetTabsBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    maxHeight: 36,
  },
  sheetTabsContent: { alignItems: 'center', paddingHorizontal: Spacing.xs, gap: 2 },
  sheetTab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: 4, marginVertical: 4 },
  sheetTabActive: { backgroundColor: Colors.primary },
  sheetTabText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  sheetTabTextActive: { color: Colors.white },
  addSheetBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    marginVertical: 4, borderRadius: 4,
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
  },
  addSheetText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '700' },

  // Modals (shared)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: Spacing.md, paddingBottom: 40,
    maxHeight: '80%',
  },
  modalTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.md },
  modalLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  modalInput: {
    backgroundColor: Colors.surfaceHigh,
    color: Colors.text,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  modalCancelBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelText: { color: Colors.textMuted, fontWeight: '600' },
  modalSaveBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.sm, backgroundColor: Colors.primary, alignItems: 'center' },
  modalSaveText: { color: Colors.white, fontWeight: '700' },
  modalRow: { flexDirection: 'row', gap: Spacing.xs },
  cfChip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceHigh },
  cfChipActive: { backgroundColor: `${Colors.primary}22`, borderColor: Colors.primary },
  cfChipText: { color: Colors.text, fontSize: FontSize.xs },
  cfChipTextActive: { color: Colors.primary, fontWeight: '700' },

  // Conditional format
  cfConditionChip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  cfConditionChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  cfConditionText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  cfConditionTextActive: { color: Colors.white },
  swatchRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  swatch: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  swatchActive: { borderColor: Colors.primary, borderWidth: 2.5 },
  swatchNone: { color: Colors.textMuted, fontSize: 10, fontWeight: '700' },
  cfRuleRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  cfRuleText: { flex: 1, color: Colors.textMuted, fontSize: FontSize.xs },
  cfRuleSwatch: { width: 16, height: 16, borderRadius: 3, borderWidth: 1, borderColor: Colors.border },
  cfRuleDelete: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.sm, paddingHorizontal: 4 },

  // Chart config
  chartTypeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  chartTypeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  chartTypeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chartTypeBtnText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  chartTypeBtnTextActive: { color: Colors.white },

  // Hidden row / col indicators
  hiddenBar: {
    height: 16,
    backgroundColor: `${Colors.warning}22`,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenBarText: { color: Colors.warning, fontSize: 9, fontWeight: '700' },
  hiddenColBar: {
    width: 14,
    height: CELL_HEIGHT,
    backgroundColor: `${Colors.warning}22`,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Named ranges modal
  namedRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  namedRangeName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  namedRangeRef: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 1 },
  namedRangeDelete: { paddingHorizontal: Spacing.xs },
  // Pivot table
  pivotPreview: { marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, overflow: 'hidden' },
  pivotHeaderRow: { flexDirection: 'row', backgroundColor: Colors.surfaceHigh },
  pivotDataRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  pivotCell: { flex: 1, padding: 4, fontSize: FontSize.xs, color: Colors.text },
  pivotHeaderCell: { fontWeight: '700', color: Colors.textMuted },
});
