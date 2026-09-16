import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { quoteInPassage } from './anchor';
import { ungroundedNumbers } from './numbers';
import type { Fact, Finding, NotFound, Passage, Source, SourceVerdict } from './types';

export const CaseDraftSchema = z.object({
  activity: z.string(),
  subquestions: z.array(z.string()),
  facts: z.array(z.object({ id: z.string(), question: z.string(), answer: z.enum(['ja', 'nee', 'onbekend']) })),
  date: z.string().nullable(),
});
export type CaseDraft = z.infer<typeof CaseDraftSchema>;

export const RawFindingsSchema = z.object({
  findings: z.array(
    z.object({
      subquestion: z.string(),
      statement: z.string(),
      citations: z.array(z.object({ passage_id: z.string(), quote: z.string() })),
      condition: z.object({ quote: z.string(), fact_id: z.string(), fact_question: z.string() }).nullable(),
      conflict_with: z.object({ passage_id: z.string(), explanation: z.string() }).nullable(),
    }),
  ),
  not_found: z.array(z.string()),
});
export type RawFindings = z.infer<typeof RawFindingsSchema>;

export type Grounded = { findings: Finding[]; not_found: NotFound[]; added_facts: Fact[] };

const factId = (id: string) =>
  id
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'voorwaarde';

/**
 * Keeps only what code could check. Citations must point to a candidate passage and be found in it.
 * A condition is never dropped: if its quote isn't found, it stays with quote_checked=false and the finding is onzeker.
 */
export function ground(
  raw: RawFindings,
  candidates: Passage[],
  verdicts: SourceVerdict[],
  { subquestions = [] as string[], facts = [] as Fact[], sources = [] as Source[] } = {},
): Grounded {
  const byId = new Map(candidates.map((p) => [p.id, p]));
  const verdictOf = new Map(verdicts.map((v) => [v.source_id, v]));
  const titleOf = (id: string) => sources.find((s) => s.id === id)?.short_title ?? id;
  const knownFacts = new Set(facts.map((f) => f.id));
  const added_facts: Fact[] = [];

  const findings: Finding[] = [];
  const notFound = new Set<string>();

  for (const f of raw.findings) {
    const reasons: string[] = [];
    let uncertain = false;

    const citations = f.citations.filter((c) => {
      const p = byId.get(c.passage_id);
      return p !== undefined && quoteInPassage(c.quote, p.text);
    });
    if (citations.length === 0) {
      notFound.add(f.subquestion);
      continue;
    }
    const dropped = f.citations.length - citations.length;
    if (dropped > 0) {
      uncertain = true;
      reasons.push(`${dropped} quote${dropped > 1 ? 's were' : ' was'} not found in the source and omitted`);
    }
    const cited = citations.map((c) => byId.get(c.passage_id)!);

    let condition: Finding['condition'] = null;
    if (f.condition) {
      const id = factId(f.condition.fact_id);
      const quote_checked = cited.some((p) => quoteInPassage(f.condition!.quote, p.text));
      condition = { quote: f.condition.quote, fact_id: id, quote_checked };
      if (!quote_checked) {
        uncertain = true;
        reasons.push('Condition not found in the source');
      }
      if (!knownFacts.has(id)) {
        knownFacts.add(id);
        added_facts.push({ id, question: f.condition.fact_question.trim() || `Does this apply to the applicant: "${f.condition.quote}"?`, answer: 'onbekend', set_by: 'ai' });
      }
    }

    for (const sourceId of new Set(cited.map((p) => p.source_id))) {
      const v = verdictOf.get(sourceId);
      if (v?.verdict === 'onzeker') {
        uncertain = true;
        reasons.push(`Source check uncertain for ${titleOf(sourceId)}: ${v.reasons.join(' · ')}`);
      }
    }

    const missing = ungroundedNumbers(f.statement, citations.map((c) => c.quote));
    if (missing.length) {
      uncertain = true;
      reasons.push(`Number not present in the quote: ${missing.join(', ')}`);
    }

    let conflict_with: Finding['conflict_with'] = null;
    if (f.conflict_with) {
      if (byId.has(f.conflict_with.passage_id)) {
        conflict_with = f.conflict_with;
        reasons.push(`Conflicts with ${titleOf(byId.get(f.conflict_with.passage_id)!.source_id)}: ${f.conflict_with.explanation}`);
      } else {
        uncertain = true;
        reasons.push(`Conflict reported without a valid passage: ${f.conflict_with.explanation}`);
      }
    }

    findings.push({
      id: randomUUID().slice(0, 8),
      subquestion: f.subquestion,
      statement: f.statement,
      citations,
      condition,
      conflict_with,
      status: conflict_with ? 'tegenstrijdig' : uncertain ? 'onzeker' : 'citaat_gecontroleerd',
      status_reasons: reasons,
      review: 'open',
      corrected_statement: null,
      review_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      bulk: false,
      conflict_decision: null,
      conflict_reason: null,
    });
  }

  // Every subquestion ends up answered or visibly not found.
  for (const s of raw.not_found) notFound.add(s);
  for (const s of subquestions) if (!findings.some((f) => f.subquestion === s)) notFound.add(s);
  for (const f of findings) notFound.delete(f.subquestion);

  return { findings, not_found: [...notFound].map((subquestion) => ({ subquestion, decision: null })), added_facts };
}
