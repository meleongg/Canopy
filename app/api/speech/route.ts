import { openai } from "@ai-sdk/openai";
import { experimental_generateSpeech as generateSpeech } from "ai";
import { z } from "zod";
import { hasOpenAIEnv } from "@/db/env";
import { requireApiAuth } from "@/lib/session";
import {
  getSpeechVoice,
  SPEECH_MAX_CHARACTERS,
  SPEECH_MODEL,
} from "@/lib/speech";

export const runtime = "edge";

const speechSchema = z.object({
  speaker: z.enum(["bramble", "mossy", "narrator"]),
  text: z.string().trim().min(1).max(SPEECH_MAX_CHARACTERS),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;

  const parsed = speechSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response("Provide completed text to play.", { status: 400 });
  }
  if (!hasOpenAIEnv()) {
    return new Response("OPENAI_API_KEY is required to generate speech.", {
      status: 503,
    });
  }

  try {
    const result = await generateSpeech({
      model: openai.speech(SPEECH_MODEL),
      text: parsed.data.text,
      voice: getSpeechVoice(parsed.data.speaker),
      outputFormat: "mp3",
      instructions:
        "Speak clearly, warmly, and at a gentle pace for a language learner.",
    });
    const audioBytes = new Uint8Array(result.audio.uint8Array);

    return new Response(audioBytes, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": result.audio.mediaType,
      },
    });
  } catch (error) {
    console.error("Could not generate Canopy speech.", error);
    return new Response("Audio could not be generated. Please try again.", {
      status: 502,
    });
  }
}
