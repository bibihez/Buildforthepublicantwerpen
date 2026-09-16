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
  it('uses only reviewed findings and renders source footnotes', () => {
    const result = buildReply(response());

    expect(result).toContain('Vul het aanvraagformulier in op de website van de gemeente Schoten. [1]');
    expect(result).toContain('[1] Marktreglement Schoten 2024, Artikel 13 §3, p. 5');
    expect(result).not.toContain('verwarmingstoestel');
    expect(result).not.toContain('veertien dagen');
  });

  it('keeps an unknown condition explicit and omits it when the fact is no', () => {
    const unknown = response();
    expect(buildReply(unknown)).toContain(
      'Indien de aanvrager voeding verkoopt: Voeg de toepasselijke FAVV-attesten toe',
    );

    const no = response();
    no.answer.casus.facts[0].answer = 'nee';
    expect(buildReply(no)).not.toContain('FAVV-attesten');
  });

  it('does not repeat a condition already stated in the finding', () => {
    const result = response();
    result.answer.findings[1].statement =
      'Voeg de toepasselijke FAVV-attesten toe bij verkoop van voeding.';

    const reply = buildReply(result);
    expect(reply).toContain(
      'Voeg de toepasselijke FAVV-attesten toe bij verkoop van voeding. [2]',
    );
    expect(reply).not.toContain('Indien de aanvrager voeding verkoopt');
  });

  it('does not duplicate an existing conditional prefix', () => {
    const result = response();
    result.answer.findings[1].condition!.quote = 'Als je een zelfstandige uitbater bent';
    result.answer.casus.facts[0].question = 'Ben je een zelfstandige uitbater?';

    const reply = buildReply(result);
    expect(reply).toContain(
      'Indien je een zelfstandige uitbater bent: Voeg de toepasselijke FAVV-attesten toe',
    );
    expect(reply).not.toContain('Indien Als');
  });

  it('retains the source condition when the fact is yes', () => {
    const yes = response();
    yes.answer.casus.facts[0].answer = 'ja';

    expect(buildReply(yes)).toContain(
      'Voorwaarde: enkel van toepassing bij verkoop van voeding.',
    );
  });

  it('uses corrected text and omits rejected findings', () => {
    const corrected = response();
    corrected.answer.findings[0].review = 'gecorrigeerd';
    corrected.answer.findings[0].corrected_statement = 'Gebruik het digitale aanvraagformulier.';
    expect(buildReply(corrected)).toContain('Gebruik het digitale aanvraagformulier. [1]');

    corrected.answer.findings[0].review = 'verworpen';
    expect(buildReply(corrected)).not.toContain('digitale aanvraagformulier');
    expect(buildReply(corrected)).not.toContain('Vul het aanvraagformulier');
  });

  it('respects mention and omit decisions for missing answers without promising follow-up', () => {
    const result = response();
    result.answer.not_found[0].decision = 'vermelden';
    const mentioned = buildReply(result);

    expect(mentioned).toContain(
      'Over wat kost een standplaats vonden we in onze bronnen geen informatie.',
    );
    expect(mentioned).not.toMatch(/nemen contact op|laten weten|komen erop terug/i);

    result.answer.not_found[0].decision = 'weglaten';
    expect(buildReply(result)).not.toContain('Wat kost een standplaats?');
  });

  it('handles each conflict decision without silently choosing an unresolved conflict', () => {
    const unresolved = reviewedResponse();
    expect(buildReply(unresolved)).not.toContain('veertien dagen');

    const uncertain = reviewedResponse();
    uncertain.answer.findings[3].conflict_decision = 'onzeker_vermelden';
    expect(buildReply(uncertain)).toContain(
      'Hierover bestaan verschillende bronnen; dit wordt nog nagekeken.',
    );

    const current = reviewedResponse();
    current.answer.findings[3].conflict_decision = 'deze';
    expect(buildReply(current)).toContain('ten minste veertien dagen');

    const other = reviewedResponse();
    other.answer.findings[3].conflict_decision = 'andere';
    expect(buildReply(other)).toContain('Een andere passage vermeldt een termijn van zeven dagen.');
    expect(buildReply(other)).toContain(
      'Ontwikkelfixture afwijkende termijn, Indiening, p. 1',
    );

    const omitted = reviewedResponse();
    omitted.answer.findings[3].conflict_decision = 'weglaten';
    expect(buildReply(omitted)).not.toContain('veertien dagen');
    expect(buildReply(omitted)).not.toContain('zeven dagen');
  });

  it('can build from the frozen snapshot on an approved Answer', () => {
    const result = buildReply(fixtureApprovedAnswerResponse.answer);

    expect(result).toContain('Marktreglement Schoten 2024, Artikel 13 §3, p. 5');
    expect(result).toContain('Hierover bestaan verschillende bronnen; dit wordt nog nagekeken.');
  });
});
