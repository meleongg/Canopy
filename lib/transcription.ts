export const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
export const TRANSCRIPTION_MAX_AUDIO_BYTES = 5 * 1024 * 1024;

export function getTranscriptionLanguage(languageCode: string) {
  const language = languageCode.split("-")[0]?.toLowerCase();
  return language && /^[a-z]{2,3}$/.test(language) ? language : undefined;
}
