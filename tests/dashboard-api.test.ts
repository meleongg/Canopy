import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDashboardData: vi.fn(),
  getDashboardLearningRhythm: vi.fn(),
  requireApiAuth: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
  getDashboardData: mocks.getDashboardData,
  getDashboardLearningRhythm: mocks.getDashboardLearningRhythm,
}));
vi.mock("@/lib/serialization", () => ({
  serializeDashboardCards: (cards: unknown) => cards,
}));
vi.mock("@/lib/session", () => ({ requireApiAuth: mocks.requireApiAuth }));

describe("dashboard API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireApiAuth.mockResolvedValue({
      session: { user: { id: "learner-1" } },
      response: null,
    });
  });

  it("returns the recent learning rhythm with the dashboard data", async () => {
    const cards = [
      {
        id: "card-1",
        nextReviewAt: "2099-10-18T00:00:00Z",
        aiExampleContexts: [],
      },
    ];
    const learningRhythm = [
      { date: "2026-10-18", reviewCount: 1, practiceCount: 2 },
    ];
    mocks.getDashboardData.mockResolvedValue(cards);
    mocks.getDashboardLearningRhythm.mockResolvedValue(learningRhythm);

    const { GET } = await import("@/app/api/dashboard/route");
    const response = await GET();

    expect(mocks.getDashboardData).toHaveBeenCalledWith("learner-1");
    expect(mocks.getDashboardLearningRhythm).toHaveBeenCalledWith("learner-1");
    expect(await response.json()).toEqual({
      cards,
      learningRhythm,
      stats: { totalCards: 1, dueCount: 0, contextCount: 0 },
    });
  });
});
