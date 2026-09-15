import { describe, expect, it } from "vitest";
import {
  createDictionaryPracticeRound,
  type DictionarySearchResult,
} from "@/lib/dictionary";

const entries: DictionarySearchResult[] = [
  {
    entryId: "1",
    simplified: "学习",
    traditional: "學習",
    pinyin: "xué xí",
    definitions: ["to study"],
  },
  {
    entryId: "2",
    simplified: "会议",
    traditional: "會議",
    pinyin: "huì yì",
    definitions: ["meeting"],
  },
  {
    entryId: "3",
    simplified: "图书馆",
    traditional: "圖書館",
    pinyin: "tú shū guǎn",
    definitions: ["library"],
  },
  {
    entryId: "4",
    simplified: "机场",
    traditional: "機場",
    pinyin: "jī chǎng",
    definitions: ["airport"],
  },
];

describe("Explore Chinese practice rounds", () => {
  it("builds a four-choice pinyin match", () => {
    const round = createDictionaryPracticeRound("pinyin", entries, () => 0.4);

    expect(round).not.toBeNull();
    expect(round?.options).toHaveLength(4);
    expect(round?.options.map((option) => option.id)).toContain(
      round?.answerId,
    );
    expect(
      round?.options.find((option) => option.id === round?.answerId)?.text,
    ).toBe(round?.entry.pinyin);
  });

  it("builds a Traditional recognition round only from differing forms", () => {
    const round = createDictionaryPracticeRound("script", entries, () => 0.4);

    expect(round).not.toBeNull();
    expect(round?.entry.simplified).not.toBe(round?.entry.traditional);
    expect(
      round?.options.find((option) => option.id === round?.answerId)?.text,
    ).toBe(round?.entry.traditional);
  });

  it("does not create a round without three distinct distractors", () => {
    expect(
      createDictionaryPracticeRound("pinyin", entries.slice(0, 3)),
    ).toBeNull();
  });
});
