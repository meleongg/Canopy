import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
  getSql: () => ({ transaction: mocks.transaction }),
}));

import { importVocabularyEntries } from "@/lib/cards";

const entry = {
  languageCode: "zh-CN",
  targetText: "会议",
  phoneticReading: ["huì", "yì"],
  definitions: ["meeting"],
};

describe("atomic vocabulary imports", () => {
  it("submits every entry as one Neon transaction and reports card upserts", async () => {
    mocks.transaction.mockImplementation(async (buildQueries) => {
      buildQueries(() => ({}));
      return [[{ inserted: true }], [{ inserted: false }]];
    });

    await expect(
      importVocabularyEntries("learner-1", [entry, { ...entry, targetText: "附近" }]),
    ).resolves.toEqual({ importedCount: 1, updatedCount: 1 });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("surfaces a failed transaction without reporting a partial import", async () => {
    mocks.transaction.mockRejectedValueOnce(new Error("database write failed"));

    await expect(importVocabularyEntries("learner-1", [entry])).rejects.toThrow(
      "database write failed",
    );
  });
});
