import { describe, expect, it } from "vitest";
import { sourceDocumentHref } from "./source-link";

describe("sourceDocumentHref", () => {
  it("opens the cited page and carries the normalized exact quote", () => {
    expect(sourceDocumentHref("markt-2024", 5, "Als je  alcoholische\n dranken serveert"))
      .toBe("/source/markt-2024?from=5&to=5&quote=Als%20je%20alcoholische%20dranken%20serveert");
  });

  it("keeps a safe page and URL-encodes the source id", () => {
    expect(sourceDocumentHref("source/id", 0))
      .toBe("/source/source%2Fid?from=1&to=1");
  });
});
