# Bronwijzer — build plan

Start 12:50 · **code freeze 15:05** · recording 15:15 · submitted by 16:15 (deadline 16:30)
Two people: **A = engine** (data, rules, AI, API) · **B = screens** (UI, review, history, upload form)
This plan includes the independent review's corrections (§ "Rules locked" below). Where it differs from PRD v2, **this plan wins**.

---

## How to use this plan

- Do the steps **in order**. Each step has **Owner · Files · Do · Done when**.
- **Don't start the next step until "Done when" is true.** If a step overruns by more than 10 min, apply the cut in its box.
- A and B work in parallel against **one shared contract** (`lib/types.ts`, step 0.2). Neither changes it without telling the other.
- Checkpoints **C1 (14:05)**, **C2 (14:45)** and **C3 (15:05)** are go/no-go gates for the whole team.
- Giving a step to a coding agent: paste the step plus `lib/types.ts` plus "Rules locked". Nothing else is needed.

---

## Rules locked (read once, both of you)

1. **Three separate collections:** official sources · officer notes · previous answers. **Only official sources are evidence.** Notes and previous answers never enter the search index as evidence.
2. **Source checks ≠ legal applicability.** Code checks territory, dates, status and version, labelled **"Broncontrole geslaagd"**, never "van toepassing".
3. **Topic ≠ territory.** A Province of Antwerp document **passes** the territory check for Schoten. If it's irrelevant, that's because search didn't pick it, not because of territory.
4. **Publication date ≠ effective date.** Guidance (`richtlijn`) has `published_on`, which is shown but never used as validity. Only legislation (`wetgeving`) has `effective_from` / `effective_until` checked.
5. **Automated labels describe what code checked:** "Citaat gecontroleerd" · "Onzeker" · "Tegenstrijdige passages" · "Niet gevonden in beschikbare bronnen". **Only a human action produces "Bevestigd door medewerker".**
6. **A checked quote doesn't prove the meaning.** Conditions ("enkel bij verkoop van voeding") must be carried as conditions, never dropped.
7. **Unknown stays unknown.** A case fact nobody answered (sells food?) is `onbekend`, and the reply states the requirement conditionally.
8. **New findings are never "geen actie nodig".** Every finding needs a human state before approval (bulk-confirm is allowed, and is recorded).
9. **Editing a statement removes its "Citaat gecontroleerd" label**, replaced by "Tekst gewijzigd — niet gedekt door citaat".
10. **Approval covers one version.** Editing after approval creates a new draft. **No send button anywhere.**
11. **Precedent banner wording:** "Geen wijzigingen gedetecteerd in de gecontroleerde bronnen", never "nog geldig". **No automatic reuse of old text.**
12. **The reply never promises a follow-up by itself.** Gaps are shown; the officer chooses what to write.

---

## Timeline at a glance

| Time | A · engine | B · screens | Gate |
|---|---|---|---|
| 12:50–13:05 | **0.1** scaffold, deps, env | **0.2** contract `types.ts` + fixture JSON | both run `npm run dev` |
| 13:05–13:35 | **1** ingest + seed · **2** source checks + tests | **5** Question screen on fixture | |
| 13:35–14:05 | **3** search + quote check · **4** AI calls + `/api/answers` | **6** evidence panel, conditions, review actions | **C1 14:05**: real Q1 on screen |
| 14:05–14:45 | **7** approve + snapshot + history API · **8** upload + deactivate API | **9** reply draft + approve UI · **10** history + sources screens + upload form | **C2 14:45**: full loop incl. upload |
| 14:45–15:05 | **11** precedent banner (sources only) | **12** polish Dutch labels, empty and error states | **C3 15:05**: freeze |
| 15:05–15:15 | **13** reset + seed demo state + dry run (both) | | |
| optional | **14** dictated note (ElevenLabs), only if C2 passed by 14:45 | | |

**Not in this build:** Exa web search · automatic text reuse · review-by-exception collapsing · auto-filled source form · interview agent · scheduled re-fetch.

---

## Step 0.1 · Scaffold (A · 12:50–13:05)

> ✅ **Done (12:55).** App scaffolded and pushed to `github.com/bibihez/Buildforthepublicantwerpen`. Everyone: clone, `npm i`, `cp .env.example .env.local`, copy the 9 starter-pack PDFs into `data/files/` (see README). The commands below are for reference only.

**Files:** `_hackathon-prov-ai/app/` (new Next.js app, not inside CoproClear's app)

**Do**
```bash
cd /Users/bibihez/dev/coproclear/_hackathon-prov-ai
npx create-next-app@latest app --ts --tailwind --app --eslint --src-dir=false --import-alias "@/*" --use-npm
cd app
npm i better-sqlite3 unpdf minisearch openai zod
npm i -D @types/better-sqlite3 vitest tsx
mkdir -p data/files data/seed lib prompts scripts tests
cp ../starter-pack/AP-starter-pack-2026-09-07/RAG/*.pdf data/files/
git init && git add -A && git commit -m "scaffold"
```
`.env.local`:
```
OPENAI_API_KEY=...
OPENAI_MODEL_FAST=...        # a fast model for the case parser
OPENAI_MODEL_STRONG=...      # the strongest model you have for findings
MUNICIPALITY=schoten
```
Add `"test": "vitest run"` and `"seed": "tsx scripts/seed.ts"` to `package.json` scripts.

**Done when:** `npm run dev` shows the default page, and `node -e "require('better-sqlite3')"` doesn't crash.
**If `better-sqlite3` fails to build:** replace it with JSON files in `data/db/*.json` behind the same `lib/db.ts` functions. Don't debug native builds.

---

## Step 0.2 · Shared contract + fixture (B · 12:50–13:05)

> ✅ **`lib/types.ts` is done and pushed (by A).** B: only write `data/seed/fixture-answer.json`, then go to step 5.

**Files:** `lib/types.ts`, `data/seed/fixture-answer.json`

**Do:** create `lib/types.ts` exactly as in **Appendix A**. Hand-write `fixture-answer.json`, a realistic `Answer` for Q1 with 3 findings: application (with a condition), documents, and one `niet_gevonden`. Take the quotes from Appendix D.

**Done when:** both people have pulled `types.ts`, and the fixture passes `Answer` typing (`tsc --noEmit`).

---

## Step 1 · Ingest PDFs into passages + seed sources (A · 13:05–13:20)

> ✅ **Done (13:05).** `npm run seed` loads 8 PDFs + 1 metadata-only source. Tests: `npm test`. Passages are capped at 4,000 characters so article 13 stays whole.

**Files:** `lib/db.ts`, `lib/ingest.ts`, `data/seed/sources.json` (Appendix B), `scripts/seed.ts`, `config/schoten.json`

**Do**
1. `lib/db.ts`: tables `sources`, `passages`, `source_events`, `answers`, `notes`. JSON fields stored as TEXT. Export small functions (`insertSource`, `listSources`, `insertPassages`, `getPassagesBySource`, `insertAnswer`, `updateAnswer`, `getAnswer`, `listAnswers`, `addSourceEvent`).
2. `lib/ingest.ts` → `ingestPdf(filePath, sourceId): Passage[]`:
   - `getDocumentProxy` + `extractText(pdf, { mergePages: false })` from `unpdf` → one string per page.
   - Remove footer/header lines matching `/^\s*pagina \d+ van \d+\s*$/im`, and the repeated title line of the market regulation.
   - **Concatenate all pages** into one text, remembering the start offset of each page.
   - Split at article headings: `/^\s*(I\s+)?Art(ikel|\.)\s*\d+[\w.]*/m`. No heading found → split per page.
   - Any passage over 2,500 characters → split further on blank lines.
   - Each passage gets `page_from` / `page_to` from offsets (**so art. 13 is one passage with page_from 5, page_to 6**), `article` (the heading text, trimmed to 60 characters), and `id = sha1(file_sha256 + page_from + start_offset).slice(0,12)`.
3. `scripts/seed.ts`: for every entry in `sources.json` with `"seed": true` → compute `sha256` → insert source → ingest → insert passages → event `toegevoegd`. The metadata-only entry (#0) is inserted without passages.

**Done when:**
- `npm run seed` loads **8 sources with files + 1 metadata-only**. The fee regulation is **not seeded**; it's uploaded live in step 8.
- A quick query shows a passage whose `article` starts with "Artikel 13", with `page_from=5` and `page_to=6`, containing both "aanvraagformulier" and "keuringsbewijs brandblusapparaten".

**Cut if late:** skip the >2,500 character split; accept large passages.

---

## Step 2 · Source checks (A · 13:20–13:35)

**Files:** `lib/verdict.ts`, `tests/verdict.test.ts`, `config/schoten.json`

**Do:** implement `verdict(source, casus, config): SourceVerdict` as a **pure function**. Checks in order; each fail adds a Dutch reason:

| # | Check | Fail → `niet_gebruikt` | Unknown → `onzeker` |
|---|---|---|---|
| 1 | `active` | "Gedeactiveerd door {naam}: {reden}" | — |
| 2 | `superseded_by` | "Vervangen door {short_title}" | — |
| 3 | `status === 'historisch'` | "Historisch document — achtergrond, geen huidige regel" | — |
| 4 | territory ∈ `config.scope` | "Ander grondgebied: {territory}" | territory missing |
| 5 | **only if `nature === 'wetgeving'`**: `casus.date` within `[effective_from, effective_until]` | "Nog niet van kracht op {datum}" / "Niet meer van kracht sinds {datum}" | no `effective_from` → "Geen datum van inwerkingtreding" |

Result: any fail → `niet_gebruikt`; else any unknown → `onzeker`; else `gecontroleerd` (UI label "Broncontrole geslaagd").
`richtlijn` sources skip check 5 and get the reason "Richtlijn, gepubliceerd {published_on} — geen regelgeving".

`config/schoten.json`: `{ "municipality": "Schoten", "scope": ["België", "Vlaanderen", "Provincie Antwerpen", "Schoten"] }`

**Tests (must pass):**
- Market regulation, date 2026-09-16 → `gecontroleerd`
- Fee regulation, date 2025-06-01 → `niet_gebruikt`, reason contains "Nog niet van kracht"
- Innovation fund (territory "Provincie Antwerpen") → **not** `niet_gebruikt` on territory
- Royal decree 2006 → `niet_gebruikt`, "Historisch"
- Terrace rules (no dates, wetgeving) → `onzeker`
- VLAIO (richtlijn) → `gecontroleerd` with the "Richtlijn" reason, and **no date check**
- Old market regulation (#0) → `niet_gebruikt`, "Vervangen door"

**Done when:** `npm test` shows 7 passing.

---

## Step 3 · Search + quote check + number check (A · 13:35–13:50)

**Files:** `lib/search.ts`, `lib/anchor.ts`, `lib/numbers.ts`, `tests/anchor.test.ts`

**Do**
1. `lib/search.ts` → `buildIndex(passages)` and `search(query, {limit})` using `minisearch` on `text` + `article`, with a lowercase, accent-stripping tokenizer and prefix + fuzzy 0.2.
   `findCandidates(casus, verdicts)`:
   - query = question + sub-questions + activity
   - take the top 40 hits, **max 3 per source**
   - hits from `gecontroleerd` / `onzeker` sources → `candidates` (max 20)
   - hits from `niet_gebruikt` sources → `notUsed` (max 5, with the source's reason)
2. `lib/anchor.ts` → `norm(s)`: NFC · `’‘ʼ´` → `'` · `–—‑` → `-` · `“”«»` → `"` · remove `*` · **remove all whitespace**. Never change letters or digits. `quoteInPassage(quote, passageText) = norm(passageText).includes(norm(quote))`.
3. `lib/numbers.ts`: **copy** `canonicalNumber`, `numbersIn`, `isFreeNumber` from `/Users/bibihez/dev/coproclear/lib/copro/public-qa/corpus.ts` (lines 120–165). `numbersGrounded(statement, quotes) = every number in the statement that isn't a free number appears among the numbers of the quotes`.

**Tests (must pass):**
- `quoteInPassage("Per marktdag: 6,00 euro", "•    P er marktdag: 6,00 euro")` → true
- `quoteInPassage("Per marktdag: 8,00 euro", "P er marktdag: 6,00 euro")` → false
- `numbersGrounded("78,00 euro per halfjaar", ["H alfjaarlijks: 78,00 euro"])` → true
- `numbersGrounded("80 euro", ["78,00 euro"])` → false

**Done when:** the tests pass, and `findCandidates` for Q1 today returns the art. 13 passage among the candidates and the royal decree 2006 (if hit) in `notUsed`.

---

## Step 4 · AI calls + grounding + `/api/answers` (A · 13:50–14:05)

**Files:** `lib/llm.ts`, `prompts/case.md`, `prompts/findings.md`, `lib/ground.ts`, `app/api/answers/route.ts`

**Do**
1. `lib/llm.ts` → `callJson<T>(model, system, user, zodSchema)` using `openai` with JSON output. Parse with zod; on a parse failure retry once, then throw.
2. **AI ① case** (`OPENAI_MODEL_FAST`, prompt in Appendix C.1) → `CaseDraft`: `activity`, `subquestions[]`, `facts[]` (clarification questions with answer `onbekend` unless the question states it), `date` only if stated.
3. **AI ② findings** (`OPENAI_MODEL_STRONG`, prompt in Appendix C.2). Input: case + candidate passages (`id`, source short_title, level, nature, article, pages, text). Output: `findings[]` + `not_found[]`.
4. `lib/ground.ts` → `ground(raw, candidates, verdicts): Finding[]`:
   - drop citations whose `passage_id` isn't in the candidates
   - drop citations failing `quoteInPassage`
   - drop `condition` if its quote fails `quoteInPassage`
   - no citations left → finding removed, its sub-question goes to `not_found`
   - status: `conflict_with` present → `tegenstrijdig` · any cited source `onzeker`, or `numbersGrounded` false → `onzeker` (with reasons) · otherwise → `citaat_gecontroleerd`
   - `review = 'open'` for every finding
5. `POST /api/answers { question }`: case → verdicts for all sources → candidates → findings → ground → save `Answer` (status `concept`) → return it.
   `POST /api/answers/[id]/rerun { casus }`: same pipeline without AI ①.

**Done when (C1 · 14:05):** `curl -XPOST localhost:3000/api/answers -d '{"question":"Ik wil een vaste standplaats op de markt in Schoten. Hoe dien ik een aanvraag in?"}'` returns:
- at least 2 findings with `citaat_gecontroleerd`, one of them with a condition about food ("voeding")
- a "kostprijs" sub-question in `not_found` (the fee regulation isn't uploaded yet)
- `notUsed` listing at least one source with a reason

**Cut if late:** use one model for both calls.

---

## Step 5 · Question screen on the fixture (B · 13:05–13:35)

**Files:** `app/page.tsx`, `components/CaseCard.tsx`, `components/FindingList.tsx`, `components/StatusBadge.tsx`

**Do:** three columns (they stack on narrow screens). Everything reads from `fixture-answer.json` for now.
- **Left:** question textarea + "Analyseer" · case card: gemeente (fixed "Schoten"), datum (date input, default today), activiteit, sub-questions, **facts with ja / nee / onbekend toggles** ("Verkoopt de aanvrager voeding?").
- **Middle:** findings grouped by sub-question. Each shows its statement, `StatusBadge` and review state. "Niet gevonden in beschikbare bronnen" items are visible, not hidden.
- **Right:** evidence panel (step 6). Placeholder for now.
- `StatusBadge` labels (Dutch, exact): `citaat_gecontroleerd` → "Citaat gecontroleerd" · `onzeker` → "Onzeker" · `tegenstrijdig` → "Tegenstrijdige passages" · `niet_gevonden` → "Niet gevonden in beschikbare bronnen". Human: "Bevestigd door medewerker" · "Gecorrigeerd" · "Verworpen".
- A permanent line at the top: "Beperkte bronnenset: {n} documenten. Niet gevonden betekent: geen bewijs in deze bronnen — niet dat er geen regel bestaat."

**Done when:** the fixture renders, and the fact toggles change local state.

---

## Step 6 · Evidence panel, conditions, review actions (B · 13:35–14:05)

**Files:** `components/EvidencePanel.tsx`, `components/NotUsedList.tsx`, `components/ReviewActions.tsx`

**Do**
- Clicking a finding → the right panel shows, per citation:
  - source short_title, chips (level · nature), article, pages
  - **the exact quote**, highlighted inside the passage text (show 300 characters around it)
  - "Open bron" → `/files/{sourceId}#page={page_from}` (add `app/files/[id]/route.ts` serving the PDF)
  - **"Broncontrole"** lines from the verdict reasons (✓ / ? / ✕)
- **Condition block** under a finding: "Voorwaarde: *enkel van toepassing bij verkoop van voeding*" + the linked fact state. Fact `nee` → finding greyed "Niet van toepassing volgens casus". Fact `onbekend` → label "Voorwaardelijk".
- **Niet gebruikt** list: source · reason.
- **Review actions** per finding: Bevestig · Corrigeer (textarea → `corrected_statement`, status label becomes "Tekst gewijzigd — niet gedekt door citaat") · Verwerp (reason required). Above the list, the button **"Bevestig alle gecontroleerde citaten"** confirms only `citaat_gecontroleerd` findings still `open`, and records `bulk: true`.
- Conflict finding: choice "Passage A" / "Passage B" / "Als onzeker vermelden" / "Weglaten" + reason.

**Done when:** all actions work on the fixture (local state), and C1 wiring works: "Analyseer" calls `POST /api/answers` and renders the real Q1.

---

## ✅ C1 · 14:05 (both, 5 min)

Real Q1 on screen: findings with quotes, one condition, "kostprijs" not found, a not-used list.
**If not reached:** A keeps fixing step 4 until 14:20 while B continues step 9 on the fixture. **Drop step 11 now.**

---

## Step 7 · Review persistence, approve, snapshot, history API (A · 14:05–14:25)

**Files:** `app/api/answers/[id]/route.ts`, `app/api/answers/[id]/approve/route.ts`, `lib/snapshot.ts`

**Do**
- `PATCH /api/answers/[id]` accepts `{ facts?, findingReviews?, replyText? }` and saves. Changing `facts` doesn't call AI (conditions are evaluated in the UI and in the reply draft).
- `POST /api/answers/[id]/approve { approvedBy }`. **Refuse (409 with a list)** if:
  - any finding has `review === 'open'`
  - any `tegenstrijdig` finding has no conflict decision
  - any `not_found` item has no decision (`vermelden` / `weglaten`)
- On approve: build `snapshot` = copies of the sources used and not used (metadata + sha256), cited passages (full text), verdicts, the case, findings with reviews, notes used, model names, reply text, approver, timestamp. Status → `goedgekeurd`. **Any later PATCH on an approved answer → 409** ("Maak een nieuwe versie").
- `POST /api/answers/[id]/new-version` → copies it into a new `concept` with `parent_id`.
- `GET /api/answers` (list) · `GET /api/answers/[id]`.

**Done when:** approving the Q1 answer with an open finding returns 409 with a readable list; after reviewing everything it succeeds, and a PATCH after approval returns 409.

---

## Step 8 · Upload a source + deactivate (A · 14:25–14:45)

**Files:** `app/api/sources/route.ts`, `app/api/sources/[id]/route.ts`

**Do**
- `GET /api/sources` → sources with passage counts and last event.
- `POST /api/sources` (multipart: `file` + metadata fields from Appendix A `Source`) → save the file → sha256 → **reject a duplicate sha** ("Deze versie bestaat al") → ingest → insert → event `toegevoegd` → **rebuild the search index**.
  - If `supersedes_id` is given → set `superseded_by` on the old source + event `vervangen`.
- `PATCH /api/sources/[id]` `{ active:false, reason }` → event `gedeactiveerd` → rebuild the index.

**Done when (C2 · 14:45):** uploading `Schoten-markt-en-kermisretributies-2026-2031.pdf` with effective 2026-01-01 → 2031-12-31, then re-running Q1, turns "kostprijs" into a finding quoting "6,00 euro" / "78,00 euro" with "Citaat gecontroleerd".

---

## Step 9 · Reply draft + approve UI (B · 14:05–14:25)

**Files:** `lib/reply.ts`, `components/ReplyEditor.tsx`, `components/ApproveBar.tsx`

**Do**
- `buildReply(answer): string`, a code template (no AI):
  - findings reviewed `bevestigd` / `gecorrigeerd` → statement (or corrected) + footnote `[n]`
  - fact `onbekend` with a condition → sentence starts "Indien {condition}: …"; fact `nee` → finding left out; `verworpen` → left out
  - `not_found` with decision `vermelden` → "Over {subquestion} vonden we in onze bronnen geen informatie." (**no promise to follow up**)
  - conflict decision "als onzeker vermelden" → "Hierover bestaan verschillende bronnen; dit wordt nog nagekeken."
  - source list: `[n] {short_title}, {article}, p. {page_from}`
- The editor pre-fills with `buildReply`; the officer edits freely. A "Opnieuw opbouwen" button regenerates after review changes (with a confirm, since it overwrites edits).
- **ApproveBar:** name field · list of blockers (from the 409 response or computed locally) · **Goedkeuren** · **Kopieer**. No send button.

**Done when:** on the fixture, rejecting a finding removes it from the draft, and fact `onbekend` produces an "Indien…" sentence.

---

## Step 10 · History + sources screens + upload form (B · 14:25–14:45)

**Files:** `app/historiek/page.tsx`, `app/historiek/[id]/page.tsx`, `app/bronnen/page.tsx`, `components/SourceForm.tsx`

**Do**
- **Historiek:** table (date, question, status, approved by). The detail page renders **only from `snapshot`** (read-only): case, findings with reviews and reasons, quotes, source versions (title, sha first 8, verdict reasons), reply text, approver + time.
- **Bronnen:** table (short title, level, nature, territory, dates, status, passages, last change) · "Deactiveer" (reason prompt) · event history per source (expand).
- **SourceForm:** file input + required fields: titel, korte titel, niveau, uitgever, aard, grondgebied, status; for `wetgeving`, van kracht vanaf / tot (or tick "onbekend"); for `richtlijn`, gepubliceerd op; optional: officiële link, vervangt (dropdown of same-issuer sources). On success, a toast "Bron toegevoegd — {n} passages".

**Done when (C2):** upload through the form works end to end (step 8 check), and an approved answer opens read-only in Historiek.

---

## ✅ C2 · 14:45 (both, 5 min)

Full loop: question → evidence → correction → approval → history **plus** a live upload that changes the answer.
**If not reached:** skip steps 11, 12 and 14. Fix only what blocks this loop until 15:05.

---

## Step 11 · Precedent banner, sources only (A · 14:45–15:05)

**Files:** `lib/precedent.ts`, `components/PrecedentBanner.tsx`, update `POST /api/answers`

**Do**
- `findPrecedent(question)`: minisearch over **approved** answers' questions + sub-questions, with a score threshold (tune on Q1). Return the best match or null.
- `compare(precedent.snapshot, current)` → a list of concrete differences:
  - source cited now but absent from the precedent snapshot → "Nieuwe bron sinds vorig antwoord: {short_title}"
  - precedent source now deactivated / superseded / different sha → "Bron gewijzigd sinds vorig antwoord: {short_title} ({reden})"
  - case fact differs ("toen: voeding = nee · nu: onbekend") → "Casus verschilt: {fact}"
  - nothing → "Geen wijzigingen gedetecteerd in de gecontroleerde bronnen"
- Banner above the findings: "Vergelijkbare vraag eerder goedgekeurd door {naam} op {datum}" + the list + "Open vorig antwoord" (→ Historiek detail).
- **The precedent is not passed to AI ② and doesn't change any finding.**

**Done when:** after approving Q1 (without the fee regulation) and uploading the fee regulation, asking Q1 again shows "Nieuwe bron sinds vorig antwoord: Retributiereglement markten 2026–2031".

**Cut:** the case-fact difference line.

---

## Step 12 · Dutch polish, empty and error states (B · 14:45–15:05)

- Every visible label in Dutch. No English leftovers.
- Loading state on "Analyseer" (the AI takes 10–30 s): "Bronnen controleren…" → "Passages zoeken…" → "Bevindingen opstellen…"
- AI failure → "Geen bevindingen opgesteld. De gevonden passages staan hieronder." + the candidate list (the officer can still work).
- Zero findings → only not-found items plus the not-used list.
- Keyboard focus is visible; text is readable at laptop recording resolution (at least 15 px).

---

## ✅ C3 · 15:05 CODE FREEZE

After this, only fix crashes that appear in the demo path.

## Step 13 · Reset + demo state + dry run (both · 15:05–15:15)

1. Delete `data/*.db` (or the JSON files) → `npm run seed` (fee regulation **not** seeded).
2. As "Marleen": ask Q1 → review all findings (fact voeding = `nee`, FAVV finding shows "Niet van toepassing volgens casus") → approve. **This is the real precedent, with a real timestamp.**
3. Keep `Schoten-markt-en-kermisretributies-2026-2031.pdf` ready on the desktop for the live upload.
4. Dry run once, start to finish, with the screen recorder on. Stop at the first crash and fix only that.

---

## Step 14 · Optional: dictated note (ElevenLabs) — only if C2 passed by 14:45

**Gate:** ElevenLabs credits claimed **and** a 10-minute test of Flemish Dutch passed (a street name, an amount, a date).
**Files:** `components/MicButton.tsx`, `app/api/voice/route.ts`, `app/notities/page.tsx`
- `MicButton`: `MediaRecorder` → POST audio → ElevenLabs speech-to-text → **editable transcript** → "Opslaan als notitie" (topic, author, date).
- Notes are shown beside the case as "Notitie medewerker — niet geverifieerd" and add search terms only.
**Done when:** a 20-second dictation becomes a saved, editable note. If it isn't working by 15:05, drop it.

---

# Appendix A · `lib/types.ts`

```ts
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
```

# Appendix B · `data/seed/sources.json`

Territory strings must match `config.scope` exactly.

| id | file | short_title | level | issuer | nature | territory | dates | status | seed |
|---|---|---|---|---|---|---|---|---|---|
| `markt-oud` | — | Bijzonder reglement wekelijkse marktdag | gemeentelijk | Gemeente Schoten | wetgeving | Schoten | effective_until 2024-03-31 | van_kracht, **superseded_by `markt-2024`** | true |
| `markt-2024` | Schoten-marktreglement-2024.pdf | Marktreglement Schoten 2024 | gemeentelijk | Gemeente Schoten | wetgeving | Schoten | adopted 2024-03-28 · effective_from 2024-04-01 | van_kracht | true |
| `retributie-markt` | Schoten-markt-en-kermisretributies-2026-2031.pdf | Retributiereglement markten 2026–2031 | gemeentelijk | Gemeente Schoten | wetgeving | Schoten | adopted 2025-11-24 · 2026-01-01 → 2031-12-31 | van_kracht | **false (live upload)** |
| `terrassen` | Schoten-terrassen-en-uitstallingen-ongedateerd.pdf | Reglement terrassen en uitstallingen | gemeentelijk | Gemeente Schoten | wetgeving | Schoten | none | onbekend | true |
| `vlaio-eigen-zaak` | VLAIO-mijn-eigen-zaak-januari-2026.pdf | VLAIO Mijn eigen zaak (2026) | vlaams | VLAIO | richtlijn | Vlaanderen | published_on 2026-01 | van_kracht | true |
| `favv-heffingen` | FAVV-heffingen-FAQ-juni-2026.pdf | FAVV Brochure heffingen 2026 | federaal | FAVV | richtlijn | België | published_on 2026-06 | van_kracht | true |
| `innovatiefonds` | Antwerpen-innovatiefonds-reglement-2026.pdf | Subsidiereglement Innovatiefonds | provinciaal | Provincie Antwerpen | wetgeving | Provincie Antwerpen | none recorded | van_kracht | true |
| `hist-favv-gids` | HISTORICAL-FAVV-controle-gids-cover-2022.pdf | FAVV-controlegids (2022) | federaal | FAVV | richtlijn | België | published_on 2022 | **historisch** | true |
| `hist-kb-2006` | HISTORICAL-FAVV-koninklijk-besluit-2006.pdf | KB 16 januari 2006 (FAVV) | federaal | FOD Volksgezondheid | wetgeving | België | BS 2006-03-02 | **historisch** | true |
| `hist-omgevingsloket` | HISTORICAL-Omgevingsloket-kleinhandel-2019.pdf | Handleiding Omgevingsloket kleinhandel (2019) | vlaams | Vlaamse overheid | richtlijn | Vlaanderen | published_on 2019-01 | **historisch** | true |

Origin URLs known: market regulation `https://www.schoten.be/sites/default/files/2024-03/GR%2028-03-2024_2000_Uittreksel%20in%20pdf_Marktreglement.pdf`, fee regulation `https://www.schoten.be/sites/default/files/public/documenten/Reglementen/Retributiereglementen%2026-31/Retributiereglement%20op%20de%20openbare%20markten%20en%20kermissen%202026-2031.pdf`. The others have no URL; link the local file.
`markt-oud.notes`: "Opgeheven per 1 april 2024 volgens het slotartikel van het Marktreglement 2024."

# Appendix C · Prompts

### C.1 `prompts/case.md` (AI ①)

```
You read a question an entrepreneur asked a local economy officer in a Flemish municipality.
Return JSON only, matching the schema.

- activity: short Dutch description of the activity (e.g. "vaste marktkramer").
- subquestions: 2–5 short Dutch questions the officer must answer (procedure, required documents, costs,
  conditions). Only questions that follow from the entrepreneur's question.
- facts: up to 4 yes/no questions whose answer changes which requirements apply
  (e.g. "Verkoopt de aanvrager voeding?", "Gebruikt de aanvrager gas of elektriciteit?",
  "Gaat het om een vaste of een losse standplaats?").
  answer = "ja" or "nee" ONLY if the question states it explicitly; otherwise "onbekend". Never assume.
- date: ISO date only if the question states one; otherwise null.
Do not answer the question.
```

### C.2 `prompts/findings.md` (AI ②)

```
You help a local economy officer. You receive a case and numbered passages from official sources.
Answer each subquestion in plain Dutch, using ONLY the passages. Return JSON only.

For each finding:
- subquestion: copy it exactly.
- statement: 1–2 plain Dutch sentences answering it.
- citations: at least one {passage_id, quote}. The quote is copied CHARACTER FOR CHARACTER from that passage,
  long enough to contain every number and condition your statement uses.
- condition: if the passage limits the requirement ("enkel", "indien", "in geval van", "bij gebruik van"),
  give {quote: the exact limiting words, fact_id: the id of the matching case fact}. Never drop a condition.
- conflict_with: if another passage says something incompatible, give {passage_id, explanation}.
  Do NOT choose between them.

Rules:
- No calculations. Copy amounts, deadlines and dates exactly as written.
- No general knowledge. If the passages don't answer a subquestion, put it in not_found.
- Don't mention sources that aren't in the passages.
```

# Appendix D · Real text to test against (checked 16/09)

- **Market regulation, art. 13 §3 (p. 5):** "Een onderneming die een standplaats met abonnement wenst te bekomen, dient zich kandidaat te stellen door het invullen van het aanvraagformulier op de website van de gemeente Schoten, na melding van een vacature of op elk ander tijdstip."
- **Art. 13 attachments (p. 6):** "attest(en) van het FAVV waaruit de registratie, erkenning of toelating voor de ambulante activiteit blijkt (enkel van toepassing bij verkoop van voeding) (*)"
- **Market regulation, last article (p. 11):** "Dit reglement treedt in werking op 1 april 2024 en het voorgaand "Bijzonder reglement voor de wekelijkse marktdag" wordt opgeheven."
- **Fee regulation, art. 4.1 (p. 1), as extracted:** "P er marktdag: 6,00 euro" · "H alfjaarlijks: 78,00 euro"
- **Fee regulation, art. 1:** "Met ingang van 1 januari 2026 en voor een periode eindigend op 31 december 2031"
- **FAVV brochure 2026 (p. 7):** "De registratie in de KBO volstaat echter niet."

# Appendix E · Cut list (in this order)

1. Step 14 (voice)
2. Step 11 case-fact difference line
3. Step 12 staged loading text
4. Step 11 entirely
5. Conflict decision UI (keep the badge; approval refuses unresolved conflicts)
6. "Opnieuw opbouwen" on the reply
7. Source event history expand (keep the events in the DB)

**Never cut:** exact quote + "Open bron" · "Niet gebruikt" with reasons · conditions + unknown facts · review actions · approve with blockers · snapshot history view · live PDF upload.
