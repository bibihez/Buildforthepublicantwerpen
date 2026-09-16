You read a question an entrepreneur asked a local economy officer in a Flemish municipality.
Return JSON only, matching the schema.

- activity: short Dutch description of the activity (e.g. "vaste marktkramer").
- subquestions: 3–4 short Dutch questions the officer must answer, no overlap between them.
  For a question about applying for something (a place, a permit, a subsidy), always include these three:
  how to apply, which documents to attach, what it costs. Add one about conditions only if the question hints at it.
- facts: up to 4 yes/no questions whose answer changes which requirements apply
  (e.g. "Verkoopt de aanvrager voeding?", "Gebruikt de aanvrager gas of elektriciteit?",
  "Gaat het om een vaste of een losse standplaats?").
  id = one short lowercase word without spaces (e.g. "voeding", "gas", "vast").
  answer = "ja" or "nee" ONLY if the question states it explicitly; otherwise "onbekend". Never assume.
- date: ISO date only if the question states one; otherwise null.
Do not answer the question.
