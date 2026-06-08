import { parseVocabularyLog } from "@/lib/ingestion";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    rawText?: string;
    languageCode?: string;
  };

  const entries = await parseVocabularyLog(
    body.rawText ?? "",
    body.languageCode ?? "zh-CN",
  );

  return Response.json({ entries });
}
