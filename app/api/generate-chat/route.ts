import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { streamText, type ModelMessage } from "ai";
import { hasOpenAIEnv } from "@/db/env";
import { getCardSeeds } from "@/lib/cards";
import { GARDEN_BOUNDARY_MESSAGE, moderateText } from "@/lib/openai";
import { requireApiAuth } from "@/lib/session";

export const runtime = "edge";

const chatSchema = z.object({
  cardIds: z.array(z.string().uuid()).min(1).max(7),
  persona: z.enum(["bramble", "mossy"]),
  scenario: z.string().trim().min(1).max(500),
  messageHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4_000),
      }),
    )
    .max(6),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) {
    return auth.response;
  }

  const parsed = chatSchema.safeParse(await request.json());
  if (!parsed.success) return new Response("Provide a valid dialogue turn.", { status: 400 });
  const userTurns = parsed.data.messageHistory.filter(
    (message) => message.role === "user",
  );
  if (userTurns.length > 3) {
    return new Response("The Understory ends after three learner turns.", { status: 400 });
  }
  const seeds = await getCardSeeds(auth.session.user.id, parsed.data.cardIds);
  if (seeds.length !== parsed.data.cardIds.length) {
    return new Response("One or more selected cards could not be found.", { status: 404 });
  }

  if (!hasOpenAIEnv()) {
    return new Response("OPENAI_API_KEY is required to generate chat.", {
      status: 503,
    });
  }

  const latestUserMessage = userTurns.at(-1);

  if (latestUserMessage) {
    const moderation = await moderateText(latestUserMessage.content);
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
  const setting = parsed.data.scenario;
  const persona = parsed.data.persona;
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
    system: `You are Bramble, Canopy's ${persona} for The Understory Chat. Run a natural, low-pressure roleplay in ${setting}. The target language is ${targetLanguage}; respond primarily in that language, not English. If the target is Chinese, use Chinese characters first and include pinyin only when correcting or clarifying. Keep each reply to 1-3 short sentences and end with a natural question that invites the learner to answer. Weave in the selected vocabulary when appropriate, but do not force every word into every reply. If the learner writes English, answer in ${targetLanguage} and give only a very brief English hint if needed. Selected vocabulary: ${targetWords}.`,
    messages: parsed.data.messageHistory as ModelMessage[],
  });

  return result.toTextStreamResponse();
}
