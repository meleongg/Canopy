import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { dictionaryEntries, dictionaryReleases } from "@/db/schema";
import { dictionaryEntryAsCard } from "@/lib/dictionary";
import { importVocabularyEntries } from "@/lib/cards";
import { requireApiAuth } from "@/lib/session";

const schema = z.object({ entryId: z.string().uuid() });

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return new Response("Provide a dictionary entry.", { status: 400 });
  const [entry] = await getDb()
    .select({
      simplified: dictionaryEntries.simplified,
      pinyin: dictionaryEntries.pinyin,
      definitions: dictionaryEntries.definitions,
    })
    .from(dictionaryEntries)
    .innerJoin(
      dictionaryReleases,
      eq(dictionaryEntries.releaseId, dictionaryReleases.id),
    )
    .where(
      and(
        eq(dictionaryEntries.id, parsed.data.entryId),
        eq(dictionaryReleases.isActive, true),
      ),
    )
    .limit(1);
  if (!entry)
    return new Response("Dictionary entry not found.", { status: 404 });
  const result = await importVocabularyEntries(auth.session.user.id, [
    dictionaryEntryAsCard(entry),
  ]);
  return Response.json(result);
}
