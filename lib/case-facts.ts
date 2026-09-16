import type { Casus, Fact } from "./types";

export const MAX_CASE_FACTS = 3;

/** The officer confirms one stable fact set before research; later source analysis cannot expand it. */
export function initialCaseFacts(facts: Fact[]): Fact[] {
  return facts.slice(0, MAX_CASE_FACTS);
}

export function lockCaseFacts(casus: Casus): Casus {
  return { ...casus, facts: initialCaseFacts(casus.facts) };
}
