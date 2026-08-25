import { z } from "zod";
import {
  dictionarySearchScopes,
  recordDictionaryLookup,
  searchActiveDictionary,
} from "@/lib/dictionary";
import { requireApiAuth } from "@/lib/session";

const searchSchema = z.object({
  query: z.string().trim().min(1).max(100),
  scope: z.enum(dictionarySearchScopes).default("all"),
});

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;
  const parsed = searchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response("Enter up to 100 characters to search.", { status: 400 });
  }
  const entries = await searchActiveDictionary(
      auth.session.user.id,
      parsed.data.query,
      parsed.data.scope,
    );
  await recordDictionaryLookup(
    auth.session.user.id,
    parsed.data.query,
    parsed.data.scope,
  );
  return Response.json({ entries });
}
