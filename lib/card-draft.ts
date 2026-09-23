import { normalizeSuppliedReading } from "@/lib/phonetics";

export const MAX_HEADWORD_HAN_CHARS = 8;

export type CardDraftFields = {
  targetText: string;
  phoneticReading: string;
  definitions: string;
  dictionaryEntryId?: string;
};

/** Client-safe shape returned by `/api/dictionary/autofill`. */
export type AutofillMatch = {
  entryId: string;
  traditional: string;
  simplified: string;
  pinyin: string;
  definitions: string[];
  matchKind: "exact" | "partial" | "component";
};

export type AutofillResult = {
  query: string;
  matches: AutofillMatch[];
  exactMatch: boolean;
  suggestSplit: boolean;
  helpMessage: string | null;
};

export function countHanCharacters(text: string) {
  return (text.match(/\p{Script=Han}/gu) ?? []).length;
}

export function headwordLengthMessage(text: string) {
  const hanCount = countHanCharacters(text);
  if (hanCount > MAX_HEADWORD_HAN_CHARS) {
    return `Keep the headword to ${MAX_HEADWORD_HAN_CHARS} Chinese characters or fewer (now ${hanCount}).`;
  }
  return null;
}

/** Shared mapping: CC-CEDICT entry → editable Add Card draft fields. */
export function draftFieldsFromDictionaryEntry(entry: {
  entryId: string;
  simplified: string;
  traditional: string;
  pinyin: string;
  definitions: string[];
}): CardDraftFields {
  return {
    targetText: entry.simplified,
    phoneticReading: normalizeSuppliedReading(entry.pinyin)
      .map((token) => token.toLocaleLowerCase())
      .join(" "),
    definitions: entry.definitions.join("; "),
    dictionaryEntryId: entry.entryId,
  };
}
