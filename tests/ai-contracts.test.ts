import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCardSeeds: vi.fn(),
  requireApiAuth: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireApiAuth: mocks.requireApiAuth }));
vi.mock("@/db/env", () => ({ hasOpenAIEnv: () => true }));
vi.mock("@/lib/cards", () => ({ getCardSeeds: mocks.getCardSeeds }));
vi.mock("@/lib/openai", () => ({
  GARDEN_BOUNDARY_MESSAGE: "blocked",
  moderateText: vi.fn(),
}));
describe("AI route guardrails", () => {
  beforeEach(() => {
    mocks.requireApiAuth.mockResolvedValue({
      session: { user: { id: "learner-1" } },
      response: null,
    });
    mocks.getCardSeeds.mockResolvedValue([
      {
        id: crypto.randomUUID(),
        languageCode: "zh-CN",
        targetText: "会议",
        phoneticReading: ["huì", "yì"],
        definitions: ["meeting"],
      },
    ]);
  });

  it("rejects a story request containing more than seven cards", async () => {
    const { POST } = await import("@/app/api/generate-sandbox/route");
    const response = await POST(
      new Request("http://test/api/generate-sandbox", {
        method: "POST",
        body: JSON.stringify({
          cardIds: Array.from({ length: 8 }, () => crypto.randomUUID()),
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("stops dialogue after the fifth learner turn", async () => {
    const { POST } = await import("@/app/api/generate-chat/route");
    const response = await POST(
      new Request("http://test/api/generate-chat", {
        method: "POST",
        body: JSON.stringify({
          cardIds: [crypto.randomUUID()],
          persona: "bramble",
          scenario: "a market",
          messageHistory: [
            { role: "user", content: "one" },
            { role: "assistant", content: "two" },
            { role: "user", content: "three" },
            { role: "assistant", content: "four" },
            { role: "user", content: "five" },
            { role: "assistant", content: "six" },
            { role: "user", content: "seven" },
            { role: "assistant", content: "eight" },
            { role: "user", content: "nine" },
            { role: "user", content: "ten" },
          ],
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("five learner turns");
  });
});
