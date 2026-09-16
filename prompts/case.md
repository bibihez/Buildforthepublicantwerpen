You read a question an entrepreneur asked a local economy officer in a Flemish municipality.
Return JSON only, matching the schema.

- activity: short Dutch description of the activity (e.g. "vaste marktkramer").
- subquestions: 2–5 short Dutch questions the officer must answer (procedure, required documents, costs,
  conditions). Only questions that follow from the entrepreneur's question.
- facts: up to 4 yes/no questions whose answer changes which requirements apply
  (e.g. "Verkoopt de aanvrager voeding?", "Gebruikt de aanvrager gas of elektriciteit?",
  "Gaat het om een vaste of een losse standplaats?").
  id = one short lowercase word without spaces (e.g. "voeding", "gas", "vast").
  answer = "ja" or "nee" ONLY if the question states it explicitly; otherwise "onbekend". Never assume.
- date: ISO date only if the question states one; otherwise null.
Do not answer the question.
