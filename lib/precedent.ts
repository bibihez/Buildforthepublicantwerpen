import { tokenize } from './search';
import type { Answer, PrecedentInfo, Source } from './types';

export const NO_CHANGES = 'No changes detected in the checked sources';

/** Share of the shorter question's words found in the other. 1 = same words. */
export function similarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

/** The most similar approved answer above the threshold (newest wins a tie), or null. */
export function findPrecedent(question: string, answers: Answer[], { threshold = 0.7, excludeId = '' } = {}): Answer | null {
  let best: { answer: Answer; score: number } | null = null;
  for (const a of answers) {
    if (a.status !== 'goedgekeurd' || !a.snapshot || a.id === excludeId) continue;
    const score = similarity(question, a.snapshot.casus.question);
    if (score < threshold) continue;
    if (!best || score > best.score || (score === best.score && a.snapshot.approved_at > best.answer.snapshot!.approved_at)) {
      best = { answer: a, score };
    }
  }
  return best?.answer ?? null;
}

const citedSourceIds = (findings: Answer['findings'], passageSource: (id: string) => string | undefined) =>
  new Set(
    findings
      .filter((f) => f.review !== 'verworpen')
      .flatMap((f) => f.citations.map((c) => passageSource(c.passage_id)))
      .filter((id): id is string => !!id),
  );

/**
 * Concrete differences between an approved answer's snapshot and today. Informs only: it never changes a finding
 * and is never given to the AI.
 */
export function compare(precedent: Answer, current: Answer, currentSources: Source[], currentPassageSource: (id: string) => string | undefined): PrecedentInfo {
  const snap = precedent.snapshot!;
  const then = new Map(snap.sources.map((s) => [s.id, s]));
  const now = new Map(currentSources.map((s) => [s.id, s]));
  const snapPassageSource = new Map(snap.passages.map((p) => [p.id, p.source_id]));
  const differences: string[] = [];

  for (const id of citedSourceIds(current.findings, currentPassageSource)) {
    if (!then.has(id)) differences.push(`New source since the previous answer: ${now.get(id)?.short_title ?? id}`);
  }

  for (const id of citedSourceIds(snap.findings, (p) => snapPassageSource.get(p))) {
    const old = then.get(id);
    const cur = now.get(id);
    const title = old?.short_title ?? id;
    if (!cur) differences.push(`Source changed since the previous answer: ${title} (no longer available)`);
    else if (!cur.active) differences.push(`Source changed since the previous answer: ${title} (deactivated)`);
    else if (cur.superseded_by && !old?.superseded_by) {
      differences.push(`Source changed since the previous answer: ${title} (superseded by ${now.get(cur.superseded_by)?.short_title ?? cur.superseded_by})`);
    } else if (old?.sha256 && cur.sha256 && old.sha256 !== cur.sha256) {
      differences.push(`Source changed since the previous answer: ${title} (different file version)`);
    }
  }

  for (const f of current.casus.facts) {
    const old = snap.casus.facts.find((o) => o.id === f.id);
    if (old && old.answer !== f.answer) differences.push(`Case differs: ${f.question} (then: ${old.answer} · now: ${f.answer})`);
  }

  return {
    answer_id: precedent.id,
    approved_by: snap.approved_by,
    approved_at: snap.approved_at,
    differences: differences.length ? differences : [NO_CHANGES],
  };
}
