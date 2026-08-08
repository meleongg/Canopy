import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteCard: vi.fn(),
  patchCard: vi.fn(),
  requireApiAuth: vi.fn(),
}));

vi.mock("@/lib/cards", () => ({
  deleteCard: mocks.deleteCard,
  patchCard: mocks.patchCard,
}));
vi.mock("@/lib/session", () => ({ requireApiAuth: mocks.requireApiAuth }));

const authenticatedUser = {
  session: { user: { id: "learner-1" } },
  response: null,
};
const context = { params: Promise.resolve({ cardId: crypto.randomUUID() }) };

describe("card lifecycle API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireApiAuth.mockResolvedValue(authenticatedUser);
    mocks.patchCard.mockResolvedValue({ id: "card-1" });
    mocks.deleteCard.mockResolvedValue({ id: "card-1" });
  });

  it("scopes archive updates to the authenticated user", async () => {
    const { PATCH } = await import("@/app/api/cards/[cardId]/route");
    const response = await PATCH(
      new Request("http://test/api/cards/card-1", {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mocks.patchCard).toHaveBeenCalledWith(
      "learner-1",
      expect.any(String),
      { archived: true },
    );
  });

  it("rejects malformed overrides without mutating a card", async () => {
    const { PATCH } = await import("@/app/api/cards/[cardId]/route");
    const response = await PATCH(
      new Request("http://test/api/cards/card-1", {
        method: "PATCH",
        body: JSON.stringify({ definitions: [] }),
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(mocks.patchCard).not.toHaveBeenCalled();
  });

  it("does not claim deletion when the card belongs to another user", async () => {
    mocks.deleteCard.mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/cards/[cardId]/route");
    const response = await DELETE(
      new Request("http://test/api/cards/card-1", { method: "DELETE" }),
      context,
    );

    expect(response.status).toBe(404);
    expect(mocks.deleteCard).toHaveBeenCalledWith(
      "learner-1",
      expect.any(String),
    );
  });
});
