/**
 * Document exporters — convert internal JSON schemas to distributable file formats.
 *
 * Spreadsheet → .xlsx  (SheetJS, lazy-loaded to avoid startup bundle issues)
 * Spreadsheet → .csv   (plain text, client-side)
 * Text        → .html  (HTML file Word/browsers can open, client-side)
 * Presentation→ .html  (self-contained HTML slideshow, client-side)
 *
 * All functions write to the Expo file-system cache then open the OS share sheet.
 *
 * IMPORTANT: xlsx and expo-sharing are require()'d lazily inside each function so
 * that missing native modules or bundle-init failures do not crash the app on startup.
 */

import { Linking, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';

import {
  cellKey,
  type TextDocumentContent,
  type TextBlock,
  type SpreadsheetContent,
  type PresentationContent,
} from '@/lib/documents/schemas';

// ─── Sharing helper ───────────────────────────────────────────────────────────

async function shareFile(
  content: string,
  fileName: string,
  mimeType: string,
  encoding: 'utf8' | 'base64' = 'utf8'
): Promise<void> {
  const path = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(path, content, {
    encoding:
      encoding === 'base64'
        ? FileSystem.EncodingType.Base64
        : FileSystem.EncodingType.UTF8,
  });

  // 1. Try expo-sharing (lazy require — missing native module won't crash startup)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sharing = require('expo-sharing');
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(path, { mimeType, dialogTitle: `Export ${fileName}` });
      return;
    }
  } catch {
    // Native module absent — fall through
  }

  // 2. For text-based formats, share content directly via the OS share sheet
  if (encoding === 'utf8') {
    await Share.share({ title: fileName, message: content });
    return;
  }

  // 3. For binary formats, open the cached file via Linking
  const canOpen = await Linking.canOpenURL(path).catch(() => false);
  if (canOpen) await Linking.openURL(path);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Spreadsheet → .xlsx ──────────────────────────────────────────────────────

export async function exportSpreadsheetAsXlsx(
  content: SpreadsheetContent,
  docName: string
): Promise<void> {
  // Lazy-load xlsx so it is NOT evaluated at app startup
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX = require('xlsx') as typeof import('xlsx');

  const wb = XLSX.utils.book_new();

  for (const sheet of content.sheets) {
    const ws: import('xlsx').WorkSheet = {};
    let maxRow = 0;
    let maxCol = 0;

    for (const [key, cellData] of Object.entries(sheet.cells)) {
      const colIndex = key.charCodeAt(0) - 65;
      const rowIndex = parseInt(key.slice(1), 10) - 1;
      const addr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });

      maxRow = Math.max(maxRow, rowIndex);
      maxCol = Math.max(maxCol, colIndex);

      const isFormula = cellData.raw.startsWith('=');
      const numericVal = parseFloat(cellData.computed ?? cellData.raw);

      const xlsxCell: import('xlsx').CellObject = isFormula
        ? {
            f: cellData.raw.slice(1),
            v: isNaN(numericVal) ? cellData.computed : numericVal,
            t: isNaN(numericVal) ? 's' : 'n',
          }
        : {
            v:
              isNaN(numericVal) || cellData.raw.trim() === ''
                ? cellData.raw
                : numericVal,
            t:
              isNaN(numericVal) || cellData.raw.trim() === '' ? 's' : 'n',
          };

      ws[addr] = xlsxCell;
    }

    if (maxRow >= 0 || maxCol >= 0) {
      ws['!ref'] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: maxRow, c: maxCol },
      });
    }

    ws['!cols'] = sheet.colWidths.map((w) => ({
      wch: Math.max(8, Math.round(w / 7)),
    }));

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  await shareFile(
    base64,
    `${docName}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'base64'
  );
}

// ─── Spreadsheet → .csv ───────────────────────────────────────────────────────

export async function exportSpreadsheetAsCsv(
  content: SpreadsheetContent,
  docName: string
): Promise<void> {
  const sheet = content.sheets[content.activeSheet] ?? content.sheets[0];
  let csv = '';

  for (let r = 0; r < sheet.rows; r++) {
    const row = Array.from({ length: sheet.cols }, (_, c) => {
      const key = cellKey(r, c);
      const val = sheet.cells[key]?.computed ?? sheet.cells[key]?.raw ?? '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    csv += row.join(',') + '\n';
  }

  await shareFile(csv, `${docName}.csv`, 'text/csv');
}

// ─── Text Document → .html ────────────────────────────────────────────────────

function blockToHtml(block: TextBlock): string {
  let inner = escapeHtml(block.text);
  if (block.bold) inner = `<strong>${inner}</strong>`;
  if (block.italic) inner = `<em>${inner}</em>`;
  if (block.underline) inner = `<u>${inner}</u>`;

  const alignStyle =
    block.align && block.align !== 'left'
      ? ` style="text-align:${block.align}"`
      : '';

  switch (block.type) {
    case 'heading1':  return `<h1${alignStyle}>${inner}</h1>\n`;
    case 'heading2':  return `<h2${alignStyle}>${inner}</h2>\n`;
    case 'heading3':  return `<h3${alignStyle}>${inner}</h3>\n`;
    case 'heading':   return `<h${block.level ?? 1}${alignStyle}>${inner}</h${block.level ?? 1}>\n`;
    case 'quote':     return `<blockquote>${inner}</blockquote>\n`;
    case 'code':
    case 'code_block':return `<pre><code>${inner}</code></pre>\n`;
    case 'divider':   return `<hr/>\n`;
    case 'page_break':return `<div style="page-break-after:always"></div>\n`;
    default:          return `<p${alignStyle}>${inner}</p>\n`;
  }
}

function textContentToHtml(content: TextDocumentContent, title: string): string {
  const blocks = content.blocks;
  let body = '';
  let i = 0;

  while (i < blocks.length) {
    const b = blocks[i];
    const isBullet =
      b.type === 'bullet' ||
      (b.type === 'list_item' && b.listType !== 'ordered');
    const isNumbered =
      b.type === 'numbered' ||
      (b.type === 'list_item' && b.listType === 'ordered');

    if (isBullet) {
      body += '<ul>\n';
      while (i < blocks.length) {
        const bi = blocks[i];
        const still =
          bi.type === 'bullet' ||
          (bi.type === 'list_item' && bi.listType !== 'ordered');
        if (!still) break;
        body += `  <li>${escapeHtml(bi.text)}</li>\n`;
        i++;
      }
      body += '</ul>\n';
    } else if (isNumbered) {
      body += '<ol>\n';
      while (i < blocks.length) {
        const bi = blocks[i];
        const still =
          bi.type === 'numbered' ||
          (bi.type === 'list_item' && bi.listType === 'ordered');
        if (!still) break;
        body += `  <li>${escapeHtml(bi.text)}</li>\n`;
        i++;
      }
      body += '</ol>\n';
    } else {
      body += blockToHtml(b);
      i++;
    }
  }

  const fontFamily = content.defaultFontFamily ?? 'Georgia, "Times New Roman", serif';
  const fontSize = content.defaultFontSize ?? 16;
  const pageSize = content.pageSize ?? 'A4';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: ${pageSize}; margin: 25mm; }
    body {
      font-family: ${fontFamily};
      font-size: ${fontSize}px;
      line-height: 1.6;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 24px;
      color: #1a1a1a;
    }
    h1 { font-size: 2em; margin: 0.67em 0; }
    h2 { font-size: 1.5em; margin: 0.75em 0; }
    h3 { font-size: 1.17em; margin: 0.83em 0; }
    h4 { font-size: 1em; margin: 1em 0; }
    h5 { font-size: 0.83em; }
    h6 { font-size: 0.67em; }
    p  { margin: 0.8em 0; }
    blockquote {
      border-left: 4px solid #6366f1;
      margin: 1em 0;
      padding: 0.5em 1em;
      color: #555;
      background: #f8f8ff;
    }
    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1em;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    ul, ol { margin: 0.8em 0; padding-left: 2em; }
    li { margin: 0.3em 0; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export async function exportTextAsHtml(
  content: TextDocumentContent,
  docName: string
): Promise<void> {
  const html = textContentToHtml(content, docName);
  await shareFile(html, `${docName}.html`, 'text/html');
}

// ─── Text Document → .txt ─────────────────────────────────────────────────────

export async function exportTextAsTxt(
  content: TextDocumentContent,
  docName: string
): Promise<void> {
  const text = content.blocks.map((b) => b.text).filter(Boolean).join('\n\n');
  await shareFile(text, `${docName}.txt`, 'text/plain');
}

// ─── Presentation → .html slideshow ──────────────────────────────────────────

export async function exportPresentationAsHtml(
  content: PresentationContent,
  docName: string
): Promise<void> {
  const slidesHtml = content.slides
    .map(
      (slide, i) => `
  <div class="slide" id="slide-${i}" style="background:${slide.background};">
    ${slide.elements
      .filter((el) => el.type === 'text')
      .map(
        (el) => `
    <div class="element" style="
      left:${el.x}%;top:${el.y}%;
      width:${el.width}%;min-height:${el.height}%;
      font-size:${(el.style?.fontSize ?? 16) * 1.5}px;
      font-weight:${el.style?.bold ? '700' : '400'};
      font-style:${el.style?.italic ? 'italic' : 'normal'};
      color:${el.style?.color ?? '#ffffff'};
      text-align:${el.style?.align ?? 'left'};
    ">${escapeHtml(el.content)}</div>`
      )
      .join('')}
    ${slide.notes ? `<div class="slide-notes">${escapeHtml(slide.notes)}</div>` : ''}
  </div>`
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(docName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #000; font-family: sans-serif; overflow: hidden; }
    .slide { display: none; position: relative; width: 100vw; height: 100vh; overflow: hidden; }
    .slide.active { display: block; }
    .element { position: absolute; white-space: pre-wrap; word-break: break-word; }
    .slide-notes {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: rgba(0,0,0,0.7); color: #ccc;
      font-size: 14px; font-style: italic; padding: 8px 16px;
    }
    nav {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 12px; align-items: center;
      background: rgba(0,0,0,0.6); padding: 8px 20px; border-radius: 40px; z-index: 100;
    }
    nav button {
      background: #334155; color: #fff; border: none;
      padding: 6px 16px; border-radius: 20px; cursor: pointer; font-size: 14px;
    }
    #counter { color: #94a3b8; font-size: 14px; min-width: 60px; text-align: center; }
  </style>
</head>
<body>
${slidesHtml}
<nav>
  <button onclick="go(-1)">← Prev</button>
  <span id="counter"></span>
  <button onclick="go(1)">Next →</button>
</nav>
<script>
  var current = 0;
  var slides = document.querySelectorAll('.slide');
  function show(n) {
    slides[current].classList.remove('active');
    current = (n + slides.length) % slides.length;
    slides[current].classList.add('active');
    document.getElementById('counter').textContent = (current+1) + ' / ' + slides.length;
  }
  function go(d) { show(current + d); }
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });
  show(0);
</script>
</body>
</html>`;

  await shareFile(html, `${docName}.html`, 'text/html');
}
