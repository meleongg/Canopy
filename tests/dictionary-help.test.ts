import { describe, expect, it } from "vitest";
import { shouldHighlightDictionaryOccurrence } from "@/lib/dictionary-help";

describe("dictionary highlight density", () => {
  it("keeps selected vocabulary highlighted at every occurrence", () => {
    expect(
      shouldHighlightDictionaryOccurrence({
        isSeed: true,
        density: "helpful",
        occurrence: 3,
      }),
    ).toBe(true);
  });

  it("limits discovered phrases to their first helpful occurrence", () => {
    expect(
      shouldHighlightDictionaryOccurrence({
        isSeed: false,
        density: "helpful",
        occurrence: 0,
      }),
    ).toBe(true);
    expect(
      shouldHighlightDictionaryOccurrence({
        isSeed: false,
        density: "helpful",
        occurrence: 1,
      }),
    ).toBe(false);
  });

  it("shows every discovered phrase when all matches is selected", () => {
    expect(
      shouldHighlightDictionaryOccurrence({
        isSeed: false,
        density: "all",
        occurrence: 3,
      }),
    ).toBe(true);
  });
});
