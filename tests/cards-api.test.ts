import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCollectionPage: vi.fn(),
  importVocabularyEntries: vi.fn(),
  requireApiAuth: vi.fn(),
  reviewCard: vi.fn(),
}));

vi.mock("@/db/env", () => ({ hasDatabaseEnv: () => true }));
vi.mock("@/lib/cards", () => ({
  importVocabularyEntries: mocks.importVocabularyEntries,
  reviewCard: mocks.reviewCard,
}));
vi.mock("@/lib/data", () => ({
  getCollectionPage: mocks.getCollectionPage,
  getDashboardData: vi.fn(),
}));
vi.mock("@/lib/serialization", () => ({
  serializeDashboardCards: (cards: unknown) => cards,
}));
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
    expect(mocks.reviewCard).toHaveBeenCalledWith(
      "learner-1",
      expect.any(String),
      4,
    );
  });

  it("returns an owner-scoped collection page when pagination is requested", async () => {
    mocks.getCollectionPage.mockResolvedValue({
      cards: [{ id: "card-1" }],
      total: 21,
    });
    const { GET } = await import("@/app/api/cards/route");
    const response = await GET(
      new Request("http://test/api/cards?scope=archived&query=tea&page=2"),
    );

    expect(mocks.getCollectionPage).toHaveBeenCalledWith("learner-1", {
      scope: "archived",
      query: "tea",
      page: 2,
      pageSize: 20,
    });
    expect(await response.json()).toEqual({
      cards: [{ id: "card-1" }],
      total: 21,
      page: 2,
      pageSize: 20,
    });
  });
});
