import { describe, expect, it } from "vitest";
import { findQuoteTextRange } from "./source-highlight";

describe("findQuoteTextRange", () => {
  it("maps an exact quote inside one PDF text item", () => {
    expect(findQuoteTextRange(["Before exact Dutch quote after"], "exact Dutch quote"))
      .toEqual({ startItem: 0, startOffset: 7, endItem: 0, endOffset: 24 });
  });

  it("maps a quote split across text items and whitespace", () => {
    expect(findQuoteTextRange(["Als je alcoholische", " dranken\nserveert"], "Als je alcoholische dranken serveert"))
      .toEqual({ startItem: 0, startOffset: 0, endItem: 1, endOffset: 17 });
  });

  it("normalizes PDF quote and dash variants", () => {
    expect(findQuoteTextRange(["‘aanvraag’ – verplicht"], "'aanvraag' - verplicht")).not.toBeNull();
  });

  it("returns null when the quote is absent", () => {
    expect(findQuoteTextRange(["Different source text"], "required passage")).toBeNull();
  });
});
