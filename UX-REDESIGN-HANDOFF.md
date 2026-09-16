# Bronwijzer UX redesign handoff

Date: 16 September 2026, Europe/Brussels

## Version isolation

- Existing production design: `main` at `4e5d0f1`; its last design change is `a64dcf7`.
- Reference-inspired redesign: `ui/reference-redesign`.
- The redesign was developed and tested in isolation on `ui/reference-redesign`.
- Matisse explicitly approved merging the completed edits into `main` on 16 September 2026.

## Design configuration

The personal Codex skill `design-taste-frontend` is installed at:

`/Users/matisse/.codex/skills/design-taste-frontend`

Design read: a public-sector AI workbench for municipal officers, with a calm, trust-first conversational layout.

- Design variance: 4/10
- Motion intensity: 3/10
- Visual density: 5/10
- Theme: light, cool-white canvas, navy navigation and one blue interaction accent
- Semantic colours: green for verified or confirmed, amber for uncertainty, red for errors or conflicts
- Radius rule: 10-14px for controls and surfaces
- Motion rule: short interaction feedback only, with reduced-motion support

The installed skill is mainly written for landing pages. Its redesign audit, accessibility, consistency and pre-flight
rules were applied. Its image-heavy marketing and cinematic-motion rules were intentionally excluded because this is
an operational workbench.

## Implemented UX changes

1. Replaced the horizontal navigation with a responsive navy workbench shell and clear active navigation.
2. Added a confirmation-first case builder: the AI proposes territory, date, activity, operational facts and research questions, but official-source research begins only after the officer confirms the brief.
3. Removed generic question suggestions. Suggestions now frame the submitted case instead of prompting users with sample questions.
4. Renamed colleague notes to officer notes and kept them as the first context surface. Dictation is visibly labelled as a future feature.
5. Preserved the staged loading trace and made its search scope explicit without exposing private chain-of-thought.
6. Kept Question details in the narrative immediately before the web-source section after research completes.
7. Promoted web search into a prominent parallel-discovery section, while keeping web leads outside the evidence set until a document is uploaded and verified.
8. Made Findings the full-width primary review surface and moved selected official evidence into the right rail.
9. Made the full finding content area open its associated evidence, with keyboard support and visible selected state.
10. Added a dedicated source-document viewer that opens the cited PDF page and highlights the exact Dutch quote inside the original document.
11. Added a responsive tri-state fact checklist with AI suggestions, source-condition provenance and officer confirmation.
12. Removed the bottom human-approval block. A cited entrepreneur draft is produced immediately from verified local findings and refreshes after confirm, correct, reject, fact and not-found decisions.
13. Kept the reply traceable with numbered source references and added a copy-draft action. Nothing is sent automatically.
14. Locked Facts to confirm to the first three questions proposed before research. Source analysis cannot append new fact questions; the original three remain editable and can trigger reanalysis after findings exist.

## Fact safety rule

AI pre-selections are suggestions, not operative facts.

- A fact inferred from the question can display a suggested Yes or No.
- A condition found in an official source can add a required fact check.
- Until an officer clicks Yes, No or Unknown, the pipeline treats every AI-set value as Unknown.
- An unconfirmed AI No cannot hide a conditional requirement.
- An unconfirmed AI Yes cannot make a conditional requirement apply.
- History shows whether the saved value was AI-generated or officer-confirmed.

The optional `Fact.origin` field records `question` or `source_condition`. It remains backward compatible with old
snapshots.

## Subagent review log

All delegated reviews were read-only. Subagents created no commits and edited no files.

### Layout audit

- Inspected the reference screenshot and current application layout.
- Recommended the sidebar, central task workspace and contextual-rail structure.
- Flagged nested scrolling and the risk of keeping three narrow review columns inside the new shell.
- Provided desktop, tablet and mobile layout guidance.

### Facts audit

- Traced facts from question parsing through source-condition grounding, replies and snapshots.
- Identified that AI values were previously applied before officer confirmation.
- Recommended the effective-answer safety rule now implemented and tested.

### Web-search and evidence audit

- Confirmed that web search is automatic and separate from official evidence.
- Recommended stronger prominence, dedicated non-evidence styling and a verified upload path.
- Flagged and corrected the search rerun key so explicit reanalysis triggers a fresh web search.

### CivicFlow specification gap audit — `/root/civicflow_gap_audit`

- 15:32 CEST: compared `civicflow-ui-ux-spec.md` with the redesign branch.
- 15:34 CEST: reported priority gaps in case confirmation, persistent evidence, citation controls, source-verdict clarity and immutable approved history.
- Action taken in this iteration: implemented the case confirmation gate, persistent selected-evidence rail, finding-to-evidence interaction and source-document highlighting. The old approval UI was intentionally removed by the latest product instruction.
- Read-only audit: no files edited and no commits created by the subagent.

### PDF highlighting audit — `/root/pdf_highlight_audit`

- 15:35 CEST: confirmed Chromium's built-in PDF viewer does not reliably honour URL text-search fragments for this workflow.
- Recommended a first-party PDF.js viewer using the repository's existing `unpdf` dependency and a text-layer overlay.
- Action taken: added `/source/[id]`, quote-to-text-layer mapping, visual highlight overlays, page navigation and a fallback link to the full PDF.
- Read-only audit: no files edited and no commits created by the subagent.

## Verification

- `npm test`: 65/65 passed across 11 test files.
- `npm run typecheck`: passed.
- `npm run lint`: 0 errors; four pre-existing unused-variable warnings.
- `npx next build --webpack`: passed.
- Live browser checks passed for the confirmation-first case flow, officer-note terminology, trace, Question details order,
  prominent web leads, full-width findings, finding-to-evidence selection, cited draft generation and automatic draft refresh.
- The custom source viewer was verified against fixture page 5: the exact Dutch quotation was visibly highlighted in the PDF.

## Test both versions

```bash
# Redesign branch before merge
git switch ui/reference-redesign

# Production after the approved merge
git switch main
```

After switching, restart the local development server and open `http://localhost:3000/`.
