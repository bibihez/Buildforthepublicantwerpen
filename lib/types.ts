export type Level = 'federaal' | 'vlaams' | 'provinciaal' | 'gemeentelijk';
export type Nature = 'wetgeving' | 'richtlijn';

export type Source = {
  id: string;
  title: string;
  short_title: string;
  level: Level;
  issuer: string;
  nature: Nature;
  territory: string;               // must match config.scope entries
  adopted_on?: string | null;
  effective_from?: string | null;  // wetgeving only
  effective_until?: string | null; // wetgeving only
  published_on?: string | null;    // richtlijn: shown, never used as validity
  status: 'van_kracht' | 'historisch' | 'onbekend';
  active: boolean;
  superseded_by?: string | null;
  origin_url?: string | null;
  file_path?: string | null;       // null for metadata-only sources
  sha256?: string | null;
  notes?: string | null;
  added_at: string;
  added_by: string;
};

export type SourceEvent = {
  id: string; source_id: string; at: string; by: string;
  type: 'toegevoegd' | 'gewijzigd' | 'vervangen' | 'gedeactiveerd' | 'geactiveerd';
  reason?: string | null;
};

export type Passage = {
  id: string; source_id: string;
  page_from: number; page_to: number;
  article: string | null;
  text: string;
};

export type SourceVerdict = {
  source_id: string;
  verdict: 'gecontroleerd' | 'onzeker' | 'niet_gebruikt';
  reasons: string[];
};

export type Fact = {
  id: string;                       // e.g. "voeding"
  question: string;                 // "Verkoopt de aanvrager voeding?"
  answer: 'ja' | 'nee' | 'onbekend';
  set_by: 'ai' | 'officer';
};

export type Casus = {
  question: string;
  municipality: string;
  date: string;                     // ISO, default today
  activity: string;
  subquestions: string[];
  facts: Fact[];
};

export type Citation = { passage_id: string; quote: string };

export type Finding = {
  id: string;
  subquestion: string;
  statement: string;
  citations: Citation[];
  condition?: { quote: string; fact_id: string } | null;
  conflict_with?: { passage_id: string; explanation: string } | null;
  status: 'citaat_gecontroleerd' | 'onzeker' | 'tegenstrijdig';
  status_reasons: string[];
  review: 'open' | 'bevestigd' | 'gecorrigeerd' | 'verworpen';
  corrected_statement?: string | null;
  review_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  bulk?: boolean;
  conflict_decision?: 'A' | 'B' | 'onzeker_vermelden' | 'weglaten' | null;
};

export type NotFound = {
  subquestion: string;
  decision?: 'vermelden' | 'weglaten' | null;
};

export type NotUsed = { source_id: string; passage_id: string; reason: string };

export type PrecedentInfo = {
  answer_id: string; approved_by: string; approved_at: string;
  differences: string[];            // Dutch sentences, see step 11
};

export type Answer = {
  id: string;
  parent_id?: string | null;
  created_at: string;
  casus: Casus;
  verdicts: SourceVerdict[];
  candidates: string[];             // passage ids sent to AI ②
  findings: Finding[];
  not_found: NotFound[];
  not_used: NotUsed[];
  precedent?: PrecedentInfo | null;
  reply_text: string;
  status: 'concept' | 'goedgekeurd';
  approved_by?: string | null;
  approved_at?: string | null;
  models: { case: string; findings: string };
  snapshot?: unknown | null;        // frozen copy at approval (step 7)
};
