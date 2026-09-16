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
    expect(blockers.find((blocker) => blocker.code === 'reply_stale')?.message).toBe(
      'The reply is out of date. Rebuild it or save the revised text before approval.',
    );
    expect(blockers.find((blocker) => blocker.code === 'finding_open')?.message).toMatch(
      /^Review the finding about/,
    );
    expect(blockers.find((blocker) => blocker.code === 'conflict_undecided')?.message).toMatch(
      /^Choose how to handle the conflicting passages/,
    );
    expect(blockers.find((blocker) => blocker.code === 'not_found_undecided')?.message).toMatch(
      /^Choose whether to mention the missing answer/,
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
    expect(blockers[0].message).toBe(
      'This version has changed. Reload the answer before approving it.',
    );
  });

  it('blocks an answer version that is already approved', () => {
    const answer = draft();
    answer.status = 'goedgekeurd';

    expect(getApproveBlockers(answer)).toContainEqual(
      expect.objectContaining({
        code: 'already_approved',
        message: 'This version has already been approved. Create a new version to make changes.',
      }),
    );
  });
});
