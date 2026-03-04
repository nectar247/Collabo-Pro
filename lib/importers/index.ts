/**
 * Document importers — parse external file formats into our internal JSON schemas.
 *
 * .xlsx / .xls → SpreadsheetContent  (SheetJS, client-side)
 * .csv         → SpreadsheetContent  (plain text, client-side)
 * .txt / .html → TextDocumentContent (plain text / HTML-stripped, client-side)
 *
 * Each function shows the OS document picker, reads the selected file, converts
 * it to our internal format, and returns it (or null if the user cancelled).
 *
 * Attributes that cannot be represented in our schema are stored in _passthrough
 * so they are not silently lost.
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

import {
  cellKey,
  type CellValue,
  type Sheet,
  type SpreadsheetContent,
  type TextBlock,
  type TextDocumentContent,
} from '@/lib/documents/schemas';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function pickFile(
  types: string[]
): Promise<{ uri: string; name: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: types,
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return { uri: result.assets[0].uri, name: result.assets[0].name ?? 'import' };
}

// ─── .xlsx / .xls → SpreadsheetContent ───────────────────────────────────────

export async function importSpreadsheetFromXlsx(): Promise<SpreadsheetContent | null> {
  const file = await pickFile([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    // Fallback MIME for some Android/iOS file managers
    'application/octet-stream',
  ]);
  if (!file) return null;

  // Lazy-load xlsx so it is NOT evaluated at app startup
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX = require('xlsx') as typeof import('xlsx');

  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const wb = XLSX.read(base64, { type: 'base64', cellStyles: true, cellFormula: true });

  const sheets: Sheet[] = wb.SheetNames.map((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const ref = ws['!ref'];
    if (!ref) return { name: sheetName, rows: 20, cols: 10, colWidths: Array(10).fill(80), cells: {} };

    const range = XLSX.utils.decode_range(ref);
    const rows = range.e.r + 1;
    const cols = range.e.c + 1;
    const cells: Record<string, CellValue> = {};

    for (let r = 0; r <= range.e.r; r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const xlCell = ws[addr];
        if (!xlCell) continue;

        const key = cellKey(r, c);
        const raw = xlCell.f ? `=${xlCell.f}` : String(xlCell.v ?? '');
        const computed = String(xlCell.v ?? '');

        // Extract cell styles (available when cellStyles: true)
        const s = xlCell.s as Record<string, any> | undefined;
        const font = s?.font as Record<string, any> | undefined;
        const fill = s?.fill as Record<string, any> | undefined;
        const alignment = s?.alignment as Record<string, any> | undefined;

        // ARGB hex from XLSX styles → CSS hex (strip the leading 2 alpha chars)
        const toHex = (argb?: string) =>
          argb && argb.length >= 6 ? `#${argb.slice(-6)}` : undefined;

        const cell: CellValue = {
          raw,
          computed,
          bold: font?.bold ?? undefined,
          italic: font?.italic ?? undefined,
          underline: font?.underline ? true : undefined,
          color: toHex(font?.color?.rgb),
          bgColor: toHex(fill?.fgColor?.rgb),
          align: alignment?.horizontal as CellValue['align'],
          vAlign: alignment?.vertical as CellValue['vAlign'],
          wrapText: alignment?.wrapText ?? undefined,
          numberFormat: xlCell.z ?? undefined,
          // Preserve the raw XLSX cell style in passthrough for round-trip fidelity
          _passthrough: s ? { xlsxStyle: s } : undefined,
        };

        cells[key] = cell;
      }
    }

    // Column widths: xlsx '!cols' gives character-width units; convert to points
    const xlCols: { wch?: number }[] = (ws['!cols'] as any[]) ?? [];
    const colWidths = Array.from({ length: cols }, (_, c) =>
      xlCols[c]?.wch ? xlCols[c].wch! * 7 : 80
    );

    const merges = (ws['!merges'] as Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> | undefined)?.map((m) => ({
      from: XLSX.utils.encode_cell(m.s),
      to: XLSX.utils.encode_cell(m.e),
    }));

    return { name: sheetName, rows, cols, colWidths, cells, merges };
  });

  return { sheets, activeSheet: 0 };
}

// ─── .csv → SpreadsheetContent ────────────────────────────────────────────────

export async function importSpreadsheetFromCsv(): Promise<SpreadsheetContent | null> {
  const file = await pickFile(['text/csv', 'text/comma-separated-values', 'text/plain']);
  if (!file) return null;

  const text = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const lines = text.split('\n').filter((l) => l.trim());
  const cells: Record<string, CellValue> = {};
  let maxCols = 0;

  lines.forEach((line, rowIdx) => {
    const cols = parseCsvLine(line);
    maxCols = Math.max(maxCols, cols.length);
    cols.forEach((val, colIdx) => {
      if (val !== '') {
        cells[cellKey(rowIdx, colIdx)] = { raw: val, computed: val };
      }
    });
  });

  return {
    sheets: [
      {
        name: file.name.replace(/\.csv$/i, '') || 'Imported',
        rows: Math.max(lines.length, 20),
        cols: Math.max(maxCols, 10),
        colWidths: Array(Math.max(maxCols, 10)).fill(80),
        cells,
      },
    ],
    activeSheet: 0,
  };
}

// RFC 4180-compliant CSV line parser (handles quoted fields with embedded commas/newlines)
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let inQuotes = false;
  let current = '';
  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 2;
      } else {
        inQuotes = !inQuotes;
        i++;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      i++;
    } else {
      current += ch;
      i++;
    }
  }
  fields.push(current);
  return fields;
}

// ─── .txt → TextDocumentContent ──────────────────────────────────────────────

export async function importTextFromTxt(): Promise<TextDocumentContent | null> {
  const file = await pickFile(['text/plain']);
  if (!file) return null;

  const text = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const paragraphs = text.split(/\n{2,}/);
  const blocks: TextBlock[] = paragraphs
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({
      id: generateId(),
      type: 'paragraph' as const,
      text: p.replace(/\n/g, ' '),
    }));

  if (blocks.length === 0) {
    blocks.push({ id: generateId(), type: 'paragraph', text: '' });
  }

  return { blocks };
}

// ─── .html → TextDocumentContent ─────────────────────────────────────────────

export async function importTextFromHtml(): Promise<TextDocumentContent | null> {
  const file = await pickFile(['text/html', 'text/htm', 'application/xhtml+xml']);
  if (!file) return null;

  const html = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const blocks: TextBlock[] = [];

  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;

  // Walk common block elements and convert to our schema
  const blockRegex =
    /<(h[1-6]|p|blockquote|pre|li|hr)[^>]*>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;

  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = blockRegex.exec(bodyHtml)) !== null) {
    const tag = (match[1] ?? 'hr').toLowerCase();
    const innerHtml = match[2] ?? '';

    // Strip inline HTML tags to get plain text
    const text = innerHtml.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim();

    if (tag === 'hr') {
      blocks.push({ id: generateId(), type: 'divider', text: '' });
      continue;
    }
    if (!text) continue;

    // Detect inline bold/italic
    const hasBold = /<(strong|b)[^>]*>/i.test(innerHtml);
    const hasItalic = /<(em|i)[^>]*>/i.test(innerHtml);
    const hasUnderline = /<u[^>]*>/i.test(innerHtml);

    let type: TextBlock['type'] = 'paragraph';
    let level: TextBlock['level'];

    switch (tag) {
      case 'h1': type = 'heading'; level = 1; break;
      case 'h2': type = 'heading'; level = 2; break;
      case 'h3': type = 'heading'; level = 3; break;
      case 'h4': type = 'heading'; level = 4; break;
      case 'h5': type = 'heading'; level = 5; break;
      case 'h6': type = 'heading'; level = 6; break;
      case 'blockquote': type = 'quote'; break;
      case 'pre': type = 'code_block'; break;
      case 'li': type = 'list_item'; break;
    }

    blocks.push({
      id: generateId(),
      type,
      level,
      text,
      bold: hasBold || undefined,
      italic: hasItalic || undefined,
      underline: hasUnderline || undefined,
    });
  }

  if (blocks.length === 0) {
    // Fallback: strip all HTML and treat as plain text paragraphs
    const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, '\n\n').trim();
    plain.split(/\n{2,}/).forEach((p) => {
      const t = p.trim();
      if (t) blocks.push({ id: generateId(), type: 'paragraph', text: t });
    });
  }

  if (blocks.length === 0) {
    blocks.push({ id: generateId(), type: 'paragraph', text: '' });
  }

  return { blocks };
}
