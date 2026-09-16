import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../config/schoten.json';
import seed from '../data/seed/sources.json';
import { quoteInPassage } from '../lib/anchor';
import { ingestPdf } from '../lib/ingest';
import { canonicalNumber, numbersGrounded } from '../lib/numbers';
import { buildIndex, findCandidates } from '../lib/search';
import type { Passage, Source } from '../lib/types';
import { verdictsFor } from '../lib/verdict';

describe('quoteInPassage', () => {
  it('ignores PDF spaces inside words and bullets', () => {
    expect(quoteInPassage('Per marktdag: 6,00 euro', '•    P er marktdag: 6,00 euro')).toBe(true);
  });
  it('never matches a different amount', () => {
    expect(quoteInPassage('Per marktdag: 8,00 euro', 'P er marktdag: 6,00 euro')).toBe(false);
  });
  it('matches curly quotes, dashes and markdown asterisks', () => {
    expect(quoteInPassage('**het “voorgaand” reglement – opgeheven**', 'het "voorgaand" reglement - opgeheven')).toBe(true);
  });
  it('rejects an empty quote', () => {
    expect(quoteInPassage('  ', 'tekst')).toBe(false);
  });
});

describe('numbers', () => {
  it('reads Dutch notation', () => {
    expect(canonicalNumber('6,00')).toBe('6');
    expect(canonicalNumber('1.250,50')).toBe('1250.5');
  });
  it('grounds amounts present in the quote', () => {
    expect(numbersGrounded('78,00 euro per halfjaar', ['H alfjaarlijks: 78,00 euro'])).toBe(true);
  });
  it('refuses an amount the quote does not contain', () => {
    expect(numbersGrounded('80 euro', ['78,00 euro'])).toBe(false);
  });
  it('treats article and page references as free', () => {
    expect(numbersGrounded('Volgens artikel 13 en p. 6 kost het 6 euro', ['6,00 euro'])).toBe(true);
  });
});

const MARKET = path.join(process.cwd(), 'data/files/Schoten-marktreglement-2024.pdf');

describe.skipIf(!fs.existsSync(MARKET))('real sources', () => {
  it('Q1 finds article 13 among candidates and keeps historical sources out', async () => {
    const entries = (seed as (Source & { seed: boolean })[]).filter((s) => s.seed);
    const sources: Source[] = [];
    const passages: Passage[] = [];
    for (const { seed: _s, ...s } of entries) {
      sources.push({ ...s, added_at: '', added_by: 'test' });
      if (s.file_path) passages.push(...(await ingestPdf(new Uint8Array(fs.readFileSync(s.file_path)), s.id)).passages);
    }
    const casus = {
      question: 'Ik wil een vaste standplaats op de markt in Schoten. Hoe dien ik een aanvraag in?',
      municipality: 'Schoten',
      date: '2026-09-16',
      activity: 'vaste marktkramer',
      subquestions: ['Hoe dien ik een aanvraag in?', 'Welke documenten moet ik toevoegen?', 'Wat kost een standplaats?'],
      facts: [],
    };
    const verdicts = verdictsFor(sources, casus, config);
    const { candidates, notUsed } = findCandidates(casus, verdicts, buildIndex(passages));

    const art13 = candidates.find((p) => p.article?.startsWith('Artikel 13'));
    expect(art13).toBeDefined();
    expect(quoteInPassage('attest(en) van het FAVV waaruit de registratie, erkenning of toelating voor de ambulante activiteit blijkt (enkel van toepassing bij verkoop van voeding)', art13!.text)).toBe(true);
    expect(candidates.every((p) => !p.source_id.startsWith('hist-'))).toBe(true);
    expect(notUsed.every((n) => n.reason.length > 0)).toBe(true);
    expect(notUsed.some((n) => n.source_id === 'hist-kb-2006')).toBe(true);
  });
});
