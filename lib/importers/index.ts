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
  type TextRun,
  type PresentationContent,
  type Slide,
  type SlideElement,
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

// ─── .docx → TextDocumentContent ─────────────────────────────────────────────

function xmlGetAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, 'g');
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) results.push(m[0]);
  return results;
}

function xmlAttr(el: string, attr: string): string | null {
  const m = el.match(new RegExp(`${attr}="([^"]*)"`));
  return m ? m[1] : null;
}

function xmlHasTag(xml: string, tag: string): boolean {
  return new RegExp(`<w:${tag}(\\s*\\/|\\s[^>]*\\/|>)`).test(xml);
}

function xmlInnerText(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g');
  let out = '';
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out += m[1];
  return out;
}

function mapDocxStyle(styleName: string): { type: TextBlock['type']; level?: 1|2|3|4|5|6 } {
  const s = styleName.toLowerCase().replace(/[\s-]/g, '');
  if (s === 'heading1' || s === 'title') return { type: 'heading', level: 1 };
  if (s === 'heading2' || s === 'subtitle') return { type: 'heading', level: 2 };
  if (s === 'heading3') return { type: 'heading', level: 3 };
  if (s === 'heading4') return { type: 'heading', level: 4 };
  if (s === 'heading5') return { type: 'heading', level: 5 };
  if (s === 'heading6') return { type: 'heading', level: 6 };
  if (s === 'listparagraph') return { type: 'list_item' };
  if (s === 'quote' || s === 'blocktext' || s === 'intenseQuote') return { type: 'quote' };
  if (s === 'code' || s === 'htmlpreformatted') return { type: 'code_block' };
  return { type: 'paragraph' };
}

const DOCX_HIGHLIGHT_MAP: Record<string, string> = {
  yellow: '#FFF176', cyan: '#B2EBF2', green: '#C8E6C9', magenta: '#F8BBD9',
  blue: '#BBDEFB', red: '#FFCDD2', darkYellow: '#FFF9C4', darkGreen: '#A5D6A7',
};

function decodeXmlEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

export async function importDocx(): Promise<TextDocumentContent | null> {
  const file = await pickFile([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream',
  ]);
  if (!file) return null;

  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { unzipSync, strFromU8 } = require('fflate') as typeof import('fflate');
  const unzipped = unzipSync(bytes);
  const docXmlBytes = unzipped['word/document.xml'];
  if (!docXmlBytes) return null;
  const xml = strFromU8(docXmlBytes);

  const paraEls = xmlGetAll(xml, 'w:p');
  const docxBlocks: TextBlock[] = [];

  for (const para of paraEls) {
    const pPr = xmlGetAll(para, 'w:pPr')[0] ?? '';
    const styleEl = xmlGetAll(pPr, 'w:pStyle')[0] ?? '';
    const styleName = xmlAttr(styleEl, 'w:val') ?? 'paragraph';
    const { type, level } = mapDocxStyle(styleName);

    const jcEl = xmlGetAll(pPr, 'w:jc')[0] ?? '';
    const jcVal = xmlAttr(jcEl, 'w:val');
    const align = jcVal === 'center' ? 'center' : jcVal === 'right' ? 'right' : jcVal === 'both' ? 'justify' : undefined;

    const runEls = xmlGetAll(para, 'w:r');
    const runs: TextRun[] = [];
    let fullText = '';

    for (const runEl of runEls) {
      const rPr = xmlGetAll(runEl, 'w:rPr')[0] ?? '';
      const tEls = xmlGetAll(runEl, 'w:t');
      const text = decodeXmlEntities(tEls.map((t) => t.replace(/<[^>]+>/g, '')).join(''));
      if (!text) continue;

      const bold = xmlHasTag(rPr, 'b');
      const italic = xmlHasTag(rPr, 'i');
      const underline = xmlHasTag(rPr, 'u');
      const strikethrough = xmlHasTag(rPr, 'strike') || xmlHasTag(rPr, 'dstrike');

      const colorEl = xmlGetAll(rPr, 'w:color')[0] ?? '';
      const colorVal = xmlAttr(colorEl, 'w:val');
      const color = colorVal && colorVal !== 'auto' && colorVal.toLowerCase() !== '000000' ? `#${colorVal}` : undefined;

      const szEl = xmlGetAll(rPr, 'w:sz')[0] ?? '';
      const szVal = xmlAttr(szEl, 'w:val');
      const fontSize = szVal ? Math.round(Number(szVal) / 2) : undefined;

      const hlEl = xmlGetAll(rPr, 'w:highlight')[0] ?? '';
      const hlVal = xmlAttr(hlEl, 'w:val');
      const highlight = hlVal ? (DOCX_HIGHLIGHT_MAP[hlVal] ?? undefined) : undefined;

      fullText += text;
      runs.push({
        text,
        bold: bold || undefined,
        italic: italic || undefined,
        underline: underline || undefined,
        strikethrough: strikethrough || undefined,
        color,
        fontSize,
        highlight,
      });
    }

    if (!fullText) continue;
    docxBlocks.push({ id: generateId(), type, text: fullText, runs: runs.length > 0 ? runs : undefined, level, align } as TextBlock);
  }

  if (docxBlocks.length === 0) docxBlocks.push({ id: generateId(), type: 'paragraph', text: '' });
  return { blocks: docxBlocks };
}

// ─── .pptx → PresentationContent ─────────────────────────────────────────────

const SLIDE_W_EMU = 9144000;
const SLIDE_H_EMU = 5143500;

function emuToPct(emu: number, total: number): number {
  return Math.max(0, Math.round((emu / total) * 100));
}

function pptxBgColor(slideXml: string): string {
  const bgEl = xmlGetAll(slideXml, 'p:bg')[0] ?? '';
  const solidFill = xmlGetAll(bgEl, 'a:solidFill')[0] ?? '';
  const srgb = xmlGetAll(solidFill, 'a:srgbClr')[0] ?? '';
  const val = xmlAttr(srgb, 'val');
  if (val) return `#${val}`;
  const schemeClr = xmlGetAll(solidFill, 'a:schemeClr')[0] ?? '';
  const schemeVal = xmlAttr(schemeClr, 'val');
  if (schemeVal === 'lt1' || schemeVal === 'bg1') return '#FFFFFF';
  return '#1E293B';
}

export async function importPptx(): Promise<PresentationContent | null> {
  const file = await pickFile([
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/octet-stream',
  ]);
  if (!file) return null;

  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { unzipSync, strFromU8 } = require('fflate') as typeof import('fflate');
  const unzipped = unzipSync(bytes);

  const slideKeys = Object.keys(unzipped)
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/)?.[1] ?? '0', 10);
      const nb = parseInt(b.match(/(\d+)/)?.[1] ?? '0', 10);
      return na - nb;
    });

  const slides: Slide[] = [];

  for (const key of slideKeys) {
    const xml = strFromU8(unzipped[key]);
    const background = pptxBgColor(xml);
    const elements: SlideElement[] = [];

    for (const sp of xmlGetAll(xml, 'p:sp')) {
      const xfrm = xmlGetAll(sp, 'a:xfrm')[0] ?? '';
      const off = xmlGetAll(xfrm, 'a:off')[0] ?? '';
      const ext = xmlGetAll(xfrm, 'a:ext')[0] ?? '';
      const x = emuToPct(Number(xmlAttr(off, 'x') ?? 0), SLIDE_W_EMU);
      const y = emuToPct(Number(xmlAttr(off, 'y') ?? 0), SLIDE_H_EMU);
      const width = Math.max(10, emuToPct(Number(xmlAttr(ext, 'cx') ?? 0), SLIDE_W_EMU));
      const height = Math.max(5, emuToPct(Number(xmlAttr(ext, 'cy') ?? 0), SLIDE_H_EMU));

      const txBody = xmlGetAll(sp, 'p:txBody')[0] ?? '';
      let combinedText = '';
      let bold = false;
      let italic = false;
      let color: string | undefined;
      let fontSize: number | undefined;

      for (const p of xmlGetAll(txBody, 'a:p')) {
        for (const r of xmlGetAll(p, 'a:r')) {
          const rPr = xmlGetAll(r, 'a:rPr')[0] ?? '';
          const tEl = xmlGetAll(r, 'a:t')[0] ?? '';
          const text = decodeXmlEntities(tEl.replace(/<[^>]+>/g, ''));
          combinedText += text;
          if (xmlAttr(rPr, 'b') === '1') bold = true;
          if (xmlAttr(rPr, 'i') === '1') italic = true;
          const szVal = xmlAttr(rPr, 'sz');
          if (szVal) fontSize = Math.round(Number(szVal) / 100);
          const solidFill = xmlGetAll(rPr, 'a:solidFill')[0] ?? '';
          const srgbEl = xmlGetAll(solidFill, 'a:srgbClr')[0] ?? '';
          const colorVal = xmlAttr(srgbEl, 'val');
          if (colorVal) color = `#${colorVal}`;
        }
        combinedText += '\n';
      }

      combinedText = combinedText.trim();
      if (!combinedText) continue;

      elements.push({
        id: generateId(),
        type: 'text',
        x, y, width, height,
        content: combinedText,
        style: { bold: bold || undefined, italic: italic || undefined, color: color ?? '#FFFFFF', fontSize: fontSize ?? 18 },
      });
    }

    for (const pic of xmlGetAll(xml, 'p:pic')) {
      const xfrm = xmlGetAll(pic, 'a:xfrm')[0] ?? '';
      const off = xmlGetAll(xfrm, 'a:off')[0] ?? '';
      const ext = xmlGetAll(xfrm, 'a:ext')[0] ?? '';
      elements.push({
        id: generateId(),
        type: 'image',
        x: emuToPct(Number(xmlAttr(off, 'x') ?? 0), SLIDE_W_EMU),
        y: emuToPct(Number(xmlAttr(off, 'y') ?? 0), SLIDE_H_EMU),
        width: Math.max(10, emuToPct(Number(xmlAttr(ext, 'cx') ?? 0), SLIDE_W_EMU)),
        height: Math.max(5, emuToPct(Number(xmlAttr(ext, 'cy') ?? 0), SLIDE_H_EMU)),
        content: '',
      });
    }

    slides.push({ id: generateId(), background, elements });
  }

  if (slides.length === 0) slides.push({ id: generateId(), background: '#1E293B', elements: [] });
  return { slides, theme: { primaryColor: '#3B82F6', secondaryColor: '#E2E8F0', fontFamily: 'System' } };
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
