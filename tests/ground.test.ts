import { describe, expect, it } from 'vitest';
import { ground, type RawFindings } from '../lib/ground';
import type { Passage, SourceVerdict } from '../lib/types';

const art13: Passage = {
  id: 'p13', source_id: 'markt-2024', page_from: 5, page_to: 6, article: 'Artikel 13',
  text: 'dient zich kandidaat te stellen door het invullen van het aanvraagformulier\n• attest(en) van het FAVV (enkel van toepassing bij verkoop van voeding) (*)',
};
const terras: Passage = { id: 'pt', source_id: 'terrassen', page_from: 2, page_to: 2, article: 'Art. 3', text: 'De aanvraag kost 25 euro.' };
const verdicts: SourceVerdict[] = [
  { source_id: 'markt-2024', verdict: 'gecontroleerd', reasons: [] },
  { source_id: 'terrassen', verdict: 'onzeker', reasons: ['Geen datum van inwerkingtreding'] },
];
const finding = (over: Partial<RawFindings['findings'][number]>): RawFindings['findings'][number] => ({
  subquestion: 'Hoe aanvragen?', statement: 'Vul het aanvraagformulier in.',
  citations: [{ passage_id: 'p13', quote: 'het invullen van het aanvraagformulier' }],
  condition: null, conflict_with: null, ...over,
});
const run = (findings: RawFindings['findings'], subquestions: string[] = []) =>
  ground({ findings, not_found: [] }, [art13, terras], verdicts, { subquestions, facts: [{ id: 'voeding', question: 'Voeding?', answer: 'onbekend', set_by: 'ai' }] });

describe('ground', () => {
  it('a checked quote from a checked source → citaat_gecontroleerd, review open', () => {
    const { findings } = run([finding({})]);
    expect(findings[0].status).toBe('citaat_gecontroleerd');
    expect(findings[0].review).toBe('open');
  });

  it('keeps a condition whose quote fails, marks the finding onzeker', () => {
    const { findings } = run([finding({ condition: { quote: 'alleen voor foodtrucks', fact_id: 'voeding', fact_question: '' } })]);
    expect(findings[0].condition).toEqual({ quote: 'alleen voor foodtrucks', fact_id: 'voeding', quote_checked: false });
    expect(findings[0].status).toBe('onzeker');
    expect(findings[0].status_reasons).toContain('Condition not found in the source');
  });

  it('a checked condition stays checked', () => {
    const { findings } = run([finding({ condition: { quote: 'enkel van toepassing bij verkoop van voeding', fact_id: 'voeding', fact_question: '' } })]);
    expect(findings[0].condition?.quote_checked).toBe(true);
    expect(findings[0].status).toBe('citaat_gecontroleerd');
  });

  it('an invented quote or passage removes the finding and sends its subquestion to not_found', () => {
    const { findings, not_found } = run([
      finding({ citations: [{ passage_id: 'p13', quote: 'online via e-mail' }] }),
      finding({ subquestion: 'Kost?', citations: [{ passage_id: 'nope', quote: 'x' }] }),
    ]);
    expect(findings).toHaveLength(0);
    expect(not_found.map((n) => n.subquestion)).toEqual(['Hoe aanvragen?', 'Kost?']);
  });

  it('an unknown source or an ungrounded number → onzeker with reasons', () => {
    const { findings } = run([
      finding({ subquestion: 'Kost?', statement: 'Het kost 30 euro.', citations: [{ passage_id: 'pt', quote: 'De aanvraag kost 25 euro.' }] }),
    ]);
    expect(findings[0].status).toBe('onzeker');
    expect(findings[0].status_reasons.join(' ')).toContain('Number not present in the quote: 30');
    expect(findings[0].status_reasons.join(' ')).toContain('Source check uncertain');
  });

  it('a conflict → tegenstrijdig', () => {
    const { findings } = run([finding({ conflict_with: { passage_id: 'pt', explanation: 'andere procedure' } })]);
    expect(findings[0].status).toBe('tegenstrijdig');
  });

  it('an unanswered subquestion is listed as not found; an unknown fact id becomes an onbekend fact', () => {
    const r = run([finding({ condition: { quote: 'enkel van toepassing bij verkoop van voeding', fact_id: 'Verkoop voeding', fact_question: 'Verkoopt de aanvrager voeding?' } })], ['Hoe aanvragen?', 'Wat kost het?']);
    expect(r.not_found).toEqual([{ subquestion: 'Wat kost het?', decision: null }]);
    expect(r.added_facts[0]).toMatchObject({ id: 'verkoop_voeding', question: 'Verkoopt de aanvrager voeding?', answer: 'onbekend' });
  });
});
