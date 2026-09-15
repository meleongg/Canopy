import { describe, expect, it } from "vitest";
import {
  displayPhoneticReading,
  normalizeSuppliedReading,
} from "@/lib/phonetics";

describe("normalizeSuppliedReading", () => {
  it("renders numbered Mandarin tones with neutral tones unmarked", () => {
    expect(normalizeSuppliedReading("gu4 shi5 xiao3 shi2 hou5")).toEqual([
      "gù",
      "shi",
      "xiǎo",
      "shí",
      "hou",
    ]);
  });

  it("uses lowercase Chinese readings without changing other languages", () => {
    expect(displayPhoneticReading("zh-CN", ["Xī"])).toBe("xī");
    expect(displayPhoneticReading("fr-FR", ["Paris"])).toBe("Paris");
  });
});
