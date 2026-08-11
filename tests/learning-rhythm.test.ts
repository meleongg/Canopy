import { describe, expect, it } from "vitest";
import { buildLearningRhythm } from "@/lib/learning-rhythm";

describe("learning rhythm", () => {
  it("groups recent reviews and completed practice into seven UTC days", () => {
    const now = new Date("2026-08-10T18:00:00Z");
    const rhythm = buildLearningRhythm(
      [new Date("2026-08-04T22:00:00Z"), new Date("2026-08-10T01:00:00Z")],
      [new Date("2026-08-10T15:00:00Z")],
      now,
    );

    expect(rhythm).toHaveLength(7);
    expect(rhythm[0]).toEqual({
      date: "2026-08-04",
      reviewCount: 1,
      practiceCount: 0,
    });
    expect(rhythm.at(-1)).toEqual({
      date: "2026-08-10",
      reviewCount: 1,
      practiceCount: 1,
    });
  });

  it("ignores activity outside the seven-day window", () => {
    const rhythm = buildLearningRhythm(
      [new Date("2026-08-03T23:59:59Z")],
      [],
      new Date("2026-08-10T18:00:00Z"),
    );

    expect(rhythm.every((day) => day.reviewCount === 0)).toBe(true);
  });
});
