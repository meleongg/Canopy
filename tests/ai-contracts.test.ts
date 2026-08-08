import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceAiRateLimit: vi.fn(),
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
vi.mock("@/lib/rate-limit", () => ({
  enforceAiRateLimit: mocks.enforceAiRateLimit,
}));

describe("AI route guardrails", () => {
  beforeEach(() => {
    mocks.requireApiAuth.mockResolvedValue({
      session: { user: { id: "learner-1" } },
      response: null,
    });
    mocks.enforceAiRateLimit.mockResolvedValue({
      allowed: true,
      retryAfter: 0,
      reason: "",
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

  it("stops dialogue after the third learner turn", async () => {
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
            { role: "user", content: "six" },
          ],
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("three learner turns");
  });

  it("rejects an AI request before moderation when the quota is exhausted", async () => {
    mocks.enforceAiRateLimit.mockResolvedValue({
      allowed: false,
      retryAfter: 60,
      reason: "AI practice limit reached. Please return later.",
    });
    mocks.getCardSeeds.mockResolvedValue(
      Array.from({ length: 3 }, () => ({
        id: crypto.randomUUID(),
        languageCode: "zh-CN",
        targetText: "会议",
        phoneticReading: ["huì", "yì"],
        definitions: ["meeting"],
      })),
    );
    const { POST } = await import("@/app/api/generate-sandbox/route");
    const response = await POST(
      new Request("http://test/api/generate-sandbox", {
        method: "POST",
        body: JSON.stringify({
          cardIds: Array.from({ length: 3 }, () => crypto.randomUUID()),
        }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });
});
