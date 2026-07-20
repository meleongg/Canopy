import { describe, expect, it } from "vitest";
import { parseVocabularyLog } from "@/lib/ingestion";
import { calculateSm2 } from "@/lib/srs";

describe("vocabulary ingestion", () => {
  it("skips malformed rows and sanitizes raw parsing syntax", async () => {
    const entries = await parseVocabularyLog(
      "# exported from a dictionary\n会议\thui4yi4\t[noun] meeting; conference\n\u0000\n\tmissing target\n",
      "zh-CN",
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      targetText: "会议",
      definitions: ["meeting", "conference"],
    });
  });

  it("deduplicates repeated target words within one import", async () => {
    const entries = await parseVocabularyLog(
      "福利\tbenefit\n福利\twelfare",
      "zh-CN",
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]?.definitions).toEqual(["welfare"]);
  });
});

describe("SM-2 scheduling", () => {
  it("resets a hard review and schedules a successful first review", () => {
    const hard = calculateSm2({ interval: 6, repetition: 2, easiness: 250 }, 2);
    const firstSuccess = calculateSm2(
      { interval: 0, repetition: 0, easiness: 250 },
      4,
    );

    expect(hard).toMatchObject({ interval: 1, repetition: 0 });
    expect(firstSuccess).toMatchObject({ interval: 1, repetition: 1 });
  });
});
