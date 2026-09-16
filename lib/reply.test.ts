import { describe, expect, it } from 'vitest';
import {
  fixtureAnswerResponse,
  fixtureApprovedAnswerResponse,
} from '../data/seed/fixture-answer';
import type { AnswerResponse } from './types';
import { buildReply } from './reply';

function response(): AnswerResponse {
  return structuredClone(fixtureAnswerResponse);
}

function reviewedResponse(): AnswerResponse {
  const result = response();
  result.answer.findings = result.answer.findings.map((finding) => ({
    ...finding,
    review: 'bevestigd',
  }));
  return result;
}

describe('buildReply', () => {
  it('uses eligible findings and renders source footnotes', () => {
    const result = buildReply(response());

    expect(result).toContain(
      'Complete the application form on the Municipality of Schoten website. [1]',
    );
    expect(result).toContain('[1] Marktreglement Schoten 2024, Artikel 13 §3, p. 5');
    expect(result).not.toContain('heating appliance');
    expect(result).not.toContain('fourteen days');
  });

  it('seeds the first draft from open findings backed by verified local quotes', () => {
    const result = response();
    result.answer.findings[0].review = 'open';

    const reply = buildReply(result);

    expect(reply).toContain('Complete the application form on the Municipality of Schoten website. [1]');
    expect(reply).toContain('[1] Marktreglement Schoten 2024, Artikel 13 §3, p. 5');
  });

  it('keeps an unknown condition explicit and omits it when the fact is no', () => {
    const unknown = response();
    expect(buildReply(unknown)).toContain(
      'If the answer to “Does the applicant sell food?” is yes: Attach the applicable FAVV certificates',
    );

    const no = response();
    no.answer.casus.facts[0].answer = 'nee';
    no.answer.casus.facts[0].set_by = 'officer';
    expect(buildReply(no)).not.toContain('FAVV certificates');
  });

  it('treats an unconfirmed AI selection as unknown', () => {
    const suggestedNo = response();
    suggestedNo.answer.casus.facts[0].answer = 'nee';
    suggestedNo.answer.casus.facts[0].set_by = 'ai';

    expect(buildReply(suggestedNo)).toContain(
      'If the answer to “Does the applicant sell food?” is yes: Attach the applicable FAVV certificates',
    );
  });

  it('does not repeat a condition already stated in the finding', () => {
    const result = response();
    result.answer.findings[1].statement =
      'Attach the applicable FAVV certificates when selling food.';

    const reply = buildReply(result);
    expect(reply).toContain('Attach the applicable FAVV certificates when selling food. [2]');
    expect(reply).not.toContain('If the answer to');
  });

  it('does not duplicate an existing conditional prefix', () => {
    const result = response();
    result.answer.findings[1].condition!.quote = 'Als je een zelfstandige uitbater bent';
    result.answer.casus.facts[0].question = 'Is the applicant a self-employed operator?';

    const reply = buildReply(result);
    expect(reply).toContain(
      'If this source condition applies (“je een zelfstandige uitbater bent”): Attach the applicable FAVV certificates',
    );
    expect(reply).not.toContain('If Als');
  });

  it('retains the source condition when the fact is yes', () => {
    const yes = response();
    yes.answer.casus.facts[0].answer = 'ja';
    yes.answer.casus.facts[0].set_by = 'officer';

    expect(buildReply(yes)).toContain(
      'Condition: enkel van toepassing bij verkoop van voeding.',
    );
  });

  it('uses corrected text and omits rejected findings', () => {
    const corrected = response();
    corrected.answer.findings[0].review = 'gecorrigeerd';
    corrected.answer.findings[0].corrected_statement = 'Use the digital application form.';
    expect(buildReply(corrected)).toContain('Use the digital application form. [1]');

    corrected.answer.findings[0].review = 'verworpen';
    expect(buildReply(corrected)).not.toContain('digital application form');
    expect(buildReply(corrected)).not.toContain('Complete the application form');
  });

  it('respects mention and omit decisions for missing answers without promising follow-up', () => {
    const result = response();
    result.answer.not_found[0].decision = 'vermelden';
    const mentioned = buildReply(result);

    expect(mentioned).toContain(
      'No information was found in the available sources for the question: “What does a market pitch cost?”',
    );
    expect(mentioned).not.toMatch(
      /we will contact|let you know|follow up|nemen contact op|laten weten|komen erop terug/i,
    );

    result.answer.not_found[0].decision = 'weglaten';
    expect(buildReply(result)).not.toContain('What does a market pitch cost?');
  });

  it('handles each conflict decision without silently choosing an unresolved conflict', () => {
    const unresolved = reviewedResponse();
    expect(buildReply(unresolved)).not.toContain('fourteen days');

    const uncertain = reviewedResponse();
    uncertain.answer.findings[3].conflict_decision = 'onzeker_vermelden';
    expect(buildReply(uncertain)).toContain(
      'The available sources conflict on this point; this still needs to be checked.',
    );

    const current = reviewedResponse();
    current.answer.findings[3].conflict_decision = 'deze';
    expect(buildReply(current)).toContain('at least fourteen days');

    const other = reviewedResponse();
    other.answer.findings[3].conflict_decision = 'andere';
    expect(buildReply(other)).toContain('Another passage gives a deadline of seven days.');
    expect(buildReply(other)).toContain(
      'Ontwikkelfixture afwijkende termijn, Indiening, p. 1',
    );

    const omitted = reviewedResponse();
    omitted.answer.findings[3].conflict_decision = 'weglaten';
    expect(buildReply(omitted)).not.toContain('fourteen days');
    expect(buildReply(omitted)).not.toContain('seven days');
  });

  it('can build from the frozen snapshot on an approved Answer', () => {
    const result = buildReply(fixtureApprovedAnswerResponse.answer);

    expect(result).toContain('Marktreglement Schoten 2024, Artikel 13 §3, p. 5');
    expect(result).toContain(
      'The available sources conflict on this point; this still needs to be checked.',
    );
  });
});
