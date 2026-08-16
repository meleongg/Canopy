import { describe, expect, it } from "vitest";
import { parseCcCedictLine } from "@/lib/cc-cedict";

describe("CC-CEDICT parsing", () => {
  it("parses the published V1 entry form into lookup-ready fields", () => {
    expect(
      parseCcCedictLine(
        "福利 福利 [fu2 li4] /welfare/well-being/material benefit/",
      ),
    ).toEqual({
      traditional: "福利",
      simplified: "福利",
      pinyin: "fu2 li4",
      definitions: ["welfare", "well-being", "material benefit"],
    });
  });

  it("accepts the V2 double-bracket reading form", () => {
    expect(
      parseCcCedictLine("算 算 [[suan4]] /to calculate/to figure out/"),
    ).toEqual({
      traditional: "算",
      simplified: "算",
      pinyin: "suan4",
      definitions: ["to calculate", "to figure out"],
    });
  });

  it("skips comments and malformed rows without inventing a definition", () => {
    expect(parseCcCedictLine("# CC-CEDICT export")).toBeNull();
    expect(parseCcCedictLine("福利 福利 [fu2 li4]")).toBeNull();
  });
});
