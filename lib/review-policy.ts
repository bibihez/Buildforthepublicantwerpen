import type { Answer, ApproveBlocker } from './types';

/**
 * Returns every reason why the given answer version cannot be approved.
 *
 * `expectedRevision` is the revision supplied by the officer's approval
 * request. Keeping that check here lets the browser preview and server
 * enforcement share one policy without importing either environment.
 */
export function getApproveBlockers(
  answer: Answer,
  expectedRevision?: number,
): ApproveBlocker[] {
  const blockers: ApproveBlocker[] = [];

  if (expectedRevision !== undefined && expectedRevision !== answer.revision) {
    blockers.push({
      code: 'revision_mismatch',
      message: 'This version has changed. Reload the answer before approving it.',
    });
  }

  if (answer.status === 'goedgekeurd') {
    blockers.push({
      code: 'already_approved',
      message: 'This version has already been approved. Create a new version to make changes.',
    });
  }

  if (answer.reply_stale) {
    blockers.push({
      code: 'reply_stale',
      message: 'The reply is out of date. Rebuild it or save the revised text before approval.',
    });
  }

  for (const finding of answer.findings) {
    if (finding.review === 'open') {
      blockers.push({
        code: 'finding_open',
        message: `Review the finding about “${finding.subquestion}”.`,
        ref: finding.id,
      });
    }

    const isConflict = finding.status === 'tegenstrijdig' || Boolean(finding.conflict_with);
    if (isConflict && !finding.conflict_decision) {
      blockers.push({
        code: 'conflict_undecided',
        message: `Choose how to handle the conflicting passages about “${finding.subquestion}”.`,
        ref: finding.id,
      });
    }
  }

  for (const missing of answer.not_found) {
    if (!missing.decision) {
      blockers.push({
        code: 'not_found_undecided',
        message: `Choose whether to mention the missing answer about “${missing.subquestion}”.`,
        ref: missing.subquestion,
      });
    }
  }

  return blockers;
}
