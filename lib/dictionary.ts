import { and, asc, desc, eq, ilike, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
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

export type DictionarySearchResult = Omit<DictionaryLookup, "text">;
export const dictionarySearchScopes = ["all", "chinese", "pinyin", "english"] as const;
export type DictionarySearchScope = (typeof dictionarySearchScopes)[number];

type DictionaryEntryRecord = {
  entryId: string;
  traditional: string;
  simplified: string;
  pinyin: string;
  definitions: string[];
};

export type DictionaryDiscoveryResult = DictionarySearchResult & {
  sharedWith: string[];
};

async function withLearnerCards(
  userId: string,
  entries: DictionaryEntryRecord[],
) {
  const forms = [...new Set(entries.flatMap((entry) => [entry.simplified, entry.traditional]))];
  const cards = forms.length
    ? await getDb()
        .select({
          id: flashcards.id,
          targetText: flashcards.targetText,
          phoneticReading: flashcards.phoneticReading,
          definitions: flashcards.definitions,
        })
        .from(flashcards)
        .where(
          and(
            eq(flashcards.userId, userId),
            inArray(flashcards.targetText, forms),
          ),
        )
    : [];
  const cardsByText = new Map(cards.map((card) => [card.targetText, card]));
  return entries.map(({ pinyin, ...entry }) => ({
    ...entry,
    pinyin: normalizeSuppliedReading(pinyin).join(" "),
    card:
      cardsByText.get(entry.simplified) ??
      cardsByText.get(entry.traditional),
  }));
}

export async function searchActiveDictionary(
  userId: string,
  query: string,
  scope: DictionarySearchScope = "all",
) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [] as DictionarySearchResult[];

  const chineseMatch = or(
    ilike(dictionaryEntries.simplified, `%${normalizedQuery}%`),
    ilike(dictionaryEntries.traditional, `%${normalizedQuery}%`),
  );
  const pinyinMatch = ilike(dictionaryEntries.pinyin, `%${normalizedQuery}%`);
  const englishMatch = sql`lower(${dictionaryEntries.definitions}::text) LIKE ${`%${normalizedQuery.toLowerCase()}%`}`;
  const matchByScope = {
    all: or(chineseMatch, pinyinMatch, englishMatch),
    chinese: chineseMatch,
    pinyin: pinyinMatch,
    english: englishMatch,
  }[scope];
  const relevance = sql<number>`case
    when ${dictionaryEntries.simplified} = ${normalizedQuery}
      or ${dictionaryEntries.traditional} = ${normalizedQuery} then 0
    when lower(${dictionaryEntries.pinyin}) = lower(${normalizedQuery}) then 1
    when exists (
      select 1 from jsonb_array_elements_text(${dictionaryEntries.definitions}) definition
      where lower(definition) = lower(${normalizedQuery})
    ) then 2
    when ${dictionaryEntries.simplified} ilike ${`${normalizedQuery}%`}
      or ${dictionaryEntries.traditional} ilike ${`${normalizedQuery}%`} then 3
    when ${dictionaryEntries.pinyin} ilike ${`${normalizedQuery}%`} then 4
    else 5
  end`;
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
        matchByScope,
      ),
    )
    .orderBy(asc(relevance), asc(dictionaryEntries.simplified))
    .limit(30);
  return withLearnerCards(userId, entries);
}

export async function discoverSharedCharacterCompounds(userId: string) {
  const db = getDb();
  const learnerCards = await db
    .select({ targetText: flashcards.targetText })
    .from(flashcards)
    .where(and(eq(flashcards.userId, userId), isNull(flashcards.archivedAt)))
    .orderBy(desc(flashcards.createdAt))
    .limit(24);
  const sourceTerms = learnerCards
    .map((card) => card.targetText)
    .filter((term) => /\p{Script=Han}/u.test(term))
    .slice(0, 12);
  const characters = [
    ...new Set(sourceTerms.flatMap((term) => term.match(/\p{Script=Han}/gu) ?? [])),
  ].slice(0, 24);
  if (!characters.length) return [] as DictionaryDiscoveryResult[];

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
        sql`char_length(${dictionaryEntries.simplified}) >= 2`,
        notInArray(dictionaryEntries.simplified, sourceTerms),
        or(
          ...characters.map((character) =>
            ilike(dictionaryEntries.simplified, `%${character}%`),
          ),
        ),
      ),
    )
    .orderBy(asc(sql`char_length(${dictionaryEntries.simplified})`), asc(dictionaryEntries.simplified))
    .limit(12);
  const results = await withLearnerCards(userId, entries);
  return results.map((entry) => ({
    ...entry,
    sharedWith: sourceTerms.filter((term) =>
      [...term].some((character) => entry.simplified.includes(character)),
    ),
  }));
}

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
      .map((term) => ({
        ...entry,
        pinyin: normalizeSuppliedReading(entry.pinyin).join(" "),
        text: term,
        card: cardsByText.get(term),
      })),
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
