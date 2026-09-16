# Bronwijzer UX redesign handoff

Date: 16 September 2026, Europe/Brussels

## Version isolation

- Existing production design: `main` at `4e5d0f1`; its last design change is `a64dcf7`.
- Reference-inspired redesign: `ui/reference-redesign`.
- The redesign must be tested and reviewed on its branch. Do not merge it into `main` until Matisse approves it.

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
2. Added a focused conversational question area with useful example questions and a compact composer.
3. Kept colleague notes as the first context surface and collapsed note creation until requested.
4. Preserved the staged loading trace and made its search scope explicit.
5. Promoted web search into a prominent parallel-discovery section directly after the analysis trace.
6. Kept web results visually and semantically separate from verified evidence, with a persistent `Not evidence` label.
7. Added a direct link from a web lead to the verified source-upload workflow.
8. Preserved findings, exact Dutch quotes, surrounding passages, source consultation and human review controls.
9. Improved official evidence presentation and highlights the cited quotation inside the surrounding passage.
10. Added a responsive tri-state fact checklist with AI suggestions, source-condition provenance and officer confirmation.

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

## Verification

- `npm test`: 58/58 passed across 9 test files.
- `npm run typecheck`: passed.
- `npm run lint`: 0 errors; four pre-existing unused-variable warnings.
- `npx next build --webpack`: passed.
- Live browser checks passed for responsive navigation, top-priority notes, loading trace, completed web leads, fact
  suggestion, officer confirmation, findings and exact evidence.

## Test both versions

```bash
# Existing design
git switch main

# New design
git switch ui/reference-redesign
```

After switching, restart the local development server and open `http://localhost:3000/`.
