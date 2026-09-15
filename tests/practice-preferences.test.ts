import { describe, expect, it } from "vitest";
import { practicePromptInstructions } from "@/lib/practice-preferences";
import type { UserPreferences } from "@/lib/user-preferences";

const preferences: UserPreferences = {
  theme: "dark",
  importLanguage: "zh-CN",
  readingSize: "default",
  proficiency: "beginner",
  correctionStyle: "direct",
  conversationGoal: "travel",
  chineseScript: "traditional",
  formality: "formal",
  playbackSpeed: "1",
};

describe("practicePromptInstructions", () => {
  it("uses the shared generation defaults for Chinese practice", () => {
    const instructions = practicePromptInstructions(preferences, "zh-CN", {
      includeCorrections: true,
    });

    expect(instructions).toContain("high-frequency sentences");
    expect(instructions).toContain("brief, clear correction");
    expect(instructions).toContain("travel situations");
    expect(instructions).toContain("Traditional characters");
    expect(instructions).toContain("formal register");
  });

  it("leaves correction guidance out of one-way practice and ignores script outside Chinese", () => {
    const instructions = practicePromptInstructions(preferences, "fr-FR", {
      includeCorrections: false,
    });

    expect(instructions).not.toContain("correction");
    expect(instructions).not.toContain("characters");
    expect(instructions).toContain("travel situations");
  });
});
