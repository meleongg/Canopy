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

function candidateTerms(text: string) {
  const hanRuns = text.match(/\p{Script=Han}+/gu) ?? [];
  return [
    ...new Set(
      hanRuns.flatMap((run) => {
        const terms: string[] = [];
        for (let start = 0; start < run.length; start += 1) {
          for (
            let length = 2;
            length <= 6 && start + length <= run.length;
            length += 1
          ) {
            terms.push(run.slice(start, start + length));
          }
        }
        return terms;
      }),
    ),
  ].slice(0, 500);
}

export async function lookupActiveDictionary(userId: string, text: string) {
  const terms = candidateTerms(text);
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
