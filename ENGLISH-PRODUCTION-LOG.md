# English production switch — review log

Date: 16 September 2026, Europe/Brussels

## Outcome

English is the production interface and generated-answer language. Dutch remains unchanged only where exact source
provenance or user-entered historical content requires it:

- official source passages and exact citations;
- immutable historical content and officer-entered notes.

The previous Dutch production version is preserved on GitHub as `archive/dutch-production` at `441e6f5`.

## Main integration log

1. Archived the completed Dutch interface before translation.
2. Translated navigation, workbench, review controls, evidence metadata, fallback evidence, replies, API errors and approval policy.
3. Kept the case and findings prompts in Dutch so retrieval and generated evidence remain aligned with Dutch official documents.
4. Translated source management, history and immutable-snapshot chrome while preserving dynamic Dutch source and snapshot content.
5. Rebased over Machine A's concurrent notes, dictation and web-search release (`f335163`).
6. Resolved the shared navigation conflict by retaining Notes and translating all four navigation links.
7. Translated the new notes, dictation and web-search UI and API errors.
8. Ran a live Dutch analysis through the English interface; it returned Dutch findings and exact Dutch citations.

## Review upgrade — 16 September 2026

1. Moved `Colleague knowledge — Notes for this question` above the entrepreneur question so officers see internal
   context first.
2. Added an auditable high-level analysis trace showing the entered question, workflow stages, extracted search
   targets, source-document count and candidate-passage count. It explicitly does not expose private model reasoning.
3. Changed all newly generated case fields, fact questions, findings, conflict explanations and reply text to English.
4. Kept exact Dutch source quotations, exact condition wording and official source titles unchanged for auditability.
5. Added deterministic English-to-Dutch query aliases so English questions still retrieve the Dutch source corpus.
6. Applied the same bilingual matching to colleague notes and debounced matching while the question is being typed.
7. Updated the development fixture to English generated content while retaining its Dutch evidence passages.
8. Added cross-language reply-condition deduplication so English wrappers do not repeat Dutch conditions.

### Review-upgrade subagent logs

- **Language audit:** reviewed the workbench, history, evidence, notes, web search and development fixture; identified
  the remaining Dutch default question and web-search instruction. No edits or commits were made by the auditor.
- **Pipeline and fixture:** updated English generation prompts, English fixture outputs, bilingual source retrieval and
  cross-language reply deduplication. No commit was made by the subagent; the changes were reviewed and integrated
  centrally.

### Review-upgrade verification

- `npm test`: 57/57 passed across 9 files.
- `npm run typecheck`: passed.
- `npm run lint`: 0 errors; four pre-existing unused-variable warnings.
- `npx next build --webpack`: passed.
- Live browser check passed: notes appear first, the three-step trace is visible while analysis runs, and the completed
  analysis shows four English search targets, English case fields and English findings against 10 documents and 15
  candidate passages. Exact Dutch evidence remains visible and explicitly labelled.

## Subagent logs

### History UI

- Files: `app/historiek/page.tsx`, `components/history/HistoryList.tsx`, `components/history/HistoryDetail.tsx`.
- Translated static history text, status/fact/decision labels and date presentation.
- Preserved internal Dutch enum values and immutable dynamic snapshot content.
- Checks: scoped ESLint and full typecheck passed.

### Source management UI

- Files: `app/bronnen/page.tsx`, `components/sources/SourceForm.tsx`, `components/sources/SourceList.tsx`, `components/sources/SourceEvents.tsx`.
- Translated headings, fields, actions, validation, loading/error states and enum display labels.
- Preserved API values and dynamic official source metadata.
- Checks: scoped ESLint, scoped TypeScript and diff check passed.

### Reply and approval policy

- Files: `lib/reply.ts`, `lib/reply.test.ts`, `lib/review-policy.ts`, `lib/review-policy.test.ts`.
- Translated deterministic wrapper text and approval blockers while retaining Dutch findings, source titles and quotes.
- Preserved the duplicate-condition protections from `73b0719`.
- Checks: 13 focused tests, 51 full tests, typecheck, focused ESLint and diff check passed.

No subagent created a commit. Their changes were reviewed, integrated and committed centrally.

## Final verification

- `npm test`: 51/51 passed.
- `npm run typecheck`: passed.
- `npm run lint`: 0 errors; four pre-existing unused-variable warnings.
- `npx next build --webpack`: passed, including Notes, Voice and Web Search routes.
- Browser checks passed for workbench, source management, history, history detail and notes.
- Focused browser check confirmed `Search the web`, `Notes for this question`, and a Dutch grounded finding on the same answer.
