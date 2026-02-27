import type { DocumentType } from '@/types';

// ─── Text Document (Word-like) ────────────────────────────────────────────────

export interface TextBlock {
  id: string;
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'numbered' | 'quote' | 'code';
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface TextDocumentContent {
  blocks: TextBlock[];
}

// ─── Spreadsheet (Excel-like) ─────────────────────────────────────────────────

export interface CellValue {
  raw: string;              // raw input (may be formula like "=A1+B1")
  computed?: string;        // computed display value
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface SpreadsheetContent {
  rows: number;
  cols: number;
  colWidths: number[];      // width in points per column
  cells: Record<string, CellValue>; // key: "A1", "B3", etc.
}

// ─── Presentation (PowerPoint-like) ──────────────────────────────────────────

export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number;      // percentage 0-100
  y: number;
  width: number;  // percentage 0-100
  height: number;
  content: string;
  style?: {
    fontSize?: number;
    bold?: boolean;
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
  };
}

export interface Slide {
  id: string;
  background: string; // hex color
  elements: SlideElement[];
}

export interface PresentationContent {
  slides: Slide[];
  theme: {
    primaryColor: string;
    fontFamily: string;
  };
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

export function parseDocumentContent(
  raw: string,
  type: DocumentType
): DocumentContent {
  try {
    return JSON.parse(raw) as DocumentContent;
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
        rows: 20,
        cols: 10,
        colWidths: Array(10).fill(80),
        cells: {},
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
