import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query-keys";

describe("query keys", () => {
  it("keeps collection pages distinct while sharing an invalidation root", () => {
    expect(queryKeys.collectionRoot).toEqual(["collection"]);
    expect(queryKeys.collection("active", "tea", 1)).toEqual([
      "collection",
      "active",
      "tea",
      1,
    ]);
    expect(queryKeys.collection("archived", "tea", 1)).not.toEqual(
      queryKeys.collection("active", "tea", 1),
    );
  });

  it("separates dictionary history, searches, and discoveries", () => {
    expect(queryKeys.dictionaryHistory).toEqual(["dictionaryHistory"]);
    expect(queryKeys.dictionarySearchRoot).toEqual(["dictionarySearch"]);
    expect(queryKeys.dictionarySearch("pinyin", "fu li")).toEqual([
      "dictionarySearch",
      "pinyin",
      "fu li",
    ]);
    expect(queryKeys.dictionaryDiscoveries).toEqual([
      "dictionaryDiscoveries",
    ]);
  });
});
