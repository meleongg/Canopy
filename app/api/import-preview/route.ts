import { z } from "zod";
import { parseVocabularyLog } from "@/lib/ingestion";
import { requireApiAuth } from "@/lib/session";

const previewSchema = z.object({
  rawText: z.string().trim().min(1).max(1_000_000),
  languageCode: z.enum(["zh-CN", "zh-HK"]),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) {
    return auth.response;
  }

  const parsed = previewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(
      "Paste a Chinese vocabulary list under 1 MB, then choose Mandarin or Cantonese.",
      { status: 400 },
    );
  }

  const entries = await parseVocabularyLog(
    parsed.data.rawText,
    parsed.data.languageCode,
  );

  if (!entries.length) {
    return new Response(
      "No usable rows found. Use one entry per line: word, optional reading, and definition (tabs or commas work).",
      { status: 422 },
    );
  }

  return Response.json({ entries });
}
