import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  dictionaryEntries,
  dictionaryLookupHistory,
  dictionaryReleases,
  flashcards,
} from "@/db/schema";
import { compactPinyinKey, normalizeSuppliedReading } from "@/lib/phonetics";

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
export const dictionarySearchScopes = [
  "all",
  "chinese",
  "pinyin",
  "english",
] as const;
export type DictionarySearchScope = (typeof dictionarySearchScopes)[number];

type DictionaryEntryRecord = {
  entryId: string;
  traditional: string;
  simplified: string;
  pinyin: string;
  definitions: string[];
};

function dictionaryPinyinTokens(pinyin: string) {
  return normalizeSuppliedReading(pinyin).map((token) =>
    token.toLocaleLowerCase(),
  );
}

function displayDictionaryPinyin(pinyin: string) {
  return dictionaryPinyinTokens(pinyin).join(" ");
}

export type DictionaryDiscoveryResult = DictionarySearchResult & {
  sharedWith: string[];
};

export const dictionaryPracticeExercises = ["pinyin", "script"] as const;
export type DictionaryPracticeExercise =
  (typeof dictionaryPracticeExercises)[number];

export type DictionaryPinyinPracticeRound = {
  exercise: "pinyin";
  entry: DictionarySearchResult;
  options: { id: string; text: string }[];
  answerId: string;
};

export type DictionaryScriptPracticePair = {
  id: string;
  simplified: string;
  traditional: string;
  source: Pick<
    DictionarySearchResult,
    "simplified" | "traditional" | "pinyin" | "definitions"
  >;
};

export type DictionaryScriptPracticeRound = {
  exercise: "script";
  pairs: DictionaryScriptPracticePair[];
  options: { id: string; text: string }[];
};

export type DictionaryPracticeRound =
  | DictionaryPinyinPracticeRound
  | DictionaryScriptPracticeRound;

export async function recordDictionaryLookup(
  userId: string,
  query: string,
  scope: DictionarySearchScope,
) {
  await getDb().insert(dictionaryLookupHistory).values({
    id: crypto.randomUUID(),
    userId,
    query,
    scope,
  });
}

export async function listDictionaryLookupHistory(userId: string) {
  const entries = await getDb()
    .select({
      id: dictionaryLookupHistory.id,
      query: dictionaryLookupHistory.query,
      scope: dictionaryLookupHistory.scope,
    })
    .from(dictionaryLookupHistory)
    .where(eq(dictionaryLookupHistory.userId, userId))
    .orderBy(desc(dictionaryLookupHistory.createdAt))
    .limit(48);
  const seenQueries = new Set<string>();
  return entries
    .filter((entry) => {
      const key = entry.query.toLocaleLowerCase();
      if (seenQueries.has(key)) return false;
      seenQueries.add(key);
      return true;
    })
    .slice(0, 12);
}

export async function clearDictionaryLookupHistory(userId: string) {
  await getDb()
    .delete(dictionaryLookupHistory)
    .where(eq(dictionaryLookupHistory.userId, userId));
}

async function withLearnerCards(
  userId: string,
  entries: DictionaryEntryRecord[],
) {
  const forms = [
    ...new Set(
      entries.flatMap((entry) => [entry.simplified, entry.traditional]),
    ),
  ];
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
    pinyin: displayDictionaryPinyin(pinyin),
    card:
      cardsByText.get(entry.simplified) ?? cardsByText.get(entry.traditional),
  }));
}

export async function searchActiveDictionary(
  userId: string,
  query: string,
  scope: DictionarySearchScope = "all",
) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [] as DictionarySearchResult[];

  const compactQuery = compactPinyinKey(normalizedQuery);
  const compactPinyinColumn = sql`regexp_replace(regexp_replace(lower(${dictionaryEntries.pinyin}), 'u:', 'v', 'gi'), '[1-5[:space:]''’·.\-]', '', 'g')`;
  const chineseMatch = or(
    ilike(dictionaryEntries.simplified, `%${normalizedQuery}%`),
    ilike(dictionaryEntries.traditional, `%${normalizedQuery}%`),
  );
  const tonedPinyinMatch = ilike(
    dictionaryEntries.pinyin,
    `%${normalizedQuery}%`,
  );
  const tonelessPinyinMatch =
    compactQuery.length > 0
      ? sql`${compactPinyinColumn} LIKE ${`%${compactQuery}%`}`
      : undefined;
  const pinyinMatch = tonelessPinyinMatch
    ? or(tonedPinyinMatch, tonelessPinyinMatch)
    : tonedPinyinMatch;
  const englishMatch = sql`lower(${dictionaryEntries.definitions}::text) LIKE ${`%${normalizedQuery.toLowerCase()}%`}`;
  const matchByScope = {
    all: or(chineseMatch, pinyinMatch, englishMatch),
    chinese: chineseMatch,
    pinyin: pinyinMatch,
    english: englishMatch,
  }[scope];
  const relevance =
    compactQuery.length > 0
      ? sql<number>`case
    when ${dictionaryEntries.simplified} = ${normalizedQuery}
      or ${dictionaryEntries.traditional} = ${normalizedQuery} then 0
    when lower(${dictionaryEntries.pinyin}) = lower(${normalizedQuery})
      or ${compactPinyinColumn} = ${compactQuery} then 1
    when exists (
      select 1 from jsonb_array_elements_text(${dictionaryEntries.definitions}) definition
      where lower(definition) = lower(${normalizedQuery})
    ) then 2
    when ${dictionaryEntries.simplified} ilike ${`${normalizedQuery}%`}
      or ${dictionaryEntries.traditional} ilike ${`${normalizedQuery}%`} then 3
    when ${dictionaryEntries.pinyin} ilike ${`${normalizedQuery}%`}
      or ${compactPinyinColumn} like ${`${compactQuery}%`} then 4
    else 5
  end`
      : sql<number>`case
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
    .where(and(eq(dictionaryReleases.isActive, true), matchByScope))
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
    ...new Set(
      sourceTerms.flatMap((term) => term.match(/\p{Script=Han}/gu) ?? []),
    ),
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
    .orderBy(
      asc(sql`char_length(${dictionaryEntries.simplified})`),
      asc(dictionaryEntries.simplified),
    )
    .limit(12);
  const results = await withLearnerCards(userId, entries);
  return results.map((entry) => ({
    ...entry,
    sharedWith: sourceTerms.filter((term) =>
      [...term].some((character) => entry.simplified.includes(character)),
    ),
  }));
}

function shuffled<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
  }
  return copy;
}

function pinyinToneTokens(reading: string) {
  return practicePinyin(reading)
    .split(/\s+/)
    .map((token) => ({
      text: token,
      base: token.normalize("NFD").replace(/[\u0300-\u036f1-5]/g, ""),
    }));
}

function practicePinyin(reading: string) {
  return reading.toLocaleLowerCase();
}

export function createDictionaryPracticeRound(
  exercise: "pinyin",
  entries: DictionarySearchResult[],
  random: () => number = Math.random,
): DictionaryPinyinPracticeRound | null {
  const candidates = shuffled(entries, random);

  for (const entry of candidates) {
    const answer = practicePinyin(entry.pinyin);
    const availableDistractors = entries.filter((candidate) => {
      const candidateValue = practicePinyin(candidate.pinyin);
      return candidate.entryId !== entry.entryId && candidateValue !== answer;
    });
    const entryTokens = pinyinToneTokens(entry.pinyin);
    const closelyRelated = availableDistractors.filter((candidate) => {
      const candidateTokens = pinyinToneTokens(candidate.pinyin);
      return (
        candidateTokens.length === entryTokens.length &&
        candidateTokens.some(
          (token, index) =>
            token.base === entryTokens[index].base &&
            token.text !== entryTokens[index].text,
        )
      );
    });
    const distractors = shuffled(closelyRelated, random).slice(0, 3);
    if (distractors.length !== 3) continue;

    const options = shuffled(
      [entry, ...distractors].map((candidate) => ({
        id: candidate.entryId,
        text: practicePinyin(candidate.pinyin),
      })),
      random,
    );
    return { exercise, entry, options, answerId: entry.entryId };
  }

  return null;
}

export function createDictionaryScriptPracticeRound(
  entries: DictionarySearchResult[],
  random: () => number = Math.random,
): DictionaryScriptPracticeRound | null {
  const candidatePairs = entries.flatMap((entry) => {
    const simplified = [...entry.simplified];
    const traditional = [...entry.traditional];
    if (simplified.length !== traditional.length) return [];
    return simplified.flatMap((character, index) =>
      character !== traditional[index]
        ? [
            {
              id: `${entry.entryId}:${index}`,
              simplified: character,
              traditional: traditional[index],
              source: {
                simplified: entry.simplified,
                traditional: entry.traditional,
                pinyin: entry.pinyin,
                definitions: entry.definitions,
              },
            },
          ]
        : [],
    );
  });
  const selectedPairs: DictionaryScriptPracticePair[] = [];
  const simplifiedCharacters = new Set<string>();
  const traditionalCharacters = new Set<string>();

  for (const pair of shuffled(candidatePairs, random)) {
    if (
      simplifiedCharacters.has(pair.simplified) ||
      traditionalCharacters.has(pair.traditional)
    )
      continue;
    selectedPairs.push(pair);
    simplifiedCharacters.add(pair.simplified);
    traditionalCharacters.add(pair.traditional);
    if (selectedPairs.length === 4) break;
  }
  if (selectedPairs.length !== 4) return null;

  return {
    exercise: "script",
    pairs: selectedPairs,
    options: shuffled(
      selectedPairs.map((pair) => ({ id: pair.id, text: pair.traditional })),
      random,
    ),
  };
}

export async function getDictionaryPracticeRound(
  userId: string,
  exercise: DictionaryPracticeExercise,
) {
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
        sql`char_length(${dictionaryEntries.simplified}) between 1 and 4`,
        exercise === "script"
          ? sql`${dictionaryEntries.simplified} <> ${dictionaryEntries.traditional}`
          : undefined,
      ),
    )
    .orderBy(sql`random()`)
    .limit(exercise === "pinyin" ? 512 : 64);
  const displayEntries = await withLearnerCards(userId, entries);
  return exercise === "pinyin"
    ? createDictionaryPracticeRound("pinyin", displayEntries)
    : createDictionaryScriptPracticeRound(displayEntries);
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
        pinyin: displayDictionaryPinyin(entry.pinyin),
        text: term,
        card: cardsByText.get(term),
      })),
  );
}

export function dictionaryEntryAsCard(
  entry: Pick<
    DictionaryLookup,
    "entryId" | "simplified" | "traditional" | "pinyin" | "definitions"
  >,
) {
  return {
    languageCode: "zh-CN",
    targetText: entry.simplified,
    dictionaryEntryId: entry.entryId,
    simplifiedText: entry.simplified,
    traditionalText: entry.traditional,
    phoneticReading: dictionaryPinyinTokens(entry.pinyin),
    definitions: entry.definitions,
  };
}
