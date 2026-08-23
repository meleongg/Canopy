export const SPEECH_MODEL = "gpt-4o-mini-tts";
export const SPEECH_MAX_CHARACTERS = 1_200;

export type SpeechSpeaker = "bramble" | "mossy" | "narrator";

export function getSpeechVoice(speaker: SpeechSpeaker) {
  if (speaker === "mossy") return "cedar";
  return "marin";
}

export function canGenerateSpeech(text: string) {
  const characterCount = Array.from(text.trim()).length;
  return characterCount > 0 && characterCount <= SPEECH_MAX_CHARACTERS;
}

export function getSpeechCacheKey({
  speaker,
  text,
}: {
  speaker: SpeechSpeaker;
  text: string;
}) {
  return JSON.stringify([SPEECH_MODEL, speaker, text]);
}
