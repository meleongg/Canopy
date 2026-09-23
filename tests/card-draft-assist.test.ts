import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  matchDictionaryForCardAutofill: vi.fn(),
  moderateText: vi.fn(),
  chatCompletionsCreate: vi.fn(),
}));

vi.mock("@/lib/card-autofill", () => ({
  matchDictionaryForCardAutofill: mocks.matchDictionaryForCardAutofill,
}));
vi.mock("@/lib/openai", () => ({
  GARDEN_BOUNDARY_MESSAGE: "blocked",
  moderateText: mocks.moderateText,
}));
vi.mock("@/db/env", () => ({
  hasOpenAIEnv: () => true,
  getOpenAIKey: () => "test-key",
}));
vi.mock("openai", () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: mocks.chatCompletionsCreate,
      },
    };
  },
}));

describe("card draft assist", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.moderateText.mockResolvedValue({ flagged: false });
    mocks.matchDictionaryForCardAutofill.mockResolvedValue({
      query: "宵夜",
      matches: [
        {
          entryId: "entry-1",
          traditional: "宵夜",
          simplified: "宵夜",
          pinyin: "xiao1 ye4",
          definitions: ["midnight snack"],
          matchKind: "exact",
        },
      ],
      exactMatch: true,
      suggestSplit: false,
      helpMessage: null,
    });
  });

  it("grounds inbound drafts with CC-CEDICT and keeps LLM context notes", async () => {
    mocks.chatCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              contextualMeaning: "a late-night snack after going out",
              sourceSentence: "吃点宵夜再回去吧。",
            }),
          },
        },
      ],
    });

    const { assistInboundCardDraft } = await import(
      "@/lib/card-draft-assist"
    );
    const result = await assistInboundCardDraft("learner-1", {
      targetText: "宵夜",
      sourceContext: "吃点宵夜再回去吧。",
    });

    expect(result.mode).toBe("inbound");
    expect(result.options).toHaveLength(1);
    expect(result.options[0]).toMatchObject({
      headword: "宵夜",
      definitions: "midnight snack",
      contextualMeaning: "a late-night snack after going out",
      sourceSentence: "吃点宵夜再回去吧。",
      grounded: true,
      dictionaryEntryId: "entry-1",
    });
    expect(result.options[0]?.phoneticReading).toMatch(/xiāo|xiao/i);
  });

  it("returns ranked outbound options with register labels", async () => {
    mocks.matchDictionaryForCardAutofill.mockImplementation(
      async (_userId: string, query: string) => {
        if (query === "抛锚") {
          return {
            query,
            matches: [
              {
                entryId: "entry-2",
                traditional: "拋錨",
                simplified: "抛锚",
                pinyin: "pao1 mao2",
                definitions: ["to drop anchor", "(fig.) to break down"],
                matchKind: "exact" as const,
              },
            ],
            exactMatch: true,
            suggestSplit: false,
            helpMessage: null,
          };
        }
        return {
          query,
          matches: [],
          exactMatch: false,
          suggestSplit: false,
          helpMessage: null,
        };
      },
    );
    mocks.chatCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              options: [
                {
                  register: "casual",
                  sentence: "我的车坏了。",
                  headword: "坏了",
                  glossHint: "broke / out of order",
                },
                {
                  register: "formal",
                  sentence: "我的车抛锚了。",
                  headword: "抛锚",
                  glossHint: "broke down (mechanical)",
                },
              ],
            }),
          },
        },
      ],
    });

    const { assistOutboundCardDraft } = await import(
      "@/lib/card-draft-assist"
    );
    const result = await assistOutboundCardDraft("learner-1", {
      englishIntent: "my car broke down",
    });

    expect(result.mode).toBe("outbound");
    expect(result.options).toHaveLength(2);
    expect(result.options[0]).toMatchObject({
      headword: "坏了",
      registerLabel: "Casual",
      definitions: "broke / out of order",
      grounded: false,
    });
    expect(result.options[1]).toMatchObject({
      headword: "抛锚",
      register: "formal",
      registerLabel: "Formal",
      sourceSentence: "我的车抛锚了。",
      grounded: true,
    });
  });

  it("rejects moderated inbound input", async () => {
    mocks.moderateText.mockResolvedValue({ flagged: true });
    const { assistInboundCardDraft } = await import(
      "@/lib/card-draft-assist"
    );
    await expect(
      assistInboundCardDraft("learner-1", {
        targetText: "宵夜",
        sourceContext: "bad content",
      }),
    ).rejects.toThrow("blocked");
  });
});
