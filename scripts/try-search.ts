import config from '../config/schoten.json';
import { listPassages, listSources, listSourceEvents } from '../lib/db';
import { buildIndex, findCandidates } from '../lib/search';
import { verdictsFor } from '../lib/verdict';

const casus = {
  question: process.argv[2] ?? 'Ik wil een vaste standplaats op de markt in Schoten. Hoe dien ik een aanvraag in?',
  municipality: 'Schoten', date: '2026-09-16', activity: 'vaste marktkramer',
  subquestions: ['Hoe dien ik een aanvraag in voor een vaste standplaats?', 'Welke documenten moet ik toevoegen?', 'Wat kost een vaste standplaats?'],
  facts: [],
};
const verdicts = verdictsFor(listSources(), casus, config, listSourceEvents());
for (const v of verdicts) console.log(v.source_id, v.verdict, v.reasons.join(' | '));
const { candidates, notUsed } = findCandidates(casus, verdicts, buildIndex(listPassages()));
console.log('\nCANDIDATES');
for (const p of candidates) console.log(p.id, p.source_id, p.page_from, p.page_to, p.article);
console.log('\nNOT USED');
for (const n of notUsed) console.log(n.source_id, n.passage_id, n.reason);
