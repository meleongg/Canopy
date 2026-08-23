import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { streamText, type ModelMessage } from "ai";
import { hasOpenAIEnv } from "@/db/env";
import { getCardSeeds } from "@/lib/cards";
import { saveChatSession } from "@/lib/ai-sessions";
import { GARDEN_BOUNDARY_MESSAGE, moderateText } from "@/lib/openai";
import { requireApiAuth } from "@/lib/session";
import { understoryPersonas } from "@/lib/understory";

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
    .max(10),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) {
    return auth.response;
  }

  const parsed = chatSchema.safeParse(await request.json());
  if (!parsed.success)
    return new Response("Provide a valid dialogue turn.", { status: 400 });
  const userTurns = parsed.data.messageHistory.filter(
    (message) => message.role === "user",
  );
  if (userTurns.length > 5) {
    return new Response("The Understory ends after five learner turns.", {
      status: 400,
    });
  }
  const seeds = await getCardSeeds(auth.session.user.id, parsed.data.cardIds);
  if (seeds.length !== parsed.data.cardIds.length) {
    return new Response("One or more selected cards could not be found.", {
      status: 404,
    });
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
  const companion = understoryPersonas[persona];
  const languageCode = seeds[0]?.languageCode ?? "und";
  const targetLanguage =
    languageCode === "zh-CN"
      ? "Simplified Chinese Mandarin"
      : languageCode === "zh-HK"
        ? "Traditional Chinese Cantonese"
        : languageCode === "fr-FR"
          ? "French"
          : "the target language";
  const conversation = parsed.data.messageHistory.length
    ? { messages: parsed.data.messageHistory as ModelMessage[] }
    : {
        prompt:
          "Open the selected scene now. Introduce yourself as the learner's companion, establish the setting, and ask the first natural question.",
      };
  const closingInstruction =
    userTurns.length === 5
      ? "This is the learner's fifth and final turn. Respond warmly, acknowledge their effort, naturally recap or reinforce useful vocabulary, and close the scene without asking another question."
      : "End with one natural question that invites the learner to answer.";

  const result = streamText({
    model: openai("gpt-4o-mini"),
    temperature: 0.7,
    system: `You are ${companion.name}, Canopy's companion for The Understory Chat. ${companion.prompt} Run a natural, low-pressure roleplay in ${setting}. The target language is ${targetLanguage}; respond primarily in that language, not English. If the target is Chinese, use Chinese characters first and include pinyin only when correcting or clarifying. Keep each reply to 1-3 short sentences. Weave in the selected vocabulary when appropriate, but do not force every word into every reply. If the learner writes English, answer in ${targetLanguage} and give only a very brief English hint if needed. ${closingInstruction} Selected vocabulary: ${targetWords}.`,
    ...conversation,
    onFinish: async ({ text }) => {
      if (userTurns.length === 5 && text.trim()) {
        try {
          await saveChatSession(auth.session.user.id, seeds, [
            ...parsed.data.messageHistory,
            { role: "assistant", content: text },
          ]);
        } catch (error) {
          console.error("Could not save completed Understory session.", error);
        }
      }
    },
  });

  return result.toTextStreamResponse();
}
