import { describe, expect, it } from "vitest";
import {
  createDictionaryPracticeRound,
  createDictionaryScriptPracticeRound,
  dictionaryEntryAsCard,
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
    simplified: "图书",
    traditional: "圖書",
    pinyin: "tú shū",
    definitions: ["book"],
  },
  {
    entryId: "4",
    simplified: "机场",
    traditional: "機場",
    pinyin: "jī chǎng",
    definitions: ["airport"],
  },
];

const toneEntries: DictionarySearchResult[] = [
  {
    entryId: "1",
    simplified: "不行",
    traditional: "不行",
    pinyin: "bù xíng",
    definitions: ["not okay"],
  },
  {
    entryId: "2",
    simplified: "不幸",
    traditional: "不幸",
    pinyin: "bú xìng",
    definitions: ["unfortunate"],
  },
  {
    entryId: "3",
    simplified: "步行",
    traditional: "步行",
    pinyin: "bǔ xíng",
    definitions: ["to walk"],
  },
  {
    entryId: "4",
    simplified: "步兴",
    traditional: "步興",
    pinyin: "bǔ xìng",
    definitions: ["example"],
  },
];

describe("Explore Chinese practice rounds", () => {
  it("builds a four-choice pinyin match", () => {
    const round = createDictionaryPracticeRound(
      "pinyin",
      toneEntries,
      () => 0.4,
    );

    expect(round).not.toBeNull();
    expect(round?.options).toHaveLength(4);
    expect(round?.options.map((option) => option.id)).toContain(
      round?.answerId,
    );
    expect(
      round?.options.find((option) => option.id === round?.answerId)?.text,
    ).toBe(round?.entry.pinyin);
    expect(round?.options.map((option) => option.text)).toEqual(
      expect.arrayContaining(["bù xíng", "bú xìng", "bǔ xíng", "bǔ xìng"]),
    );
  });

  it("builds a four-pair Traditional character match", () => {
    const round = createDictionaryScriptPracticeRound(entries, () => 0.4);

    expect(round).not.toBeNull();
    expect(round?.pairs).toHaveLength(4);
    expect(round?.pairs.map((pair) => pair.traditional)).toEqual(
      expect.arrayContaining(round?.options.map((option) => option.text) ?? []),
    );
  });

  it("does not create a tone round without matching base readings", () => {
    expect(createDictionaryPracticeRound("pinyin", entries)).toBeNull();
  });

  it("normalizes dictionary pinyin before adding a card", () => {
    expect(
      dictionaryEntryAsCard({
        entryId: "1",
        simplified: "奚",
        traditional: "奚",
        pinyin: "Xī",
        definitions: ["surname Xi"],
      }).phoneticReading,
    ).toEqual(["xī"]);
  });
});
