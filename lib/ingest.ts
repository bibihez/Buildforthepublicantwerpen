import { createHash } from 'node:crypto';
import { extractText, getDocumentProxy } from 'unpdf';
import type { Passage } from './types';

const PAGE_MARK = /pagina\s+\d+\s+van\s+\d+/i;
// An article heading at the start of a line: "Artikel 13 - …", "I Artikel 4.1 : …", "Art. 5. …".
const HEADING = /^[ \t]*(?:I[ \t]+)?(?:Artikel|Art\.)[ \t]*\d+[^\n]*/gm;
const MAX_PASSAGE = 4000;
const MIN_PASSAGE = 20;

export function sha256(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function sha1(data: string): string {
  return createHash('sha1').update(data).digest('hex');
}

/** One string per page, as the PDF's text layer gives it. */
export async function pdfPages(data: Uint8Array): Promise<string[]> {
  // unpdf may detach the buffer it receives, so it gets a copy.
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const { text } = await extractText(pdf, { mergePages: false });
  return Array.isArray(text) ? text : [text];
}

/**
 * Removes page footers ("pagina 5 van 11") and running headers (a short line repeated on at least
 * half the pages), so they never land inside a passage or a quote.
 */
export function cleanPages(pages: string[]): string[] {
  const shape = (line: string) => line.replace(/\d+/g, '#').trim();
  // Only the first and last lines of a page can be a running header or footer; a short line repeated
  // in the body ("§2.", "•") is content and stays.
  const EDGE = 3;
  const edgeLines = (lines: string[]) => [...lines.slice(0, EDGE), ...lines.slice(-EDGE)];
  const seenOn = new Map<string, number>();
  for (const page of pages) {
    for (const line of new Set(edgeLines(page.split('\n')).map(shape).filter(Boolean))) {
      seenOn.set(line, (seenOn.get(line) ?? 0) + 1);
    }
  }
  const repeated = Math.max(3, Math.ceil(pages.length * 0.5));
  return pages.map((page) => {
    const lines = page.split('\n');
    return lines
      .filter((line, i) => {
        const s = shape(line);
        if (!s) return true;
        if (PAGE_MARK.test(line)) return false;
        const atEdge = i < EDGE || i >= lines.length - EDGE;
        return !(atEdge && s.length < 120 && (seenOn.get(s) ?? 0) >= repeated);
      })
      .join('\n');
  });
}

type Span = { start: number; end: number; article: string | null };

function splitLong(text: string, span: Span): Span[] {
  const out: Span[] = [];
  let start = span.start;
  while (span.end - start > MAX_PASSAGE) {
    const limit = start + MAX_PASSAGE;
    const para = text.lastIndexOf('\n\n', limit);
    const line = text.lastIndexOf('\n', limit);
    const cut = para > start + MAX_PASSAGE / 2 ? para : line > start + MAX_PASSAGE / 2 ? line : limit;
    out.push({ start, end: cut, article: span.article });
    start = cut;
  }
  out.push({ start, end: span.end, article: span.article });
  return out;
}

/**
 * Cuts cleaned pages into passages at article headings (or per page when a document has none).
 * Pages are joined first, so an article that runs from page 5 onto page 6 stays one passage.
 */
export function splitPassages(pages: string[], sourceId: string, fileSha: string): Passage[] {
  let text = '';
  const pageStarts: number[] = [];
  for (const page of pages) {
    pageStarts.push(text.length);
    text += page + '\n';
  }
  const pageAt = (offset: number) => {
    let i = 0;
    while (i + 1 < pageStarts.length && pageStarts[i + 1] <= offset) i++;
    return i + 1;
  };

  const headings = [...text.matchAll(HEADING)].map((m) => ({ start: m.index!, article: m[0].trim().slice(0, 60) }));
  const spans: Span[] = [];
  if (headings.length === 0) {
    pages.forEach((page, i) => spans.push({ start: pageStarts[i], end: pageStarts[i] + page.length, article: null }));
  } else {
    if (headings[0].start > 0) spans.push({ start: 0, end: headings[0].start, article: null });
    headings.forEach((h, i) =>
      spans.push({ start: h.start, end: i + 1 < headings.length ? headings[i + 1].start : text.length, article: h.article }),
    );
  }

  const passages: Passage[] = [];
  for (const span of spans) {
    for (const piece of splitLong(text, span)) {
      const raw = text.slice(piece.start, piece.end);
      const body = raw.trim();
      if (body.length < MIN_PASSAGE) continue;
      const bodyStart = piece.start + raw.indexOf(body);
      passages.push({
        id: sha1(`${fileSha}:${bodyStart}`).slice(0, 12),
        source_id: sourceId,
        page_from: pageAt(bodyStart),
        page_to: pageAt(bodyStart + body.length - 1),
        article: piece.article,
        text: body,
      });
    }
  }
  return passages;
}

export async function ingestPdf(data: Uint8Array, sourceId: string): Promise<{ sha256: string; passages: Passage[] }> {
  const fileSha = sha256(data);
  const pages = cleanPages(await pdfPages(data));
  return { sha256: fileSha, passages: splitPassages(pages, sourceId, fileSha) };
}
