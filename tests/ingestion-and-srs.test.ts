import { describe, expect, it } from "vitest";
import { buildManualVocabularyEntry } from "@/lib/ingestion";
import { calculateSm2 } from "@/lib/srs";

describe("manual vocabulary entry", () => {
  it("builds a Mandarin card with definitions and reading tokens", async () => {
    const entry = await buildManualVocabularyEntry({
      languageCode: "zh-CN",
      targetText: "会议",
      phoneticReading: "hui4yi4",
      definitions: "meeting; conference",
    });

    expect(entry).toMatchObject({
      languageCode: "zh-CN",
      targetText: "会议",
      definitions: ["meeting", "conference"],
    });
    expect(entry?.phoneticReading.length).toBeGreaterThan(0);
  });

  it("returns null when the word or definitions are missing", async () => {
    await expect(
      buildManualVocabularyEntry({
        languageCode: "zh-CN",
        targetText: "会议",
        definitions: "   ",
      }),
    ).resolves.toBeNull();
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
