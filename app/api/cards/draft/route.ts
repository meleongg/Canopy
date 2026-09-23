import { z } from "zod";
import { hasOpenAIEnv } from "@/db/env";
import { assistCardDraft } from "@/lib/card-draft-assist";
import {
  MAX_ENGLISH_INTENT_CHARS,
  MAX_SOURCE_CONTEXT_CHARS,
} from "@/lib/card-draft";
import { GARDEN_BOUNDARY_MESSAGE } from "@/lib/openai";
import { requireApiAuth } from "@/lib/session";

const schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("inbound"),
    targetText: z.string().trim().min(1).max(40),
    sourceContext: z
      .string()
      .trim()
      .min(1)
      .max(MAX_SOURCE_CONTEXT_CHARS),
  }),
  z.object({
    mode: z.literal("outbound"),
    englishIntent: z
      .string()
      .trim()
      .min(1)
      .max(MAX_ENGLISH_INTENT_CHARS),
  }),
]);

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;

  if (!hasOpenAIEnv()) {
    return new Response("OPENAI_API_KEY is required for card draft assist.", {
      status: 503,
    });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(
      "Provide inbound target + context, or outbound English intent.",
      { status: 400 },
    );
  }

  try {
    const result =
      parsed.data.mode === "inbound"
        ? await assistCardDraft(auth.session.user.id, "inbound", {
            targetText: parsed.data.targetText,
            sourceContext: parsed.data.sourceContext,
          })
        : await assistCardDraft(auth.session.user.id, "outbound", {
            englishIntent: parsed.data.englishIntent,
          });
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Card draft assist failed.";
    if (message === GARDEN_BOUNDARY_MESSAGE) {
      return new Response(message, { status: 400 });
    }
    console.error("Card draft assist failed.", error);
    return new Response(
      "Draft assist could not finish. Try again, or fill the card manually.",
      { status: 500 },
    );
  }
}
