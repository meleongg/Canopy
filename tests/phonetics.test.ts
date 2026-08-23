import { describe, expect, it } from "vitest";
import { normalizeSuppliedReading } from "@/lib/phonetics";

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
});
