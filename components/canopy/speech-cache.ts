"use client";

import { getSpeechCacheKey, type SpeechSpeaker } from "@/lib/speech";

const MAX_CACHED_AUDIO_CLIPS = 24;
const audioRequests = new Map<string, Promise<Blob>>();

export function getCachedSpeechAudio({
  speaker,
  text,
}: {
  speaker: SpeechSpeaker;
  text: string;
}) {
  const key = getSpeechCacheKey({ speaker, text });
  const cached = audioRequests.get(key);
  if (cached) return cached;

  const request = fetch("/api/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speaker, text }),
  }).then(async (response) => {
    if (!response.ok) throw new Error(await response.text());
    return response.blob();
  });

  audioRequests.set(key, request);
  if (audioRequests.size > MAX_CACHED_AUDIO_CLIPS) {
    const oldestKey = audioRequests.keys().next().value;
    if (oldestKey) audioRequests.delete(oldestKey);
  }
  void request.catch(() => {
    if (audioRequests.get(key) === request) audioRequests.delete(key);
  });

  return request;
}
