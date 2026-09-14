import OpenAI from "openai";
import { getOpenAIKey } from "@/db/env";
import { phoneticTextForSentence } from "@/lib/phonetics";

export const GARDEN_BOUNDARY_MESSAGE =
  "Your sentence wandered out of the garden boundary. Let's try phrasing that differently!";

function getOpenAIClient() {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for this operation.");
  }

  return new OpenAI({ apiKey });
}

export async function moderateText(input: string) {
  const client = getOpenAIClient();
  const result = await client.moderations.create({
    model: "omni-moderation-latest",
    input,
  });

  return { flagged: result.results.some((item) => item.flagged) };
}

export async function generateExampleContext(input: {
  targetText: string;
  phoneticReading: string[];
  definitions: string[];
  languageCode: string;
}) {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.35,
    messages: [
      {
        role: "system",
        content:
          "Return compact JSON with sentence and translation keys. Use the target word naturally. Do not include phonetic readings.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });

  const content = completion.choices[0]?.message.content ?? "{}";
  const parsed = JSON.parse(content) as {
    sentence?: string;
    translation?: string;
  };
  const sentence = parsed.sentence ?? input.targetText;

  return {
    sentence,
    phonetic: phoneticTextForSentence(
      input.languageCode,
      sentence,
      input.phoneticReading,
    ),
    translation: parsed.translation ?? input.definitions.join("; "),
    generatedAt: new Date().toISOString(),
  };
}
