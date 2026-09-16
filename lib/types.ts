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

/**
 * ONE independently reviewable requirement per finding. A food-only requirement is its own finding, never
 * bundled with identity or insurance requirements that apply to everyone.
 */
export type Finding = {
  id: string;
  subquestion: string;
  statement: string;
  citations: Citation[];
  /**
   * The limiting words from the source ("enkel van toepassing bij verkoop van voeding").
   * If the condition's quote fails the check, the condition is KEPT with quote_checked=false and the finding
   * becomes 'onzeker'. A restriction is never silently removed.
   */
  condition?: { quote: string; fact_id: string; quote_checked: boolean } | null;
  conflict_with?: { passage_id: string; explanation: string } | null;
  status: 'citaat_gecontroleerd' | 'onzeker' | 'tegenstrijdig';
  status_reasons: string[];
  review: 'open' | 'bevestigd' | 'gecorrigeerd' | 'verworpen';
  corrected_statement?: string | null;
  review_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  bulk?: boolean;
  conflict_decision?: 'deze' | 'andere' | 'onzeker_vermelden' | 'weglaten' | null;
  conflict_reason?: string | null;
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

/** Frozen at approval. History screens render ONLY from this, never from today's database. */
export type Snapshot = {
  taken_at: string;
  revision: number;
  casus: Casus;
  sources: Source[];                // every source with a verdict, as it was (incl. sha256)
  passages: Passage[];              // every cited or not-used passage, full text
  verdicts: SourceVerdict[];
  findings: Finding[];
  not_found: NotFound[];
  not_used: NotUsed[];
  notes_used: string[];             // note ids (empty until notes exist)
  precedent: PrecedentInfo | null;
  reply_text: string;
  approved_by: string;
  approved_at: string;
  models: { case: string; findings: string };
};

export type Answer = {
  id: string;
  parent_id?: string | null;
  created_at: string;
  /** +1 on every saved change. Approval must send the revision it was looking at. */
  revision: number;
  casus: Casus;
  verdicts: SourceVerdict[];
  candidates: string[];             // passage ids sent to AI ②
  findings: Finding[];
  not_found: NotFound[];
  not_used: NotUsed[];
  precedent?: PrecedentInfo | null;
  reply_text: string;
  /** true when facts or reviews changed after the reply text was built; approval is blocked until rebuilt or re-saved */
  reply_stale: boolean;
  status: 'concept' | 'goedgekeurd';
  approved_by?: string | null;
  approved_at?: string | null;
  models: { case: string; findings: string };
  snapshot?: Snapshot | null;
};

// ============================================================================================
// API CONTRACT (A implements, B calls). Every endpoint returning an answer returns AnswerResponse.
// ============================================================================================

/** The answer plus everything the evidence panel needs, so B never fetches passages one by one. */
export type AnswerResponse = {
  answer: Answer;
  sources: Record<string, Source>;     // every source referenced by verdicts / citations / not_used
  passages: Record<string, Passage>;   // every passage cited or listed as not used
};

// POST /api/answers                       body: CreateAnswerRequest        → AnswerResponse
export type CreateAnswerRequest = { question: string; date?: string };

// POST /api/answers/[id]/rerun            body: RerunRequest               → AnswerResponse
export type RerunRequest = { revision: number; casus: Casus };

// PATCH /api/answers/[id]                 body: UpdateAnswerRequest        → AnswerResponse
export type UpdateAnswerRequest = {
  revision: number;
  facts?: Fact[];
  finding_reviews?: {
    finding_id: string;
    review: Finding['review'];
    corrected_statement?: string | null;
    review_reason?: string | null;
    reviewed_by: string;
    bulk?: boolean;
    conflict_decision?: Finding['conflict_decision'];
    conflict_reason?: string | null;
  }[];
  not_found_decisions?: { subquestion: string; decision: 'vermelden' | 'weglaten' }[];
  reply_text?: string;               // saving reply text clears reply_stale
};

// POST /api/answers/[id]/approve          body: ApproveRequest             → AnswerResponse | 409 ApiError
export type ApproveRequest = { revision: number; approved_by: string };

// POST /api/answers/[id]/new-version      body: {}                         → AnswerResponse
// GET  /api/answers                                                        → { answers: Answer[] }
// GET  /api/answers/[id]                                                   → AnswerResponse
// GET  /api/sources                                                        → { sources: SourceListItem[] }
// POST /api/sources  multipart: file + SourceUploadFields                  → { source: Source; passages: number } | 400/409 ApiError
// PATCH /api/sources/[id]  body: { active: boolean; reason: string; by: string } → { source: Source }
// GET  /files/[sourceId]  → the PDF (A owns this route; B links to `/files/${id}#page=${page_from}`)

export type SourceListItem = Source & { passage_count: number; events: SourceEvent[] };

export type SourceUploadFields = Omit<Source, 'id' | 'active' | 'superseded_by' | 'file_path' | 'sha256' | 'added_at'> & {
  supersedes_id?: string | null;
};

export type ApproveBlocker = {
  code: 'finding_open' | 'conflict_undecided' | 'not_found_undecided' | 'reply_stale' | 'revision_mismatch' | 'already_approved';
  message: string;                   // Dutch, shown as-is to the officer
  ref?: string;                      // finding id or subquestion
};

export type ApiError = {
  error: string;
  blockers?: ApproveBlocker[];
  /**
   * Only on a failed AI call (502) from POST /api/answers or /rerun: the passages search found from checked
   * sources, so the officer can still work. candidate_ids keeps search order. Nothing here is a finding.
   */
  fallback?: { candidate_ids: string[]; sources: Record<string, Source>; passages: Record<string, Passage> };
};
