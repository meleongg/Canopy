import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDictionaryPracticeRound: vi.fn(),
  requireApiAuth: vi.fn(),
}));

vi.mock("@/lib/dictionary", () => ({
  dictionaryPracticeExercises: ["pinyin", "script"],
  getDictionaryPracticeRound: mocks.getDictionaryPracticeRound,
}));
vi.mock("@/lib/session", () => ({ requireApiAuth: mocks.requireApiAuth }));

describe("dictionary practice API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireApiAuth.mockResolvedValue({
      session: { user: { id: "learner-1" } },
      response: null,
    });
  });

  it("returns an authenticated practice round", async () => {
    const round = { exercise: "pinyin", entry: { simplified: "学习" } };
    mocks.getDictionaryPracticeRound.mockResolvedValue(round);
    const { GET } = await import("@/app/api/dictionary/practice/route");
    const response = await GET(
      new Request("http://test/api/dictionary/practice?exercise=pinyin"),
    );

    expect(await response.json()).toEqual({ round });
    expect(mocks.getDictionaryPracticeRound).toHaveBeenCalledWith(
      "learner-1",
      "pinyin",
    );
  });

  it("rejects an unsupported exercise before querying the dictionary", async () => {
    const { GET } = await import("@/app/api/dictionary/practice/route");
    const response = await GET(
      new Request("http://test/api/dictionary/practice?exercise=meaning"),
    );

    expect(response.status).toBe(400);
    expect(mocks.getDictionaryPracticeRound).not.toHaveBeenCalled();
  });
});
