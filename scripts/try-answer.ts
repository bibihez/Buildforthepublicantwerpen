// Runs the full pipeline once without the web server. Use a copy of the db:
//   BRONWIJZER_DB=/tmp/x.db npx tsx --env-file=.env.local scripts/try-answer.ts "vraag"
import { createAnswer } from '../lib/pipeline';

const question = process.argv[2] ?? 'Ik wil een vaste standplaats op de markt in Schoten. Hoe dien ik een aanvraag in?';
createAnswer(question).then((a) => {
  console.log(JSON.stringify({ subquestions: a.casus.subquestions, facts: a.casus.facts.map((f) => `${f.id}=${f.answer}`) }, null, 1));
  for (const f of a.findings) console.log(`${f.status} | ${f.statement} | cond=${f.condition?.fact_id ?? ''} ${f.status_reasons.join('; ')}`);
  console.log('not found:', a.not_found.map((n) => n.subquestion));
  console.log('findings:', a.findings.length);
});
