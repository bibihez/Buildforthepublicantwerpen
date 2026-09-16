import type {
  Answer,
  AnswerResponse,
  Finding,
  Passage,
  Snapshot,
  Source,
  SourceVerdict,
} from '../../lib/types';

export const FIXTURE_DEVELOPMENT_NOTICE =
  'Development only: the uncertain and conflicting scenarios below are synthetic and are not production sources.';

const marketSource: Source = {
  id: 'markt-2024',
  title: 'Bijzonder politiereglement voor de openbare markt',
  short_title: 'Marktreglement Schoten 2024',
  level: 'gemeentelijk',
  issuer: 'Gemeente Schoten',
  nature: 'wetgeving',
  territory: 'Schoten',
  adopted_on: '2024-03-28',
  effective_from: '2024-04-01',
  effective_until: null,
  published_on: null,
  status: 'van_kracht',
  active: true,
  superseded_by: null,
  origin_url: 'https://www.schoten.be/',
  file_path: 'data/files/Schoten-marktreglement-2024.pdf',
  sha256: 'fixture-market-sha256',
  notes: null,
  added_at: '2026-09-16T11:00:00.000Z',
  added_by: 'ontwikkelfixture',
};

const terraceSource: Source = {
  id: 'fixture-onzeker',
  title: 'ONTWIKKELFIXTURE — ongedateerde marktbijlage',
  short_title: 'Ontwikkelfixture ongedateerde bijlage',
  level: 'gemeentelijk',
  issuer: 'Ontwikkelfixture — geen productiebron',
  nature: 'wetgeving',
  territory: 'Schoten',
  adopted_on: null,
  effective_from: null,
  effective_until: null,
  published_on: null,
  status: 'onbekend',
  active: true,
  superseded_by: null,
  origin_url: null,
  file_path: null,
  sha256: 'fixture-uncertain-sha256',
  notes: FIXTURE_DEVELOPMENT_NOTICE,
  added_at: '2026-09-16T11:00:00.000Z',
  added_by: 'ontwikkelfixture',
};

const conflictSource: Source = {
  id: 'fixture-conflict',
  title: 'ONTWIKKELFIXTURE — afwijkende indieningstermijn',
  short_title: 'Ontwikkelfixture afwijkende termijn',
  level: 'gemeentelijk',
  issuer: 'Ontwikkelfixture — geen productiebron',
  nature: 'richtlijn',
  territory: 'Schoten',
  adopted_on: null,
  effective_from: null,
  effective_until: null,
  published_on: '2026-09-01',
  status: 'van_kracht',
  active: true,
  superseded_by: null,
  origin_url: null,
  file_path: null,
  sha256: 'fixture-conflict-sha256',
  notes: FIXTURE_DEVELOPMENT_NOTICE,
  added_at: '2026-09-16T11:00:00.000Z',
  added_by: 'ontwikkelfixture',
};

const historicSource: Source = {
  id: 'markt-oud',
  title: 'Bijzonder reglement voor de wekelijkse marktdag',
  short_title: 'Bijzonder reglement wekelijkse marktdag',
  level: 'gemeentelijk',
  issuer: 'Gemeente Schoten',
  nature: 'wetgeving',
  territory: 'Schoten',
  adopted_on: null,
  effective_from: null,
  effective_until: '2024-03-31',
  published_on: null,
  status: 'van_kracht',
  active: true,
  superseded_by: 'markt-2024',
  origin_url: null,
  file_path: null,
  sha256: null,
  notes: 'Opgeheven door het Marktreglement Schoten 2024.',
  added_at: '2026-09-16T11:00:00.000Z',
  added_by: 'ontwikkelfixture',
};

const passages: Passage[] = [
  {
    id: 'fixture-art13-aanvraag',
    source_id: marketSource.id,
    page_from: 5,
    page_to: 5,
    article: 'Artikel 13 §3',
    text: 'Een onderneming die een standplaats met abonnement wenst te bekomen, dient zich kandidaat te stellen door het invullen van het aanvraagformulier op de website van de gemeente Schoten, na melding van een vacature of op elk ander tijdstip.',
  },
  {
    id: 'fixture-art13-bijlagen',
    source_id: marketSource.id,
    page_from: 6,
    page_to: 6,
    article: 'Artikel 13 §3',
    text: 'Bij de aanvraag worden de nodige bewijsstukken gevoegd, waaronder attest(en) van het FAVV waaruit de registratie, erkenning of toelating voor de ambulante activiteit blijkt (enkel van toepassing bij verkoop van voeding) (*).',
  },
  {
    id: 'fixture-onzeker-brandveiligheid',
    source_id: terraceSource.id,
    page_from: 2,
    page_to: 2,
    article: 'Artikel 4',
    text: 'ONTWIKKELFIXTURE: bij gebruik van een verwarmingstoestel wordt een recent keuringsbewijs toegevoegd.',
  },
  {
    id: 'fixture-termijn-a',
    source_id: marketSource.id,
    page_from: 5,
    page_to: 5,
    article: 'Artikel 13 §3',
    text: 'ONTWIKKELFIXTURE: de aanvraag wordt ten minste veertien dagen voor de gewenste startdatum ingediend.',
  },
  {
    id: 'fixture-termijn-b',
    source_id: conflictSource.id,
    page_from: 1,
    page_to: 1,
    article: 'Indiening',
    text: 'ONTWIKKELFIXTURE: dien de aanvraag uiterlijk zeven dagen voor de gewenste startdatum in.',
  },
  {
    id: 'fixture-oude-marktregel',
    source_id: historicSource.id,
    page_from: 1,
    page_to: 1,
    article: 'Artikel 1',
    text: 'ONTWIKKELFIXTURE: deze passage behoort tot een vervangen reglement.',
  },
];

const verdicts: SourceVerdict[] = [
  {
    source_id: marketSource.id,
    verdict: 'gecontroleerd',
    reasons: ['Schoten territory checked', 'In force on 16 September 2026'],
  },
  {
    source_id: terraceSource.id,
    verdict: 'onzeker',
    reasons: ['No effective date'],
  },
  {
    source_id: conflictSource.id,
    verdict: 'gecontroleerd',
    reasons: ['Guidance, published 1 September 2026—not legislation'],
  },
  {
    source_id: historicSource.id,
    verdict: 'niet_gebruikt',
    reasons: ['Superseded by Marktreglement Schoten 2024'],
  },
];

const draftFindings: Finding[] = [
  {
    id: 'finding-aanvraag',
    subquestion: 'Hoe dien ik een aanvraag in?',
    statement: 'Vul het aanvraagformulier in op de website van de gemeente Schoten.',
    citations: [
      {
        passage_id: 'fixture-art13-aanvraag',
        quote: 'Een onderneming die een standplaats met abonnement wenst te bekomen, dient zich kandidaat te stellen door het invullen van het aanvraagformulier op de website van de gemeente Schoten, na melding van een vacature of op elk ander tijdstip.',
      },
    ],
    condition: null,
    conflict_with: null,
    status: 'citaat_gecontroleerd',
    status_reasons: [],
    review: 'bevestigd',
    reviewed_by: 'Marleen',
    reviewed_at: '2026-09-16T11:10:00.000Z',
    bulk: false,
  },
  {
    id: 'finding-voeding',
    subquestion: 'Welke documenten moet ik toevoegen?',
    statement: 'Voeg de toepasselijke FAVV-attesten toe aan de aanvraag.',
    citations: [
      {
        passage_id: 'fixture-art13-bijlagen',
        quote: 'attest(en) van het FAVV waaruit de registratie, erkenning of toelating voor de ambulante activiteit blijkt (enkel van toepassing bij verkoop van voeding) (*)',
      },
    ],
    condition: {
      quote: 'enkel van toepassing bij verkoop van voeding',
      fact_id: 'voeding',
      quote_checked: true,
    },
    conflict_with: null,
    status: 'citaat_gecontroleerd',
    status_reasons: [],
    review: 'bevestigd',
    reviewed_by: 'Marleen',
    reviewed_at: '2026-09-16T11:10:00.000Z',
    bulk: false,
  },
  {
    id: 'finding-onzeker',
    subquestion: 'Welke documenten moet ik toevoegen?',
    statement: 'Bij gebruik van een verwarmingstoestel moet een recent keuringsbewijs worden toegevoegd.',
    citations: [
      {
        passage_id: 'fixture-onzeker-brandveiligheid',
        quote: 'bij gebruik van een verwarmingstoestel wordt een recent keuringsbewijs toegevoegd',
      },
    ],
    condition: null,
    conflict_with: null,
    status: 'onzeker',
    status_reasons: ['No effective date'],
    review: 'open',
  },
  {
    id: 'finding-conflict',
    subquestion: 'Wanneer moet ik de aanvraag indienen?',
    statement: 'Dien de aanvraag ten minste veertien dagen voor de gewenste startdatum in.',
    citations: [
      {
        passage_id: 'fixture-termijn-a',
        quote: 'de aanvraag wordt ten minste veertien dagen voor de gewenste startdatum ingediend',
      },
    ],
    condition: null,
    conflict_with: {
      passage_id: 'fixture-termijn-b',
      explanation: 'Een andere passage vermeldt een termijn van zeven dagen.',
    },
    status: 'tegenstrijdig',
    status_reasons: ['The available passages give different submission deadlines.'],
    review: 'open',
    conflict_decision: null,
  },
];

const baseAnswer: Answer = {
  id: 'fixture-answer-q1',
  parent_id: null,
  created_at: '2026-09-16T11:05:00.000Z',
  revision: 3,
  casus: {
    question: 'Ik wil een vaste standplaats op de markt in Schoten. Hoe dien ik een aanvraag in?',
    municipality: 'Schoten',
    date: '2026-09-16',
    activity: 'Een vaste standplaats met abonnement op de openbare markt aanvragen',
    subquestions: [
      'Hoe dien ik een aanvraag in?',
      'Welke documenten moet ik toevoegen?',
      'Wanneer moet ik de aanvraag indienen?',
      'Wat kost een standplaats?',
    ],
    facts: [
      {
        id: 'voeding',
        question: 'Verkoopt de aanvrager voeding?',
        answer: 'onbekend',
        set_by: 'ai',
      },
    ],
  },
  verdicts,
  candidates: passages.slice(0, 5).map((passage) => passage.id),
  findings: draftFindings,
  not_found: [{ subquestion: 'Wat kost een standplaats?', decision: null }],
  not_used: [
    {
      source_id: historicSource.id,
      passage_id: 'fixture-oude-marktregel',
      reason: 'Superseded by Marktreglement Schoten 2024',
    },
  ],
  precedent: null,
  reply_text: '',
  reply_stale: true,
  status: 'concept',
  approved_by: null,
  approved_at: null,
  models: { case: 'fixture', findings: 'fixture' },
  snapshot: null,
};

const sourceMap = Object.fromEntries(
  [marketSource, terraceSource, conflictSource, historicSource].map((source) => [source.id, source]),
);
const passageMap = Object.fromEntries(passages.map((passage) => [passage.id, passage]));

export const fixtureAnswerResponse: AnswerResponse = {
  answer: baseAnswer,
  sources: sourceMap,
  passages: passageMap,
};

const approvedAt = '2026-09-16T11:20:00.000Z';
const approvedFindings: Finding[] = draftFindings.map((finding) => {
  if (finding.id === 'finding-onzeker') {
    return {
      ...finding,
      review: 'gecorrigeerd',
      corrected_statement: 'Bij gebruik van een verwarmingstoestel vraagt de gemeente om een recent keuringsbewijs; de geldigheidsdatum van deze bron is onzeker.',
      review_reason: 'De onzekerheid over de brondatum expliciet gemaakt.',
      reviewed_by: 'Marleen',
      reviewed_at: approvedAt,
    };
  }
  if (finding.id === 'finding-conflict') {
    return {
      ...finding,
      review: 'bevestigd',
      reviewed_by: 'Marleen',
      reviewed_at: approvedAt,
      conflict_decision: 'onzeker_vermelden',
      conflict_reason: 'De twee passages zijn niet eenduidig te verzoenen.',
    };
  }
  return finding;
});

const approvedReply = [
  'Vul het aanvraagformulier in op de website van de gemeente Schoten. [1]',
  'If the answer to “Verkoopt de aanvrager voeding?” is yes: Voeg de toepasselijke FAVV-attesten toe aan de aanvraag. [2]',
  'Bij gebruik van een verwarmingstoestel vraagt de gemeente om een recent keuringsbewijs; de geldigheidsdatum van deze bron is onzeker. [3]',
  'The available sources conflict on this point; this still needs to be checked. [4][5]',
  'No information was found in the available sources for the question: “Wat kost een standplaats?”',
  '',
  'Sources:',
  '[1] Marktreglement Schoten 2024, Artikel 13 §3, p. 5',
  '[2] Marktreglement Schoten 2024, Artikel 13 §3, p. 6',
  '[3] Ontwikkelfixture ongedateerde bijlage, Artikel 4, p. 2',
  '[4] Marktreglement Schoten 2024, Artikel 13 §3, p. 5',
  '[5] Ontwikkelfixture afwijkende termijn, Indiening, p. 1',
].join('\n');

const approvedSnapshot: Snapshot = {
  taken_at: approvedAt,
  revision: 7,
  casus: baseAnswer.casus,
  sources: Object.values(sourceMap),
  passages,
  verdicts,
  findings: approvedFindings,
  not_found: [{ subquestion: 'Wat kost een standplaats?', decision: 'vermelden' }],
  not_used: baseAnswer.not_used,
  notes_used: [],
  precedent: null,
  reply_text: approvedReply,
  approved_by: 'Marleen',
  approved_at: approvedAt,
  models: baseAnswer.models,
};

export const fixtureApprovedAnswerResponse: AnswerResponse = {
  answer: {
    ...baseAnswer,
    id: 'fixture-answer-q1-approved',
    revision: 7,
    findings: approvedFindings,
    not_found: [{ subquestion: 'Wat kost een standplaats?', decision: 'vermelden' }],
    reply_text: approvedReply,
    reply_stale: false,
    status: 'goedgekeurd',
    approved_by: 'Marleen',
    approved_at: approvedAt,
    snapshot: approvedSnapshot,
  },
  sources: sourceMap,
  passages: passageMap,
};
