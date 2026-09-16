import { describe, expect, it } from 'vitest';
import { fixtureAnswerResponse } from '../data/seed/fixture-answer';
import type { Answer } from './types';
import { getApproveBlockers } from './review-policy';

function draft(): Answer {
  return structuredClone(fixtureAnswerResponse.answer);
}

describe('getApproveBlockers', () => {
  it('returns every unresolved review, conflict, missing answer and stale-reply blocker', () => {
    const blockers = getApproveBlockers(draft());

    expect(blockers.filter((blocker) => blocker.code === 'finding_open')).toHaveLength(2);
    expect(blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'conflict_undecided', ref: 'finding-conflict' }),
        expect.objectContaining({ code: 'not_found_undecided', ref: 'Wat kost een standplaats?' }),
        expect.objectContaining({ code: 'reply_stale' }),
      ]),
    );
  });

  it('returns no blockers for a fully reviewed, current concept version', () => {
    const answer = draft();
    answer.reply_stale = false;
    answer.findings = answer.findings.map((finding) => ({
      ...finding,
      review: 'bevestigd',
      conflict_decision:
        finding.status === 'tegenstrijdig' ? 'onzeker_vermelden' : finding.conflict_decision,
    }));
    answer.not_found = answer.not_found.map((missing) => ({ ...missing, decision: 'weglaten' }));

    expect(getApproveBlockers(answer, answer.revision)).toEqual([]);
  });

  it('protects the version viewed by the officer', () => {
    const answer = draft();
    const blockers = getApproveBlockers(answer, answer.revision - 1);

    expect(blockers[0]).toMatchObject({ code: 'revision_mismatch' });
  });

  it('blocks an answer version that is already approved', () => {
    const answer = draft();
    answer.status = 'goedgekeurd';

    expect(getApproveBlockers(answer)).toContainEqual(
      expect.objectContaining({ code: 'already_approved' }),
    );
  });
});
