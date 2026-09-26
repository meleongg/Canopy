import { describe, expect, it } from "vitest";
import { displayCardText } from "@/lib/script-variants";

describe("displayCardText", () => {
  const card = {
    languageCode: "zh-CN",
    targetText: "学习",
    simplifiedText: "学习",
    traditionalText: "學習",
  };

  it("switches a matched Chinese card without changing its canonical text", () => {
    expect(displayCardText(card, "simplified")).toBe("学习");
    expect(displayCardText(card, "traditional")).toBe("學習");
  });

  it("keeps unmatched and non-Chinese cards in their original form", () => {
    expect(
      displayCardText(
        { languageCode: "zh-CN", targetText: "手写词" },
        "traditional",
      ),
    ).toBe("手写词");
    expect(
      displayCardText(
        { languageCode: "fr-FR", targetText: "bonjour", traditionalText: "x" },
        "traditional",
      ),
    ).toBe("bonjour");
  });
});
