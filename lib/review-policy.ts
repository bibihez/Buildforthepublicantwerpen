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
      message: 'Deze versie is intussen gewijzigd. Laad het antwoord opnieuw voor je goedkeurt.',
    });
  }

  if (answer.status === 'goedgekeurd') {
    blockers.push({
      code: 'already_approved',
      message: 'Deze versie is al goedgekeurd. Maak een nieuwe versie om wijzigingen aan te brengen.',
    });
  }

  if (answer.reply_stale) {
    blockers.push({
      code: 'reply_stale',
      message: 'De antwoordtekst is niet meer actueel. Bouw de tekst opnieuw op of sla de aangepaste tekst op.',
    });
  }

  for (const finding of answer.findings) {
    if (finding.review === 'open') {
      blockers.push({
        code: 'finding_open',
        message: `Beoordeel eerst de bevinding over “${finding.subquestion}”.`,
        ref: finding.id,
      });
    }

    const isConflict = finding.status === 'tegenstrijdig' || Boolean(finding.conflict_with);
    if (isConflict && !finding.conflict_decision) {
      blockers.push({
        code: 'conflict_undecided',
        message: `Kies hoe de tegenstrijdige passages over “${finding.subquestion}” worden behandeld.`,
        ref: finding.id,
      });
    }
  }

  for (const missing of answer.not_found) {
    if (!missing.decision) {
      blockers.push({
        code: 'not_found_undecided',
        message: `Kies of het ontbrekende antwoord over “${missing.subquestion}” wordt vermeld.`,
        ref: missing.subquestion,
      });
    }
  }

  return blockers;
}
