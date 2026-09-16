import MiniSearch from 'minisearch';
import type { Casus, NotUsed, Passage, SourceVerdict } from './types';

// Dutch function words that match every passage and drown the useful terms.
const STOP = new Set(
  'de het een en of in op aan van voor met bij door naar om te tot uit als dat die dit deze dan ook niet wel is zijn was wordt worden kan kunnen moet moeten mag ik je jij u uw we wij ze zij hij hoe wat wie waar wanneer welke er nog al'.split(
    ' ',
  ),
);

export function tokenize(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export type SearchIndex = { mini: MiniSearch<Passage>; byId: Map<string, Passage> };

export function buildIndex(passages: Passage[]): SearchIndex {
  const mini = new MiniSearch<Passage>({
    fields: ['text', 'article'],
    storeFields: ['source_id'],
    tokenize,
    processTerm: (t) => t,
    searchOptions: { prefix: true, fuzzy: 0.2, boost: { article: 2 }, tokenize, processTerm: (t) => t },
  });
  mini.addAll(passages.map((p) => ({ ...p, article: p.article ?? '' })));
  return { mini, byId: new Map(passages.map((p) => [p.id, p])) };
}

export type Hit = { passage: Passage; score: number };

export function search(index: SearchIndex, query: string, { limit = 40 } = {}): Hit[] {
  return index.mini
    .search(query)
    .slice(0, limit)
    .map((r) => ({ passage: index.byId.get(r.id as string)!, score: r.score }));
}

export type Candidates = { candidates: Passage[]; notUsed: NotUsed[] };

export function findCandidates(
  casus: Pick<Casus, 'question' | 'subquestions' | 'activity'>,
  verdicts: SourceVerdict[],
  index: SearchIndex,
  { maxCandidates = 20, maxNotUsed = 5, perSource = 3 } = {},
): Candidates {
  const query = [casus.question, ...casus.subquestions, casus.activity].join(' ');
  const bySource = new Map(verdicts.map((v) => [v.source_id, v]));
  const taken = new Map<string, number>();
  const candidates: Passage[] = [];
  const notUsed: NotUsed[] = [];

  for (const { passage } of search(index, query, { limit: 40 })) {
    const n = taken.get(passage.source_id) ?? 0;
    if (n >= perSource) continue;
    const v = bySource.get(passage.source_id);
    if (!v) continue; // a passage whose source has no verdict is never evidence
    taken.set(passage.source_id, n + 1);
    if (v.verdict === 'niet_gebruikt') {
      if (notUsed.length < maxNotUsed) {
        notUsed.push({ source_id: passage.source_id, passage_id: passage.id, reason: v.reasons.join(' · ') });
      }
    } else if (candidates.length < maxCandidates) {
      candidates.push(passage);
    }
  }
  return { candidates, notUsed };
}
