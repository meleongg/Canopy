import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { streamText } from "ai";
import { hasOpenAIEnv } from "@/db/env";
import { getCardSeeds } from "@/lib/cards";
import { moderateText } from "@/lib/openai";
import { requireApiAuth } from "@/lib/session";

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
    return new Response("One or more selected cards could not be found.", { status: 404 });
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
    temperature: 0.3,
    system:
      "You are writing for The Overstory Sandbox. Write one short natural story paragraph for a language learner. Include every target term exactly once. Avoid lists and explanations.",
    prompt: JSON.stringify({ seeds }),
  });

  return result.toTextStreamResponse();
}
