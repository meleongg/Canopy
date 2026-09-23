import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assistCardDraft: vi.fn(),
  requireApiAuth: vi.fn(),
  hasOpenAIEnv: vi.fn(() => true),
}));

vi.mock("@/lib/card-draft-assist", () => ({
  assistCardDraft: mocks.assistCardDraft,
}));
vi.mock("@/lib/session", () => ({ requireApiAuth: mocks.requireApiAuth }));
vi.mock("@/db/env", () => ({
  hasOpenAIEnv: mocks.hasOpenAIEnv,
  getOpenAIKey: () => "test-key",
}));

describe("cards draft API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.hasOpenAIEnv.mockReturnValue(true);
    mocks.requireApiAuth.mockResolvedValue({
      session: { user: { id: "learner-1" } },
      response: null,
    });
  });

  it("rejects invalid payloads before calling assist", async () => {
    const { POST } = await import("@/app/api/cards/draft/route");
    const response = await POST(
      new Request("http://test/api/cards/draft", {
        method: "POST",
        body: JSON.stringify({ mode: "inbound", targetText: "宵夜" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.assistCardDraft).not.toHaveBeenCalled();
  });

  it("returns an inbound draft for the learner", async () => {
    mocks.assistCardDraft.mockResolvedValue({
      mode: "inbound",
      options: [
        {
          id: "opt-1",
          headword: "宵夜",
          phoneticReading: "xiāo yè",
          definitions: "midnight snack",
          contextualMeaning: "late-night bite after going out",
          sourceSentence: "吃点宵夜再回去吧。",
          grounded: true,
        },
      ],
      helpMessage: null,
    });
    const { POST } = await import("@/app/api/cards/draft/route");
    const response = await POST(
      new Request("http://test/api/cards/draft", {
        method: "POST",
        body: JSON.stringify({
          mode: "inbound",
          targetText: "宵夜",
          sourceContext: "吃点宵夜再回去吧。",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.assistCardDraft).toHaveBeenCalledWith("learner-1", "inbound", {
      targetText: "宵夜",
      sourceContext: "吃点宵夜再回去吧。",
    });
    await expect(response.json()).resolves.toMatchObject({
      mode: "inbound",
      options: [{ headword: "宵夜" }],
    });
  });

  it("returns outbound options for English intent", async () => {
    mocks.assistCardDraft.mockResolvedValue({
      mode: "outbound",
      options: [
        {
          id: "opt-1",
          register: "casual",
          headword: "抛锚",
          sourceSentence: "我的车抛锚了。",
          grounded: true,
        },
      ],
      helpMessage: null,
    });
    const { POST } = await import("@/app/api/cards/draft/route");
    const response = await POST(
      new Request("http://test/api/cards/draft", {
        method: "POST",
        body: JSON.stringify({
          mode: "outbound",
          englishIntent: "my car broke down",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.assistCardDraft).toHaveBeenCalledWith(
      "learner-1",
      "outbound",
      { englishIntent: "my car broke down" },
    );
  });

  it("returns 503 when OpenAI env is missing", async () => {
    mocks.hasOpenAIEnv.mockReturnValue(false);
    const { POST } = await import("@/app/api/cards/draft/route");
    const response = await POST(
      new Request("http://test/api/cards/draft", {
        method: "POST",
        body: JSON.stringify({
          mode: "outbound",
          englishIntent: "hello",
        }),
      }),
    );
    expect(response.status).toBe(503);
    expect(mocks.assistCardDraft).not.toHaveBeenCalled();
  });
});
