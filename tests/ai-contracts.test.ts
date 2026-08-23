import { beforeEach, describe, expect, it, vi } from "vitest";
import { UNDERSTORY_LEARNER_TURN_LIMIT } from "@/lib/understory";

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

  it("stops dialogue after the configured learner turn limit", async () => {
    const { POST } = await import("@/app/api/generate-chat/route");
    const response = await POST(
      new Request("http://test/api/generate-chat", {
        method: "POST",
        body: JSON.stringify({
          cardIds: [crypto.randomUUID()],
          persona: "bramble",
          scenario: "a market",
          messageHistory: Array.from(
            { length: UNDERSTORY_LEARNER_TURN_LIMIT + 1 },
            (_, index) => ({ role: "user" as const, content: `turn ${index}` }),
          ),
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toContain(
      `${UNDERSTORY_LEARNER_TURN_LIMIT} learner turns`,
    );
  });
});
