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

  it("accepts UTF-8 Pleco text exports and ignores category headers", async () => {
    const entries = await parseVocabularyLog(
      "// Test\n福利\tfu2li4\tnoun material benefit; well-being; welfare 福利分房 fúlì fēnfáng welfare-oriented public housing distribution system 为人民谋福利 wèi rénmín móu fúlì work for the well-being of the people verb literary better one's living conditions 发展地方经济, 以福利人民 Fāzhǎn dìfang jīngjì, yǐ fúlì rénmín better people’s living conditions by developing local economy\n疤痕\tba1hen2\tnoun scar 疤痕累累的手 bāhén lěilěi de shǒu scar-covered hands 伤口会留下难看的疤痕。 shāngkǒu huì liúxià nánkàn debāhén. The cut will leave a nasty scar.",
      "zh-CN",
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      targetText: "福利",
      phoneticReading: ["fú", "lì"],
      definitions: [
        "material benefit",
        "well-being",
        "welfare",
        "better one's living conditions",
      ],
      exampleContexts: [
        expect.objectContaining({
          sentence: "福利分房",
          phonetic: "fúlì fēnfáng",
          translation: "welfare-oriented public housing distribution system",
        }),
        expect.objectContaining({
          sentence: "为人民谋福利",
          phonetic: "wèi rénmín móu fúlì",
          translation: "work for the well-being of the people",
        }),
        expect.objectContaining({
          sentence: "发展地方经济, 以福利人民",
          phonetic: "Fāzhǎn dìfang jīngjì, yǐ fúlì rénmín",
          translation:
            "better people’s living conditions by developing local economy",
        }),
      ],
    });
    expect(entries[1]).toMatchObject({
      targetText: "疤痕",
      phoneticReading: ["bā", "hén"],
      definitions: ["scar"],
      exampleContexts: [
        expect.objectContaining({
          sentence: "疤痕累累的手",
          phonetic: "bāhén lěilěi de shǒu",
          translation: "scar-covered hands",
        }),
        expect.objectContaining({
          sentence: "伤口会留下难看的疤痕。",
          phonetic: "shāngkǒu huì liúxià nánkàn debāhén.",
          translation: "The cut will leave a nasty scar.",
        }),
      ],
    });
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
