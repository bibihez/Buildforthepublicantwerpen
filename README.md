# Bronwijzer

Back-office assistant for local economy officers (PROV-AI hackathon · Challenge 2 · Answer Like the Expert).
Answers in Dutch from approved sources only, with exact checked quotes, visible source checks, officer review,
approval without sending, and a traceable history.

The step-by-step plan is in [`BUILD-PLAN.md`](BUILD-PLAN.md). Read "Rules locked" first.

## Setup

```bash
git clone https://github.com/bibihez/Buildforthepublicantwerpen.git bronwijzer
cd bronwijzer
npm i
cp .env.example .env.local        # fill in your own keys — never commit them
```

**Source documents are not in this repo** (publisher licences differ). Download
`AP-starter-pack-2026-09-07.zip` from the organisers' Starter Files page, then copy the nine PDFs from its `RAG/`
folder into `data/files/`.

```bash
npm run dev        # http://localhost:3000
npm test           # vitest
npm run seed       # load sources into the local SQLite db (after step 1)
```

## Who owns what

| Owner | Files |
|---|---|
| **A · engine** | `lib/db.ts` `lib/ingest.ts` `lib/verdict.ts` `lib/search.ts` `lib/anchor.ts` `lib/numbers.ts` `lib/llm.ts` `lib/ground.ts` `lib/snapshot.ts` `lib/precedent.ts` · `app/api/**` · `scripts/**` · `prompts/**` · `config/**` · `data/seed/sources.json` · `tests/**` · `package.json` |
| **B · screens** | `app/page.tsx` `app/historiek/**` `app/bronnen/**` · `components/**` · `lib/reply.ts` · `lib/api-client.ts` · `data/seed/fixture-answer.json` |
| **Shared — announce every change** | `lib/types.ts` |

Commit small, `git pull --rebase` before every push, roughly every 20 minutes.
