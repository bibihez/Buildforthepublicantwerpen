import { describe, expect, it } from "vitest";
import { initialCaseFacts, lockCaseFacts, MAX_CASE_FACTS } from "./case-facts";
import type { Casus, Fact } from "./types";

const facts: Fact[] = Array.from({ length: 5 }, (_, index) => ({
  id: `fact-${index + 1}`,
  question: `Question ${index + 1}?`,
  answer: "onbekend",
  set_by: "ai",
}));

describe("case fact lock", () => {
  it("keeps only the first three facts in their original order", () => {
    expect(MAX_CASE_FACTS).toBe(3);
    expect(initialCaseFacts(facts).map((fact) => fact.id)).toEqual(["fact-1", "fact-2", "fact-3"]);
  });

  it("preserves officer edits while preventing later facts from entering the case", () => {
    const casus: Casus = {
      question: "Question",
      municipality: "Schoten",
      date: "2026-09-16",
      activity: "Activity",
      subquestions: ["How?"],
      facts: facts.map((fact, index) => index === 1 ? { ...fact, answer: "ja", set_by: "officer" } : fact),
    };

    const locked = lockCaseFacts(casus);
    expect(locked.facts).toHaveLength(3);
    expect(locked.facts[1]).toMatchObject({ id: "fact-2", answer: "ja", set_by: "officer" });
  });
});
