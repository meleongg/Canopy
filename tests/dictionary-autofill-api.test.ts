import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  matchDictionaryForCardAutofill: vi.fn(),
  requireApiAuth: vi.fn(),
}));

vi.mock("@/lib/card-autofill", () => ({
  matchDictionaryForCardAutofill: mocks.matchDictionaryForCardAutofill,
}));
vi.mock("@/lib/session", () => ({ requireApiAuth: mocks.requireApiAuth }));

describe("dictionary autofill API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireApiAuth.mockResolvedValue({
      session: { user: { id: "learner-1" } },
      response: null,
    });
  });

  it("rejects a blank query before matching", async () => {
    const { POST } = await import("@/app/api/dictionary/autofill/route");
    const response = await POST(
      new Request("http://test/api/dictionary/autofill", {
        method: "POST",
        body: JSON.stringify({ query: "  " }),
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.matchDictionaryForCardAutofill).not.toHaveBeenCalled();
  });

  it("returns ranked autofill matches for the learner", async () => {
    mocks.matchDictionaryForCardAutofill.mockResolvedValue({
      query: "机场",
      matches: [{ entryId: "1", simplified: "机场", matchKind: "exact" }],
      exactMatch: true,
      suggestSplit: false,
      helpMessage: null,
    });
    const { POST } = await import("@/app/api/dictionary/autofill/route");
    const response = await POST(
      new Request("http://test/api/dictionary/autofill", {
        method: "POST",
        body: JSON.stringify({ query: "机场" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.matchDictionaryForCardAutofill).toHaveBeenCalledWith(
      "learner-1",
      "机场",
    );
    await expect(response.json()).resolves.toMatchObject({
      exactMatch: true,
      matches: [{ simplified: "机场" }],
    });
  });
});
