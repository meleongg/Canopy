import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  importVocabularyEntries: vi.fn(),
  parseVocabularyLog: vi.fn(),
  requireApiAuth: vi.fn(),
  reviewCard: vi.fn(),
}));

vi.mock("@/db/env", () => ({ hasDatabaseEnv: () => true }));
vi.mock("@/lib/cards", () => ({
  importVocabularyEntries: mocks.importVocabularyEntries,
  reviewCard: mocks.reviewCard,
}));
vi.mock("@/lib/ingestion", () => ({ parseVocabularyLog: mocks.parseVocabularyLog }));
vi.mock("@/lib/session", () => ({ requireApiAuth: mocks.requireApiAuth }));

const authenticatedUser = {
  session: { user: { id: "learner-1" } },
  response: null,
};

describe("card API contracts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireApiAuth.mockResolvedValue(authenticatedUser);
  });

  it("imports parsed rows for the authenticated user", async () => {
    mocks.parseVocabularyLog.mockResolvedValue([{ targetText: "会议" }]);
    mocks.importVocabularyEntries.mockResolvedValue({
      importedCount: 1,
      updatedCount: 0,
    });
    const { POST } = await import("@/app/api/cards/import/route");

    const response = await POST(
      new Request("http://test/api/cards/import", {
        method: "POST",
        body: JSON.stringify({ rawText: "会议\thui4yi4\tmeeting", languageCode: "zh-CN" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ importedCount: 1, updatedCount: 0 });
    expect(mocks.importVocabularyEntries).toHaveBeenCalledWith("learner-1", [
      { targetText: "会议" },
    ]);
  });

  it("rejects invalid review ratings before touching persistence", async () => {
    const { POST } = await import("@/app/api/cards/review/route");
    const response = await POST(
      new Request("http://test/api/cards/review", {
        method: "POST",
        body: JSON.stringify({ cardId: crypto.randomUUID(), rating: 1 }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.reviewCard).not.toHaveBeenCalled();
  });

  it("reports a failed import without claiming partial success", async () => {
    mocks.parseVocabularyLog.mockResolvedValue([{ targetText: "会议" }]);
    mocks.importVocabularyEntries.mockRejectedValueOnce(
      new Error("database write failed"),
    );
    const { POST } = await import("@/app/api/cards/import/route");

    const response = await POST(
      new Request("http://test/api/cards/import", {
        method: "POST",
        body: JSON.stringify({
          rawText: "会议\thui4yi4\tmeeting",
          languageCode: "zh-CN",
        }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Import failed. No vocabulary changes were saved.",
    });
  });

  it("does not report a review for a card outside the learner's collection", async () => {
    mocks.reviewCard.mockResolvedValue(null);
    const { POST } = await import("@/app/api/cards/review/route");
    const response = await POST(
      new Request("http://test/api/cards/review", {
        method: "POST",
        body: JSON.stringify({ cardId: crypto.randomUUID(), rating: 4 }),
      }),
    );

    expect(response.status).toBe(404);
    expect(mocks.reviewCard).toHaveBeenCalledWith("learner-1", expect.any(String), 4);
  });
});
