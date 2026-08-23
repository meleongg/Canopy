export const understoryPersonas = {
  bramble: {
    name: "Bramble",
    description:
      "A curious, upbeat guide who keeps the scene moving with gentle questions and small moments of play.",
    prompt:
      "Your voice is curious, warm, and lightly playful. Keep the learner moving through the scene with encouraging, concrete questions.",
  },
  mossy: {
    name: "Mossy",
    description:
      "A calm, patient companion who leaves room to think and helps the conversation unfold at an unhurried pace.",
    prompt:
      "Your voice is calm, patient, and reflective. Give the learner room to think, and respond with reassuring, unhurried prompts.",
  },
} as const;

export type UnderstoryPersona = keyof typeof understoryPersonas;

// Product-controlled conversation duration. This is intentionally not a
// learner setting until we have evidence that configurable rounds add value.
export const UNDERSTORY_LEARNER_TURN_LIMIT = 5;

export function ensureUnderstoryClosing(
  text: string,
  languageCode: string,
) {
  const closing = text
    .split(/(?<=[。！？!?])/u)
    .filter((sentence) => !/[?？]/u.test(sentence))
    .join("")
    .trim();
  if (closing) return closing;

  if (languageCode === "zh-CN") {
    return "谢谢你今天的练习。你很好地使用了这些词语，今天的对话就到这里。";
  }
  if (languageCode === "zh-HK") {
    return "多謝你今天的練習。你很好地運用了這些詞語，今天的對話就到這裡。";
  }
  if (languageCode === "fr-FR") {
    return "Merci pour cette conversation. Tu as bien travaillé avec le vocabulaire choisi. Notre conversation se termine ici.";
  }
  return "Thank you for practising today. You used the selected vocabulary well, and this conversation is complete.";
}
