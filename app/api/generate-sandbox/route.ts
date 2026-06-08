import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getDb } from "@/db/client";
import { hasDatabaseEnv, hasOpenAIEnv } from "@/db/env";
import { aiSessions } from "@/db/schema";
import { DEMO_USER_ID } from "@/lib/constants";
import { moderateText } from "@/lib/openai";

export const runtime = "edge";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    seeds?: {
      id: string;
      targetText: string;
      phoneticReading: string[];
      definitions: string[];
      languageCode: string;
    }[];
  };
  const seeds = (body.seeds ?? []).slice(0, 7);

  if (seeds.length < 3) {
    return new Response("Choose between 3 and 7 seeds.", { status: 400 });
  }

  if (!hasOpenAIEnv()) {
    return new Response("OPENAI_API_KEY is required to generate stories.", {
      status: 503,
    });
  }

  const moderation = await moderateText(
    seeds.map((seed) => seed.targetText).join(" "),
  );
  if (moderation.flagged) {
    return new Response("Seed set was flagged by moderation.", { status: 400 });
  }

  const result = streamText({
    model: openai("gpt-4o-mini"),
    temperature: 0.4,
    system:
      "Write one short natural story paragraph for a language learner. Include every target term exactly once. Avoid lists and explanations.",
    prompt: JSON.stringify({ seeds }),
    onFinish: async ({ text }) => {
      if (!hasDatabaseEnv()) {
        return;
      }

      await getDb()
        .insert(aiSessions)
        .values({
          id: crypto.randomUUID(),
          userId: DEMO_USER_ID,
          sessionType: "story_sandbox",
          languageCode: seeds[0]?.languageCode ?? "und",
          seedWordIds: seeds.map((seed) => seed.id),
          contentHistory: { storyParagraph: text },
        });
    },
  });

  return result.toTextStreamResponse();
}
