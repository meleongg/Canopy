import { describe, expect, it } from "vitest";
import {
  practiceCountFrom,
  practiceSourceFrom,
  practiceSourceLabel,
} from "@/lib/practice";

describe("free practice request options", () => {
  it("accepts supported session sizes and small collection fallbacks", () => {
    expect(practiceCountFrom("2")).toBe(2);
    expect(practiceCountFrom("5")).toBe(5);
    expect(practiceCountFrom(["20", "5"])).toBe(20);
    expect(practiceCountFrom("12")).toBeNull();
    expect(practiceCountFrom(undefined)).toBeNull();
  });

  it("defaults invalid sources to the random round", () => {
    expect(practiceSourceFrom("recent")).toBe("recent");
    expect(practiceSourceFrom("earlier")).toBe("earlier");
    expect(practiceSourceFrom("due")).toBe("random");
    expect(practiceSourceFrom(undefined)).toBe("random");
  });

  it("provides a learner-facing label for every supported source", () => {
    expect(practiceSourceLabel("random")).toBe("Random");
    expect(practiceSourceLabel("recent")).toBe("Recently added");
    expect(practiceSourceLabel("earlier")).toBe("Earlier additions");
  });
});
