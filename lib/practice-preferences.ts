import type { UserPreferences } from "@/lib/user-preferences";

export function practicePromptInstructions(
  preferences: UserPreferences,
  languageCode: string,
  options: { includeCorrections: boolean },
) {
  const proficiencyInstruction = {
    beginner:
      "Use short, high-frequency sentences and make one idea at a time easy to follow.",
    intermediate:
      "Use natural everyday language with modest variety, and keep support concise.",
    advanced:
      "Use natural, nuanced language while remaining clear and conversational.",
  }[preferences.proficiency];
  const correctionInstruction = {
    gentle:
      "When a correction would help, respond naturally first and gently model the preferred phrasing without over-explaining.",
    direct:
      "When the learner makes a meaningful error, give a brief, clear correction before continuing the conversation.",
    "on-request":
      "Do not correct the learner unless they explicitly ask for feedback; prioritize a natural conversation.",
  }[preferences.correctionStyle];
  const goalInstruction = {
    everyday: "Prioritize practical everyday communication.",
    travel: "Prioritize useful travel situations and polite navigation of them.",
    work: "Prioritize clear, appropriate workplace communication.",
    vocabulary: "Prioritize memorable, natural uses of the selected vocabulary.",
  }[preferences.conversationGoal];
  const scriptInstruction =
    languageCode === "zh-CN" || languageCode === "zh-HK"
      ? preferences.chineseScript === "traditional"
        ? "Write Chinese in Traditional characters."
        : "Write Chinese in Simplified characters."
      : "";
  const formalityInstruction = `Use a ${preferences.formality} register unless the scene clearly calls for a different one.`;

  return [
    proficiencyInstruction,
    options.includeCorrections ? correctionInstruction : "",
    goalInstruction,
    scriptInstruction,
    formalityInstruction,
  ]
    .filter(Boolean)
    .join(" ");
}
