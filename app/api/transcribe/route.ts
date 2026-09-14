import OpenAI from "openai";
import { hasOpenAIEnv } from "@/db/env";
import { requireApiAuth } from "@/lib/session";
import {
  getTranscriptionLanguage,
  TRANSCRIPTION_MAX_AUDIO_BYTES,
  TRANSCRIPTION_MODEL,
} from "@/lib/transcription";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;

  const formData = await request.formData();
  const audio = formData.get("audio");
  const languageCode = formData.get("languageCode");
  if (!(audio instanceof File) || audio.size === 0) {
    return new Response("Record a short reply before transcribing.", {
      status: 400,
    });
  }
  if (
    !audio.type.startsWith("audio/") ||
    audio.size > TRANSCRIPTION_MAX_AUDIO_BYTES
  ) {
    return new Response("Use an audio recording smaller than 5 MB.", {
      status: 400,
    });
  }
  if (!hasOpenAIEnv()) {
    return new Response("OPENAI_API_KEY is required to transcribe speech.", {
      status: 503,
    });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcript = await client.audio.transcriptions.create({
      file: audio,
      language: getTranscriptionLanguage(
        typeof languageCode === "string" ? languageCode : "",
      ),
      model: TRANSCRIPTION_MODEL,
    });
    const text = transcript.text.trim();
    if (!text) {
      return new Response("No speech was heard. Please try again.", {
        status: 422,
      });
    }

    return Response.json({ text });
  } catch (error) {
    console.error("Could not transcribe Canopy speech.", error);
    return new Response(
      "Speech could not be transcribed. Please try again or type your reply.",
      {
        status: 502,
      },
    );
  }
}
