import type { DocumentType } from '@/types';

// ─── Text Document (Word-like) ────────────────────────────────────────────────

// A single styled span within a block. Optional — blocks may use the legacy
// flat `text` + `bold/italic/underline` fields instead.
export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;           // inline code
  superscript?: boolean;
  subscript?: boolean;
  color?: string;           // hex, e.g. "#EF4444"
  highlight?: string;       // hex background colour
  fontSize?: number;        // pt
  fontFamily?: string;
  link?: string;            // URL — makes the run a hyperlink
}

export type BlockType =
  // ── Unified types (new documents & imports) ──────────────────────────────
  | 'heading'               // level 1-6 via block.level
  | 'list_item'             // bullet / ordered / task via block.listType
  | 'code_block'
  | 'divider'               // horizontal rule
  | 'page_break'
  | 'image'                 // embedded image block
  | 'table'                 // grid table — data in block.tableData
  // ── Legacy types (kept for full backward compatibility) ──────────────────
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet'
  | 'numbered'
  | 'quote'
  | 'code';

export interface TextBlock {
  id: string;
  type: BlockType;

  // ── Primary text ─────────────────────────────────────────────────────────
  // Always populated — used by the editor TextInput.
  text: string;

  // ── Legacy block-level inline formatting ─────────────────────────────────
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  color?: string;           // hex text color, e.g. "#EF4444"
  highlight?: string;       // hex background highlight color
  fontFamily?: string;      // e.g. 'serif', 'monospace', 'Georgia'
  textDirection?: 'ltr' | 'rtl';
  fontSize?: number;        // pt — overrides the block-type default

  // ── Rich per-run formatting (optional — used by imports) ─────────────────
  // When present, preserves per-character formatting from .docx etc.
  // On edit the editor writes back to `text`; runs survive as metadata.
  runs?: TextRun[];

  // ── Heading level (type === 'heading') ───────────────────────────────────
  level?: 1 | 2 | 3 | 4 | 5 | 6;

  // ── List item (type === 'list_item') ─────────────────────────────────────
  listType?: 'bullet' | 'ordered' | 'task';
  listLevel?: number;       // nesting depth, 0-based
  listStyle?: 'disc' | 'circle' | 'square' | 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman';
  checked?: boolean;        // task list checkbox state

  // ── Named anchor ─────────────────────────────────────────────────────────
  bookmark?: string;        // named jump point, shown in outline

  // ── Paragraph formatting ─────────────────────────────────────────────────
  align?: 'left' | 'center' | 'right' | 'justify';
  indent?: number;          // 0-8 indent levels
  spacing?: { before: number; after: number; line: number };

  // ── Image block (type === 'image') ───────────────────────────────────────
  imageUri?: string;        // Firebase Storage download URL or local URI

  // ── Table block (type === 'table') ───────────────────────────────────────
  tableData?: {
    rows: number;
    cols: number;
    cells: string[][];      // cells[row][col] = cell text
    colWidths?: number[];   // per-column widths in px (default 110)
    cellStyles?: Record<string, { bgColor?: string }>; // key: "ri,ci"
    merges?: Array<{ row: number; col: number; colSpan: number }>; // horizontal cell merges
  };

  // ── Hyperlink (block-level) ───────────────────────────────────────────────
  linkUrl?: string;         // when set, the block text becomes a tappable link

  // ── Divider style (type === 'divider') ───────────────────────────────────
  dividerStyle?: 'thin' | 'thick' | 'dashed' | 'dotted';

  // ── Paragraph shading (full block background color) ───────────────────────
  shading?: string;         // hex background for the whole block

  // ── Image caption ────────────────────────────────────────────────────────
  imageCaption?: string;

  // ── Footnote reference ───────────────────────────────────────────────────
  footnoteRef?: string;     // marker like "1", "2", "a" — renders as superscript [1]

  // ── Inline @mentions ─────────────────────────────────────────────────────
  mentions?: Array<{ userId: string; displayName: string; start: number; end: number }>;

  // ── Passthrough ──────────────────────────────────────────────────────────
  // Attributes from an external format (e.g. .docx) that we cannot yet edit
  // are stored here so they survive a round-trip unchanged.
  _passthrough?: Record<string, unknown>;
}

export interface Annotation {
  id: string;
  path: string;           // SVG path d attribute: "M x,y L x,y ..."
  color: string;          // hex stroke color
  strokeWidth: number;    // 2 | 4 | 6
}

export interface Suggestion {
  id: string;
  userId: string;
  displayName: string;
  timestamp: number;        // ms since epoch
  blockId: string;
  type: 'text_change' | 'block_insert' | 'block_delete';
  originalText?: string;    // block.text before the change
  proposedText?: string;    // what the user typed (new text)
  newBlock?: TextBlock;     // for block_insert suggestions
}

export interface TextDocumentContent {
  blocks: TextBlock[];
  // Page-level metadata (preserved from imports for export fidelity)
  defaultFontFamily?: string;
  defaultFontSize?: number;
  pageSize?: 'A4' | 'Letter' | 'Legal';
  margins?: { top: number; right: number; bottom: number; left: number };
  // Headers, footers, page numbers
  header?: string;
  footer?: string;
  showPageNumbers?: boolean;
  // Footnotes / endnotes
  footnotes?: Array<{ id: string; marker: string; text: string }>;
  // Drawing / annotation strokes
  annotations?: Annotation[];
  // Track changes / suggested edits
  suggestions?: Suggestion[];
}

// ─── Spreadsheet (Excel-like) ─────────────────────────────────────────────────

export interface CellBorder {
  style: 'thin' | 'medium' | 'thick' | 'dashed' | 'dotted' | 'none';
  color: string;
}

export interface CellValue {
  raw: string;              // raw input (may be a formula: "=A1+B1")
  computed?: string;        // evaluated display value

  // ── Legacy formatting ────────────────────────────────────────────────────
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';

  // ── Rich formatting (new) ────────────────────────────────────────────────
  fontSize?: number;
  fontFamily?: string;
  color?: string;           // text colour (hex)
  bgColor?: string;         // background colour (hex)
  strikethrough?: boolean;
  underline?: boolean;
  vAlign?: 'top' | 'middle' | 'bottom';
  wrapText?: boolean;
  // Number format string (Excel-compatible): "0.00", "dd/mm/yyyy", "$#,##0", "0%"
  numberFormat?: string;
  borders?: {
    top?: CellBorder;
    right?: CellBorder;
    bottom?: CellBorder;
    left?: CellBorder;
  };

  _passthrough?: Record<string, unknown>;
}

export interface MergedCell {
  from: string;  // e.g. "A1"
  to: string;    // e.g. "B2"
}

export interface ConditionalFormat {
  range: string;      // e.g. "A1:C10"
  condition: 'gt' | 'lt' | 'eq' | 'ne' | 'not_empty' | 'contains';
  value?: string;
  color?: string;     // text colour (hex)
  bgColor?: string;   // background colour (hex)
}

export interface DataValidation {
  range: string;            // e.g. "B2:B10"
  type: 'list' | 'number_range';
  values?: string[];        // for list type: allowed values
  min?: number;             // for number_range
  max?: number;             // for number_range
  errorMessage?: string;
}

export interface ChartDef {
  id: string;
  type: 'bar' | 'line' | 'pie';
  title?: string;
  dataRange: string;    // e.g. "B2:B6"
  labelRange?: string;  // e.g. "A2:A6"
  colors?: string[];
}

export interface Sheet {
  name: string;
  rows: number;
  cols: number;
  colWidths: number[];
  rowHeights?: number[];
  cells: Record<string, CellValue>;   // key: "A1", "B3", etc.
  frozenRows?: number;
  frozenCols?: number;
  merges?: MergedCell[];
  hiddenRows?: number[];
  hiddenCols?: number[];
  tabColor?: string;
  conditionalFormats?: ConditionalFormat[];
  charts?: ChartDef[];
  validations?: DataValidation[];
  pivotTables?: PivotTableDef[];
}

export interface NamedRange {
  name: string;
  sheetIndex: number;
  ref: string;              // e.g. "A1:C10"
}

export interface PivotTableDef {
  id: string;
  name: string;
  sourceSheet: number;       // index into content.sheets
  rowField: string;          // column letter for row grouping (e.g. "A")
  valueField: string;        // column letter for numeric values (e.g. "B")
  aggregation: 'sum' | 'count' | 'avg' | 'max' | 'min';
}

export interface SpreadsheetContent {
  sheets: Sheet[];
  activeSheet: number;
  namedRanges?: NamedRange[];
  pivotTables?: PivotTableDef[];
}

// ─── Presentation (PowerPoint-like) ──────────────────────────────────────────

export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'shape';

  // Position (percentage of slide dimensions, 0-100)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  opacity?: number;         // 0-1
  locked?: boolean;

  // ── Text element ─────────────────────────────────────────────────────────
  // Legacy plain-text content field (kept for backward compat)
  content: string;
  // Rich runs (preserved from imports)
  runs?: TextRun[];

  style?: {
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    align?: 'left' | 'center' | 'right';
    letterSpacing?: number;
    lineHeight?: number;
    padding?: number;
  };

  // ── Shape element ─────────────────────────────────────────────────────────
  shapeType?: 'rect' | 'ellipse' | 'triangle' | 'arrow' | 'star' | 'line';
  fill?: { type: 'solid' | 'gradient' | 'none'; color?: string; colors?: string[] };
  stroke?: { color: string; width: number; style?: 'solid' | 'dashed' | 'dotted' };

  // ── Image element ─────────────────────────────────────────────────────────
  src?: string;
  alt?: string;
  objectFit?: 'cover' | 'contain' | 'fill';

  // ── Per-element animation ─────────────────────────────────────────────────
  animation?: {
    type: 'fade' | 'slide' | 'zoom' | 'bounce';
    direction?: 'left' | 'right' | 'up' | 'down'; // for 'slide' type
    duration?: number;   // ms, default 400
    delay?: number;      // ms, default 0
  };

  _passthrough?: Record<string, unknown>;
}

export interface Slide {
  id: string;
  background: string;       // hex colour or gradient descriptor
  elements: SlideElement[];
  notes?: string;           // speaker notes
  transition?: { type: 'none' | 'fade' | 'slide' | 'zoom'; duration: number };
  hidden?: boolean;
  _passthrough?: Record<string, unknown>;
}

export interface PresentationContent {
  slides: Slide[];
  theme: {
    primaryColor: string;
    secondaryColor?: string;
    fontFamily: string;
    fontHeading?: string;
  };
  // Logical slide canvas size (aspect ratio base); defaults to 1280×720
  slideWidth?: number;
  slideHeight?: number;
}

// ─── Union type ───────────────────────────────────────────────────────────────

export type DocumentContent =
  | TextDocumentContent
  | SpreadsheetContent
  | PresentationContent;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Detect a legacy single-sheet spreadsheet (pre-migration format).
function isLegacySpreadsheet(parsed: unknown): boolean {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const p = parsed as Record<string, unknown>;
  return 'rows' in p && 'cells' in p && !('sheets' in p);
}

// Convert old { rows, cols, colWidths, cells } → new { sheets, activeSheet }.
function migrateLegacySpreadsheet(old: Record<string, unknown>): SpreadsheetContent {
  const cols = (old.cols as number) ?? 10;
  return {
    sheets: [
      {
        name: 'Sheet 1',
        rows: (old.rows as number) ?? 20,
        cols,
        colWidths: (old.colWidths as number[]) ?? Array(cols).fill(80),
        cells: (old.cells as Record<string, CellValue>) ?? {},
      },
    ],
    activeSheet: 0,
  };
}

export function parseDocumentContent(
  raw: string,
  type: DocumentType
): DocumentContent {
  try {
    const parsed = JSON.parse(raw);
    // Migrate legacy spreadsheet format on the fly — transparent to callers.
    if (type === 'spreadsheet' && isLegacySpreadsheet(parsed)) {
      return migrateLegacySpreadsheet(parsed as Record<string, unknown>);
    }
    return parsed as DocumentContent;
  } catch {
    return createEmptyContent(type);
  }
}

export function serializeDocumentContent(content: DocumentContent): string {
  return JSON.stringify(content);
}

export function createEmptyContent(type: DocumentType): DocumentContent {
  switch (type) {
    case 'text':
      return {
        blocks: [
          { id: generateId(), type: 'paragraph', text: '' },
        ],
      } satisfies TextDocumentContent;

    case 'spreadsheet':
      return {
        sheets: [
          {
            name: 'Sheet 1',
            rows: 20,
            cols: 10,
            colWidths: Array(10).fill(80),
            cells: {},
          },
        ],
        activeSheet: 0,
      } satisfies SpreadsheetContent;

    case 'presentation':
      return {
        slides: [
          {
            id: generateId(),
            background: '#1E293B',
            elements: [
              {
                id: generateId(),
                type: 'text',
                x: 10,
                y: 35,
                width: 80,
                height: 30,
                content: 'Click to add title',
                style: { fontSize: 32, bold: true, color: '#FFFFFF' },
              },
            ],
          },
        ],
        theme: {
          primaryColor: '#2563EB',
          fontFamily: 'System',
        },
        slideWidth: 1280,
        slideHeight: 720,
      } satisfies PresentationContent;
  }
}

// ─── Cell address helpers (spreadsheet) ──────────────────────────────────────

export function cellKey(row: number, col: number): string {
  const colLetter = String.fromCharCode(65 + col); // 0 → 'A', 1 → 'B', etc.
  return `${colLetter}${row + 1}`;
}

export function parseCellKey(key: string): { row: number; col: number } {
  const col = key.charCodeAt(0) - 65;
  const row = parseInt(key.slice(1), 10) - 1;
  return { row, col };
}

// Basic formula evaluation: handles =A1+B1, =A1*2, =A1/B1, etc.
// Uses a safe recursive-descent arithmetic parser — no eval() or Function().
export function evaluateFormula(
  formula: string,
  cells: Record<string, CellValue>
): string {
  if (!formula.startsWith('=')) return formula;

  try {
    // Replace cell references with their numeric values
    const expression = formula.slice(1).replace(/[A-Z]+\d+/g, (ref) => {
      const cell = cells[ref];
      const val = cell?.computed ?? cell?.raw ?? '0';
      const num = Number(val);
      return isNaN(num) ? '0' : String(num);
    });

    const result = safeArithmetic(expression);
    if (!isFinite(result)) return '#ERR';
    // Round to avoid floating-point display noise
    return String(Math.round(result * 1e10) / 1e10);
  } catch {
    return '#ERR';
  }
}

// Safe recursive-descent arithmetic parser: +, -, *, /, (, ), numbers
function safeArithmetic(expr: string): number {
  let pos = 0;

  function skipSpaces() {
    while (pos < expr.length && expr[pos] === ' ') pos++;
  }

  function parseNumber(): number {
    skipSpaces();
    const start = pos;
    if (pos < expr.length && expr[pos] === '-') pos++;
    while (pos < expr.length && /[\d.]/.test(expr[pos])) pos++;
    const str = expr.slice(start, pos);
    const n = parseFloat(str);
    if (isNaN(n)) throw new Error('Invalid number');
    return n;
  }

  function parseFactor(): number {
    skipSpaces();
    if (pos >= expr.length) throw new Error('Unexpected end');
    if (expr[pos] === '(') {
      pos++;
      const val = parseExpr();
      skipSpaces();
      if (expr[pos] === ')') pos++;
      return val;
    }
    return parseNumber();
  }

  function parseTerm(): number {
    let left = parseFactor();
    skipSpaces();
    while (pos < expr.length && (expr[pos] === '*' || expr[pos] === '/')) {
      const op = expr[pos++];
      const right = parseFactor();
      left = op === '*' ? left * right : right !== 0 ? left / right : NaN;
      skipSpaces();
    }
    return left;
  }

  function parseExpr(): number {
    let left = parseTerm();
    skipSpaces();
    while (pos < expr.length && (expr[pos] === '+' || expr[pos] === '-')) {
      const op = expr[pos++];
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
      skipSpaces();
    }
    return left;
  }

  const result = parseExpr();
  if (pos !== expr.length) throw new Error('Unexpected characters');
  return result;
}
