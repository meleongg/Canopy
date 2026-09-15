import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { streamText } from "ai";
import { getOpenAIKey, hasOpenAIEnv } from "@/db/env";
import { getCardSeeds } from "@/lib/cards";
import { saveStorySession } from "@/lib/ai-sessions";
import { moderateText } from "@/lib/openai";
import { stripModelMarkdownMarkers } from "@/lib/ai-text";
import { practicePromptInstructions } from "@/lib/practice-preferences";
import { requireApiAuth } from "@/lib/session";
import { getUserPreferences } from "@/lib/user-preferences";
import { displayCardText } from "@/lib/script-variants";

export const runtime = "edge";

const sandboxSchema = z.object({
  cardIds: z.array(z.string().uuid()).min(3).max(7),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) {
    return auth.response;
  }

  const parsed = sandboxSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response("Choose between 3 and 7 seeds.", { status: 400 });
  }
  const seeds = await getCardSeeds(auth.session.user.id, parsed.data.cardIds);
  if (seeds.length !== parsed.data.cardIds.length) {
    return new Response("One or more selected cards could not be found.", {
      status: 404,
    });
  }
  const preferences = await getUserPreferences(auth.session.user.id);
  const displaySeeds = seeds.map((seed) => ({
    ...seed,
    targetText: displayCardText(seed, preferences.chineseScript),
  }));

  if (!hasOpenAIEnv()) {
    return new Response("OPENAI_API_KEY is required to generate stories.", {
      status: 503,
    });
  }
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return new Response("OPENAI_API_KEY is required to generate stories.", {
      status: 503,
    });
  }
  const openai = createOpenAI({ apiKey });
  const languageCode = seeds[0]?.languageCode ?? "und";
  const practiceInstructions = practicePromptInstructions(
    preferences,
    languageCode,
    { includeCorrections: false },
  );

  const moderation = await moderateText(
    displaySeeds.map((seed) => seed.targetText).join(" "),
  );
  if (moderation.flagged) {
    return new Response("Seed set was flagged by moderation.", { status: 400 });
  }

  const result = streamText({
    model: openai("gpt-4o-mini"),
    temperature: 0.3,
    system: `You are writing for The Overstory Sandbox. Write one short natural story paragraph for a language learner. ${practiceInstructions} Include every target term exactly once. Avoid lists, explanations, and Markdown formatting. Return plain text only.`,
    prompt: JSON.stringify({ seeds: displaySeeds }),
    onFinish: async ({ text }) => {
      const cleanedText = stripModelMarkdownMarkers(text).trim();
      if (cleanedText) {
        try {
          await saveStorySession(auth.session.user.id, seeds, cleanedText);
        } catch (error) {
          console.error("Could not save completed Overstory session.", error);
        }
      }
    },
  });

  return result.toTextStreamResponse();
}
