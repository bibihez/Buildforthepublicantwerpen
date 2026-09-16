import MiniSearch from 'minisearch';
import type { Casus, NotUsed, Passage, SourceVerdict } from './types';

// Dutch and English function words that match every passage and drown the useful terms.
const STOP = new Set(
  'de het een en of in op aan van voor met bij door naar om te tot uit als dat die dit deze dan ook niet wel is zijn was wordt worden kan kunnen moet moeten mag ik je jij u uw we wij ze zij hij hoe wat wie waar wanneer welke er nog al a an and are as at be by can could do does for from has have how if into is it must of on or should that the their them these this those to was were what when where which who why will with would you your'.split(
    ' ',
  ),
);

// New analyses use English case fields while the official corpus remains Dutch.
// These aliases are deliberately small and domain-specific: they improve recall
// without translating or modifying any source passage.
const ENGLISH_TO_DUTCH_ALIASES: Readonly<Record<string, readonly string[]>> = {
  apply: ['aanvraag', 'aanvragen', 'indienen', 'kandidaat', 'aanvraagformulier'],
  application: ['aanvraag', 'aanvragen', 'indienen', 'kandidaat', 'aanvraagformulier'],
  submit: ['indienen', 'aanvraag', 'aanvraagformulier'],
  submission: ['indiening', 'aanvraag', 'aanvraagformulier'],
  form: ['formulier', 'aanvraagformulier'],
  website: ['website'],
  fixed: ['vast', 'vaste', 'abonnement'],
  market: ['markt', 'marktdag'],
  pitch: ['standplaats', 'plaats'],
  stall: ['standplaats', 'kraam'],
  document: ['document', 'bewijsstuk', 'attest'],
  documents: ['documenten', 'bewijsstukken', 'attesten'],
  attachment: ['bijlage', 'bewijsstuk', 'attest'],
  attachments: ['bijlagen', 'bewijsstukken', 'attesten'],
  attach: ['toevoegen', 'bijvoegen', 'gevoegd', 'bewijsstukken'],
  certificate: ['attest', 'keuringsbewijs'],
  certificates: ['attesten', 'keuringsbewijzen'],
  evidence: ['bewijs', 'bewijsstukken'],
  cost: ['kost', 'kosten', 'kostprijs', 'retributie', 'tarief', 'bedrag', 'euro'],
  costs: ['kost', 'kosten', 'kostprijs', 'retributie', 'tarief', 'bedrag', 'euro'],
  fee: ['kost', 'retributie', 'tarief', 'bedrag', 'euro'],
  fees: ['kosten', 'retributie', 'tarieven', 'bedrag', 'euro'],
  price: ['prijs', 'kostprijs', 'tarief', 'bedrag', 'euro'],
  much: ['kostprijs', 'retributie', 'tarief', 'bedrag', 'euro'],
  pay: ['betalen', 'retributie', 'tarief', 'euro'],
  daily: ['dagelijks', 'marktdag'],
  halfyearly: ['halfjaarlijks'],
};

export function tokenize(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export type SearchIndex = { mini: MiniSearch<Passage>; byId: Map<string, Passage> };

export function expandSearchQuery(query: string): string {
  const aliases = tokenize(query).flatMap((term) => ENGLISH_TO_DUTCH_ALIASES[term] ?? []);
  return aliases.length > 0 ? `${query} ${aliases.join(' ')}` : query;
}

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
    .search(expandSearchQuery(query))
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
