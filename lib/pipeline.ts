import { randomUUID } from 'node:crypto';
import config from '../config/schoten.json';
import { getPassage, listAnswers, listPassages, listSourceEvents, listSources, saveAnswer } from './db';
import { CaseDraftSchema, ground, RawFindingsSchema } from './ground';
import { callJson, loadPrompt, models } from './llm';
import { compare, findPrecedent } from './precedent';
import { buildReply } from './reply';
import { passageIdsOf } from './snapshot';
import { buildIndex, findCandidates, type SearchIndex } from './search';
import type { Answer, AnswerResponse, ApiError, Casus, Passage, Source } from './types';
import { verdictsFor } from './verdict';

let index: SearchIndex | null = null;
/** Call after a source is added, deactivated or superseded. */
export function invalidateIndex(): void {
  index = null;
}
function getIndex(): SearchIndex {
  if (!index) index = buildIndex(listPassages());
  return index;
}

const today = () => new Date().toISOString().slice(0, 10);

/** AI ① — case parser. Facts are "onbekend" unless the question states them. */
export async function draftCase(question: string, date?: string): Promise<Casus> {
  const draft = await callJson(models.fast(), loadPrompt('case'), question, CaseDraftSchema, { name: 'casus' });
  return {
    question,
    municipality: config.municipality,
    date: date || draft.date || today(),
    activity: draft.activity,
    subquestions: draft.subquestions,
    facts: draft.facts.map((f) => ({ ...f, set_by: 'ai' as const })),
  };
}

function passageForModel(p: Passage, sources: Map<string, Source>): string {
  const s = sources.get(p.source_id);
  const pages = p.page_from === p.page_to ? `p. ${p.page_from}` : `p. ${p.page_from}-${p.page_to}`;
  return [
    `### passage_id: ${p.id}`,
    `source: ${s?.short_title ?? p.source_id} · ${s?.level ?? ''} · ${s?.nature ?? ''} · ${p.article ?? 'no article'} · ${pages}`,
    p.text,
  ].join('\n');
}

/** Source checks → search → AI ② → grounding. `casus` is taken as given (no AI ①). */
export async function analyse(casus: Casus, base: Partial<Answer> = {}): Promise<Answer> {
  const sources = listSources();
  const sourceMap = new Map(sources.map((s) => [s.id, s]));
  const verdicts = verdictsFor(sources, casus, config, listSourceEvents());
  const { candidates, notUsed } = findCandidates(casus, verdicts, getIndex());

  const user = [
    `## Case`,
    JSON.stringify(
      { question: casus.question, municipality: casus.municipality, date: casus.date, activity: casus.activity, subquestions: casus.subquestions, facts: casus.facts.map(({ id, question, answer }) => ({ id, question, answer })) },
      null,
      2,
    ),
    `## Source passages`,
    ...candidates.map((p) => passageForModel(p, sourceMap)),
  ].join('\n\n');

  const raw = candidates.length
    ? await callJson(models.strong(), loadPrompt('findings'), user, RawFindingsSchema, { name: 'bevindingen', effort: (process.env.OPENAI_EFFORT_FINDINGS as 'low' | 'medium') || 'low' })
    : { findings: [], not_found: casus.subquestions };

  const grounded = ground(raw, candidates, verdicts, { subquestions: casus.subquestions, facts: casus.facts, sources });

  const answer: Answer = {
    id: base.id ?? randomUUID(),
    parent_id: base.parent_id ?? null,
    created_at: base.created_at ?? new Date().toISOString(),
    revision: (base.revision ?? 0) + 1,
    casus: { ...casus, facts: [...casus.facts, ...grounded.added_facts] },
    verdicts,
    candidates: candidates.map((p) => p.id),
    findings: grounded.findings,
    not_found: grounded.not_found,
    not_used: notUsed,
    precedent: null,
    reply_text: '',
    reply_stale: false,
    status: 'concept',
    approved_by: null,
    approved_at: null,
    models: { case: base.models?.case ?? models.fast(), findings: models.strong() },
    snapshot: null,
  };
  // After the findings exist, and never given to the AI.
  const precedent = findPrecedent(casus.question, listAnswers(), { excludeId: answer.id });
  const passageSource = new Map(candidates.map((p) => [p.id, p.source_id]));
  answer.precedent = precedent ? compare(precedent, answer, sources, (id) => passageSource.get(id)) : null;
  answer.reply_text = buildReply(answer);
  saveAnswer(answer);
  return answer;
}

export async function createAnswer(question: string, date?: string): Promise<Answer> {
  const casus = await draftCase(question, date);
  return analyse(casus);
}

/** The answer plus every source and passage the screens need. */
export function toResponse(answer: Answer): AnswerResponse {
  const sources: Record<string, Source> = {};
  for (const s of listSources()) sources[s.id] = s;
  const ids = new Set<string>([...answer.candidates, ...passageIdsOf(answer)]);
  const passages: Record<string, Passage> = {};
  for (const id of ids) {
    const p = getPassage(id);
    if (p) passages[id] = p;
  }
  return { answer, sources, passages };
}

/** When an AI call fails: search results from checked sources only, so the officer can still read the evidence. */
export function fallbackFor(casus: Pick<Casus, 'question'> & Partial<Casus>): NonNullable<ApiError['fallback']> {
  const sources = listSources();
  const full: Casus = {
    question: casus.question,
    municipality: config.municipality,
    date: casus.date || today(),
    activity: casus.activity ?? '',
    subquestions: casus.subquestions ?? [],
    facts: casus.facts ?? [],
  };
  const verdicts = verdictsFor(sources, full, config, listSourceEvents());
  const { candidates } = findCandidates(full, verdicts, getIndex());
  return {
    candidate_ids: candidates.map((p) => p.id),
    sources: Object.fromEntries(sources.map((s) => [s.id, s])),
    passages: Object.fromEntries(candidates.map((p) => [p.id, p])),
  };
}
