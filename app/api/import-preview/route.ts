import { parseVocabularyLog } from "@/lib/ingestion";
import { requireApiAuth } from "@/lib/session";

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) {
    return auth.response;
  }

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
