import { describe, expect, it } from 'vitest';
import { similarity } from './precedent';
import type { Passage, SourceVerdict } from './types';
import { buildIndex, expandSearchQuery, findCandidates, search } from './search';

const passages: Passage[] = [
  {
    id: 'application',
    source_id: 'market-rules',
    page_from: 5,
    page_to: 5,
    article: 'Artikel 13 §3',
    text: 'Een onderneming die een standplaats met abonnement wenst te bekomen, dient zich kandidaat te stellen door het invullen van het aanvraagformulier op de website van de gemeente Schoten.',
  },
  {
    id: 'documents',
    source_id: 'market-rules',
    page_from: 6,
    page_to: 6,
    article: 'Artikel 13 §3',
    text: 'Bij de aanvraag worden de nodige bewijsstukken gevoegd, waaronder attest(en) van het FAVV.',
  },
  {
    id: 'fees',
    source_id: 'market-fees',
    page_from: 1,
    page_to: 1,
    article: 'Artikel 4.1',
    text: 'P er marktdag: 6,00 euro. H alfjaarlijks: 78,00 euro.',
  },
];

const index = buildIndex(passages);

describe('English-to-Dutch search aliases', () => {
  it('expands an English query deterministically without changing source text', () => {
    expect(expandSearchQuery('How do I apply?')).toBe(
      'How do I apply? aanvraag aanvragen indienen kandidaat aanvraagformulier',
    );
    expect(passages[0].text).toContain('aanvraagformulier');
  });

  it.each([
    ['How do I apply for a fixed market pitch?', 'application'],
    ['Which documents and certificates should I attach?', 'documents'],
    ['How much does a market pitch cost?', 'fees'],
  ])('retrieves the Dutch %s passage from an English question', (query, expectedId) => {
    expect(search(index, query).map((hit) => hit.passage.id)).toContain(expectedId);
  });

  it('lets an English question match Dutch colleague-note wording', () => {
    expect(
      similarity(
        expandSearchQuery('How do I apply for a fixed market pitch?'),
        'Vaste standplaats Aanvraag voor een abonnement op de markt',
      ),
    ).toBeGreaterThanOrEqual(0.25);
  });

  it('finds application, document and fee candidates from an English generated case', () => {
    const verdicts: SourceVerdict[] = [
      { source_id: 'market-rules', verdict: 'gecontroleerd', reasons: [] },
      { source_id: 'market-fees', verdict: 'gecontroleerd', reasons: [] },
    ];
    const result = findCandidates(
      {
        question: 'I want a fixed market pitch in Schoten.',
        activity: 'Apply for a fixed market pitch',
        subquestions: [
          'How do I apply?',
          'Which documents should I attach?',
          'What does a market pitch cost?',
        ],
      },
      verdicts,
      index,
    );

    expect(result.candidates.map((passage) => passage.id)).toEqual(
      expect.arrayContaining(['application', 'documents', 'fees']),
    );
  });
});
