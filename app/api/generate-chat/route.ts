import { openai } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { hasOpenAIEnv } from "@/db/env";
import { GARDEN_BOUNDARY_MESSAGE, moderateText } from "@/lib/openai";

export const runtime = "edge";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    messages?: ModelMessage[];
    seeds?: {
      targetText: string;
      phoneticReading?: string[];
      definitions: string[];
      languageCode?: string;
    }[];
    setting?: string;
  };

  const messages = body.messages ?? [];
  const seeds = (body.seeds ?? []).slice(0, 7);

  if (seeds.length === 0) {
    return new Response("Choose at least one chat seed.", { status: 400 });
  }

  if (!hasOpenAIEnv()) {
    return new Response("OPENAI_API_KEY is required to generate chat.", {
      status: 503,
    });
  }

  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  if (latestUserMessage) {
    const content = Array.isArray(latestUserMessage.content)
      ? latestUserMessage.content.map((part) => JSON.stringify(part)).join(" ")
      : String(latestUserMessage.content);
    const moderation = await moderateText(content);
    if (moderation.flagged) {
      return new Response(GARDEN_BOUNDARY_MESSAGE, { status: 400 });
    }
  }

  const targetWords = seeds
    .map(
      (seed) =>
        `${seed.targetText} (${seed.phoneticReading?.join(" ") || "no reading"}): ${seed.definitions.join(", ")}`,
    )
    .join("; ");
  const setting = body.setting ?? "a calm airport cafe";
  const languageCode = seeds[0]?.languageCode ?? "und";
  const targetLanguage =
    languageCode === "zh-CN"
      ? "Simplified Chinese Mandarin"
      : languageCode === "zh-HK"
        ? "Traditional Chinese Cantonese"
        : languageCode === "fr-FR"
          ? "French"
          : "the target language";

  const result = streamText({
    model: openai("gpt-4o-mini"),
    temperature: 0.7,
    system: `You are Canopy's language-practice partner. Run a natural roleplay in ${setting}. The target language is ${targetLanguage}; respond primarily in that language, not English. If the target is Chinese, use Chinese characters first and include pinyin only when correcting or clarifying. Keep each reply to 1-3 short sentences and end with a natural question that invites the learner to answer. Weave in the selected vocabulary when appropriate, but do not force every word into every reply. If the learner writes English, answer in ${targetLanguage} and give only a very brief English hint if needed. Selected vocabulary: ${targetWords}.`,
    messages,
  });

  return result.toTextStreamResponse();
}
