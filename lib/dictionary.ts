import { and, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dictionaryEntries, dictionaryReleases, flashcards } from "@/db/schema";
import { normalizeSuppliedReading } from "@/lib/phonetics";

export type DictionaryLookup = {
  entryId: string;
  text: string;
  traditional: string;
  simplified: string;
  pinyin: string;
  definitions: string[];
  card?: { id: string; phoneticReading: string[]; definitions: string[] };
};

async function candidateTerms(text: string) {
  try {
    const [{ Jieba }, { dict }] = await Promise.all([
      import("@node-rs/jieba"),
      import("@node-rs/jieba/dict"),
    ]);
    return [
      ...new Set(
        Jieba.withDict(dict)
          .cut(text, false)
          .filter((term) => /\p{Script=Han}/u.test(term) && term.length >= 2),
      ),
    ].slice(0, 500);
  } catch {
    return (text.match(/\p{Script=Han}{2,}/gu) ?? []).slice(0, 500);
  }
}

export async function lookupActiveDictionary(userId: string, text: string) {
  const terms = await candidateTerms(text);
  if (terms.length === 0) return [] as DictionaryLookup[];

  const db = getDb();
  const entries = await db
    .select({
      entryId: dictionaryEntries.id,
      traditional: dictionaryEntries.traditional,
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
        eq(dictionaryReleases.isActive, true),
        or(
          inArray(dictionaryEntries.simplified, terms),
          inArray(dictionaryEntries.traditional, terms),
        ),
      ),
    );
  const cards = await db
    .select({
      id: flashcards.id,
      targetText: flashcards.targetText,
      phoneticReading: flashcards.phoneticReading,
      definitions: flashcards.definitions,
    })
    .from(flashcards)
    .where(
      and(eq(flashcards.userId, userId), inArray(flashcards.targetText, terms)),
    );
  const cardsByText = new Map(cards.map((card) => [card.targetText, card]));
  return entries.flatMap((entry) =>
    [entry.simplified, entry.traditional]
      .filter(
        (term, index, forms) =>
          terms.includes(term) && forms.indexOf(term) === index,
      )
      .map((term) => ({ ...entry, text: term, card: cardsByText.get(term) })),
  );
}

export function dictionaryEntryAsCard(
  entry: Pick<DictionaryLookup, "simplified" | "pinyin" | "definitions">,
) {
  return {
    languageCode: "zh-CN",
    targetText: entry.simplified,
    phoneticReading: normalizeSuppliedReading(entry.pinyin),
    definitions: entry.definitions,
  };
}
