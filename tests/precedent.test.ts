import { describe, expect, it } from 'vitest';
import { compare, findPrecedent, NO_CHANGES, similarity } from '../lib/precedent';
import type { Answer, Source } from '../lib/types';

const Q1 = 'Ik wil een vaste standplaats op de markt in Schoten. Hoe dien ik een aanvraag in?';
const src = (id: string, over: Partial<Source> = {}) => ({ id, short_title: id.toUpperCase(), active: true, sha256: 'a', superseded_by: null, ...over }) as Source;
const finding = (passage_id: string) => ({
  id: passage_id, subquestion: 's', statement: 'x', citations: [{ passage_id, quote: 'q' }], status: 'citaat_gecontroleerd' as const, status_reasons: [], review: 'bevestigd' as const,
});
const base = (over: Partial<Answer> = {}): Answer => ({
  id: 'now', created_at: '', revision: 1,
  casus: { question: Q1, municipality: 'Schoten', date: '2026-09-16', activity: '', subquestions: [], facts: [{ id: 'voeding', question: 'Voeding?', answer: 'onbekend', set_by: 'ai' }] },
  verdicts: [], candidates: [], findings: [finding('p-markt')], not_found: [], not_used: [], reply_text: '', reply_stale: false, status: 'concept', models: { case: '', findings: '' },
  ...over,
});
const approved = (): Answer => {
  const a = base({ id: 'old', status: 'goedgekeurd' });
  a.snapshot = {
    taken_at: '', revision: 2, casus: { ...a.casus, facts: [{ id: 'voeding', question: 'Voeding?', answer: 'nee', set_by: 'officer' }] },
    sources: [src('markt')], passages: [{ id: 'p-markt', source_id: 'markt', page_from: 5, page_to: 6, article: null, text: '' }],
    verdicts: [], findings: a.findings, not_found: [], not_used: [], notes_used: [], precedent: null, reply_text: '',
    approved_by: 'Marleen', approved_at: '2026-09-16T14:00:00Z', models: { case: '', findings: '' },
  };
  return a;
};
const sourceOf = (id: string) => ({ 'p-markt': 'markt', 'p-fee': 'retributie' })[id];

describe('precedent', () => {
  it('matches the same question, not a different one', () => {
    expect(similarity(Q1, Q1)).toBe(1);
    expect(findPrecedent('Hoe vaste standplaats aanvragen op de markt in Schoten?', [approved()])?.id).toBe('old');
    expect(findPrecedent('Welke subsidie bestaat er voor innovatie?', [approved()])).toBeNull();
  });

  it('ignores drafts and the answer itself', () => {
    expect(findPrecedent(Q1, [{ ...approved(), status: 'concept' }])).toBeNull();
    expect(findPrecedent(Q1, [approved()], { excludeId: 'old' })).toBeNull();
  });

  it('nothing changed → the fixed sentence, never "nog geldig"', () => {
    const cur = base({ casus: approved().snapshot!.casus });
    expect(compare(approved(), cur, [src('markt')], sourceOf).differences).toEqual([NO_CHANGES]);
  });

  it('names a new source, a changed source and a different case fact', () => {
    const cur = base({ findings: [finding('p-markt'), finding('p-fee')] });
    const info = compare(approved(), cur, [src('markt', { sha256: 'b' }), src('retributie', { short_title: 'Retributiereglement markten 2026–2031' })], sourceOf);
    expect(info).toMatchObject({ answer_id: 'old', approved_by: 'Marleen' });
    expect(info.differences).toEqual([
      'New source since the previous answer: Retributiereglement markten 2026–2031',
      'Source changed since the previous answer: MARKT (different file version)',
      'Case differs: Voeding? (then: nee · now: onbekend)',
    ]);
  });
});
