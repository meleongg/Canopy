import { z } from "zod";
import { hasDatabaseEnv } from "@/db/env";
import { importVocabularyEntries } from "@/lib/cards";
import { parseVocabularyLog } from "@/lib/ingestion";
import { requireApiAuth } from "@/lib/session";

const importSchema = z.object({
  rawText: z.string().trim().min(1).max(1_000_000),
  languageCode: z.enum(["zh-CN", "zh-HK", "fr-FR", "und"]),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;
  if (!hasDatabaseEnv()) {
    return new Response("Database configuration is unavailable.", { status: 503 });
  }

  const result = importSchema.safeParse(await request.json());
  if (!result.success) {
    return Response.json({ error: "Provide a valid dictionary log and language." }, { status: 400 });
  }

  const entries = await parseVocabularyLog(result.data.rawText, result.data.languageCode);

  try {
    const counts = await importVocabularyEntries(auth.session.user.id, entries);
    return Response.json(counts);
  } catch (error) {
    console.error("Vocabulary import transaction failed.", error);
    return Response.json(
      { error: "Import failed. No vocabulary changes were saved." },
      { status: 500 },
    );
  }
}
