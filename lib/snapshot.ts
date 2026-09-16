import type { Answer, Passage, Snapshot, Source, UpdateAnswerRequest } from './types';

export class RequestError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 409,
  ) {
    super(message);
  }
}

/**
 * Applies an officer's changes. Pure: returns a new answer with revision +1.
 * Facts or reviews changing make the reply stale, unless the same request saves a reply text.
 */
export function applyUpdate(answer: Answer, req: UpdateAnswerRequest, now: string): Answer {
  if (answer.status === 'goedgekeurd') throw new RequestError('Dit antwoord is goedgekeurd. Maak een nieuwe versie.', 409);
  if (req.revision !== answer.revision) throw new RequestError('Dit antwoord werd intussen gewijzigd. Herlaad de pagina.', 409);

  const next: Answer = structuredClone(answer);
  let stale = false;

  if (req.facts) {
    next.casus.facts = req.facts.map((f) => ({ ...f }));
    stale = true;
  }

  for (const r of req.finding_reviews ?? []) {
    const f = next.findings.find((x) => x.id === r.finding_id);
    if (!f) throw new RequestError(`Bevinding ${r.finding_id} bestaat niet`, 400);
    if (!r.reviewed_by?.trim()) throw new RequestError('Naam van de medewerker ontbreekt', 400);
    if (r.review === 'gecorrigeerd' && !r.corrected_statement?.trim()) throw new RequestError('Een correctie heeft een nieuwe tekst nodig', 400);
    if (r.review === 'verworpen' && !r.review_reason?.trim()) throw new RequestError('Verwerpen vraagt een reden', 400);
    if (r.bulk && (r.review !== 'bevestigd' || f.status !== 'citaat_gecontroleerd')) {
      throw new RequestError('In bulk bevestigen kan alleen voor gecontroleerde citaten', 400);
    }
    f.review = r.review;
    f.corrected_statement = r.review === 'gecorrigeerd' ? r.corrected_statement!.trim() : null;
    f.review_reason = r.review_reason ?? null;
    f.reviewed_by = r.review === 'open' ? null : r.reviewed_by.trim();
    f.reviewed_at = r.review === 'open' ? null : now;
    f.bulk = !!r.bulk;
    if (r.conflict_decision !== undefined) f.conflict_decision = r.conflict_decision;
    if (r.conflict_reason !== undefined) f.conflict_reason = r.conflict_reason;
    stale = true;
  }

  for (const d of req.not_found_decisions ?? []) {
    const n = next.not_found.find((x) => x.subquestion === d.subquestion);
    if (!n) throw new RequestError(`Onbekende vraag: ${d.subquestion}`, 400);
    n.decision = d.decision;
    stale = true;
  }

  if (req.reply_text !== undefined) {
    next.reply_text = req.reply_text;
    next.reply_stale = false;
  } else if (stale) {
    next.reply_stale = true;
  }

  next.revision = answer.revision + 1;
  return next;
}

export function passageIdsOf(answer: Answer): string[] {
  return [
    ...new Set([
      ...answer.findings.flatMap((f) => [...f.citations.map((c) => c.passage_id), ...(f.conflict_with ? [f.conflict_with.passage_id] : [])]),
      ...answer.not_used.map((n) => n.passage_id),
    ]),
  ];
}

/** Frozen copy at approval. History renders only from this. */
export function buildSnapshot(answer: Answer, sources: Source[], passages: Passage[], approvedBy: string, now: string): Snapshot {
  const judged = new Set(answer.verdicts.map((v) => v.source_id));
  const wanted = new Set(passageIdsOf(answer));
  return structuredClone({
    taken_at: now,
    revision: answer.revision,
    casus: answer.casus,
    sources: sources.filter((s) => judged.has(s.id)),
    passages: passages.filter((p) => wanted.has(p.id)),
    verdicts: answer.verdicts,
    findings: answer.findings,
    not_found: answer.not_found,
    not_used: answer.not_used,
    notes_used: [],
    precedent: answer.precedent ?? null,
    reply_text: answer.reply_text,
    approved_by: approvedBy,
    approved_at: now,
    models: answer.models,
  });
}

export function approve(answer: Answer, snapshot: Snapshot): Answer {
  return {
    ...answer,
    status: 'goedgekeurd',
    approved_by: snapshot.approved_by,
    approved_at: snapshot.approved_at,
    revision: answer.revision + 1,
    snapshot: { ...snapshot, revision: answer.revision + 1 },
  };
}

/** Editing after approval: a new draft that keeps the reviews, linked to its parent. */
export function newVersion(parent: Answer, id: string, now: string): Answer {
  const copy = structuredClone(parent);
  return {
    ...copy,
    id,
    parent_id: parent.id,
    created_at: now,
    revision: 1,
    status: 'concept',
    approved_by: null,
    approved_at: null,
    snapshot: null,
  };
}
