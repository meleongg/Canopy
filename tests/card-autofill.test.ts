import { describe, expect, it } from "vitest";
import {
  countHanCharacters,
  draftFieldsFromDictionaryEntry,
  headwordLengthMessage,
  MAX_HEADWORD_HAN_CHARS,
} from "@/lib/card-autofill";

describe("card autofill helpers", () => {
  it("counts Han characters for the headword cap", () => {
    expect(countHanCharacters("宵夜")).toBe(2);
    expect(countHanCharacters("airport")).toBe(0);
    expect(countHanCharacters("我的车坏了啊啊")).toBe(7);
  });

  it("rejects headwords over the Han character cap", () => {
    const tooLong = "一二三四五六七八九";
    expect(countHanCharacters(tooLong)).toBeGreaterThan(MAX_HEADWORD_HAN_CHARS);
    expect(headwordLengthMessage(tooLong)).toContain(
      String(MAX_HEADWORD_HAN_CHARS),
    );
    expect(headwordLengthMessage("宵夜")).toBeNull();
  });

  it("maps a dictionary entry into editable draft fields", () => {
    expect(
      draftFieldsFromDictionaryEntry({
        entryId: "entry-1",
        simplified: "机场",
        traditional: "機場",
        pinyin: "ji1 chang3",
        definitions: ["airport", "airfield"],
      }),
    ).toMatchObject({
      targetText: "机场",
      dictionaryEntryId: "entry-1",
      definitions: "airport; airfield",
    });
  });
});
