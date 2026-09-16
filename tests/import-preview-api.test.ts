import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  parseVocabularyLog: vi.fn(),
  requireApiAuth: vi.fn(),
}));

vi.mock("@/lib/ingestion", () => ({
  parseVocabularyLog: mocks.parseVocabularyLog,
}));
vi.mock("@/lib/session", () => ({ requireApiAuth: mocks.requireApiAuth }));

describe("import preview API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireApiAuth.mockResolvedValue({
      session: { user: { id: "learner-1" } },
      response: null,
    });
  });

  it("rejects a blank or unsupported preview before parsing", async () => {
    const { POST } = await import("@/app/api/import-preview/route");
    const response = await POST(
      new Request("http://test/api/import-preview", {
        method: "POST",
        body: JSON.stringify({ rawText: " ", languageCode: "fr-FR" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.parseVocabularyLog).not.toHaveBeenCalled();
  });

  it("explains when valid text contains no usable vocabulary rows", async () => {
    mocks.parseVocabularyLog.mockResolvedValue([]);
    const { POST } = await import("@/app/api/import-preview/route");
    const response = await POST(
      new Request("http://test/api/import-preview", {
        method: "POST",
        body: JSON.stringify({ rawText: "not a card", languageCode: "zh-CN" }),
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.text()).toContain("one entry per line");
  });
});
