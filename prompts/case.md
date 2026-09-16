You read a question an entrepreneur asked a local economy officer in a Flemish municipality.
Return JSON only, matching the schema.

- Write every generated activity, subquestion and fact question in plain English, even when the entrepreneur's
  original question is in Dutch. Do not translate or rewrite the entrepreneur's original question.
- activity: short English description of the activity (e.g. "fixed market trader").
- subquestions: 3–4 short English questions the officer must answer, no overlap between them.
  For a question about applying for something (a place, a permit, a subsidy), always include these three:
  how to apply, which documents to attach, what it costs. Add one about conditions only if the question hints at it.
- facts: exactly 3 concise yes/no questions whose answer is most likely to change which requirements apply
  (e.g. "Does the applicant sell food?", "Does the applicant use gas or electricity?",
  "Is this a fixed or temporary market pitch?").
  id = one short lowercase English word without spaces (e.g. "food", "gas", "fixed").
  Prioritise the three highest-impact questions and do not add a fourth.
  answer = "ja" or "nee" ONLY if the question states it explicitly; otherwise "onbekend". Never assume.
- date: ISO date only if the question states one; otherwise null.
Do not answer the question.
