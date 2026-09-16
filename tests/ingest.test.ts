import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cleanPages, ingestPdf, splitPassages } from '../lib/ingest';

const MARKET = path.join(process.cwd(), 'data/files/Schoten-marktreglement-2024.pdf');
const FEES = path.join(process.cwd(), 'data/files/Schoten-markt-en-kermisretributies-2026-2031.pdf');

describe('splitPassages', () => {
  it('keeps an article that crosses a page break in one passage', () => {
    const pages = ['Intro\nArtikel 1 - Eerste\nbegin van de tekst', 'vervolg op pagina twee\nArtikel 2 - Tweede\nnog een regel tekst'];
    const passages = splitPassages(pages, 'x', 'sha');
    const art1 = passages.find((p) => p.article?.startsWith('Artikel 1'))!;
    expect(art1.page_from).toBe(1);
    expect(art1.page_to).toBe(2);
    expect(art1.text).toContain('vervolg op pagina twee');
  });

  it('removes page footers and repeated headers', () => {
    const header = 'BIJZONDER POLITIEREGLEMENT';
    const bodies = ['eerste inhoud', 'tweede stuk', 'derde deel', 'vierde tekst'];
    const pages = bodies.map((b, n) => `${header}\nGemeenteraad pagina ${n + 1} van 4\n${b}\n§2.`);
    const cleaned = cleanPages(pages);
    expect(cleaned[0]).not.toContain(header);
    expect(cleaned[0]).not.toContain('pagina 1 van 4');
    expect(cleaned[0]).toContain('eerste inhoud');
  });
});

describe.skipIf(!fs.existsSync(MARKET))('real Schoten PDFs', () => {
  it('market regulation: article 13 is one passage from page 5 to 6', async () => {
    const { passages } = await ingestPdf(new Uint8Array(fs.readFileSync(MARKET)), 'markt-2024');
    const art13 = passages.filter((p) => p.article?.startsWith('Artikel 13'));
    expect(art13).toHaveLength(1);
    expect(art13[0].page_from).toBe(5);
    expect(art13[0].page_to).toBe(6);
    expect(art13[0].text).toContain('aanvraagformulier');
    expect(art13[0].text).toContain('keuringsbewijs brandblusapparaten');
    expect(art13[0].text).not.toMatch(/pagina \d+ van \d+/i);
  });

  it('fee regulation: article 4.1 carries both market rates', async () => {
    const { passages } = await ingestPdf(new Uint8Array(fs.readFileSync(FEES)), 'retributie-markt');
    const art41 = passages.find((p) => p.article?.includes('Artikel 4.1'));
    expect(art41).toBeDefined();
    expect(art41!.text).toContain('6,00 euro');
    expect(art41!.text).toContain('78,00 euro');
  });
});
