import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lookupActiveDictionary: vi.fn(),
  requireApiAuth: vi.fn(),
}));

vi.mock("@/lib/dictionary", () => ({
  lookupActiveDictionary: mocks.lookupActiveDictionary,
}));
vi.mock("@/lib/session", () => ({ requireApiAuth: mocks.requireApiAuth }));

describe("dictionary lookup API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireApiAuth.mockResolvedValue({
      session: { user: { id: "learner-1" } },
      response: null,
    });
  });

  it("returns active dictionary matches scoped to the learner", async () => {
    mocks.lookupActiveDictionary.mockResolvedValue([{ text: "福利" }]);
    const { POST } = await import("@/app/api/dictionary/lookup/route");
    const response = await POST(
      new Request("http://test/api/dictionary/lookup", {
        method: "POST",
        body: JSON.stringify({ text: "福利很重要。" }),
      }),
    );

    expect(await response.json()).toEqual({ entries: [{ text: "福利" }] });
    expect(mocks.lookupActiveDictionary).toHaveBeenCalledWith(
      "learner-1",
      "福利很重要。",
    );
  });

  it("rejects an empty lookup without querying the dictionary", async () => {
    const { POST } = await import("@/app/api/dictionary/lookup/route");
    const response = await POST(
      new Request("http://test/api/dictionary/lookup", {
        method: "POST",
        body: JSON.stringify({ text: " " }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.lookupActiveDictionary).not.toHaveBeenCalled();
  });
});
