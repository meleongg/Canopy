import { describe, expect, it } from "vitest";
import { shouldHighlightFocusedDictionaryOccurrence } from "@/lib/dictionary-help";

describe("focused dictionary help", () => {
  it("keeps selected vocabulary highlighted at every occurrence", () => {
    expect(
      shouldHighlightFocusedDictionaryOccurrence({
        isSeed: true,
        occurrence: 3,
      }),
    ).toBe(true);
  });

  it("limits discovered phrases to their first helpful occurrence", () => {
    expect(
      shouldHighlightFocusedDictionaryOccurrence({
        isSeed: false,
        occurrence: 0,
      }),
    ).toBe(true);
    expect(
      shouldHighlightFocusedDictionaryOccurrence({
        isSeed: false,
        occurrence: 1,
      }),
    ).toBe(false);
  });

});
